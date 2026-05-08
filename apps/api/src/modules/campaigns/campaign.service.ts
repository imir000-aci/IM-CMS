import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'
import { publishQueue } from '../../workers/publish.worker.js'
import type { Role } from '@im-cms/shared-types'

type CampaignStatus = 'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PREVIEW' | 'PRODUCTION' | 'ARCHIVED'

// Valid workflow transitions
const TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['SCHEDULED', 'DRAFT'],
  SCHEDULED: ['PREVIEW', 'DRAFT'],
  PREVIEW: ['PRODUCTION', 'DRAFT'],
  PRODUCTION: ['ARCHIVED'],
  ARCHIVED: [],
}

// Roles allowed to approve
const APPROVER_ROLES: Role[] = ['APPROVER', 'PLATFORM_ADMIN']

const CAMPAIGN_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  priority: true,
  startDate: true,
  endDate: true,
  clonedFromId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { approvalSteps: true, comments: true, collisionReports: true } },
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  isActive?: boolean
}

export async function listCampaigns(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.CampaignWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.status ? { status: params.status as CampaignStatus } : {}),
    ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      select: CAMPAIGN_SELECT,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      ...toPrismaSkipTake(pagination),
    }),
    prisma.campaign.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getCampaign(orgId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: orgId },
    include: {
      channels: { include: { channel: { select: { id: true, name: true, slug: true } } } },
      pages: { include: { page: { select: { id: true, name: true, slug: true } } } },
      approvalSteps: { orderBy: { stepOrder: 'asc' }, include: { approver: { select: { id: true, displayName: true } } } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, displayName: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, displayName: true } } },
          },
        },
      },
      collisionReports: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!campaign) throw new NotFoundError('Campaign', id)
  return campaign
}

interface CreateInput {
  name: string
  description?: string
  priority?: number
  startDate?: string
  endDate?: string
}

export async function createCampaign(orgId: string, input: CreateInput) {
  return prisma.campaign.create({
    data: {
      organizationId: orgId,
      name: input.name,
      description: input.description,
      priority: input.priority ?? 0,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
    select: CAMPAIGN_SELECT,
  })
}

interface UpdateInput {
  name?: string
  description?: string
  priority?: number
  startDate?: string
  endDate?: string
}

export async function updateCampaign(orgId: string, id: string, input: UpdateInput) {
  const existing = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('Campaign', id)
  if (existing.status !== 'DRAFT') {
    throw new ValidationError('Campaign can only be edited in DRAFT status', [])
  }

  return prisma.campaign.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
      ...(input.endDate !== undefined ? { endDate: new Date(input.endDate) } : {}),
    },
    select: CAMPAIGN_SELECT,
  })
}

export async function deleteCampaign(orgId: string, id: string) {
  const existing = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('Campaign', id)
  if (!['DRAFT', 'ARCHIVED'].includes(existing.status)) {
    throw new ValidationError('Only DRAFT or ARCHIVED campaigns can be deleted', [])
  }
  await prisma.campaign.update({ where: { id }, data: { isActive: false } })
}

export async function cloneCampaign(orgId: string, id: string, name: string) {
  const source = await prisma.campaign.findFirst({
    where: { id, organizationId: orgId },
    include: {
      channels: true,
      pages: true,
    },
  })
  if (!source) throw new NotFoundError('Campaign', id)

  return prisma.$transaction(async (tx) => {
    const clone = await tx.campaign.create({
      data: {
        organizationId: orgId,
        name,
        description: source.description,
        priority: source.priority,
        startDate: source.startDate,
        endDate: source.endDate,
        clonedFromId: source.id,
        status: 'DRAFT',
      },
      select: CAMPAIGN_SELECT,
    })

    // Clone channel and page associations
    if (source.channels.length > 0) {
      await tx.campaignChannel.createMany({
        data: source.channels.map((c) => ({ campaignId: clone.id, channelId: c.channelId })),
      })
    }
    if (source.pages.length > 0) {
      await tx.campaignPage.createMany({
        data: source.pages.map((p) => ({ campaignId: clone.id, pageId: p.pageId })),
      })
    }

    return clone
  })
}

// Workflow transitions

export async function transitionStatus(
  orgId: string,
  id: string,
  targetStatus: CampaignStatus,
  userId: string,
  role: Role,
  comment?: string,
) {
  const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', id)

  const currentStatus = campaign.status as CampaignStatus
  const allowed = TRANSITIONS[currentStatus] ?? []
  if (!allowed.includes(targetStatus)) {
    throw new ValidationError(
      `Cannot transition from ${currentStatus} to ${targetStatus}`,
      [`Allowed transitions: ${allowed.join(', ') || 'none'}`],
    )
  }

  // PRODUCTION transition requires all approval steps approved
  if (targetStatus === 'PRODUCTION') {
    if (!APPROVER_ROLES.includes(role)) throw new ForbiddenError('Only APPROVERs can publish campaigns')
    await runCollisionCheck(orgId, id)

    const pendingSteps = await prisma.approvalStep.count({
      where: { campaignId: id, status: { not: 'APPROVED' } },
    })
    if (pendingSteps > 0) {
      throw new ValidationError('All approval steps must be APPROVED before publishing', [])
    }
  }

  const data: Prisma.CampaignUpdateInput = { status: targetStatus }
  if (targetStatus === 'ARCHIVED') {
    // Snapshot the campaign for archive
    const full = await prisma.campaign.findFirst({ where: { id }, include: { channels: true, pages: true, approvalSteps: true } })
    data.archivedSnapshot = full as unknown as Prisma.InputJsonValue
  }

  const updated = await prisma.campaign.update({ where: { id }, data, select: CAMPAIGN_SELECT })

  if (comment) {
    await prisma.comment.create({
      data: { campaignId: id, authorId: userId, body: `[Status → ${targetStatus}] ${comment}` },
    })
  }

  // Invalidate delivery cache when going PRODUCTION
  if (targetStatus === 'PRODUCTION') {
    await publishQueue.add('invalidate-campaign', { type: 'campaign', campaignId: id, orgId })
  }

  return updated
}

export async function submitForReview(orgId: string, id: string, userId: string, role: Role, comment?: string) {
  return transitionStatus(orgId, id, 'REVIEW', userId, role, comment)
}

export async function scheduleForLaunch(orgId: string, id: string, userId: string, role: Role, comment?: string) {
  return transitionStatus(orgId, id, 'SCHEDULED', userId, role, comment)
}

export async function sendToPreview(orgId: string, id: string, userId: string, role: Role, comment?: string) {
  return transitionStatus(orgId, id, 'PREVIEW', userId, role, comment)
}

export async function publishCampaign(orgId: string, id: string, userId: string, role: Role, comment?: string) {
  return transitionStatus(orgId, id, 'PRODUCTION', userId, role, comment)
}

export async function archiveCampaign(orgId: string, id: string, userId: string, role: Role, comment?: string) {
  return transitionStatus(orgId, id, 'ARCHIVED', userId, role, comment)
}

export async function revertToDraft(orgId: string, id: string, userId: string, role: Role, comment?: string) {
  return transitionStatus(orgId, id, 'DRAFT', userId, role, comment)
}

// Approval steps

export async function getApprovalSteps(orgId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  return prisma.approvalStep.findMany({
    where: { campaignId },
    orderBy: { stepOrder: 'asc' },
    include: { approver: { select: { id: true, displayName: true, email: true } } },
  })
}

export async function addApprovalStep(
  orgId: string,
  campaignId: string,
  approverId: string,
  stepOrder?: number,
) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)
  if (campaign.status !== 'DRAFT') {
    throw new ValidationError('Approval steps can only be added to DRAFT campaigns', [])
  }

  const approver = await prisma.user.findFirst({ where: { id: approverId, organizationId: orgId } })
  if (!approver) throw new NotFoundError('User', approverId)

  const maxStep = await prisma.approvalStep.aggregate({ where: { campaignId }, _max: { stepOrder: true } })
  const order = stepOrder ?? (maxStep._max.stepOrder ?? 0) + 1

  return prisma.approvalStep.create({
    data: { campaignId, approverId, stepOrder: order, status: 'PENDING' },
    include: { approver: { select: { id: true, displayName: true } } },
  })
}

export async function makeApprovalDecision(
  orgId: string,
  campaignId: string,
  stepId: string,
  userId: string,
  decision: 'APPROVED' | 'REJECTED',
  comment?: string,
) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  const step = await prisma.approvalStep.findFirst({ where: { id: stepId, campaignId } })
  if (!step) throw new NotFoundError('ApprovalStep', stepId)
  if (step.approverId !== userId) throw new ForbiddenError('You are not the assigned approver for this step')
  if (step.status !== 'PENDING') {
    throw new ConflictError(`Step is already ${step.status}`)
  }

  const updated = await prisma.approvalStep.update({
    where: { id: stepId },
    data: { status: decision, decidedAt: new Date() },
    include: { approver: { select: { id: true, displayName: true } } },
  })

  if (comment) {
    await prisma.comment.create({
      data: { campaignId, authorId: userId, body: `[Approval ${decision}] ${comment}` },
    })
  }

  return updated
}

// Comments

export async function getComments(orgId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  return prisma.comment.findMany({
    where: { campaignId, parentId: null },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, displayName: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, displayName: true } } },
      },
    },
  })
}

export async function addComment(
  orgId: string,
  campaignId: string,
  userId: string,
  body: string,
  parentId?: string,
) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  if (parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parentId, campaignId } })
    if (!parent) throw new NotFoundError('Comment', parentId)
  }

  return prisma.comment.create({
    data: { campaignId, authorId: userId, body, parentId: parentId ?? null },
    include: { author: { select: { id: true, displayName: true } } },
  })
}

export async function resolveComment(orgId: string, campaignId: string, commentId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  const comment = await prisma.comment.findFirst({ where: { id: commentId, campaignId } })
  if (!comment) throw new NotFoundError('Comment', commentId)

  return prisma.comment.update({ where: { id: commentId }, data: { isResolved: true } })
}

// Collision detection

export async function runCollisionCheck(orgId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    include: { pages: true },
  })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  // Find campaigns that overlap in date range + share pages
  const overlapping = await prisma.campaign.findMany({
    where: {
      organizationId: orgId,
      id: { not: campaignId },
      isActive: true,
      status: { in: ['SCHEDULED', 'PREVIEW', 'PRODUCTION'] },
      pages: { some: { pageId: { in: campaign.pages.map((p) => p.pageId) } } },
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: campaign.endDate ?? new Date('2099-12-31') } }] },
        { OR: [{ endDate: null }, { endDate: { gte: campaign.startDate ?? new Date('2000-01-01') } }] },
      ],
    },
    include: { pages: true },
  })

  // Clear old reports for this campaign
  await prisma.collisionReport.deleteMany({ where: { campaignId } })

  const reports: Prisma.CollisionReportCreateManyInput[] = []
  for (const other of overlapping) {
    const sharedPageIds = campaign.pages
      .filter((p) => other.pages.some((op) => op.pageId === p.pageId))
      .map((p) => p.pageId)

    for (const pageId of sharedPageIds) {
      reports.push({
        campaignId,
        conflictsWith: other.id,
        slotId: pageId, // using pageId as collision identifier here
        resolution: 'UNRESOLVED',
      })
    }
  }

  if (reports.length > 0) {
    await prisma.collisionReport.createMany({ data: reports })
  }

  return {
    hasCollisions: reports.length > 0,
    collisionCount: reports.length,
    conflictingCampaigns: [...new Set(overlapping.map((c) => c.id))],
  }
}

export async function getCollisionReports(orgId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  return prisma.collisionReport.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  })
}

// Channel/Page associations

export async function attachChannel(orgId: string, campaignId: string, channelId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  const channel = await prisma.channel.findFirst({ where: { id: channelId, organizationId: orgId } })
  if (!channel) throw new NotFoundError('Channel', channelId)

  const existing = await prisma.campaignChannel.findFirst({ where: { campaignId, channelId } })
  if (existing) throw new ConflictError('Channel already attached to this campaign')

  await prisma.campaignChannel.create({ data: { campaignId, channelId } })
}

export async function detachChannel(orgId: string, campaignId: string, channelId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  await prisma.campaignChannel.deleteMany({ where: { campaignId, channelId } })
}

export async function attachPage(orgId: string, campaignId: string, pageId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const existing = await prisma.campaignPage.findFirst({ where: { campaignId, pageId } })
  if (existing) throw new ConflictError('Page already attached to this campaign')

  await prisma.campaignPage.create({ data: { campaignId, pageId } })
}

export async function detachPage(orgId: string, campaignId: string, pageId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
  if (!campaign) throw new NotFoundError('Campaign', campaignId)

  await prisma.campaignPage.deleteMany({ where: { campaignId, pageId } })
}

// Re-launch from archive

export async function relaunchCampaign(orgId: string, id: string, name: string, userId: string) {
  const source = await prisma.campaign.findFirst({
    where: { id, organizationId: orgId, status: 'ARCHIVED' },
    include: { channels: true, pages: true },
  })
  if (!source) throw new NotFoundError('ArchivedCampaign', id)

  return prisma.$transaction(async (tx) => {
    const newCampaign = await tx.campaign.create({
      data: {
        organizationId: orgId,
        name,
        description: source.description,
        priority: source.priority,
        clonedFromId: source.id,
        status: 'DRAFT',
      },
      select: CAMPAIGN_SELECT,
    })

    if (source.channels.length > 0) {
      await tx.campaignChannel.createMany({
        data: source.channels.map((c) => ({ campaignId: newCampaign.id, channelId: c.channelId })),
      })
    }
    if (source.pages.length > 0) {
      await tx.campaignPage.createMany({
        data: source.pages.map((p) => ({ campaignId: newCampaign.id, pageId: p.pageId })),
      })
    }

    return newCampaign
  })
}

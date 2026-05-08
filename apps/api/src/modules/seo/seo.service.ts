import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'

const REDIRECT_SELECT = {
  id: true,
  fromPath: true,
  toPath: true,
  statusCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

export async function listRedirects(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.search ? { fromPath: { contains: params.search, mode: 'insensitive' as const } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.seoRedirect.findMany({
      where,
      select: REDIRECT_SELECT,
      orderBy: { fromPath: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.seoRedirect.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function createRedirect(
  orgId: string,
  input: { fromPath: string; toPath: string; statusCode?: number },
) {
  const existing = await prisma.seoRedirect.findFirst({
    where: { organizationId: orgId, fromPath: input.fromPath, isActive: true },
  })
  if (existing) throw new ConflictError(`Redirect from '${input.fromPath}' already exists`)

  return prisma.seoRedirect.create({
    data: {
      organizationId: orgId,
      fromPath: input.fromPath,
      toPath: input.toPath,
      statusCode: input.statusCode ?? 301,
    },
    select: REDIRECT_SELECT,
  })
}

export async function updateRedirect(
  orgId: string,
  id: string,
  input: { toPath?: string; statusCode?: number },
) {
  const existing = await prisma.seoRedirect.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('SeoRedirect', id)

  return prisma.seoRedirect.update({
    where: { id },
    data: {
      ...(input.toPath !== undefined ? { toPath: input.toPath } : {}),
      ...(input.statusCode !== undefined ? { statusCode: input.statusCode } : {}),
    },
    select: REDIRECT_SELECT,
  })
}

export async function deleteRedirect(orgId: string, id: string) {
  const existing = await prisma.seoRedirect.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('SeoRedirect', id)
  await prisma.seoRedirect.update({ where: { id }, data: { isActive: false } })
}

export async function generateSitemap(orgId: string, channelSlug?: string) {
  const where = {
    organizationId: orgId,
    isPublished: true,
    isActive: true,
    ...(channelSlug ? { channel: { slug: channelSlug } } : {}),
  }

  const pages = await prisma.page.findMany({
    where,
    select: {
      slug: true,
      updatedAt: true,
      channel: { select: { slug: true } },
    },
    orderBy: { slug: 'asc' },
  })

  const urls = pages.map((p) => ({
    loc: `/${p.channel.slug}/${p.slug}`,
    lastmod: p.updatedAt.toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.8,
  }))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return xml
}

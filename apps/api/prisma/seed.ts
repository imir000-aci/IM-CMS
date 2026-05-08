import { PrismaClient, Role } from '@prisma/client'
import { randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const prisma = new PrismaClient()
const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

async function main() {
  console.log('Seeding database...')

  // Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme Corporation', slug: 'acme' },
  })
  console.log(`Organization: ${org.name} (${org.id})`)

  // Users
  const adminPw = await hashPassword('admin1234!')
  const adminUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@acme.com' } },
    update: { passwordHash: adminPw },
    create: {
      organizationId: org.id,
      email: 'admin@acme.com',
      displayName: 'Platform Admin',
      role: Role.PLATFORM_ADMIN,
      passwordHash: adminPw,
      isActive: true,
    },
  })
  console.log(`Admin: ${adminUser.email}`)

  const authorPw = await hashPassword('author1234!')
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'author@acme.com' } },
    update: { passwordHash: authorPw },
    create: {
      organizationId: org.id,
      email: 'author@acme.com',
      displayName: 'Content Author',
      role: Role.CONTENT_AUTHOR,
      passwordHash: authorPw,
      isActive: true,
    },
  })

  const approverPw = await hashPassword('approver1234!')
  const approverUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'approver@acme.com' } },
    update: { passwordHash: approverPw },
    create: {
      organizationId: org.id,
      email: 'approver@acme.com',
      displayName: 'Campaign Approver',
      role: Role.APPROVER,
      passwordHash: approverPw,
      isActive: true,
    },
  })

  // Locales
  await prisma.locale.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'en' } },
    update: {},
    create: { organizationId: org.id, code: 'en', name: 'English', isDefault: true, isRtl: false },
  })
  await prisma.locale.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'fr' } },
    update: {},
    create: { organizationId: org.id, code: 'fr', name: 'French', isDefault: false, isRtl: false },
  })

  // Channel
  const webChannel = await prisma.channel.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'web' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Web',
      slug: 'web',
      defaultLocale: 'en',
    },
  })
  console.log(`Channel: ${webChannel.name}`)

  // Master component: Hero Banner
  const heroBanner = await prisma.masterComponent.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'hero-banner' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Hero Banner',
      slug: 'hero-banner',
      description: 'Full-width hero section with headline, subheadline, and CTA',
      category: 'Layout',
      attributeSchema: [
        { name: 'headline', dataType: 'text', required: true, isAuthorFillable: true, validationRules: { maxLength: 120 } },
        { name: 'subheadline', dataType: 'text', required: false, isAuthorFillable: true, validationRules: { maxLength: 300 } },
        { name: 'ctaLabel', dataType: 'text', required: true, isAuthorFillable: false, validationRules: { maxLength: 40 } },
        { name: 'ctaUrl', dataType: 'url', required: true, isAuthorFillable: false },
        { name: 'backgroundImageUrl', dataType: 'url', required: false, isAuthorFillable: false },
      ],
      currentVersion: 1,
      createdById: adminUser.id,
    },
  })

  // Version record for hero banner
  await prisma.masterComponentVersion.upsert({
    where: { masterComponentId_version: { masterComponentId: heroBanner.id, version: 1 } },
    update: {},
    create: {
      masterComponentId: heroBanner.id,
      version: 1,
      attributeSchema: heroBanner.attributeSchema,
      createdById: adminUser.id,
    },
  })

  // Master component: Product Card
  const productCard = await prisma.masterComponent.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'product-card' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Product Card',
      slug: 'product-card',
      description: 'Single product display with image, title, price, and buy button',
      category: 'Commerce',
      attributeSchema: [
        { name: 'productId', dataType: 'text', required: true, isAuthorFillable: false },
        { name: 'showRating', dataType: 'boolean', required: false, isAuthorFillable: true },
        { name: 'layout', dataType: 'text', required: false, isAuthorFillable: false, validationRules: { allowedValues: ['horizontal', 'vertical'] } },
      ],
      currentVersion: 1,
      createdById: adminUser.id,
    },
  })

  await prisma.masterComponentVersion.upsert({
    where: { masterComponentId_version: { masterComponentId: productCard.id, version: 1 } },
    update: {},
    create: {
      masterComponentId: productCard.id,
      version: 1,
      attributeSchema: productCard.attributeSchema,
      createdById: adminUser.id,
    },
  })

  // Component instances
  const heroInstance = await prisma.componentInstance.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      organizationId: org.id,
      masterComponentId: heroBanner.id,
      name: 'Homepage Hero - Default',
      prefilledAttributes: { ctaLabel: 'Shop Now', ctaUrl: '/products' },
      tags: ['homepage', 'hero'],
    },
  })

  // Content object
  const heroContent = await prisma.contentObject.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      organizationId: org.id,
      name: 'Homepage Hero Copy - Default',
      type: 'RICH_TEXT',
      fields: {
        headline: 'Discover the Future of Shopping',
        subheadline: 'Explore thousands of products curated just for you.',
      },
      currentVersion: 1,
      tags: ['homepage', 'hero'],
    },
  })

  await prisma.contentObjectVersion.upsert({
    where: { contentObjectId_version: { contentObjectId: heroContent.id, version: 1 } },
    update: {},
    create: {
      contentObjectId: heroContent.id,
      version: 1,
      fields: heroContent.fields,
      createdById: adminUser.id,
    },
  })

  // Targeting rule: New Visitors
  const newVisitorRule = await prisma.targetingRule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000100' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000100',
      organizationId: org.id,
      name: 'New Visitors',
      description: 'Matches users with no prior visits',
      scope: 'GLOBAL',
      conditionTree: {
        leaf: { type: 'behavioral', attribute: 'visitCount', operator: 'eq', value: 0 },
      },
      priority: 10,
    },
  })

  // Experience
  const heroExperience = await prisma.experience.upsert({
    where: { id: '00000000-0000-0000-0000-000000001000' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000001000',
      organizationId: org.id,
      name: 'Homepage Hero - New Visitor Experience',
      componentInstanceId: heroInstance.id,
      contentObjectId: heroContent.id,
      priority: 10,
    },
  })

  // Attach targeting rule to experience
  await prisma.experienceTargetingRule.upsert({
    where: { experienceId_targetingRuleId: { experienceId: heroExperience.id, targetingRuleId: newVisitorRule.id } },
    update: {},
    create: { experienceId: heroExperience.id, targetingRuleId: newVisitorRule.id },
  })

  // Page
  const homePage = await prisma.page.upsert({
    where: { id: '00000000-0000-0000-0000-000000010000' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000010000',
      organizationId: org.id,
      channelId: webChannel.id,
      name: 'Homepage',
      slug: 'home',
      metaTitle: 'Acme — Home',
      metaDescription: 'Discover thousands of products at Acme.',
      ogTags: { 'og:type': 'website' },
    },
  })

  // Zone + Slot
  let heroZone = await prisma.zone.findFirst({ where: { pageId: homePage.id, name: 'Hero' } })
  if (!heroZone) {
    heroZone = await prisma.zone.create({ data: { pageId: homePage.id, name: 'Hero', order: 0 } })
  }
  let heroSlot = await prisma.slot.findFirst({ where: { zoneId: heroZone.id, name: 'Main' } })
  if (!heroSlot) {
    heroSlot = await prisma.slot.create({ data: { zoneId: heroZone.id, name: 'Main', order: 0 } })
  }

  // Page configuration (baseline)
  let pageConfig = await prisma.pageConfiguration.findFirst({ where: { pageId: homePage.id, campaignId: null } })
  if (!pageConfig) {
    pageConfig = await prisma.pageConfiguration.create({
      data: { pageId: homePage.id, campaignId: null, priority: 0 },
    })
  }

  // Slot configuration
  const existingSlotConfig = await prisma.slotConfiguration.findFirst({
    where: { pageConfigurationId: pageConfig.id, slotId: heroSlot.id },
  })
  if (!existingSlotConfig) {
    await prisma.slotConfiguration.create({
      data: {
        pageConfigurationId: pageConfig.id,
        slotId: heroSlot.id,
        priority: 0,
        experienceId: heroExperience.id,
      },
    })
  }

  // Demo campaign
  const demoCampaign = await prisma.campaign.upsert({
    where: { id: '00000000-0000-0000-0000-000000100000' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000100000',
      organizationId: org.id,
      name: 'Summer Sale 2026',
      description: 'Hero banner and product carousel updates for summer sale.',
      status: 'DRAFT',
      priority: 10,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
    },
  })

  // Attach channel and page to campaign
  await prisma.campaignChannel.upsert({
    where: { campaignId_channelId: { campaignId: demoCampaign.id, channelId: webChannel.id } },
    update: {},
    create: { campaignId: demoCampaign.id, channelId: webChannel.id },
  })
  await prisma.campaignPage.upsert({
    where: { campaignId_pageId: { campaignId: demoCampaign.id, pageId: homePage.id } },
    update: {},
    create: { campaignId: demoCampaign.id, pageId: homePage.id },
  })

  // Approval step
  const existingStep = await prisma.approvalStep.findFirst({ where: { campaignId: demoCampaign.id } })
  if (!existingStep) {
    await prisma.approvalStep.create({
      data: { campaignId: demoCampaign.id, approverId: approverUser.id, stepOrder: 1, status: 'PENDING' },
    })
  }

  console.log('Seeding complete.')
  console.log('\nSeed accounts:')
  console.log('  admin@acme.com    / admin1234!    (PLATFORM_ADMIN)')
  console.log('  author@acme.com   / author1234!   (CONTENT_AUTHOR)')
  console.log('  approver@acme.com / approver1234! (APPROVER)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => void prisma.$disconnect())

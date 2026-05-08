import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme',
    },
  })
  console.log(`Organization: ${org.name} (${org.id})`)

  const adminUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@acme.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@acme.com',
      displayName: 'Platform Admin',
      role: Role.PLATFORM_ADMIN,
      isActive: true,
    },
  })
  console.log(`Admin user: ${adminUser.email} (${adminUser.id})`)

  await prisma.locale.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'en' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'en',
      name: 'English',
      isDefault: true,
      isRtl: false,
    },
  })

  const webChannel = await prisma.channel.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'web' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Web',
      slug: 'web',
      channelType: 'web',
      defaultLocale: 'en',
    },
  })
  console.log(`Channel: ${webChannel.name} (${webChannel.id})`)

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })

/**
 * Standalone seed script for demo data.
 * Run with: npx tsx src/lib/demo/seed-standalone.ts
 *
 * This script creates a demo workspace and seeds it with realistic LATAM business data.
 * It can be run independently from Next.js context.
 */

import { PrismaClient } from '@prisma/client'
import { seedDemoData } from './seed'

const db = new PrismaClient({
  log: ['error', 'warn'],
})

async function main() {
  console.log('🌱 Seeding demo data...\n')

  try {
    // Create demo user if not exists
    const demoEmail = 'demo@valiautoflow.com'
    let user = await db.user.findUnique({ where: { email: demoEmail } })

    if (!user) {
      user = await db.user.create({
        data: {
          email: demoEmail,
          name: 'Demo User',
          role: 'OWNER',
          password: '$2a$12$demo.hash.not.for.production',
        },
      })
      console.log(`  ✅ Created demo user: ${user.email}`)
    } else {
      console.log(`  ℹ️  Demo user already exists: ${user.email}`)
    }

    // Create demo workspace if not exists
    let workspace = await db.workspace.findFirst({
      where: { slug: 'demo-la-casa' },
    })

    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          name: 'Restaurante La Casa',
          slug: 'demo-la-casa',
          plan: 'PRO',
          settings: JSON.stringify({ demo: true }),
        },
      })
      console.log(`  ✅ Created demo workspace: ${workspace.name}`)
    } else {
      console.log(`  ℹ️  Demo workspace already exists: ${workspace.name}`)
    }

    // Link user to workspace
    const existingMember = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    })

    if (!existingMember) {
      await db.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
          acceptedAt: new Date(),
        },
      })
      console.log(`  ✅ Linked user to workspace`)
    }

    // Seed demo data
    const result = await seedDemoData(workspace.id)

    if (result.success) {
      console.log('\n🎉 Demo data seeded successfully!')
      console.log(`   Workspace ID: ${workspace.id}`)
      console.log(`   User ID: ${user.id}`)
      console.log('\n   Login with: demo@valiautoflow.com')
    }
  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()

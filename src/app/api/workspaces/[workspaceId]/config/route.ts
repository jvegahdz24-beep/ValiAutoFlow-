import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findWorkspaceConfig, upsertWorkspaceConfig } from '@/lib/db-supabase'

// GET /api/workspaces/[workspaceId]/config
export async function GET(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId: id } = await params
    await requireWorkspaceAccess(id)

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      let config = await db.workspaceConfig.findUnique({ where: { workspaceId: id } })
      if (!config) {
        config = await db.workspaceConfig.create({ data: { workspaceId: id } })
      }
      return NextResponse.json({ config })
    }

    // Supabase REST API fallback
    console.log('[CONFIG] Prisma unreachable, using Supabase REST API fallback')
    let config = await findWorkspaceConfig(id)
    if (!config) {
      // Create default config via Supabase REST
      config = await upsertWorkspaceConfig(id, {
        businessName: '',
        businessType: 'general',
      })
    }
    if (!config) {
      return NextResponse.json({ config: { workspaceId: id, businessName: '', businessType: 'general' } })
    }
    return NextResponse.json({ config })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[CONFIG_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

// PUT /api/workspaces/[workspaceId]/config
export async function PUT(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId: id } = await params
    await requireWorkspaceAccess(id)
    const body = await request.json()

    // Build update data with proper JSON serialization
    const updateData: Record<string, unknown> = {}
    if (body.businessName !== undefined) updateData.businessName = body.businessName
    if (body.businessType !== undefined) updateData.businessType = body.businessType
    if (body.schedule !== undefined) updateData.schedule = typeof body.schedule === 'string' ? body.schedule : JSON.stringify(body.schedule)
    if (body.products !== undefined) updateData.products = typeof body.products === 'string' ? body.products : JSON.stringify(body.products)
    if (body.leadFormula !== undefined) updateData.leadFormula = typeof body.leadFormula === 'string' ? body.leadFormula : JSON.stringify(body.leadFormula)
    if (body.customQuestions !== undefined) updateData.customQuestions = typeof body.customQuestions === 'string' ? body.customQuestions : JSON.stringify(body.customQuestions)
    if (body.policies !== undefined) updateData.policies = typeof body.policies === 'string' ? body.policies : JSON.stringify(body.policies)
    if (body.channels !== undefined) updateData.channels = typeof body.channels === 'string' ? body.channels : JSON.stringify(body.channels)
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      const config = await db.workspaceConfig.upsert({
        where: { workspaceId: id },
        update: updateData,
        create: { workspaceId: id, ...updateData },
      })
      return NextResponse.json({ config })
    }

    // Supabase REST API fallback
    console.log('[CONFIG] Prisma unreachable, using Supabase REST API fallback for PUT')
    const config = await upsertWorkspaceConfig(id, updateData)

    if (!config) {
      return NextResponse.json(
        { error: 'Failed to save config via Supabase. Check service_role key and workspace_configs table.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ config })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[CONFIG_PUT]', error)
    return NextResponse.json(
      { error: `Failed to update config: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}

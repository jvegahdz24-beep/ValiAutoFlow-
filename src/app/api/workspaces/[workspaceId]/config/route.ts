import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId: id } = await params
    await requireWorkspaceAccess(id)
    let config = await db.workspaceConfig.findUnique({ where: { workspaceId: id } })
    if (!config) {
      // Create default config if none exists
      config = await db.workspaceConfig.create({ data: { workspaceId: id } })
    }
    return NextResponse.json({ config })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId: id } = await params
    await requireWorkspaceAccess(id)
    const body = await request.json()

    // Build update data with proper JSON serialization
    const updateData: Record<string, unknown> = {}
    if (body.businessName !== undefined) updateData.businessName = body.businessName
    if (body.businessType !== undefined) updateData.businessType = body.businessType
    if (body.schedule !== undefined) updateData.schedule = JSON.stringify(body.schedule)
    if (body.products !== undefined) updateData.products = JSON.stringify(body.products)
    if (body.leadFormula !== undefined) updateData.leadFormula = JSON.stringify(body.leadFormula)
    if (body.customQuestions !== undefined) updateData.customQuestions = JSON.stringify(body.customQuestions)
    if (body.policies !== undefined) updateData.policies = JSON.stringify(body.policies)
    if (body.channels !== undefined) updateData.channels = JSON.stringify(body.channels)

    const config = await db.workspaceConfig.upsert({
      where: { workspaceId: id },
      update: updateData,
      create: { workspaceId: id, ...updateData },
    })

    return NextResponse.json({ config })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}

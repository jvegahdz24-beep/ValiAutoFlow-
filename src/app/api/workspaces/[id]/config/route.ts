import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    let config = await db.workspaceConfig.findUnique({ where: { workspaceId: id } })
    if (!config) {
      // Create default config if none exists
      config = await db.workspaceConfig.create({ data: { workspaceId: id } })
    }
    return NextResponse.json({ config })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update config', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

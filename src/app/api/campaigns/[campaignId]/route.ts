import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, requireWorkspaceAccess } from '@/lib/auth'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { campaignId } = await params
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: { campaignMessages: { take: 50, orderBy: { createdAt: 'desc' } } },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Verify workspace access
    await requireWorkspaceAccess(campaign.workspaceId)

    return NextResponse.json({ campaign })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { campaignId } = await params
    const body = await request.json()

    // Verify the campaign belongs to user's workspace
    const existing = await db.campaign.findUnique({ where: { id: campaignId } })
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    await requireWorkspaceAccess(existing.workspaceId)

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.segmentQuery !== undefined) updateData.segmentQuery = JSON.stringify(body.segmentQuery)
    if (body.channel !== undefined) updateData.channel = body.channel
    if (body.templateBody !== undefined) updateData.templateBody = body.templateBody
    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'active') updateData.startedAt = new Date()
      if (body.status === 'completed') updateData.completedAt = new Date()
    }
    if (body.stats !== undefined) updateData.stats = JSON.stringify(body.stats)

    const campaign = await db.campaign.update({ where: { id: campaignId }, data: updateData })
    return NextResponse.json({ campaign })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

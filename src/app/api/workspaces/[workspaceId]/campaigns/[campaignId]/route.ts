import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'

// GET - Campaign detail with messages
export async function GET(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  try {
    const { workspaceId, campaignId } = await params
    await requireWorkspaceAccess(workspaceId)
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: {
        campaignMessages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
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

// PUT - Update campaign (status, name, etc.)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  try {
    const { workspaceId, campaignId } = await params
    await requireWorkspaceAccess(workspaceId)
    const body = await request.json()
    const update: any = {}
    if (body.status) update.status = body.status
    if (body.name) update.name = body.name
    if (body.templateBody !== undefined) update.templateBody = body.templateBody
    if (body.segmentQuery) update.segmentQuery = JSON.stringify(body.segmentQuery)
    if (body.description !== undefined) update.description = body.description

    if (body.status === 'active') update.startedAt = new Date()
    if (body.status === 'completed') update.completedAt = new Date()

    const campaign = await db.campaign.update({
      where: { id: campaignId, workspaceId },
      data: update,
    })

    // Create notification for status changes
    if (body.status) {
      const statusMessages: Record<string, string> = {
        active: 'Campaña iniciada',
        paused: 'Campaña pausada',
        completed: 'Campaña completada',
      }
      if (statusMessages[body.status]) {
        await db.notification.create({
          data: {
            workspaceId,
            type: 'campaign',
            title: statusMessages[body.status],
            description: `Campaña "${campaign.name}" ${body.status}`,
          },
        })
      }
    }

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

// DELETE - Remove campaign
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  try {
    const { workspaceId, campaignId } = await params
    await requireWorkspaceAccess(workspaceId)
    await db.campaignMessage.deleteMany({ where: { campaignId } })
    await db.campaign.delete({ where: { id: campaignId, workspaceId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}

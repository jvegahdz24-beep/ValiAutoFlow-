import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - Campaign detail with messages
export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  const { workspaceId, campaignId } = await params
  try {
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

// PUT - Update campaign (status, name, etc.)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  const { workspaceId, campaignId } = await params
  try {
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

// DELETE - Remove campaign
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  const { workspaceId, campaignId } = await params
  try {
    await db.campaignMessage.deleteMany({ where: { campaignId } })
    await db.campaign.delete({ where: { id: campaignId, workspaceId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}

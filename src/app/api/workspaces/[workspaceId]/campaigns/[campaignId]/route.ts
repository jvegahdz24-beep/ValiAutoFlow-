import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findCampaignWithMessages, updateCampaign, deleteCampaignAndMessages, createNotification } from '@/lib/db-supabase'

// GET - Campaign detail with messages
export async function GET(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  try {
    const { workspaceId, campaignId } = await params
    await requireWorkspaceAccess(workspaceId)

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
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
    }

    // Supabase REST API fallback
    console.log('[CampaignDetail/GET] Prisma unreachable, using Supabase REST API fallback')
    const campaign = await findCampaignWithMessages(campaignId)
    if (!campaign || campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
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

    if (body.status === 'active') update.startedAt = new Date().toISOString()
    if (body.status === 'completed') update.completedAt = new Date().toISOString()

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
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
    }

    // Supabase REST API fallback
    console.log('[CampaignDetail/PUT] Prisma unreachable, using Supabase REST API fallback')
    const campaign = await updateCampaign(campaignId, update)

    if (!campaign) {
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }

    // Create notification for status changes (non-blocking)
    if (body.status) {
      const statusMessages: Record<string, string> = {
        active: 'Campaña iniciada',
        paused: 'Campaña pausada',
        completed: 'Campaña completada',
      }
      if (statusMessages[body.status]) {
        await createNotification(workspaceId, {
          type: 'campaign',
          title: statusMessages[body.status],
          description: `Campaña "${campaign.name}" ${body.status}`,
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

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      await db.campaignMessage.deleteMany({ where: { campaignId } })
      await db.campaign.delete({ where: { id: campaignId, workspaceId } })
      return NextResponse.json({ success: true })
    }

    // Supabase REST API fallback
    console.log('[CampaignDetail/DELETE] Prisma unreachable, using Supabase REST API fallback')
    await deleteCampaignAndMessages(campaignId)
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

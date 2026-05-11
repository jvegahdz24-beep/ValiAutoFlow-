import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findCampaigns, createCampaign, count, createNotification } from '@/lib/db-supabase'

// GET - List campaigns for workspace
export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      const where: any = { workspaceId }
      if (status) where.status = status

      const [campaigns, total] = await Promise.all([
        db.campaign.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { campaignMessages: true } } },
        }),
        db.campaign.count({ where }),
      ])
      return NextResponse.json({ campaigns, total })
    }

    // Supabase REST API fallback
    console.log('[Campaigns/GET] Prisma unreachable, using Supabase REST API fallback')
    const campaigns = await findCampaigns(workspaceId, status)
    const total = campaigns.length
    return NextResponse.json({ campaigns, total })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

// POST - Create campaign
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
    const body = await request.json()
    const { name, channel, templateBody, segmentQuery, description } = body

    if (!name || !channel) {
      return NextResponse.json({ error: 'Name and channel are required' }, { status: 400 })
    }

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      // Count matching leads for the segment
      const leadsCount = await db.lead.count({ where: { workspaceId } })

      const campaign = await db.campaign.create({
        data: {
          workspaceId,
          name,
          description: description || '',
          channel,
          templateBody: templateBody || '',
          segmentQuery: JSON.stringify(segmentQuery || {}),
          status: 'draft',
          stats: JSON.stringify({ totalLeads: leadsCount, sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 }),
        },
      })

      // Create notification
      await db.notification.create({
        data: {
          workspaceId,
          type: 'campaign',
          title: 'Nueva campaña creada',
          description: `Campaña "${name}" creada en modo borrador`,
        },
      })

      return NextResponse.json({ campaign }, { status: 201 })
    }

    // Supabase REST API fallback
    console.log('[Campaigns/POST] Prisma unreachable, using Supabase REST API fallback')
    const leadsCount = await count('leads', { workspaceId })

    const campaign = await createCampaign(workspaceId, {
      name,
      description: description || '',
      channel,
      templateBody: templateBody || '',
      segmentQuery: JSON.stringify(segmentQuery || {}),
      status: 'draft',
      stats: JSON.stringify({ totalLeads: leadsCount, sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 }),
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    // Create notification (non-blocking)
    await createNotification(workspaceId, {
      type: 'campaign',
      title: 'Nueva campaña creada',
      description: `Campaña "${name}" creada en modo borrador`,
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

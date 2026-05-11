import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findMany } from '@/lib/db-supabase'

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  try {
    await requireWorkspaceAccess(workspaceId)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    if (await isPrismaReachable()) {
      const campaigns = await db.campaign.findMany({
        where: { workspaceId },
        include: { _count: { select: { campaignMessages: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ campaigns })
    } else {
      const rows = await findMany('campaigns', { workspaceId }, { orderBy: 'createdAt', orderAsc: false })
      const campaigns = rows.map((row: any) => ({
        ...row,
        _count: { campaignMessages: 0 },
      }))
      return NextResponse.json({ campaigns })
    }
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }
    await requireWorkspaceAccess(body.workspaceId)
    const campaign = await db.campaign.create({
      data: {
        workspaceId: body.workspaceId,
        name: body.name,
        description: body.description || '',
        segmentQuery: JSON.stringify(body.segmentQuery || {}),
        channel: body.channel || 'whatsapp',
        templateBody: body.templateBody || '',
        status: body.status || 'draft',
        stats: JSON.stringify({ sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 }),
      },
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

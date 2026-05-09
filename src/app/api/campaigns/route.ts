import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  try {
    const campaigns = await db.campaign.findMany({
      where: { workspaceId },
      include: { _count: { select: { campaignMessages: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ campaigns })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  try {
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: { campaignMessages: { take: 50, orderBy: { createdAt: 'desc' } } },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    return NextResponse.json({ campaign })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  try {
    const body = await request.json()
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

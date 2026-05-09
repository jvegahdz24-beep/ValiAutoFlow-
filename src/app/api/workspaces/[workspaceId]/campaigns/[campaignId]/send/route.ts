import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

// POST - Execute/send campaign
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { workspaceId, campaignId } = await params
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId, workspaceId },
    })

    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (campaign.status === 'active') {
      return NextResponse.json({ error: 'Campaign already active' }, { status: 400 })
    }

    // Resolve segment to get contacts
    const segmentQuery = typeof campaign.segmentQuery === 'string' 
      ? JSON.parse(campaign.segmentQuery) 
      : campaign.segmentQuery

    // Build where clause from segment
    const where: any = { workspaceId }
    if (segmentQuery?.minScore) where.score = { gte: segmentQuery.minScore }
    if (segmentQuery?.status) where.status = segmentQuery.status

    const contacts = await db.contact.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true },
    })

    // Update campaign status to active
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: 'active', startedAt: new Date() },
    })

    // Create campaign messages for each contact (queued)
    const messageData = contacts.map(contact => ({
      campaignId,
      contactId: contact.id,
      status: 'pending',
    }))

    await db.campaignMessage.createMany({ data: messageData })

    // Process messages in batches (simulated for MVP - in production this goes to BullMQ)
    let sent = 0
    let failed = 0
    const batchSize = 10

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)
      for (const contact of batch) {
        try {
          // Personalize message
          const personalizedMsg = (campaign.templateBody || '')
            .replace(/\{\{name\}\}/g, contact.name || 'Hola')
            .replace(/\{\{phone\}\}/g, contact.phone || '')

          // In production: send via WhatsApp/Email/SMS here
          // For MVP: mark as sent
          await db.campaignMessage.updateMany({
            where: { campaignId, contactId: contact.id },
            data: { status: 'sent', sentAt: new Date() },
          })
          sent++
        } catch {
          await db.campaignMessage.updateMany({
            where: { campaignId, contactId: contact.id },
            data: { status: 'failed' },
          })
          failed++
        }
      }
    }

    // Update campaign stats and mark completed
    const stats = { totalLeads: contacts.length, sent, delivered: sent, opened: 0, clicked: 0, converted: 0, failed }
    await db.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        stats: JSON.stringify(stats),
      },
    })

    // Notification
    await db.notification.create({
      data: {
        workspaceId,
        type: 'campaign',
        title: 'Campaña completada',
        description: `"${campaign.name}": ${sent} enviados, ${failed} fallidos`,
      },
    })

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 })
  }
}

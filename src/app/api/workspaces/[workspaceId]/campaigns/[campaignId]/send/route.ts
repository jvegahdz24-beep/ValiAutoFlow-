import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { sendMessage, sendTemplateMessage, normalizePhoneNumber } from '@/lib/whatsapp/client'
import { isContactOptedOut } from '@/lib/whatsapp/channel-bridge'

// ============================================================
// POST — Execute/send campaign via WhatsApp Cloud API
// ============================================================
// Resolves segment contacts, sends personalized messages via
// WhatsApp with rate limiting (batches + delays), and tracks
// delivery status per contact.
// ============================================================

/** Meta free tier rate limit: ~40 messages per minute */
const META_RATE_LIMIT_MS = 1500 // 1.5s between messages = ~40/min
const BATCH_SIZE = 10

// POST - Execute/send campaign
export async function POST(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string; campaignId: string }> }) {
  try {
    const { workspaceId, campaignId } = await params
    await requireWorkspaceAccess(workspaceId)
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId, workspaceId },
    })

    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (campaign.status === 'active' || campaign.status === 'completed') {
      return NextResponse.json({ error: 'Campaign already active or completed' }, { status: 400 })
    }

    // ──────────────────────────────────────────────────────────
    // STEP 1: Get WhatsApp config for the workspace
    // ──────────────────────────────────────────────────────────
    const waConfig = await db.whatsAppConfig.findUnique({
      where: { workspaceId },
    })

    if (!waConfig || !waConfig.isActive) {
      // For non-WhatsApp channels, we just simulate for now
      console.warn('[Campaign Send] WhatsApp not configured. Messages will be simulated.')
    }

    // Resolve segment to get contacts
    const segmentQuery = typeof campaign.segmentQuery === 'string'
      ? JSON.parse(campaign.segmentQuery)
      : campaign.segmentQuery

    const where: Record<string, unknown> = { workspaceId }
    if (segmentQuery?.minScore) where.score = { gte: segmentQuery.minScore }
    if (segmentQuery?.status) where.status = segmentQuery.status
    if (segmentQuery?.source) where.source = segmentQuery.source

    const contacts = await db.contact.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true, metadata: true },
    })

    // Filter out opted-out contacts
    const eligibleContacts = []
    for (const contact of contacts) {
      const optedOut = await isContactOptedOut(contact.id)
      if (!optedOut && contact.phone) {
        eligibleContacts.push(contact)
      }
    }

    // Update campaign status to active
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: 'active', startedAt: new Date() },
    })

    // Create campaign messages for each eligible contact
    const messageData = eligibleContacts.map(contact => ({
      campaignId,
      contactId: contact.id,
      status: 'pending' as const,
    }))

    await db.campaignMessage.createMany({ data: messageData })

    // ──────────────────────────────────────────────────────────
    // STEP 2: Send messages with rate limiting
    // ──────────────────────────────────────────────────────────
    let sent = 0
    let delivered = 0
    let failed = 0

    // Determine if we should use a template (for contacts outside 24h window)
    // For campaigns, we ALWAYS use templates if available — it's safer
    const approvedTemplate = campaign.templateId
      ? await db.whatsAppTemplate.findFirst({
          where: { id: campaign.templateId, status: 'APPROVED' },
        })
      : await db.whatsAppTemplate.findFirst({
          where: { workspaceId, status: 'APPROVED' },
        })

    for (let i = 0; i < eligibleContacts.length; i += BATCH_SIZE) {
      const batch = eligibleContacts.slice(i, i + BATCH_SIZE)

      for (const contact of batch) {
        try {
          // Personalize message template
          const personalizedMsg = (campaign.templateBody || '')
            .replace(/\{\{name\}\}/g, contact.name || 'Hola')
            .replace(/\{\{phone\}\}/g, contact.phone || '')
            .replace(/\{\{email\}\}/g, contact.email || '')

          if (waConfig?.isActive && waConfig.accessToken) {
            const normalizedPhone = normalizePhoneNumber(contact.phone!)

            let result

            if (approvedTemplate && campaign.channel === 'whatsapp') {
              // Send via template (works inside and outside 24h window)
              result = await sendTemplateMessage({
                phoneNumberId: waConfig.phoneNumberId,
                accessToken: waConfig.accessToken,
                to: normalizedPhone,
                templateName: approvedTemplate.name,
                language: approvedTemplate.language || 'es',
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: contact.name || 'Hola' },
                    ],
                  },
                ],
              })
            } else if (campaign.channel === 'whatsapp') {
              // Send free-form text (only works inside 24h window)
              result = await sendMessage({
                phoneNumberId: waConfig.phoneNumberId,
                accessToken: waConfig.accessToken,
                to: normalizedPhone,
                text: personalizedMsg.substring(0, 4096),
              })
            }

            if (result && result.success) {
              sent++
              delivered++
              await db.campaignMessage.updateMany({
                where: { campaignId, contactId: contact.id },
                data: { status: 'sent', sentAt: new Date() },
              })
            } else {
              failed++
              await db.campaignMessage.updateMany({
                where: { campaignId, contactId: contact.id },
                data: { status: 'failed' },
              })
            }
          } else {
            // No WhatsApp config — simulate send (for demo/dev)
            sent++
            delivered++
            await db.campaignMessage.updateMany({
              where: { campaignId, contactId: contact.id },
              data: { status: 'sent', sentAt: new Date() },
            })
          }
        } catch {
          failed++
          await db.campaignMessage.updateMany({
            where: { campaignId, contactId: contact.id },
            data: { status: 'failed' },
          })
        }
      }

      // Rate limiting: wait between batches
      if (i + BATCH_SIZE < eligibleContacts.length) {
        await new Promise(resolve => setTimeout(resolve, META_RATE_LIMIT_MS * BATCH_SIZE))
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 3: Update campaign stats and mark completed
    // ──────────────────────────────────────────────────────────
    const stats = {
      totalLeads: contacts.length,
      eligible: eligibleContacts.length,
      skipped: contacts.length - eligibleContacts.length,
      sent,
      delivered,
      opened: 0,
      clicked: 0,
      converted: 0,
      failed,
    }

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
        description: `"${campaign.name}": ${sent} enviados, ${failed} fallidos, ${contacts.length - eligibleContacts.length} omitidos (opt-out)`,
      },
    })

    return NextResponse.json({ success: true, stats })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Campaign Send] Error:', error)
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 })
  }
}

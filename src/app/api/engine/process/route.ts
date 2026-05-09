// ============================================================
// ENGINE PROCESS — Main pipeline endpoint
// ============================================================
// Processes an inbound message through the 7 Carnales pipeline
// and sends Telegram notifications when human intervention is needed.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'
import { Orchestrator } from '@/lib/engine/orchestrator'
import { isConversationTakenOver, notifyHumanTakeoverNeeded, notifyHotLead } from '@/lib/telegram/cognitive-bridge'
import { sendWhatsAppMessage } from '@/lib/whatsapp/channel-bridge'
import { type LeadArchetype, type LeadTemperature } from '@/lib/engine/types'

export async function POST(request: NextRequest) {
  try {
    // ──────────────────────────────────────────────────────────
    // AUTH: Accept either user session OR internal API key
    // Webhooks call this route internally without a session cookie.
    // ──────────────────────────────────────────────────────────
    const internalApiKey = request.headers.get('x-internal-api-key')
    const isInternalCall = internalApiKey === process.env.INTERNAL_API_KEY

    if (!isInternalCall) {
      const session = await getServerSession()
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { conversationId, messageContent, workspaceId } = body

    if (!conversationId || !messageContent || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields: conversationId, messageContent, workspaceId' }, { status: 400 })
    }

    // ──────────────────────────────────────────────────────────
    // STEP 1: Check if conversation is under human control
    // If a human took over via Telegram, JHON should NOT respond
    // ──────────────────────────────────────────────────────────
    const takenOver = await isConversationTakenOver(workspaceId, conversationId)
    if (takenOver) {
      // Create inbound message but don't generate AI response
      await db.message.create({
        data: {
          conversationId,
          direction: 'INBOUND',
          content: messageContent,
          senderType: 'LEAD',
          status: 'DELIVERED',
        },
      })

      await db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      })

      return NextResponse.json({
        status: 'human_controlled',
        message: 'Conversación bajo control humano. JHON no responde.',
      })
    }

    // ──────────────────────────────────────────────────────────
    // STEP 2: Load conversation context
    // ──────────────────────────────────────────────────────────
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        lead: {
          include: {
            cognitiveStates: { orderBy: { updatedAt: 'desc' }, take: 1 },
            stateTransitions: { orderBy: { createdAt: 'desc' }, take: 10 },
            dealValueHistories: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // ──────────────────────────────────────────────────────────
    // STEP 3: Create inbound message
    // ──────────────────────────────────────────────────────────
    await db.message.create({
      data: {
        conversationId,
        direction: 'INBOUND',
        content: messageContent,
        senderType: 'LEAD',
        status: 'DELIVERED',
      },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 4: Load active policies
    // ──────────────────────────────────────────────────────────
    const activePolicies = await db.salesPolicy.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { priority: 'desc' },
    })

    const policyRules = activePolicies.map(p => ({
      id: p.id,
      type: p.ruleType,
      ruleType: p.ruleType,
      name: p.name,
      config: JSON.parse(p.config),
      priority: p.priority,
    }))

    // ──────────────────────────────────────────────────────────
    // STEP 5: Compute time since last contact
    // ──────────────────────────────────────────────────────────
    const lastInbound = conversation.messages.find(m => m.direction === 'INBOUND')
    const timeSinceLastContact = lastInbound
      ? (Date.now() - new Date(lastInbound.createdAt).getTime()) / 1000 / 60
      : 9999

    // ──────────────────────────────────────────────────────────
    // STEP 6: Run through the Orchestrator (7 Carnales Pipeline)
    // ──────────────────────────────────────────────────────────
    const orchestrator = new Orchestrator(policyRules)

    const pipelineResult = await orchestrator.processMessage({
      conversationId,
      messageContent,
      currentStage: (conversation.currentStage as 'EXPLORATION') || 'EXPLORATION',
      currentCognitiveState: conversation.lead?.cognitiveStates[0]
        ? {
            temperature: conversation.lead.cognitiveStates[0].temperature as LeadTemperature,
            archetype: conversation.lead.cognitiveStates[0].archetype as LeadArchetype,
            intentScore: conversation.lead.cognitiveStates[0].intentScore,
            churnRisk: conversation.lead.cognitiveStates[0].churnRisk,
            priority: conversation.lead.cognitiveStates[0].priority,
            historicalContext: JSON.parse(conversation.lead.cognitiveStates[0].historicalContext || '{}'),
          }
        : null,
      messages: conversation.messages.map(m => ({
        content: m.content,
        direction: m.direction,
        senderType: m.senderType,
        createdAt: new Date(m.createdAt),
      })),
      leadId: conversation.leadId || '',
      dealValue: conversation.lead?.dealValue || null,
      timeSinceLastContact,
      activePolicies: policyRules,
      workspaceId,
      stateTransitions: conversation.lead?.stateTransitions.map(t => ({
        fromStage: t.fromStage,
        toStage: t.toStage,
        trigger: t.trigger,
        createdAt: new Date(t.createdAt),
      })),
      dealValueHistory: conversation.lead?.dealValueHistories.map(h => ({
        previousValue: h.previousValue,
        newValue: h.newValue,
        reason: h.reason,
        createdAt: new Date(h.createdAt),
      })),
    })

    // ──────────────────────────────────────────────────────────
    // STEP 7: Create outbound message from JHON
    // ──────────────────────────────────────────────────────────
    const outboundMessage = await db.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        content: pipelineResult.responseSuggestion,
        senderType: 'AI',
        senderId: 'JHON',
        status: 'SENT',
        metadata: JSON.stringify({
          stage: pipelineResult.stage,
          cognitiveState: pipelineResult.cognitiveState,
          evaluation: pipelineResult.evaluation,
          validation: pipelineResult.validation,
        }),
      },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 8: Send message via the appropriate channel
    // ──────────────────────────────────────────────────────────
    if (conversation.channel === 'WHATSAPP') {
      sendWhatsAppMessage(workspaceId, conversationId, pipelineResult.responseSuggestion)
        .catch(err => console.error('[WhatsApp Bridge] Send error:', err))
    }

    // ──────────────────────────────────────────────────────────
    // STEP 9: Update conversation
    // ──────────────────────────────────────────────────────────
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        currentStage: pipelineResult.stage.stage,
        lastMessageAt: new Date(),
      },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 9: Update cognitive state
    // ──────────────────────────────────────────────────────────
    if (conversation.leadId) {
      await db.cognitiveState.upsert({
        where: {
          id: `${conversation.leadId}_${conversationId}`,
        },
        create: {
          id: `${conversation.leadId}_${conversationId}`,
          leadId: conversation.leadId,
          conversationId,
          temperature: pipelineResult.cognitiveState.temperature,
          archetype: pipelineResult.cognitiveState.archetype,
          intentScore: pipelineResult.cognitiveState.intentScore,
          churnRisk: pipelineResult.cognitiveState.churnRisk,
          priority: pipelineResult.cognitiveState.priority,
        },
        update: {
          temperature: pipelineResult.cognitiveState.temperature,
          archetype: pipelineResult.cognitiveState.archetype,
          intentScore: pipelineResult.cognitiveState.intentScore,
          churnRisk: pipelineResult.cognitiveState.churnRisk,
          priority: pipelineResult.cognitiveState.priority,
        },
      })

      // Track stage transition
      if (pipelineResult.stage.stage !== conversation.currentStage) {
        await db.stateTransition.create({
          data: {
            leadId: conversation.leadId,
            fromStage: conversation.currentStage,
            toStage: pipelineResult.stage.stage,
            trigger: pipelineResult.stage.triggerReason,
            context: JSON.stringify({ messageContent: messageContent.substring(0, 200) }),
          },
        })
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 10: TELEGRAM NOTIFICATION — Human-in-the-loop
    // If the pipeline detected escalation need, notify the owner
    // ──────────────────────────────────────────────────────────
    if (pipelineResult.escalateToHuman && conversation.leadId) {
      // Fire-and-forget notification
      notifyHumanTakeoverNeeded({
        workspaceId,
        conversationId,
        leadId: conversation.leadId,
        contactName: conversation.contact.name,
        reason: pipelineResult.escalationReason || 'El sistema requiere intervención humana',
        currentStage: pipelineResult.stage.stage,
        temperature: pipelineResult.cognitiveState.temperature,
        lastMessage: messageContent,
      }).catch(err => console.error('[Telegram Bridge] Notification error:', err))
    }

    // Also notify for hot leads (score > 70)
    if (
      conversation.leadId &&
      pipelineResult.cognitiveState.temperature === 'HOT' &&
      pipelineResult.cognitiveState.intentScore > 0.7
    ) {
      notifyHotLead({
        workspaceId,
        leadId: conversation.leadId,
        contactName: conversation.contact.name,
        score: pipelineResult.cognitiveState.priority,
        dealValue: conversation.lead?.dealValue || 0,
        currency: conversation.lead?.currency || 'USD',
        source: conversation.contact.source,
      }).catch(err => console.error('[Telegram Bridge] Hot lead notification error:', err))
    }

    // ──────────────────────────────────────────────────────────
    // RETURN PIPELINE RESULT
    // ──────────────────────────────────────────────────────────
    return NextResponse.json({
      message: outboundMessage,
      pipeline: {
        stage: pipelineResult.stage,
        routing: pipelineResult.routing,
        cognitiveState: pipelineResult.cognitiveState,
        responseSuggestion: pipelineResult.responseSuggestion,
        escalateToHuman: pipelineResult.escalateToHuman,
        escalationReason: pipelineResult.escalationReason,
        validation: pipelineResult.validation,
        evaluation: pipelineResult.evaluation,
      },
    })
  } catch (error) {
    console.error('[Engine Process] Error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

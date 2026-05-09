// ============================================================
// TELEGRAM COMMANDS — Real command handlers for ValiAutoFlow
// ============================================================
// Each command connects to the database and returns real data.
// The bot acts as a human-in-the-loop interface for the owner.
// ============================================================

import { db } from '@/lib/db'
import { type BotContext, type CommandResult, type DashboardStats } from './types'

// ============================================================
// /start — Welcome & registration
// ============================================================
export async function handleStart(ctx: BotContext): Promise<CommandResult> {
  const workspace = await db.workspace.findUnique({
    where: { id: ctx.workspaceId },
    include: { workspaceConfig: true },
  })

  const businessName = workspace?.workspaceConfig?.businessName || workspace?.name || 'ValiAutoFlow'

  return {
    text: `🤖 *${businessName} — Panel de Control*\n\n` +
      `Bienvenido al bot de control de tu sistema cognitivo comercial.\n\n` +
      `Comandos disponibles:\n` +
      `/ver — Ver conversaciones activas\n` +
      `/responder — Responder a un lead\n` +
      `/tomar_mando — Tomar control de una conversación\n` +
      `/soltar — Devolver conversación a JHON\n` +
      `/leads — Ver leads del día\n` +
      `/stats — Métricas del negocio\n` +
      `/campaña — Crear/enviar campaña\n` +
      `/campañas — Ver campañas activas\n` +
      `/config — Ver configuración\n` +
      `/help — Ayuda detallada`,
    parseMode: 'Markdown',
    newState: 'idle',
  }
}

// ============================================================
// /help — Detailed help
// ============================================================
export async function handleHelp(ctx: BotContext): Promise<CommandResult> {
  return {
    text:
      `📖 *Guía de Comandos*\n\n` +
      `🔍 *Observación:*\n` +
      `/ver — Lista conversaciones activas con último mensaje\n` +
      `/leads — Leads de hoy con temperatura y score\n` +
      `/stats — KPIs: leads, conversión, ingresos, ROI\n` +
      `/campañas — Campañas activas y su progreso\n\n` +
      `🎯 *Intervención:*\n` +
      `/responder — Enviar mensaje a un lead (JHON sugiere)\n` +
      `/tomar_mando — Tomar control total de una conversación\n` +
      `/soltar — Devolver conversación a JHON\n\n` +
      `📢 *Marketing:*\n` +
      `/campaña — Crear campaña rápida\n` +
      `/pausar — Pausar campaña activa\n\n` +
      `⚙️ *Sistema:*\n` +
      `/config — Ver configuración actual del negocio\n\n` +
      `_El bot usa JHON como asistente. Cuando tomas mando, JHON se retira y tú respondes directamente._`,
    parseMode: 'Markdown',
    newState: ctx.session.state,
  }
}

// ============================================================
// /ver — View active conversations
// ============================================================
export async function handleVer(ctx: BotContext): Promise<CommandResult> {
  const conversations = await db.conversation.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      status: 'ACTIVE',
    },
    include: {
      contact: true,
      lead: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 10,
  })

  if (conversations.length === 0) {
    return {
      text: '📭 No hay conversaciones activas ahora mismo. JHON está en espera.',
      newState: 'idle',
    }
  }

  const lines = [`📋 *Conversaciones Activas* (${conversations.length})\n`]

  for (const conv of conversations) {
    const lastMsg = conv.messages[0]
    const lead = conv.lead
    const tempEmoji = lead?.temperature === 'HOT' ? '🔴' : lead?.temperature === 'WARM' ? '🟡' : '🔵'
    const stageLabel = stageToEmoji(conv.currentStage)
    const preview = lastMsg ? truncate(lastMsg.content, 50) : 'Sin mensajes'

    lines.push(
      `${tempEmoji} *${conv.contact.name}* — ${stageLabel} ${conv.currentStage}\n` +
      `   💬 _${preview}_\n` +
      `   /responder\`${conv.id.slice(-6)}\` | /tomar_mando\`${conv.id.slice(-6)}\``
    )
  }

  return {
    text: lines.join('\n'),
    parseMode: 'Markdown',
    newState: 'idle',
  }
}

// ============================================================
// /responder — Respond to a lead (JHON suggests, human approves)
// ============================================================
export async function handleResponder(ctx: BotContext): Promise<CommandResult> {
  const args = ctx.command.args.trim()

  // If no conversation specified, show recent ones to pick
  if (!args) {
    return handleVer(ctx)
  }

  // Find conversation by partial ID match
  const conversation = await findConversationByPartialId(ctx.workspaceId, args)

  if (!conversation) {
    return {
      text: '❌ No encontré esa conversación. Usa /ver para ver las activas.',
      newState: 'idle',
    }
  }

  // Get last few messages for context
  const recentMessages = await db.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const lead = conversation.lead
  const contact = conversation.contact

  // Build context for JHON suggestion
  const contextLines = [
    `💬 *Conversación con ${contact.name}*\n`,
    `Etapa: ${stageToEmoji(conversation.currentStage)} ${conversation.currentStage}`,
    `Temperatura: ${lead?.temperature || 'N/A'} | Score: ${lead?.score || 0}`,
    '',
    '*Últimos mensajes:*',
  ]

  for (const msg of [...recentMessages].reverse()) {
    const who = msg.direction === 'INBOUND' ? '👤 Lead' : '🤖 JHON'
    contextLines.push(`${who}: ${truncate(msg.content, 80)}`)
  }

  contextLines.push('')
  contextLines.push('_Escribe tu respuesta directamente. JHON se retiró de esta conversación._')
  contextLines.push('_Usa /soltar para devolver el control a JHON._')

  return {
    text: contextLines.join('\n'),
    parseMode: 'Markdown',
    newState: 'responding',
    currentLeadId: lead?.id,
    currentConversationId: conversation.id,
  }
}

// ============================================================
// /tomar_mando — Take over a conversation (human-in-the-loop)
// ============================================================
export async function handleTomarMando(ctx: BotContext): Promise<CommandResult> {
  const args = ctx.command.args.trim()

  if (!args) {
    return {
      text: '⚠️ Especifica la conversación. Usa /ver para ver IDs.\nEjemplo: `/tomar_mando abc123`',
      parseMode: 'Markdown',
      newState: ctx.session.state,
    }
  }

  const conversation = await findConversationByPartialId(ctx.workspaceId, args)

  if (!conversation) {
    return {
      text: '❌ No encontré esa conversación. Usa /ver para ver las activas.',
      newState: 'idle',
    }
  }

  // Create audit log for takeover
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspaceId,
      action: 'TELEGRAM_TAKEOVER',
      resource: 'conversation',
      resourceId: conversation.id,
      details: JSON.stringify({
        chatId: ctx.chatId,
        contactName: conversation.contact.name,
        previousStage: conversation.currentStage,
      }),
      severity: 'WARNING',
    },
  })

  // Create notification in dashboard
  await db.notification.create({
    data: {
      workspaceId: ctx.workspaceId,
      type: 'alert',
      title: '🤖→👤 Control manual activado',
      description: `Has tomado control de la conversación con ${conversation.contact.name} desde Telegram. JHON se ha retirado.`,
      actionUrl: `/conversations/${conversation.id}`,
    },
  })

  const lead = conversation.lead
  const tempEmoji = lead?.temperature === 'HOT' ? '🔴' : lead?.temperature === 'WARM' ? '🟡' : '🔵'

  return {
    text:
      `⚡ *MODO MANUAL ACTIVADO*\n\n` +
      `Has tomado control de la conversación con *${conversation.contact.name}*.\n` +
      `${tempEmoji} Temperatura: ${lead?.temperature || 'N/A'} | Etapa: ${conversation.currentStage}\n\n` +
      `JHON se ha retirado. Tus mensajes se enviarán directamente al lead.\n\n` +
      `Comandos mientras tienes control:\n` +
      `• Escribe cualquier texto → Se envía como mensaje al lead\n` +
      `/soltar → Devolver control a JHON\n` +
      `/ver → Ver contexto de la conversación`,
    parseMode: 'Markdown',
    newState: 'taken_over',
    currentLeadId: lead?.id,
    currentConversationId: conversation.id,
  }
}

// ============================================================
// /soltar — Release conversation back to JHON
// ============================================================
export async function handleSoltar(ctx: BotContext): Promise<CommandResult> {
  if (ctx.session.state !== 'taken_over' && ctx.session.state !== 'responding') {
    return {
      text: 'ℹ️ No tienes control de ninguna conversación actualmente.',
      newState: 'idle',
    }
  }

  const conversationId = ctx.session.currentConversationId
  if (conversationId) {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    })

    if (conversation) {
      // Log the release
      await db.auditLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          action: 'TELEGRAM_RELEASE',
          resource: 'conversation',
          resourceId: conversationId,
          details: JSON.stringify({
            chatId: ctx.chatId,
            contactName: conversation.contact.name,
          }),
          severity: 'INFO',
        },
      })

      return {
        text:
          `✅ *Control devuelto a JHON*\n\n` +
          `La conversación con *${conversation.contact.name}* vuelve a estar bajo JHON.\n` +
          `JHON retomará desde la etapa actual: ${conversation.currentStage}.`,
        parseMode: 'Markdown',
        newState: 'idle',
        currentLeadId: null,
        currentConversationId: null,
      }
    }
  }

  return {
    text: '✅ Control devuelto a JHON.',
    newState: 'idle',
    currentLeadId: null,
    currentConversationId: null,
  }
}

// ============================================================
// /leads — Today's leads
// ============================================================
export async function handleLeads(ctx: BotContext): Promise<CommandResult> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const leads = await db.lead.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      createdAt: { gte: today },
    },
    include: {
      contact: true,
    },
    orderBy: { score: 'desc' },
    take: 15,
  })

  const totalToday = await db.lead.count({
    where: {
      workspaceId: ctx.workspaceId,
      createdAt: { gte: today },
    },
  })

  if (totalToday === 0) {
    return {
      text: '📭 No hay leads nuevos hoy. JHON sigue en espera.',
      newState: ctx.session.state,
    }
  }

  const lines = [`👥 *Leads de Hoy* (${totalToday})\n`]

  for (const lead of leads) {
    const tempEmoji = lead.temperature === 'HOT' ? '🔴' : lead.temperature === 'WARM' ? '🟡' : '🔵'
    const statusEmoji = lead.status === 'NEW' ? '🆕' : lead.status === 'QUALIFIED' ? '✅' : '🔄'
    lines.push(
      `${tempEmoji} ${statusEmoji} *${lead.contact.name}* — Score: ${lead.score}\n` +
      `   ${lead.temperature} | ${lead.status} | $${lead.dealValue.toLocaleString()} ${lead.currency}`
    )
  }

  return {
    text: lines.join('\n'),
    parseMode: 'Markdown',
    newState: ctx.session.state,
  }
}

// ============================================================
// /stats — Business KPIs
// ============================================================
export async function handleStats(ctx: BotContext): Promise<CommandResult> {
  const stats = await getDashboardStats(ctx.workspaceId)

  const conversionEmoji = stats.conversionRate > 20 ? '🟢' : stats.conversionRate > 10 ? '🟡' : '🔴'
  const revenueEmoji = stats.estimatedRevenue > 10000 ? '💰' : '💵'

  return {
    text:
      `📊 *Métricas del Negocio*\n\n` +
      `👥 Total Leads: *${stats.totalLeads}*\n` +
      `💬 Conversaciones Activas: *${stats.activeConversations}*\n` +
      `📅 Citas Agendadas: *${stats.appointments}*\n` +
      `${conversionEmoji} Tasa de Conversión: *${stats.conversionRate.toFixed(1)}%*\n` +
      `${revenueEmoji} Ingresos Estimados: *$${stats.estimatedRevenue.toLocaleString()}*\n` +
      `⏱️ Tiempo Respuesta Promedio: *${stats.avgResponseTime.toFixed(0)}min*\n` +
      `❌ Leads Perdidos: *${stats.lostLeads}*\n` +
      `📈 ROI Marketing: *${stats.marketingROI.toFixed(0)}%*`,
    parseMode: 'Markdown',
    newState: ctx.session.state,
  }
}

// ============================================================
// /campaña — Create or send a campaign
// ============================================================
export async function handleCampana(ctx: BotContext): Promise<CommandResult> {
  const args = ctx.command.args.trim()

  // /campaña enviar <id> — Send a campaign
  if (args.startsWith('enviar ')) {
    const partialId = args.replace('enviar ', '').trim()
    const campaign = await findCampaignByPartialId(ctx.workspaceId, partialId)

    if (!campaign) {
      return {
        text: '❌ No encontré esa campaña. Usa /campañas para verlas.',
        newState: ctx.session.state,
      }
    }

    if (campaign.status !== 'draft') {
      return {
        text: `⚠️ La campaña "${campaign.name}" está ${campaign.status}. Solo se pueden enviar borradores.`,
        newState: ctx.session.state,
      }
    }

    // Trigger send via API
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/workspaces/${ctx.workspaceId}/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        return {
          text:
            `📤 *Campaña Enviada*\n\n` +
            `"${campaign.name}" está siendo procesada.\n` +
            `Canal: ${campaign.channel}\n` +
            `Usa /campañas para ver el progreso.`,
          parseMode: 'Markdown',
          newState: ctx.session.state,
        }
      } else {
        return {
          text: '❌ Error al enviar la campaña. Revisa el dashboard para más detalles.',
          newState: ctx.session.state,
        }
      }
    } catch {
      return {
        text: '❌ Error de conexión al enviar la campaña.',
        newState: ctx.session.state,
      }
    }
  }

  // /campaña crear <nombre> | <mensaje> — Quick create
  if (args.startsWith('crear ')) {
    const parts = args.replace('crear ', '').split('|').map(p => p.trim())
    const name = parts[0] || 'Campaña Telegram'
    const message = parts[1] || 'Hola {{nombre}}, tenemos una oferta especial para ti.'

    const campaign = await db.campaign.create({
      data: {
        workspaceId: ctx.workspaceId,
        name,
        templateBody: message,
        channel: 'whatsapp',
        status: 'draft',
      },
    })

    return {
      text:
        `✅ *Campaña Creada*\n\n` +
        `Nombre: ${name}\n` +
        `Mensaje: _${truncate(message, 100)}_\n` +
        `Estado: Borrador\n\n` +
        `Para enviarla: /campaña enviar ${campaign.id.slice(-6)}`,
      parseMode: 'Markdown',
      newState: ctx.session.state,
    }
  }

  // Default: show usage
  return {
    text:
      `📢 *Comandos de Campaña*\n\n` +
      `/campaña crear Nombre | Mensaje — Crear campaña\n` +
      `/campaña enviar <id> — Enviar campaña\n` +
      `/campañas — Ver campañas existentes\n\n` +
      `Ejemplo:\n` +
      `/campaña crear Promo Mayo | Hola {{nombre}}, 20% de descuento esta semana`,
    parseMode: 'Markdown',
    newState: ctx.session.state,
  }
}

// ============================================================
// /campañas — List active campaigns
// ============================================================
export async function handleCampanas(ctx: BotContext): Promise<CommandResult> {
  const campaigns = await db.campaign.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  if (campaigns.length === 0) {
    return {
      text: '📭 No hay campañas. Usa /campaña crear para crear una.',
      newState: ctx.session.state,
    }
  }

  const lines = [`📢 *Campañas* (${campaigns.length})\n`]

  for (const c of campaigns) {
    const statusEmoji = c.status === 'active' ? '🟢' : c.status === 'draft' ? '⚪' : c.status === 'paused' ? '🟡' : '✅'
    const stats = safeParseJSON(c.stats) as Record<string, number> | null
    lines.push(
      `${statusEmoji} *${c.name}* — ${c.status}\n` +
      `   Canal: ${c.channel} | Enviados: ${stats?.sent || 0}/${stats?.totalLeads || 0}\n` +
      `   /campaña enviar ${c.id.slice(-6)}`
    )
  }

  return {
    text: lines.join('\n'),
    parseMode: 'Markdown',
    newState: ctx.session.state,
  }
}

// ============================================================
// /pausar — Pause a campaign
// ============================================================
export async function handlePausar(ctx: BotContext): Promise<CommandResult> {
  const args = ctx.command.args.trim()

  if (!args) {
    return {
      text: '⚠️ Especifica la campaña. Usa /campañas para ver IDs.\nEjemplo: `/pausar abc123`',
      parseMode: 'Markdown',
      newState: ctx.session.state,
    }
  }

  const campaign = await findCampaignByPartialId(ctx.workspaceId, args)

  if (!campaign) {
    return {
      text: '❌ No encontré esa campaña.',
      newState: ctx.session.state,
    }
  }

  if (campaign.status !== 'active') {
    return {
      text: `⚠️ La campaña "${campaign.name}" no está activa (estado: ${campaign.status}).`,
      newState: ctx.session.state,
    }
  }

  await db.campaign.update({
    where: { id: campaign.id },
    data: { status: 'paused' },
  })

  return {
    text: `⏸️ Campaña "${campaign.name}" pausada. Usa /campaña enviar ${campaign.id.slice(-6)} para reanudar.`,
    newState: ctx.session.state,
  }
}

// ============================================================
// /config — View current configuration
// ============================================================
export async function handleConfig(ctx: BotContext): Promise<CommandResult> {
  const config = await db.workspaceConfig.findUnique({
    where: { workspaceId: ctx.workspaceId },
  })

  if (!config) {
    return {
      text: '⚠️ No hay configuración. Usa el ConfigWizard en el dashboard.',
      newState: ctx.session.state,
    }
  }

  const schedule = safeParseJSON(config.schedule) as Record<string, unknown> | null
  const channels = safeParseJSON(config.channels) as Record<string, boolean> | null
  const products = safeParseJSON(config.products) as Array<Record<string, unknown>> | null
  const policies = safeParseJSON(config.policies) as Record<string, unknown> | null

  const channelList = channels
    ? Object.entries(channels).filter(([, v]) => v).map(([k]) => k).join(', ') || 'Ninguno'
    : 'No configurado'

  const productNames = products?.map(p => p.name as string).join(', ') || 'Ninguno'

  return {
    text:
      `⚙️ *Configuración de ${config.businessName}*\n\n` +
      `🏢 Tipo: ${config.businessType}\n` +
      `📅 Zona: ${(schedule as Record<string, string>)?.timezone || 'No configurada'}\n` +
      `📦 Productos: ${productNames}\n` +
      `📡 Canales: ${channelList}\n` +
      `🔒 Políticas: ${policies ? 'Configuradas' : 'Por defecto'}\n` +
      `✅ Activo: ${config.isActive ? 'Sí' : 'No'}`,
    parseMode: 'Markdown',
    newState: ctx.session.state,
  }
}

// ============================================================
// Handle free-text message when in TAKEN_OVER or RESPONDING state
// ============================================================
export async function handleFreeText(ctx: BotContext, text: string): Promise<CommandResult> {
  if (ctx.session.state === 'taken_over' && ctx.session.currentConversationId) {
    // Human is directly controlling the conversation — create message
    const conversationId = ctx.session.currentConversationId

    await db.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        content: text,
        senderType: 'HUMAN',
        status: 'SENT',
      },
    })

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    return {
      text: '✅ Mensaje enviado al lead.',
      newState: 'taken_over',
    }
  }

  if (ctx.session.state === 'responding' && ctx.session.currentConversationId) {
    // Human reviews and sends (one-time response, then back to idle)
    const conversationId = ctx.session.currentConversationId

    await db.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        content: text,
        senderType: 'HUMAN',
        status: 'SENT',
      },
    })

    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    return {
      text: '✅ Mensaje enviado. JHON retoma la conversación.',
      newState: 'idle',
      currentLeadId: null,
      currentConversationId: null,
    }
  }

  // Unknown state — suggest commands
  return {
    text: '🤔 No estoy en una conversación activa. Usa /ver para ver conversaciones o /help para ver comandos.',
    newState: 'idle',
  }
}

// ============================================================
// HELPERS
// ============================================================

function stageToEmoji(stage: string): string {
  const map: Record<string, string> = {
    EXPLORATION: '🔍',
    INTEREST: '💡',
    INTENT: '🎯',
    OBJECTION: '🛡️',
    CLOSING: '🤝',
    FOLLOW_UP: '🔄',
  }
  return map[stage] || '❓'
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}

function safeParseJSON(str: string): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

async function findConversationByPartialId(workspaceId: string, partialId: string) {
  // Try exact match first
  let conversation = await db.conversation.findFirst({
    where: { id: partialId, workspaceId },
    include: { contact: true, lead: true },
  })

  // Try partial match (last 6 chars)
  if (!conversation && partialId.length >= 4) {
    conversation = await db.conversation.findFirst({
      where: {
        workspaceId,
        id: { endsWith: partialId },
      },
      include: { contact: true, lead: true },
    })
  }

  return conversation
}

async function findCampaignByPartialId(workspaceId: string, partialId: string) {
  let campaign = await db.campaign.findFirst({
    where: { id: partialId, workspaceId },
  })

  if (!campaign && partialId.length >= 4) {
    campaign = await db.campaign.findFirst({
      where: {
        workspaceId,
        id: { endsWith: partialId },
      },
    })
  }

  return campaign
}

async function getDashboardStats(workspaceId: string): Promise<DashboardStats> {
  const [
    totalLeads,
    activeConversations,
    appointments,
    qualifiedLeads,
    lostLeads,
    leads,
    campaigns,
  ] = await Promise.all([
    db.lead.count({ where: { workspaceId } }),
    db.conversation.count({ where: { workspaceId, status: 'ACTIVE' } }),
    db.calendarEvent.count({ where: { workspaceId, status: 'scheduled' } }),
    db.lead.count({ where: { workspaceId, status: { in: ['QUALIFIED', 'WON'] } } }),
    db.lead.count({ where: { workspaceId, status: 'LOST' } }),
    db.lead.findMany({
      where: { workspaceId },
      select: { dealValue: true, currency: true },
    }),
    db.campaign.findMany({
      where: { workspaceId },
      select: { stats: true },
    }),
  ])

  const estimatedRevenue = leads.reduce((sum, l) => sum + l.dealValue, 0)
  const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0

  // Marketing ROI: sum of converted from campaign stats
  let totalSpent = 0
  let totalConverted = 0
  for (const c of campaigns) {
    const stats = safeParseJSON(c.stats) as Record<string, number> | null
    totalSpent += stats?.sent || 0
    totalConverted += stats?.converted || 0
  }
  const marketingROI = totalSpent > 0 ? (totalConverted / totalSpent) * 100 : 0

  return {
    totalLeads,
    activeConversations,
    appointments,
    conversionRate,
    estimatedRevenue,
    avgResponseTime: 12, // Simulated — in production, compute from message timestamps
    lostLeads,
    marketingROI,
  }
}

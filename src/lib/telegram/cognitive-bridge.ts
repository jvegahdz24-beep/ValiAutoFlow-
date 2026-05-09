// ============================================================
// COGNITIVE BRIDGE — JHON ↔ Telegram Human-in-the-Loop
// ============================================================
// When the orchestrator detects escalation needs, this module
// sends proactive notifications to the owner via Telegram.
// This is the real "human-in-the-loop" implementation.
// ============================================================

import { db } from '@/lib/db'
import { sendTelegramMessage } from './bot'
import { type SessionState } from './types'

// ============================================================
// Proactive notification from JHON to the owner
// ============================================================
export async function notifyHumanTakeoverNeeded(params: {
  workspaceId: string
  conversationId: string
  leadId: string
  contactName: string
  reason: string
  currentStage: string
  temperature: string
  lastMessage: string
}): Promise<boolean> {
  const { workspaceId, conversationId, leadId, contactName, reason, currentStage, temperature, lastMessage } = params

  // Get active bot config
  const botConfig = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (!botConfig || !botConfig.isActive) return false

  // Get all authorized sessions
  const sessions = await db.telegramBotSession.findMany({
    where: { workspaceId },
  })

  if (sessions.length === 0) return false

  const tempEmoji = temperature === 'HOT' ? '🔴' : temperature === 'WARM' ? '🟡' : '🔵'

  const message =
    `🚨 *INTERVENCIÓN HUMANA NECESARIA*\n\n` +
    `${tempEmoji} *${contactName}* — Etapa: ${currentStage}\n` +
    `📋 Razón: ${reason}\n\n` +
    `💬 Último mensaje:\n_"${lastMessage.substring(0, 150)}"_\n\n` +
    `Comandos:\n` +
    `/tomar_mando\`${conversationId.slice(-6)}\` — Tomar control\n` +
    `/responder\`${conversationId.slice(-6)}\` — Ver contexto y responder`

  // Send to all authorized sessions
  let sent = false
  for (const session of sessions) {
    const success = await sendTelegramMessage(
      botConfig.botToken,
      session.chatId,
      message,
      'Markdown'
    )
    if (success) sent = true
  }

  // Log the notification
  if (sent) {
    await db.notification.create({
      data: {
        workspaceId,
        type: 'alert',
        title: `🤖 JHON solicita intervención: ${contactName}`,
        description: reason,
        actionUrl: `/conversations/${conversationId}`,
      },
    })
  }

  return sent
}

// ============================================================
// Notify about hot lead entering the system
// ============================================================
export async function notifyHotLead(params: {
  workspaceId: string
  leadId: string
  contactName: string
  score: number
  dealValue: number
  currency: string
  source: string
}): Promise<boolean> {
  const { workspaceId, leadId, contactName, score, dealValue, currency, source } = params

  const botConfig = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (!botConfig || !botConfig.isActive) return false

  const sessions = await db.telegramBotSession.findMany({
    where: { workspaceId },
  })

  if (sessions.length === 0) return false

  const message =
    `🔥 *LEAD CALIENTE DETECTADO*\n\n` +
    `👤 *${contactName}*\n` +
    `📊 Score: ${score} | 💰 $${dealValue.toLocaleString()} ${currency}\n` +
    `📡 Fuente: ${source}\n\n` +
    `/ver — Ver conversaciones`

  let sent = false
  for (const session of sessions) {
    const success = await sendTelegramMessage(botConfig.botToken, session.chatId, message, 'Markdown')
    if (success) sent = true
  }

  return sent
}

// ============================================================
// Notify about deal closed/won
// ============================================================
export async function notifyDealWon(params: {
  workspaceId: string
  dealTitle: string
  dealValue: number
  currency: string
  contactName: string
}): Promise<boolean> {
  const { workspaceId, dealTitle, dealValue, currency, contactName } = params

  const botConfig = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (!botConfig || !botConfig.isActive) return false

  const sessions = await db.telegramBotSession.findMany({
    where: { workspaceId },
  })

  if (sessions.length === 0) return false

  const message =
    `🎉 *¡DEAL GANADO!*\n\n` +
    `🤝 *${contactName}*\n` +
    `💼 ${dealTitle}\n` +
    `💰 $${dealValue.toLocaleString()} ${currency}\n\n` +
    `/stats — Ver métricas actualizadas`

  let sent = false
  for (const session of sessions) {
    const success = await sendTelegramMessage(botConfig.botToken, session.chatId, message, 'Markdown')
    if (success) sent = true
  }

  return sent
}

// ============================================================
// Notify about campaign completion
// ============================================================
export async function notifyCampaignComplete(params: {
  workspaceId: string
  campaignName: string
  totalSent: number
  totalDelivered: number
  totalConverted: number
}): Promise<boolean> {
  const { workspaceId, campaignName, totalSent, totalDelivered, totalConverted } = params

  const botConfig = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (!botConfig || !botConfig.isActive) return false

  const sessions = await db.telegramBotSession.findMany({
    where: { workspaceId },
  })

  if (sessions.length === 0) return false

  const convRate = totalDelivered > 0 ? ((totalConverted / totalDelivered) * 100).toFixed(1) : '0'

  const message =
    `✅ *Campaña Completada*\n\n` +
    `📢 ${campaignName}\n` +
    `📤 Enviados: ${totalSent}\n` +
    `📬 Entregados: ${totalDelivered}\n` +
    `🎯 Conversiones: ${totalConverted} (${convRate}%)\n\n` +
    `/campañas — Ver todas las campañas`

  let sent = false
  for (const session of sessions) {
    const success = await sendTelegramMessage(botConfig.botToken, session.chatId, message, 'Markdown')
    if (success) sent = true
  }

  return sent
}

// ============================================================
// Daily summary notification (can be triggered by cron)
// ============================================================
export async function sendDailySummary(workspaceId: string): Promise<boolean> {
  const botConfig = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (!botConfig || !botConfig.isActive) return false

  const sessions = await db.telegramBotSession.findMany({
    where: { workspaceId },
  })

  if (sessions.length === 0) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    newLeads,
    activeConversations,
    dealsWon,
    campaignsActive,
    appointmentsToday,
  ] = await Promise.all([
    db.lead.count({ where: { workspaceId, createdAt: { gte: today } } }),
    db.conversation.count({ where: { workspaceId, status: 'ACTIVE' } }),
    db.lead.count({ where: { workspaceId, status: 'WON', updatedAt: { gte: today } } }),
    db.campaign.count({ where: { workspaceId, status: 'active' } }),
    db.calendarEvent.count({ where: { workspaceId, status: 'scheduled', startTime: { gte: today } } }),
  ])

  const message =
    `📅 *Resumen Diario — ${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}*\n\n` +
    `🆕 Leads nuevos: ${newLeads}\n` +
    `💬 Conversaciones activas: ${activeConversations}\n` +
    `🤝 Deals ganados: ${dealsWon}\n` +
    `📢 Campañas activas: ${campaignsActive}\n` +
    `📅 Citas hoy: ${appointmentsToday}\n\n` +
    `/stats — Métricas completas`

  let sent = false
  for (const session of sessions) {
    const success = await sendTelegramMessage(botConfig.botToken, session.chatId, message, 'Markdown')
    if (success) sent = true
  }

  return sent
}

// ============================================================
// Check if a conversation has human takeover active
// (Called by the engine before JHON responds)
// ============================================================
export async function isConversationTakenOver(
  workspaceId: string,
  conversationId: string
): Promise<boolean> {
  const session = await db.telegramBotSession.findFirst({
    where: {
      workspaceId,
      currentConversationId: conversationId,
      state: 'taken_over' as SessionState,
    },
  })

  return !!session
}

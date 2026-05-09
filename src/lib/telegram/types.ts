// ============================================================
// Telegram Bot Types — Shared type definitions
// ============================================================

export type BotCommandName =
  | '/start'
  | '/help'
  | '/ver'
  | '/responder'
  | '/tomar_mando'
  | '/soltar'
  | '/leads'
  | '/stats'
  | '/campaña'
  | '/campañas'
  | '/pausar'
  | '/config'

export type SessionState =
  | 'idle'
  | 'viewing_lead'
  | 'responding'
  | 'commanding'
  | 'taken_over'

export interface BotContext {
  workspaceId: string
  chatId: string
  session: {
    state: SessionState
    currentLeadId?: string | null
    currentConversationId?: string | null
    lastCommand?: string | null
  }
  command: {
    name: BotCommandName
    args: string
  }
}

export interface CommandResult {
  text: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  replyMarkup?: Record<string, unknown>
  newState?: SessionState
  currentLeadId?: string | null
  currentConversationId?: string | null
}

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    date: number
    text?: string
    entities?: Array<{
      offset: number
      length: number
      type: string
    }>
  }
  callback_query?: {
    id: string
    from: {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }
    message?: {
      chat: {
        id: number
      }
    }
    data?: string
  }
}

export interface DashboardStats {
  totalLeads: number
  activeConversations: number
  appointments: number
  conversionRate: number
  estimatedRevenue: number
  avgResponseTime: number
  lostLeads: number
  marketingROI: number
}

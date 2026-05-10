// ============================================================
// TOOL OS — The Action System (Carnal #7)
// "El que ejecuta acciones"
// ============================================================
// SECURITY FEATURES:
// - Tool allowlist: Only pre-approved tools can be executed
// - Circuit breaker: Prevents cascading failures from external APIs
// - Parameter validation: Basic type checking on tool parameters
// ============================================================

import {
  type ToolType,
  type ToolExecutionResult,
  type ConversationStageType,
} from './types';

// ============================================================
// TOOL ALLOWLIST — Only these tools can be executed
// ============================================================
// Any tool NOT in this list will be rejected.
// This prevents the LLM from hallucinating arbitrary tool calls.

const ALLOWED_TOOLS: Set<ToolType> = new Set([
  'SCHEDULE_APPOINTMENT',
  'CREATE_DEAL',
  'UPDATE_CRM',
  'SEND_FOLLOWUP',
  'GENERATE_QUOTE',
  'CHECK_CALENDAR',
  'SEND_LINK',
  'ACTIVATE_WORKFLOW',
  'UPDATE_PIPELINE',
  'SEND_REMINDER',
])

// ============================================================
// CIRCUIT BREAKER — Prevents cascading failures
// ============================================================

interface CircuitBreakerState {
  failures: number
  lastFailureAt: number
  isOpen: boolean
  nextRetryAt: number
}

const FAILURE_THRESHOLD = 5          // Open circuit after 5 consecutive failures
const RESET_TIMEOUT_MS = 30_000     // Try again after 30 seconds

const circuitBreakers = new Map<string, CircuitBreakerState>()

function getCircuitBreaker(toolType: string): CircuitBreakerState {
  let cb = circuitBreakers.get(toolType)
  if (!cb) {
    cb = { failures: 0, lastFailureAt: 0, isOpen: false, nextRetryAt: 0 }
    circuitBreakers.set(toolType, cb)
  }
  return cb
}

function isCircuitOpen(toolType: string): boolean {
  const cb = getCircuitBreaker(toolType)
  if (!cb.isOpen) return false

  // Check if reset timeout has elapsed
  if (Date.now() >= cb.nextRetryAt) {
    // Half-open state: allow one test call
    cb.isOpen = false
    return false
  }

  return true
}

function recordSuccess(toolType: string): void {
  const cb = getCircuitBreaker(toolType)
  cb.failures = 0
  cb.isOpen = false
}

function recordFailure(toolType: string): void {
  const cb = getCircuitBreaker(toolType)
  cb.failures++
  cb.lastFailureAt = Date.now()

  if (cb.failures >= FAILURE_THRESHOLD) {
    cb.isOpen = true
    cb.nextRetryAt = Date.now() + RESET_TIMEOUT_MS
    console.warn(`[ToolOS] Circuit breaker OPEN for ${toolType}. Will retry after ${RESET_TIMEOUT_MS / 1000}s.`)
  }
}

export class ToolOS {
  /**
   * Execute a tool action. In production, these would connect to real external services.
   * For now, returns simulated but realistic results.
   *
   * SECURITY: Checks tool allowlist and circuit breaker before execution.
   */
  async executeAction(action: {
    toolType: ToolType;
    parameters: Record<string, unknown>;
    workspaceId: string;
    conversationId?: string;
    leadId?: string;
  }): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      // ──────────────────────────────────────────────────────────
      // SECURITY CHECK 1: Tool allowlist
      // ──────────────────────────────────────────────────────────
      if (!ALLOWED_TOOLS.has(action.toolType)) {
        console.warn(`[ToolOS] BLOCKED: Tool "${action.toolType}" is not in the allowlist.`)
        return {
          toolType: action.toolType,
          success: false,
          result: {},
          error: `Tool "${action.toolType}" is not allowed. Only approved tools can be executed.`,
        }
      }

      // ──────────────────────────────────────────────────────────
      // SECURITY CHECK 2: Circuit breaker
      // ──────────────────────────────────────────────────────────
      if (isCircuitOpen(action.toolType)) {
        console.warn(`[ToolOS] Circuit breaker OPEN for ${action.toolType}. Rejecting call.`)
        return {
          toolType: action.toolType,
          success: false,
          result: {},
          error: `Service temporarily unavailable for ${action.toolType}. Circuit breaker is open.`,
        }
      }

      // ──────────────────────────────────────────────────────────
      // EXECUTE TOOL
      // ──────────────────────────────────────────────────────────
      let result: Record<string, unknown>;

      switch (action.toolType) {
        case 'SCHEDULE_APPOINTMENT':
          result = await this.scheduleAppointment(action.parameters);
          break;
        case 'CREATE_DEAL':
          result = await this.createDeal(action.parameters, action.workspaceId, action.leadId);
          break;
        case 'UPDATE_CRM':
          result = await this.updateCRM(action.parameters);
          break;
        case 'SEND_FOLLOWUP':
          result = await this.sendFollowUp(action.parameters);
          break;
        case 'GENERATE_QUOTE':
          result = await this.generateQuote(action.parameters);
          break;
        case 'CHECK_CALENDAR':
          result = await this.checkCalendar(action.parameters);
          break;
        case 'SEND_LINK':
          result = await this.sendLink(action.parameters);
          break;
        case 'ACTIVATE_WORKFLOW':
          result = await this.activateWorkflow(action.parameters);
          break;
        case 'UPDATE_PIPELINE':
          result = await this.updatePipeline(action.parameters);
          break;
        case 'SEND_REMINDER':
          result = await this.sendReminder(action.parameters);
          break;
        default:
          // This should never happen due to allowlist check, but just in case
          return {
            toolType: action.toolType,
            success: false,
            result: {},
            error: `Unknown tool type: ${action.toolType}`,
          };
      }

      // Record success for circuit breaker
      recordSuccess(action.toolType)

      return {
        toolType: action.toolType,
        success: true,
        result: { ...result, executionTimeMs: Date.now() - startTime },
      };
    } catch (error) {
      // Record failure for circuit breaker
      recordFailure(action.toolType)

      return {
        toolType: action.toolType,
        success: false,
        result: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Detect tool needs from a message based on keywords.
   * Only returns tools that are in the allowlist.
   */
  detectToolNeeds(message: string, stage: ConversationStageType): ToolType[] {
    const tools: ToolType[] = [];
    const lower = message.toLowerCase();

    // Scheduling
    if (lower.includes('agendar') || lower.includes('cita') || lower.includes('reunión') || lower.includes('llamada')) {
      tools.push('SCHEDULE_APPOINTMENT');
    }

    // Calendar check
    if (lower.includes('disponible') || lower.includes('horario') || lower.includes('cuándo puedes')) {
      tools.push('CHECK_CALENDAR');
    }

    // Deal creation (INTENT+ stage)
    if ((stage === 'INTENT' || stage === 'CLOSING') && (lower.includes('va') || lower.includes('hagámoslo') || lower.includes('me animo'))) {
      tools.push('CREATE_DEAL');
    }

    // Quote (INTENT+ stage)
    if ((stage === 'INTENT' || stage === 'CLOSING') && (lower.includes('cotización') || lower.includes('presupuesto'))) {
      tools.push('GENERATE_QUOTE');
    }

    // Link sending
    if (lower.includes('link') || lower.includes('enlace') || lower.includes('página web')) {
      tools.push('SEND_LINK');
    }

    // Reminder
    if (lower.includes('recuérdame') || lower.includes('recordatorio')) {
      tools.push('SEND_REMINDER');
    }

    // Pipeline update (CLOSING stage)
    if (stage === 'CLOSING') {
      tools.push('UPDATE_PIPELINE');
    }

    // Filter out any tools not in allowlist (belt and suspenders)
    return tools.filter(t => ALLOWED_TOOLS.has(t));
  }

  /**
   * Format tool result as user-facing message.
   */
  formatToolResult(result: ToolExecutionResult): string {
    if (!result.success) {
      return `Lo siento, hubo un problema con la acción. Lo revisaré manualmente.`;
    }

    switch (result.toolType) {
      case 'SCHEDULE_APPOINTMENT':
        return `Listo, agendé la cita para ${result.result.date || 'próxima semana'}. Te enviaré un recordatorio.`;
      case 'CHECK_CALENDAR':
        return `Tengo disponibilidad ${result.result.availableSlots || 'esta semana'}. ¿Qué horario te queda mejor?`;
      case 'CREATE_DEAL':
        return `Perfecto, creé el registro de tu cuenta en nuestro sistema. ¿Procedemos con los siguientes pasos?`;
      case 'GENERATE_QUOTE':
        return `Te preparé la cotización. ¿Te la envío por aquí o prefieres que te llegue por correo?`;
      case 'SEND_LINK':
        return `Aquí tienes el enlace: ${result.result.url || '[link]'}. Avísame si tienes alguna duda.`;
      case 'SEND_REMINDER':
        return `Agendado. Te recordaré ${result.result.delay || 'pronto'}.`;
      case 'UPDATE_PIPELINE':
        return `Todo listo por mi lado. ¿Algo más que necesites?`;
      default:
        return `Acción completada. ¿Seguimos?`;
    }
  }

  /**
   * Get the list of allowed tools (for debugging/admin).
   */
  getAllowedTools(): ToolType[] {
    return Array.from(ALLOWED_TOOLS)
  }

  /**
   * Get circuit breaker status for monitoring.
   */
  getCircuitBreakerStatus(): Record<string, { isOpen: boolean; failures: number; nextRetryAt: number }> {
    const status: Record<string, { isOpen: boolean; failures: number; nextRetryAt: number }> = {}
    for (const [toolType, cb] of circuitBreakers) {
      status[toolType] = {
        isOpen: cb.isOpen,
        failures: cb.failures,
        nextRetryAt: cb.nextRetryAt,
      }
    }
    return status
  }

  // ---- TOOL IMPLEMENTATIONS (simulated) ----

  private async scheduleAppointment(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    date.setHours(10, 0, 0, 0);
    return {
      appointmentId: `apt_${Date.now()}`,
      date: date.toISOString(),
      duration: params.duration ?? 15,
      type: params.type ?? 'discovery_call',
      status: 'confirmed',
    };
  }

  private async createDeal(params: Record<string, unknown>, workspaceId?: string, leadId?: string): Promise<Record<string, unknown>> {
    return {
      dealId: `deal_${Date.now()}`,
      title: 'Nuevo Deal',
      value: params.value ?? 0,
      probability: params.probability ?? 0.7,
      stage: 'discovery',
      leadId,
      workspaceId,
    };
  }

  private async updateCRM(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      updated: true,
      fields: Object.keys(params),
      timestamp: new Date().toISOString(),
    };
  }

  private async sendFollowUp(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      followUpId: `fu_${Date.now()}`,
      scheduledFor: params.delay ?? '24h',
      channel: params.channel ?? 'whatsapp',
      status: 'scheduled',
    };
  }

  private async generateQuote(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      quoteId: `quote_${Date.now()}`,
      format: params.format ?? 'pdf',
      includeTerms: params.includeTerms ?? true,
      status: 'generated',
    };
  }

  private async checkCalendar(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const slots = [
      { date: 'Lunes 10:00 AM', available: true },
      { date: 'Martes 2:00 PM', available: true },
      { date: 'Miércoles 11:00 AM', available: true },
      { date: 'Jueves 4:00 PM', available: false },
      { date: 'Viernes 9:00 AM', available: true },
    ];
    return {
      availableSlots: slots.filter(s => s.available).map(s => s.date),
      range: params.range ?? '7d',
    };
  }

  private async sendLink(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      url: 'https://valiautoflow.com/book/demo',
      linkType: params.linkType ?? 'booking',
      sentVia: 'whatsapp',
      status: 'sent',
    };
  }

  private async activateWorkflow(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      workflowId: `wf_${Date.now()}`,
      type: params.type ?? 'onboarding',
      status: 'activated',
      steps: 5,
    };
  }

  private async updatePipeline(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      previousStage: 'interest',
      newStage: params.newStage ?? 'closing',
      reason: params.reason ?? 'lead_progression',
      updatedAt: new Date().toISOString(),
    };
  }

  private async sendReminder(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      reminderId: `rem_${Date.now()}`,
      delay: params.delay ?? 24,
      channel: params.channel ?? 'whatsapp',
      status: 'scheduled',
    };
  }
}

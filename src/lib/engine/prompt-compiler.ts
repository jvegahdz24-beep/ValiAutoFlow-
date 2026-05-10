// ============================================================
// PROMPT COMPILER — Dynamic Business-Aware Prompt Builder
// Injects business config, custom questions, policies, and history
// into the JHON/MARK master prompts.
// ============================================================

import {
  type PromptContext,
  type ConversationStageType,
  type LeadArchetype,
  type LeadTemperature,
  type JHONConfig,
} from './types';
import { type BusinessConfig } from './jhon';
import { sanitizeForPrompt, wrapUserContent } from '@/lib/security';

const DEFAULT_JHON: JHONConfig = {
  neverSellBeforeDiagnose: true,
  neverCloseWithoutLossAwareness: true,
  oneIdeaPerMessage: true,
  shortDirectedConversation: true,
  consultativeNotAggressive: true,
  showCostOfInaction: true,
};

export class PromptCompiler {
  private _config: JHONConfig;
  private jhonMasterPrompt: string;
  private markMasterPrompt: string;

  /** Access the current JHON configuration */
  get config() { return this._config; }

  constructor(config?: Partial<JHONConfig>, jhonMasterPrompt?: string, markMasterPrompt?: string) {
    this._config = { ...DEFAULT_JHON, ...config };
    this.jhonMasterPrompt = jhonMasterPrompt || '';
    this.markMasterPrompt = markMasterPrompt || '';
  }

  /**
   * Set the JHON master prompt section (from JHONAgent.getMasterPromptSection()).
   */
  setJHONMasterPrompt(prompt: string) {
    this.jhonMasterPrompt = prompt;
  }

  /**
   * Set the MARK master prompt section (from MarketingAgent.getMasterPromptSection()).
   */
  setMARKMasterPrompt(prompt: string) {
    this.markMasterPrompt = prompt;
  }

  /**
   * Compile a complete system prompt for JHON with business config injection.
   * This is the main method called by the Orchestrator.
   */
  compile(context: PromptContext, businessConfig?: BusinessConfig, answeredQuestions?: string[]): string {
    const blocks = [
      // 1. JHON Master Prompt (immutable base)
      this.jhonMasterPrompt || this.buildFallbackJHONPrompt(),

      // 2. Business configuration (dynamic per workspace)
      this.buildBusinessConfigBlock(businessConfig),

      // 3. Loss formula (from business config)
      this.buildLossFormulaBlock(businessConfig),

      // 4. Pending custom questions (to weave into conversation)
      this.buildPendingQuestionsBlock(businessConfig, answeredQuestions, context.stage),

      // 5. Stage-specific instructions
      this.buildStageBlock(context.stage),

      // 6. Archetype-specific approach
      this.buildArchetypeBlock(context.archetype),

      // 7. Temperature urgency
      this.buildTemperatureBlock(context.temperature),

      // 8. Active policies
      this.buildPolicyBlock(context.policies),

      // 9. Behavioral history
      this.buildHistoryBlock(context.behavioralHistory),

      // 10. Lead context
      this.buildLeadContextBlock(context.leadContext),

      // 11. Objective
      this.buildObjectiveBlock(context.objective),
    ];

    return blocks.filter(Boolean).join('\n\n');
  }

  /**
   * Compile a system prompt for MARK (marketing agent).
   */
  compileMARK(context: {
    campaignName: string;
    segmentDescription: string;
    channel: string;
    businessConfig?: BusinessConfig;
  }): string {
    const blocks = [
      this.markMasterPrompt || this.buildFallbackMARKPrompt(),
      this.buildBusinessConfigBlock(context.businessConfig),
      `## CAMPAÑA ACTUAL
- Nombre: ${context.campaignName}
- Segmento: ${context.segmentDescription}
- Canal: ${context.channel}
- Genera el mensaje de marketing para esta campaña.`,
    ];

    return blocks.filter(Boolean).join('\n\n');
  }

  // ══════════════════════════════════════════════════════════════
  // BUSINESS CONFIG BLOCKS
  // ══════════════════════════════════════════════════════════════

  private buildBusinessConfigBlock(config?: BusinessConfig): string {
    if (!config) return '';

    const scheduleDays = config.schedule?.days?.join(', ') || 'lun-vie';
    const scheduleHours = config.schedule?.hours?.join(' y ') || '9am-6pm';
    const productsList = config.products?.map(p => {
      const priceStr = p.price > 0 ? `$${p.price.toLocaleString()}` : 'gratuito';
      const durationStr = p.duration_min ? ` (${p.duration_min}min)` : '';
      const noteStr = p.note ? ` — ${sanitizeForPrompt(p.note)}` : '';
      return `  - ${sanitizeForPrompt(p.name)}: ${priceStr}${durationStr}${noteStr}`;
    }).join('\n') || 'No definidos';

    return `--- CONFIGURACIÓN DEL NEGOCIO ---
DATOS DEL NEGOCIO:
- Nombre: ${sanitizeForPrompt(config.businessName)}
- Rubro: ${sanitizeForPrompt(config.businessType)}
- Horario: ${scheduleDays} ${scheduleHours} (${config.schedule?.timezone || 'America/Mexico_City'})
- Productos/Servicios:
${productsList}`;
  }

  private buildLossFormulaBlock(config?: BusinessConfig): string {
    if (!config?.leadFormula) return '';

    const lf = config.leadFormula;
    return `--- FÓRMULA DE PÉRDIDA ESTIMADA ---
${wrapUserContent(`Volumen keyword: "${sanitizeForPrompt(lf.volume_keyword || 'leads')}"
Métrica de conversión: "${sanitizeForPrompt(lf.conversion_metric || 'ventas')}"
Ticket promedio: $${(lf.average_ticket || 0).toLocaleString()}
Nota del funnel: ${sanitizeForPrompt(lf.funnel_note || 'No definida')}`, 'FORMULA_PERDIDA')}
Si el lead te da volumen semanal y conversión actual, aplica mentalmente:
  leads_perdidos = (volumen - convertidos) * ticket_promedio * 4 (semanas al mes).
IMPORTANTE: Cuantifica la pérdida en términos concretos. El lead debe SENTIR que pierde dinero.`;
  }

  private buildPendingQuestionsBlock(config?: BusinessConfig, answeredQuestions?: string[], currentStage?: ConversationStageType): string {
    if (!config?.customQuestions?.length) return '';

    const pending = config.customQuestions.filter(q => {
      const stageMatch = !q.stage || q.stage.toUpperCase() === currentStage;
      const notAnswered = !(answeredQuestions || []).includes(q.id);
      return stageMatch && notAnswered;
    });

    if (pending.length === 0) return '';

    const questionsList = pending.map(q =>
      `- "${sanitizeForPrompt(q.text)}" (propósito: ${sanitizeForPrompt(q.purpose)})`
    ).join('\n');

    return `--- PREGUNTAS PENDIENTES (SIN PARECER ROBÓTICO) ---
Debes introducir estas preguntas con naturalidad, justo después de validar algo que dijo el lead.
No las sueltes en seco. Pregunta máximo UNA a la vez.
Antes de preguntar, da una razón (ej: "Para recomendarte la mejor opción, necesito saber...").
Si el lead ya respondió algo relacionado, no repitas.
${questionsList}`;
  }

  // ══════════════════════════════════════════════════════════════
  // STAGE / ARCHETYPE / TEMPERATURE BLOCKS
  // ══════════════════════════════════════════════════════════════

  private buildStageBlock(stage: ConversationStageType): string {
    const instructions: Record<ConversationStageType, string> = {
      EXPLORATION: `ETAPA ACTUAL: EXPLORACIÓN → MODO: AGENTE 1 – DIAGNÓSTICO
El lead recién llega o está explorando. TU TRABAJO: Detectar la fuga oculta.
- No vendas, no expliques la solución completa.
- Haz preguntas que revelen el problema real detrás de su incomodidad.
- Si pregunta precio → redirige a diagnóstico ("Antes de números, déjame entender...").
- Máximo 2 preguntas por mensaje, la segunda más abierta.
- Meta: Que el lead admita que algo se está perdiendo.`,
      INTEREST: `ETAPA ACTUAL: INTERÉS → MODO: AGENTE 2 – ESTRATEGIA
El lead mostró interés y compartió contexto. TU TRABAJO: Cuantificar la pérdida.
- Resume lo que te contó para confirmar entendimiento.
- Convierte el caos operativo en números concretos.
- Usa la fórmula de pérdida si tienes datos de volumen y conversión.
- NO envíes pricing aún (salvo que la política lo permita).
- Meta: Que el lead VEA la pérdida como algo real y tangible.`,
      INTENT: `ETAPA ACTUAL: INTENCIÓN → MODO: AGENTE 3 – CIERRE
El lead quiere avanzar. TU TRABAJO: Invitar a la siguiente decisión natural.
- Confirma que entendiste su necesidad.
- Propón UNA acción concreta (agendar llamada, enviar info, etc.).
- Si pregunta precio: primero confirma que es lo correcto para él.
- Usa herramientas (schedule_meeting, check_calendar) si es apropiado.
- Meta: Que el lead acepte una acción concreta.`,
      OBJECTION: `ETAPA ACTUAL: OBJECIÓN → MODO: REENCUADRE
El lead tiene dudas. TU TRABAJO: Reformular mostrando lo que pierde.
- Reconoce la objeción como válida.
- Reformula: muestra lo que pierde si no actúa.
- NO presiones ni contradigas directamente.
- Si es objeción de precio → muestra costo de no actuar.
- Meta: Que el lead vea que no hacer nada también tiene costo.`,
      CLOSING: `ETAPA ACTUAL: CIERRE → MODO: CONFIRMAR Y AGENDAR
El lead está listo. TU TRABAJO: Confirmar y agendar.
- Confirma el acuerdo verbalmente.
- Agenda la siguiente acción concreta.
- Usa schedule_meeting o check_calendar.
- No vendas más, solo cierra.
- Meta: Cita agendada o acuerdo confirmado.`,
      FOLLOW_UP: `ETAPA ACTUAL: SEGUIMIENTO → MODO: RE-ENGANCHAR CON VALOR
Re-enganchando un lead. TU TRABAJO: Aportar valor, no presión.
- No suenes desesperado.
- Ofrece algo nuevo (info, caso de éxito, dato).
- Mantén la conversación ligera.
- Meta: Que el lead vuelva a interactuar.`,
    };
    return instructions[stage];
  }

  private buildArchetypeBlock(archetype: LeadArchetype): string {
    const approaches: Record<LeadArchetype, string> = {
      DECISIVE: `ARQUETIPO: DECISIVO — Directo, quiere resultados rápidos. Sé breve, usa datos concretos, ve al punto. Frases tipo: "Para darte algo concreto...", "Los números dicen..."`,
      ANALYTICAL: `ARQUETIPO: ANALÍTICO — Necesita datos y comparaciones. Usa números, casos, evidencia. Frases tipo: "Según los datos...", "Para ser más preciso..."`,
      SOCIAL: `ARQUETIPO: SOCIAL — Valora la relación. Sé cálido, usa historias, conecta emocionalmente. Frases tipo: "Me imagino que...", "Te entiendo perfectamente..."`,
      CAUTIOUS: `ARQUETIPO: CAUTELOSO — Teme arriesgar. Dale seguridad, garantías, pasos pequeños. Frases tipo: "Sin compromiso...", "Para que veas con calma..."`,
      SKEPTICAL: `ARQUETIPO: ESCÉPTICO — Desconfía por naturaleza. Usa hechos, testimonios, datos reales. Frases tipo: "Los datos muestran...", "Un caso real..."`,
      OVERWHELMED_OWNER: `ARQUETIPO: DUEÑO AGOBIADO — Tiene demasiado encima. Sé ultra simple, ofrece soluciones rápidas. Frases tipo: "Solo una pregunta rápida...", "Para no hacerte perder tiempo..."`,
    };
    return approaches[archetype];
  }

  private buildTemperatureBlock(temperature: LeadTemperature): string {
    const urgency: Record<LeadTemperature, string> = {
      HOT: `TEMPERATURA: CALIENTE — Lead muy activo. Responde RÁPIDO. No dejes enfriar. Prioridad máxima.`,
      WARM: `TEMPERATURA: TIBIO — Lead interesado. Mantén el momentum. No presiones pero no desaparezcas.`,
      COLD: `TEMPERATURA: FRÍO — Lead pasivo. No presiones. Nutre con valor. Paciencia.`,
    };
    return urgency[temperature];
  }

  private buildPolicyBlock(policies: string[]): string {
    if (policies.length === 0) return '';
    return `--- POLÍTICAS ACTIVAS ---
${policies.map(p => `- ${p}`).join('\n')}
DEBES respetar TODAS las políticas. Violaciones son bloqueadas.`;
  }

  private buildHistoryBlock(history: string[]): string {
    if (history.length === 0) return '';
    return `--- HISTORIAL CONDUCTUAL ---
${history.slice(-5).map(h => `- ${h}`).join('\n')}`;
  }

  private buildLeadContextBlock(context: Record<string, unknown>): string {
    const entries = Object.entries(context);
    if (entries.length === 0) return '';
    return `--- CONTEXTO DEL LEAD ---
${entries.map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n')}`;
  }

  private buildObjectiveBlock(objective: string): string {
    return `--- OBJETIVO ACTUAL ---
${objective}

Genera UNA respuesta que avance hacia este objetivo. Máximo 3 líneas.`;
  }

  // ══════════════════════════════════════════════════════════════
  // FALLBACK PROMPTS (if master prompts not injected)
  // ══════════════════════════════════════════════════════════════

  private buildFallbackJHONPrompt(): string {
    return `## JHON — Agente Comercial de ValiAutoFlow
Eres un consultor de ventas cognitivo. Tu principio: "El problema no es lo que hacen. Es lo que no están viendo."
REGLAS: Máximo 3 líneas por respuesta. Una idea por mensaje. No vendas sin diagnosticar. Español LATAM.`;
  }

  private buildFallbackMARKPrompt(): string {
    return `## MARK — Agente de Marketing de ValiAutoFlow
Eres un agente de marketing que nutre, segmenta y reactiva leads. Máximo 2 líneas por mensaje. Español LATAM.`;
  }
}

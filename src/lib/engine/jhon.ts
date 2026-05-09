// ============================================================
// JHON — Master Commercial Agent (Carnal #1)
// "El consultor que revela pérdidas invisibles"
// ============================================================

import {
  type ConversationStageType,
  type LeadArchetype,
  type LeadTemperature,
  type ToolType,
  type JHONConfig,
  type MemoryPacket,
} from './types';

// Business config structure (injected by Orchestrator from WorkspaceConfig)
export interface BusinessConfig {
  businessName: string;
  businessType: string;
  schedule: { timezone: string; days: string[]; hours: string[] };
  products: { name: string; price: number; duration_min: number; note?: string }[];
  leadFormula: {
    volume_keyword: string;
    conversion_metric: string;
    average_ticket: number;
    funnel_note: string;
  };
  customQuestions: { id: string; text: string; purpose: string; stage: string }[];
  policies: {
    show_price_early: boolean;
    auto_schedule: boolean;
    max_questions_per_turn: number;
    auto_followup: boolean;
  };
}

const DEFAULT_JHON_CONFIG: JHONConfig = {
  neverSellBeforeDiagnose: true,
  neverCloseWithoutLossAwareness: true,
  oneIdeaPerMessage: true,
  shortDirectedConversation: true,
  consultativeNotAggressive: true,
  showCostOfInaction: true,
};

export class JHONAgent {
  private config: JHONConfig;

  constructor(config?: Partial<JHONConfig>) {
    this.config = { ...DEFAULT_JHON_CONFIG, ...config };
  }

  /**
   * Generate JHON's response using the 3-Agent methodology:
   * AGENTE 1 — DIAGNÓSTICO: "Detectar la fuga oculta"
   * AGENTE 2 — ESTRATEGIA: "Traducir el problema en dinero perdido"
   * AGENTE 3 — CIERRE: "Invitar a la siguiente decisión natural"
   */
  generateResponse(
    stage: ConversationStageType,
    archetype: LeadArchetype,
    temperature: LeadTemperature,
    memory: MemoryPacket,
    policies: string[],
    leadMessage: string,
    businessConfig?: BusinessConfig,
    answeredQuestions?: string[]
  ): { response: string; toolActions: { toolType: ToolType; parameters: Record<string, unknown>; reason: string }[]; reasoning: string; pendingQuestionsLeft: string[] } {
    const toolActions: { toolType: ToolType; parameters: Record<string, unknown>; reason: string }[] = [];
    let response = '';
    let reasoning = '';

    // Detect tool needs
    const neededTools = this.detectToolNeeds(stage, leadMessage);
    toolActions.push(...neededTools.map(t => ({
      toolType: t,
      parameters: this.buildToolParams(t, leadMessage, businessConfig),
      reason: `Detected from message: "${leadMessage.substring(0, 50)}"`,
    })));

    // Calculate pending custom questions
    const pendingQuestions = businessConfig?.customQuestions?.filter(
      q => q.stage.toLowerCase() === stage.toLowerCase() && !(answeredQuestions || []).includes(q.id)
    ) || [];

    // Route to the correct AGENTE based on stage
    switch (stage) {
      case 'EXPLORATION':
        response = this.agenteDiagnostico(archetype, temperature, memory, leadMessage, businessConfig, pendingQuestions);
        reasoning = 'AGENTE 1 — DIAGNÓSTICO: Detectando la fuga oculta. Sin vender, solo diagnosticar.';
        break;
      case 'INTEREST':
        response = this.agenteEstrategia(archetype, temperature, memory, leadMessage, businessConfig);
        reasoning = 'AGENTE 2 — ESTRATEGIA: Cuantificando la pérdida. Convirtiendo caos en números.';
        break;
      case 'INTENT':
        response = this.agenteCierre(archetype, temperature, memory, leadMessage, businessConfig, policies);
        reasoning = 'AGENTE 3 — CIERRE: Invitando a la siguiente decisión natural.';
        break;
      case 'OBJECTION':
        response = this.handleObjection(archetype, temperature, memory, leadMessage, businessConfig);
        reasoning = 'OBJECCIÓN: Reconociendo objeción, reformulando con pérdida.';
        break;
      case 'CLOSING':
        response = this.handleClosing(archetype, temperature, memory, leadMessage, businessConfig);
        reasoning = 'CLOSING: Confirmando decisión y agendando.';
        break;
      case 'FOLLOW_UP':
        response = this.handleFollowUp(archetype, temperature, memory, leadMessage, businessConfig);
        reasoning = 'FOLLOW_UP: Re-enganchando con valor, no presión.';
        break;
      default:
        response = this.agenteDiagnostico(archetype, temperature, memory, leadMessage, businessConfig, pendingQuestions);
        reasoning = 'DEFAULT: Falling back to diagnóstico.';
    }

    // Enforce rules
    if (this.config.oneIdeaPerMessage) response = this.enforceOneIdea(response);
    if (this.config.shortDirectedConversation) response = this.enforceShortResponse(response);

    return {
      response,
      toolActions,
      reasoning,
      pendingQuestionsLeft: pendingQuestions.slice(1).map(q => q.id),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // AGENTE 1 — DIAGNÓSTICO: "Detectar la fuga oculta"
  // ══════════════════════════════════════════════════════════════

  private agenteDiagnostico(
    archetype: LeadArchetype,
    temperature: LeadTemperature,
    memory: MemoryPacket,
    message: string,
    config?: BusinessConfig,
    pendingQuestions?: { id: string; text: string; purpose: string; stage: string }[]
  ): string {
    // Step 1: Check for price inquiry (most common opening)
    if (this.isPriceInquiry(message)) {
      return this.redirectFromPrice(archetype, config);
    }

    // Step 2: If there's a pending custom question, weave it in naturally
    if (pendingQuestions && pendingQuestions.length > 0) {
      return this.askCustomQuestionNaturally(pendingQuestions[0], archetype, message, config);
    }

    // Step 3: Standard diagnostic based on archetype
    return this.getDiagnosticHook(archetype, temperature, config);
  }

  /**
   * REDIRECT FROM PRICE: When lead opens with "¿cuánto cuesta?"
   * JHON never gives price in EXPLORATION. Redirects to diagnosis.
   */
  private redirectFromPrice(archetype: LeadArchetype, config?: BusinessConfig): string {
    const volumeKeyword = config?.leadFormula?.volume_keyword || 'mensajes que les llegan';
    const redirects: Record<LeadArchetype, string> = {
      DECISIVE: `Antes de hablarte de números, déjame entender algo rápido: ¿cuántos ${volumeKeyword} recibes al día y cuántos logras atender?`,
      ANALYTICAL: `Bueno, antes de hablar de inversión, necesito entender tu situación: ¿cómo están midiendo cuántos ${volumeKeyword} se convierten realmente en clientes?`,
      SOCIAL: `Claro que sí, con gusto te comparto. Pero antes cuéntame: ¿hoy quién atiende los ${volumeKeyword}? ¿Tú personalmente o alguien del equipo?`,
      CAUTIOUS: `Entiendo que quieras saber el precio. Pero para darte una opción justa, necesito entender algo: ¿hoy cuántos ${volumeKeyword} se les están escapando?`,
      SKEPTICAL: `Válido preguntar. Pero antes déjame preguntarte: ¿ya intentaste algo para organizar la atención de tus ${volumeKeyword}? ¿Qué resultados tuviste?`,
      OVERWHELMED_OWNER: `Sé que quieres números ya. Pero primero: ¿cuántos ${volumeKeyword} se te juntan sin responder al día? Eso me ayuda a darte una idea real.`,
    };
    return redirects[archetype];
  }

  /**
   * ASK CUSTOMER QUESTION NATURALLY: Weave business-specific questions
   * into conversation without sounding like an interrogation.
   */
  private askCustomQuestionNaturally(
    question: { id: string; text: string; purpose: string; stage: string },
    archetype: LeadArchetype,
    _message: string,
    config?: BusinessConfig
  ): string {
    // Always provide a REASON for the question (makes it feel helpful, not invasive)
    const prefixes: Record<LeadArchetype, string> = {
      DECISIVE: `Para darte algo concreto, necesito saber: `,
      ANALYTICAL: `Para ser más preciso con la información: `,
      SOCIAL: `Me ayudas a ayudarte si me dices: `,
      CAUTIOUS: `Sin compromiso, solo para orientarte mejor: `,
      SKEPTICAL: `Para que no te dé información genérica, necesito saber: `,
      OVERWHELMED_OWNER: `Solo una pregunta rápida para no hacerte perder tiempo: `,
    };

    return `${prefixes[archetype]}${question.text}`;
  }

  /**
   * DIAGNOSTIC HOOK: Empathy + common problem + validation question
   */
  private getDiagnosticHook(archetype: LeadArchetype, temperature: LeadTemperature, config?: BusinessConfig): string {
    const businessType = config?.businessType || 'general';
    const volumeKeyword = config?.leadFormula?.volume_keyword || 'mensajes';

    // Industry-specific opening hooks
    const industryHooks: Record<string, string> = {
      mecanica: `Qué bien, taller mecánico. El principal problema que veo en talleres no es conseguir clientes, es dar seguimiento a los que preguntan por diagnóstico o presupuesto. ¿Te suena familiar?`,
      clinica: `Entendido. En consultorios y clínicas, el problema más común no es la demanda, es que los pacientes preguntan y nunca reciben confirmación de cita. ¿Te pasa algo así?`,
      restaurante: `Perfecto. En restaurantes, muchos clientes preguntan por reservas o menú y si no les respondes en 5 minutos, ya eligieron otro. ¿Te ha pasado?`,
      inmobiliaria: `Comprendo. En bienes raíces, cada lead que se enfría es una comisión perdida. ¿Hoy cómo están dando seguimiento a los prospectos?`,
      general: `Entiendo. Lo que veo en negocios como el tuyo es que el problema no es generar ${volumeKeyword}, es lo que pasa después. ¿Quién los atiende hoy?`,
    };

    if (temperature === 'HOT') {
      return (industryHooks[businessType] || industryHooks.general) + ' Parece que es urgente para ti.';
    }
    return industryHooks[businessType] || industryHooks.general;
  }

  // ══════════════════════════════════════════════════════════════
  // AGENTE 2 — ESTRATEGIA: "Traducir el problema en dinero perdido"
  // ══════════════════════════════════════════════════════════════

  private agenteEstrategia(
    archetype: LeadArchetype,
    _temperature: LeadTemperature,
    _memory: MemoryPacket,
    message: string,
    config?: BusinessConfig
  ): string {
    const avgTicket = config?.leadFormula?.average_ticket || 1500;
    const volumeKeyword = config?.leadFormula?.volume_keyword || 'leads';
    const conversionMetric = config?.leadFormula?.conversion_metric || 'ventas';

    // If the lead gave volume data, calculate loss
    const hasVolumeData = /\d+/.test(message) && (message.includes('semana') || message.includes('día') || message.includes('mes'));

    if (hasVolumeData) {
      return this.quantifyLoss(message, avgTicket, volumeKeyword, conversionMetric, archetype);
    }

    // If no volume data yet, ask for it naturally
    const askVolume: Record<LeadArchetype, string> = {
      DECISIVE: `Para darte un número real: ¿cuántos ${volumeKeyword} te llegan por semana y cuántos conviertes en ${conversionMetric}?`,
      ANALYTICAL: `¿Tienes el dato aproximado de cuántos ${volumeKeyword} recibes vs cuántos se convierten en ${conversionMetric}? Con eso puedo proyectar la pérdida.`,
      SOCIAL: `Me ayudas con un dato rápido: de los ${volumeKeyword} que te llegan, ¿cuántos terminan en ${conversionMetric}? No tiene que ser exacto.`,
      CAUTIOUS: `Sin compromiso, solo un aproximado: ¿cuántos ${volumeKeyword} recibes y cuántos se concretan? Me ayuda a darte una idea real.`,
      SKEPTICAL: `¿Tienes forma de medir cuántos ${volumeKeyword} se pierden vs los que se convierten? Si no, podemos estimarlo.`,
      OVERWHELMED_OWNER: `Solo necesito un aproximado rápido: ¿de cada 10 ${volumeKeyword}, cuántos se convierten en ${conversionMetric}?`,
    };
    return askVolume[archetype];
  }

  /**
   * QUANTIFY LOSS: Transform raw data into financial loss narrative
   */
  private quantifyLoss(
    message: string,
    avgTicket: number,
    volumeKeyword: string,
    conversionMetric: string,
    archetype: LeadArchetype
  ): string {
    // Extract numbers from message for calculation
    const numbers = message.match(/\d+/g)?.map(Number) || [];

    if (numbers.length >= 2) {
      const total = numbers[0];
      const converted = numbers[1];
      const lost = total - converted;
      const weeklyLoss = lost * avgTicket;
      const monthlyLoss = weeklyLoss * 4;

      if (archetype === 'DECISIVE') {
        return `Entonces de ${total} ${volumeKeyword}, solo conviertes ${converted}. Ahí hay ${lost} que se pierden cada semana. A $${avgTicket.toLocaleString()} por ${conversionMetric.replace(/s$/, '')}, son $${monthlyLoss.toLocaleString()} mensuales que se fugar. ¿Tiene sentido atacar eso?`;
      }

      return `Déjame ver si entendí: recibes ${total} ${volumeKeyword}, pero solo ${converted} se convierten en ${conversionMetric}. Ahí hay ${lost} oportunidades que se enfrían cada semana. Si cada ${conversionMetric.replace(/s$/, '')} vale $${avgTicket.toLocaleString()}, estarías perdiendo unos $${monthlyLoss.toLocaleString()} al mes. ¿Es más o menos así?`;
    }

    return `Entiendo. ¿Y de esos, cuántos se convierten realmente en ${conversionMetric}? Con ese dato puedo hacerte un cálculo sin compromiso.`;
  }

  // ══════════════════════════════════════════════════════════════
  // AGENTE 3 — CIERRE: "Invitar a la siguiente decisión natural"
  // ══════════════════════════════════════════════════════════════

  private agenteCierre(
    archetype: LeadArchetype,
    _temperature: LeadTemperature,
    _memory: MemoryPacket,
    message: string,
    config?: BusinessConfig,
    _policies?: string[]
  ): string {
    // If lead asks for price at INTENT stage, it's allowed
    if (this.isPriceInquiry(message)) {
      const products = config?.products || [];
      if (products.length > 0) {
        const productNames = products.map(p => `${p.name} ($${p.price.toLocaleString()})`).join(', ');
        return `Tenemos estas opciones: ${productNames}. ¿Cuál te interesa? Si quieres, agendamos una llamada rápida para definir lo mejor para tu caso.`;
      }
    }

    // Natural close — propose ONE action (usually schedule a call)
    const scheduleDays = config?.schedule?.days?.join(', ') || 'lunes a viernes';
    const scheduleHours = config?.schedule?.hours?.join(' y ') || '9am a 6pm';

    const closes: Record<LeadArchetype, string> = {
      DECISIVE: `Tiene sentido ordenarlo ya. ¿Agendamos 20 minutos esta semana? Tengo ${scheduleDays} de ${scheduleHours}.`,
      ANALYTICAL: `Lo que propongo es revisarlo con tus números reales. ¿Te parece una llamada de 20 minutos? ${scheduleDays}, ${scheduleHours}.`,
      SOCIAL: `Me gustaría mostrarte cómo se vería en tu caso. ¿Agendamos un ratito? ${scheduleDays} a ${scheduleHours}.`,
      CAUTIOUS: `Sin compromiso, solo una revisión rápida de 20 minutos para que veas cómo funciona. ¿Te va bien ${scheduleDays}?`,
      SKEPTICAL: `Te propongo verlo con tus propios ojos en una demo de 20 minutos. ${scheduleDays}, ${scheduleHours}. ¿Te animas?`,
      OVERWHELMED_OWNER: `Solo 20 minutos y te muestro cómo simplificar todo. ¿Cuándo te viene bien? ${scheduleDays}, ${scheduleHours}.`,
    };
    return closes[archetype];
  }

  // ══════════════════════════════════════════════════════════════
  // OBJECTION HANDLING
  // ══════════════════════════════════════════════════════════════

  private handleObjection(_archetype: LeadArchetype, _temperature: LeadTemperature, _memory: MemoryPacket, message: string, config?: BusinessConfig): string {
    const lower = message.toLowerCase();

    // Price objection
    if (lower.includes('caro') || lower.includes('precio') || lower.includes('cuesta mucho')) {
      return `Entiendo tu preocupación. Pero pensándolo bien: ¿cuánto te cuesta NO tener esto resuelto? Ese es el costo real que deberíamos evaluar.`;
    }

    // Time objection
    if (lower.includes('pensar') || lower.includes('después') || lower.includes('luego')) {
      return `Claro, tómate tu tiempo. Solo recuerda: cada semana que pasa, ${config?.leadFormula?.funnel_note || 'los leads se enfrían'}. ¿Qué te parecería si lo vemos el ${config?.schedule?.days?.[0] || 'próximo día hábil'}?`;
    }

    // Generic objection — acknowledge + reformulate with loss
    return `Es válido lo que dices. ¿Pero has considerado cuánto te cuesta seguir como estás? A veces lo más caro es no hacer nada.`;
  }

  // ══════════════════════════════════════════════════════════════
  // CLOSING & FOLLOW-UP
  // ══════════════════════════════════════════════════════════════

  private handleClosing(_archetype: LeadArchetype, _temperature: LeadTemperature, _memory: MemoryPacket, _message: string, config?: BusinessConfig): string {
    const products = config?.products || [];
    const scheduleHours = config?.schedule?.hours?.join(' o ') || '10am o 4pm';

    if (products.length > 0) {
      return `Perfecto. Solo para confirmar: la opción que te interesa es ${products[0].name} por $${products[0].price.toLocaleString()}. ¿Agendamos para ${scheduleHours}?`;
    }
    return `Excelente. ¿Qué horario te queda mejor para agendar? ${scheduleHours}.`;
  }

  private handleFollowUp(archetype: LeadArchetype, _temperature: LeadTemperature, _memory: MemoryPacket, _message: string, config?: BusinessConfig): string {
    const avgTicket = config?.leadFormula?.average_ticket || 1500;
    const followUps: Record<LeadArchetype, string> = {
      DECISIVE: `Tengo los números listos para ti. Según lo que platicamos, podrías recuperar $${(avgTicket * 30).toLocaleString()}+ al mes. ¿Cuándo lo revisamos?`,
      ANALYTICAL: `Actualicé el análisis con datos nuevos. ¿Te interesa ver cuánto se fuga en tu operación actualmente?`,
      SOCIAL: `Hola! Espero que todo vaya bien. Quería compartirte algo que creo te va a gustar.`,
      CAUTIOUS: `Hola, sé que estabas evaluando. Solo quería recordarte que estamos aquí cuando estés listo.`,
      SKEPTICAL: `Tengo un caso real de un negocio similar al tuyo. ¿Te interesa ver los resultados?`,
      OVERWHELMED_OWNER: `Hola, sé que estás ocupado. Solo un mensaje: cuando puedas, revisamos algo rápido que te puede ahorrar tiempo.`,
    };
    return followUps[archetype];
  }

  // ══════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════

  private isPriceInquiry(message: string): boolean {
    return /precio|cuánto cuesta|costo|inversión|cuota|mensualidad|cuánto es|cuánto vale/i.test(message);
  }

  private enforceOneIdea(response: string): string {
    const sentences = response.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 3).join(' ');
  }

  private enforceShortResponse(response: string): string {
    return response.length > 300 ? response.substring(0, 297) + '...' : response;
  }

  // ─── TOOL DETECTION ───

  detectToolNeeds(stage: ConversationStageType, message: string): ToolType[] {
    const tools: ToolType[] = [];
    const lower = message.toLowerCase();

    if (lower.includes('agendar') || lower.includes('cita') || lower.includes('reunión') || lower.includes('llamada') || lower.includes('horario')) {
      tools.push('SCHEDULE_APPOINTMENT');
    }
    if (lower.includes('disponible') || lower.includes('cuándo puedes') || lower.includes('qué horario')) {
      tools.push('CHECK_CALENDAR');
    }
    if ((stage === 'INTENT' || stage === 'CLOSING') && (lower.includes('va') || lower.includes('hagámoslo') || lower.includes('me animo') || lower.includes('adelante') || lower.includes('perfecto'))) {
      tools.push('CREATE_DEAL');
      tools.push('UPDATE_PIPELINE');
    }
    if ((stage === 'INTENT' || stage === 'CLOSING') && (lower.includes('cotización') || lower.includes('presupuesto'))) {
      tools.push('GENERATE_QUOTE');
    }
    if (lower.includes('link') || lower.includes('enlace') || lower.includes('url')) {
      tools.push('SEND_LINK');
    }
    if (lower.includes('recuérdame') || lower.includes('recordatorio')) {
      tools.push('SEND_REMINDER');
    }

    return tools;
  }

  private buildToolParams(toolType: ToolType, _message: string, config?: BusinessConfig): Record<string, unknown> {
    const schedule = config?.schedule || { timezone: 'America/Mexico_City' };
    const products = config?.products || [];

    switch (toolType) {
      case 'SCHEDULE_APPOINTMENT':
        return { type: 'discovery_call', duration: products[0]?.duration_min || 30, timezone: schedule.timezone, source: 'ai_suggestion' };
      case 'CHECK_CALENDAR':
        return { range: '7d', slotDuration: products[0]?.duration_min || 30, timezone: schedule.timezone };
      case 'CREATE_DEAL':
        return { source: 'ai_conversation', probability: 0.7, value: products[0]?.price || 0 };
      case 'UPDATE_PIPELINE':
        return { newStage: 'closing', reason: 'lead_ready' };
      case 'GENERATE_QUOTE':
        return { format: 'pdf', includeTerms: true, products: products.map(p => p.name) };
      case 'SEND_LINK':
        return { linkType: 'booking', source: 'conversation' };
      case 'SEND_REMINDER':
        return { delay: 24, channel: 'whatsapp' };
      default:
        return {};
    }
  }

  /**
   * Build the JHON Master Prompt section for the Prompt Compiler.
   * This is the system-level instruction set.
   */
  getMasterPromptSection(): string {
    return `## SISTEMA MAESTRO · JHON (Agente Comercial de ValiAutoFlow)

Eres **Jhon**, el agente comercial del sistema operativo ValiAutoFlow.

No eres un chatbot genérico. No eres un vendedor tradicional.
Eres un **consultor de ventas cognitivo** que revela pérdidas invisibles y convierte conciencia en decisiones.

Tu principio central:
> "El problema no es lo que hacen. Es lo que no están viendo."

Tu frase base (siempre presente en tu lógica):
> "No es que no funcione… es que se está fugando."

### OBJETIVO GLOBAL
Convertir conversaciones en decisiones. Cada interacción debe mover al lead una etapa más cerca de resolver su fuga comercial.

### DETECCIÓN DE ETAPA
| Etapa | Modo Activo |
|-------|-------------|
| EXPLORACIÓN | AGENTE 1 – DIAGNÓSTICO: "Detectar la fuga oculta" |
| INTERÉS | AGENTE 2 – ESTRATEGIA: "Traducir el problema en dinero perdido" |
| INTENCIÓN | AGENTE 3 – CIERRE: "Invitar a la siguiente decisión natural" |

### REGLAS DE ORO
1. Nunca preguntes sin contexto — primero reconoces, luego preguntas.
2. Usa afirmaciones + preguntas ("Me imagino que te pasa esto, ¿es así?").
3. Preguntas que parecen ayuda, no sondeo.
4. Siempre hay una razón lógica para la pregunta.
5. Máximo 2 preguntas por mensaje, la segunda más abierta.
6. No avanzas de etapa hasta que la anterior esté completa.
7. Si no hay dolor real (pérdida reconocida), no vendes.

### PROHIBIDO
- Vender sin contexto.
- Presionar.
- Explicar de más (máximo 3 líneas por mensaje).
- Sonar técnico ("automatización", "API", "workflow").
- Dar precio sin diagnóstico completo.
- Cerrar sin dolor real reconocido.
- Hacer más de 2 preguntas en un mismo mensaje.

### FILTRO FINAL (Antes de cada respuesta)
1. ¿Ya entendí suficiente para avanzar?
2. ¿El lead ya vio la fuga (pérdida)?
3. ¿Estoy queriendo vender demasiado pronto?
4. ¿Este mensaje empuja o guía?
5. ¿Estoy dejando una sola acción siguiente clara?

Si 2 es NO → sigue diagnosticando (Agente 1).
Si 3 es SÍ → retrocede a diagnóstico o estrategia.
Si 5 es NO → simplifica.

### FORMATO DE RESPUESTA
- Corto (máximo 3 líneas).
- Claro (sin jerga).
- Con dirección (siempre mueve la conversación).
- Con una sola acción siguiente posible.

IDIOMA: Español neutro LATAM. Tutea siempre. Cercano pero profesional.`;
  }
}

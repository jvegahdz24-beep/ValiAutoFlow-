// ============================================================
// JHON — The Commercial Agent (Carnal #1)
// "El que habla con leads"
// ============================================================

import {
  type ConversationStageType,
  type LeadArchetype,
  type LeadTemperature,
  type ToolType,
  type JHONConfig,
  type MemoryPacket,
} from './types';

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
   * Generate JHON's response based on the full pipeline context.
   * This is NOT a free-form chatbot. Every response follows JHON's methodology:
   * Diagnose → Strategize → Close
   */
  generateResponse(
    stage: ConversationStageType,
    archetype: LeadArchetype,
    temperature: LeadTemperature,
    memory: MemoryPacket,
    policies: string[],
    leadMessage: string
  ): { response: string; toolActions: { toolType: ToolType; parameters: Record<string, unknown>; reason: string }[]; reasoning: string } {
    const toolActions: { toolType: ToolType; parameters: Record<string, unknown>; reason: string }[] = [];
    let response = '';
    let reasoning = '';

    // Detect tool needs from message
    const neededTools = this.detectToolNeeds(stage, leadMessage);
    toolActions.push(...neededTools.map(t => ({
      toolType: t,
      parameters: this.buildToolParams(t, leadMessage),
      reason: `Detected from message: "${leadMessage.substring(0, 50)}"`,
    })));

    // Generate stage-appropriate response
    switch (stage) {
      case 'EXPLORATION':
        response = this.handleExploration(archetype, temperature, memory, leadMessage);
        reasoning = 'EXPLORATION: Diagnosing pain points before any selling. Using consultative approach.';
        break;
      case 'INTEREST':
        response = this.handleInterest(archetype, temperature, memory, leadMessage);
        reasoning = 'INTEREST: Connecting identified pain to solution. Showing cost of inaction.';
        break;
      case 'INTENT':
        response = this.handleIntent(archetype, temperature, memory, leadMessage, policies);
        reasoning = 'INTENT: Proposing next step with ONE clear action. Checking if pricing is appropriate.';
        break;
      case 'OBJECTION':
        response = this.handleObjection(archetype, temperature, memory, leadMessage);
        reasoning = 'OBJECTION: Acknowledging concern, reframing, showing what they lose by not acting.';
        break;
      case 'CLOSING':
        response = this.handleClosing(archetype, temperature, memory, leadMessage);
        reasoning = 'CLOSING: Confirming decision, scheduling, creating deal.';
        break;
      case 'FOLLOW_UP':
        response = this.handleFollowUp(archetype, temperature, memory, leadMessage);
        reasoning = 'FOLLOW_UP: Re-engaging with value, not pressure. Offering new information.';
        break;
      default:
        response = this.handleExploration(archetype, temperature, memory, leadMessage);
        reasoning = 'DEFAULT: Falling back to exploration mode.';
    }

    // Enforce one-idea-per-message rule
    if (this.config.oneIdeaPerMessage) {
      response = this.enforceOneIdea(response);
    }

    // Enforce short-directed-conversation rule
    if (this.config.shortDirectedConversation) {
      response = this.enforceShortResponse(response);
    }

    return { response, toolActions, reasoning };
  }

  // ---- STAGE HANDLERS ----

  private handleExploration(archetype: LeadArchetype, temperature: LeadTemperature, memory: MemoryPacket, message: string): string {
    // Never sell before diagnosing — always ask about pain points first
    const hasPainPoint = memory.conversational.includes('pain') || memory.conversational.includes('problema') || memory.conversational.includes('dificultad');

    if (!hasPainPoint) {
      return this.getExplorationQuestion(archetype);
    }

    // Pain point identified — acknowledge and dig deeper
    return this.getDeepExploration(archetype, temperature);
  }

  private handleInterest(archetype: LeadArchetype, temperature: LeadTemperature, memory: MemoryPacket, message: string): string {
    // Show cost of inaction
    const costPhrases: Record<LeadArchetype, string> = {
      DECISIVE: 'Cada día sin resolver esto representa pérdida directa. ¿Qué pasaría si sigues igual 30 días más?',
      ANALYTICAL: 'Según lo que compartes, el costo de no actuar se acumula. ¿Has calculado cuánto pierdes mensualmente por este problema?',
      SOCIAL: 'Entiendo perfectamente. Lo que veo es que mientras más esperas, más se complica. ¿Te gustaría ver cómo otros lo resolvieron?',
      CAUTIOUS: 'Tienes razón en ser cuidadoso. Pero también es importante considerar: ¿qué pasa si no haces nada? Ese también es un riesgo.',
      SKEPTICAL: 'Es válido dudar. Pero pensándolo bien: el status quo también tiene un costo. ¿Lo has considerado?',
      OVERWHELMED_OWNER: 'Sé que tienes mucho encima. Pero este problema no se va a resolver solo. ¿Te gustaría que te mostrara algo sencillo que puede ayudar?',
    };
    return costPhrases[archetype];
  }

  private handleIntent(archetype: LeadArchetype, temperature: LeadTemperature, memory: MemoryPacket, message: string, policies: string[]): string {
    // Check if pricing is allowed at this stage
    const canShowPrice = !policies.includes('BLOCK_PRICE_EARLY');

    if (message.toLowerCase().includes('precio') || message.toLowerCase().includes('cuánto') || message.toLowerCase().includes('cuesta')) {
      if (canShowPrice) {
        return 'Antes de hablarte de inversión, déjame asegurarme de que esto es lo correcto para ti. ¿Qué es lo que más te gustaría resolver primero?';
      }
      return 'Bueno, antes de hablar de números, quiero asegurarme de que lo que ofrecemos realmente resuelve tu problema. ¿Me cuentas un poco más sobre lo que necesitas?';
    }

    // Propose ONE clear next step
    return this.getNextStepProposal(archetype);
  }

  private handleObjection(archetype: LeadArchetype, temperature: LeadTemperature, memory: MemoryPacket, message: string): string {
    const lowerMsg = message.toLowerCase();

    // Price objection
    if (lowerMsg.includes('caro') || lowerMsg.includes('precio') || lowerMsg.includes('cuesta mucho')) {
      return 'Entiendo tu preocupación. Pero pensándolo bien: ¿cuánto te cuesta NO tener esto resuelto? Ese es el costo real que deberíamos evaluar.';
    }

    // Time objection
    if (lowerMsg.includes('pensar') || lowerMsg.includes('después') || lowerMsg.includes('luego')) {
      return 'Claro, tómate tu tiempo. Solo quiero que tengas en cuenta: cada semana que pasa, el problema sigue ahí. ¿Qué te parecería si agendamos una llamada rápida para la próxima semana?';
    }

    // Trust objection
    if (lowerMsg.includes('no sé') || lowerMsg.includes('dudo') || lowerMsg.includes('no confío')) {
      return 'Es totalmente válido. La confianza se gana. ¿Qué te gustaría ver o saber para sentirte más seguro?';
    }

    // Generic objection
    return 'Entiendo. Es una decisión importante. ¿Qué específicamente te genera duda? Así puedo darte información más precisa.';
  }

  private handleClosing(archetype: LeadArchetype, temperature: LeadTemperature, memory: MemoryPacket, message: string): string {
    // Never close without loss awareness
    if (this.config.neverCloseWithoutLossAwareness) {
      return 'Perfecto. Solo para confirmar: entendemos que hoy el problema principal es [pain point], y lo que vamos a hacer es [solution]. ¿Estás de acuerdo en que necesitamos avanzar con esto?';
    }
    return 'Excelente. Vamos a proceder. ¿Cuál es el mejor horario para agendar el inicio?';
  }

  private handleFollowUp(archetype: LeadArchetype, temperature: LeadTemperature, memory: MemoryPacket, message: string): string {
    // Re-engage with value, not pressure
    const followUpPhrases: Record<LeadArchetype, string> = {
      DECISIVE: 'Tengo algo que te puede interesar sobre [resultado concreto]. ¿Tienes 5 minutos esta semana?',
      ANALYTICAL: 'Encontré datos adicionales sobre el impacto de [problema] en negocios como el tuyo. ¿Te los comparto?',
      SOCIAL: 'Hola! Espero que todo vaya bien. Quería compartirte un caso de éxito similar al tuyo. ¿Te interesa?',
      CAUTIOUS: 'Hola, sé que estabas evaluando. Quería dejarte saber que tenemos una garantía que podría darte más tranquilidad. ¿Te cuento?',
      SKEPTICAL: 'Hola, quería compartir un resultado real de un cliente que tenía las mismas dudas que tú. ¿Te interesa verlo?',
      OVERWHELMED_OWNER: 'Hola, sé que estás ocupado. Solo quería recordarte que estamos aquí cuando estés listo. ¿Hay algo en lo que pueda ayudarte rápido?',
    };
    return followUpPhrases[archetype];
  }

  // ---- HELPERS ----

  private getExplorationQuestion(archetype: LeadArchetype): string {
    const questions: Record<LeadArchetype, string> = {
      DECISIVE: '¿Cuál es el problema principal que quieres resolver hoy?',
      ANALYTICAL: '¿Cómo están midiendo el impacto de este problema en tu operación?',
      SOCIAL: 'Cuéntame, ¿cómo están manejando esto actualmente en tu equipo?',
      CAUTIOUS: '¿Qué es lo que más te preocupa de tu situación actual?',
      SKEPTICAL: '¿Qué has intentado hasta ahora para resolver esto?',
      OVERWHELMED_OWNER: 'Sé que tienes mucho encima. ¿Qué es lo que más te quita tiempo del día a día?',
    };
    return questions[archetype];
  }

  private getDeepExploration(archetype: LeadArchetype, temperature: LeadTemperature): string {
    if (temperature === 'HOT') {
      return 'Parece que esto es urgente para ti. ¿Qué pasaría si no lo resuelves esta semana?';
    }
    return '¿Y cómo afecta esto tu día a día? Me ayudas a entender la magnitud.';
  }

  private getNextStepProposal(archetype: LeadArchetype): string {
    const proposals: Record<LeadArchetype, string> = {
      DECISIVE: 'Lo que sugiero es agendar una llamada de 15 minutos para definir el plan. ¿Te funciona esta semana?',
      ANALYTICAL: 'Lo que puedo hacer es enviarte un análisis detallado de cómo funcionaría en tu caso. ¿Te parece?',
      SOCIAL: 'Me gustaría agendar una llamada para contarte cómo otros negocios como el tuyo lo resolvieron. ¿Te animas?',
      CAUTIOUS: 'Propongo esto: agendemos una llamada sin compromiso para que veas exactamente cómo funciona. ¿Te parece bien?',
      SKEPTICAL: 'Lo que te propongo es una demo de 15 minutos para que lo veas con tus propios ojos. ¿Te interesa?',
      OVERWHELMED_OWNER: 'Te propongo algo simple: una llamada rápida de 10 minutos para ver si podemos ayudarte. ¿Cuándo te viene bien?',
    };
    return proposals[archetype];
  }

  private enforceOneIdea(response: string): string {
    // Take only the first 2 sentences max
    const sentences = response.split(/(?<=[.!?])\s+/);
    if (sentences.length > 2) {
      return sentences.slice(0, 2).join(' ');
    }
    return response;
  }

  private enforceShortResponse(response: string): string {
    // Max ~200 characters for directed conversation
    if (response.length > 250) {
      return response.substring(0, 247) + '...';
    }
    return response;
  }

  // ---- TOOL DETECTION ----

  detectToolNeeds(stage: ConversationStageType, message: string): ToolType[] {
    const tools: ToolType[] = [];
    const lower = message.toLowerCase();

    // Scheduling keywords
    if (lower.includes('agendar') || lower.includes('cita') || lower.includes('reunión') || lower.includes('llamada') || lower.includes('horario')) {
      tools.push('SCHEDULE_APPOINTMENT');
    }

    // Calendar check
    if (lower.includes('disponible') || lower.includes('cuándo puedes') || lower.includes('qué horario')) {
      tools.push('CHECK_CALENDAR');
    }

    // Deal creation (only at INTENT+ stage)
    if ((stage === 'INTENT' || stage === 'CLOSING') && (lower.includes('va') || lower.includes('hagámoslo') || lower.includes('me animo') || lower.includes('adelante'))) {
      tools.push('CREATE_DEAL');
      tools.push('UPDATE_PIPELINE');
    }

    // Quote generation (only at INTENT+ stage)
    if ((stage === 'INTENT' || stage === 'CLOSING') && (lower.includes('cotización') || lower.includes('propuesta') || lower.includes('presupuesto'))) {
      tools.push('GENERATE_QUOTE');
    }

    // Link sending
    if (lower.includes('link') || lower.includes('enlace') || lower.includes('url') || lower.includes('página')) {
      tools.push('SEND_LINK');
    }

    // Reminder
    if (lower.includes('recuérdame') || lower.includes('recordatorio') || lower.includes('no olvidar')) {
      tools.push('SEND_REMINDER');
    }

    return tools;
  }

  private buildToolParams(toolType: ToolType, message: string): Record<string, unknown> {
    switch (toolType) {
      case 'SCHEDULE_APPOINTMENT':
        return { type: 'discovery_call', duration: 15, source: 'ai_suggestion' };
      case 'CHECK_CALENDAR':
        return { range: '7d', slotDuration: 15 };
      case 'CREATE_DEAL':
        return { source: 'ai_conversation', probability: 0.7 };
      case 'UPDATE_PIPELINE':
        return { newStage: 'closing', reason: 'lead_ready' };
      case 'GENERATE_QUOTE':
        return { format: 'pdf', includeTerms: true };
      case 'SEND_LINK':
        return { linkType: 'booking', source: 'conversation' };
      case 'SEND_REMINDER':
        return { delay: 24, channel: 'whatsapp' };
      default:
        return {};
    }
  }
}

// ============================================================
// MARK — Marketing Autonomous Agent (Carnal #8)
// "El que nutre, segmenta y reactiva"
// ============================================================

import { type LeadArchetype, type ConversationStageType, type LeadTemperature } from './types';

export interface CampaignConfig {
  id: string;
  name: string;
  segmentQuery: Record<string, unknown>;
  channel: 'whatsapp' | 'email' | 'sms';
  templateBody: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
}

export interface SegmentResult {
  conditions: {
    tags?: string[];
    stages?: ConversationStageType[];
    lastInteractionDays?: number;
    scoreRange?: [number, number];
    temperature?: LeadTemperature;
  };
  estimatedCount: number;
}

export class MarketingAgent {
  /**
   * Segment leads based on dynamic conditions.
   */
  segmentLeads(conditions: SegmentResult['conditions']): { query: string; description: string } {
    const parts: string[] = [];

    if (conditions.tags?.length) {
      parts.push(`tags includes [${conditions.tags.join(', ')}]`);
    }
    if (conditions.stages?.length) {
      parts.push(`stage in [${conditions.stages.join(', ')}]`);
    }
    if (conditions.lastInteractionDays) {
      parts.push(`last interaction > ${conditions.lastInteractionDays} days ago`);
    }
    if (conditions.scoreRange) {
      parts.push(`score between ${conditions.scoreRange[0]} and ${conditions.scoreRange[1]}`);
    }
    if (conditions.temperature) {
      parts.push(`temperature = ${conditions.temperature}`);
    }

    return {
      query: parts.join(' AND '),
      description: `Segment: ${parts.join(', ')}`,
    };
  }

  /**
   * Determine if a lead needs marketing intervention.
   */
  shouldIntervene(
    timeSinceLastContact: number, // hours
    stage: ConversationStageType,
    churnRisk: number,
    hasActiveConversation: boolean
  ): { shouldIntervene: boolean; strategy: string; urgency: 'low' | 'medium' | 'high' } {
    // Dormant lead: no contact for 7+ days
    if (timeSinceLastContact >= 168 && !hasActiveConversation) {
      return { shouldIntervene: true, strategy: 'reactivation', urgency: 'medium' };
    }

    // Cold lead with high churn risk
    if (churnRisk > 0.6 && stage === 'FOLLOW_UP') {
      return { shouldIntervene: true, strategy: 'win_back', urgency: 'high' };
    }

    // Lead in exploration that stopped responding
    if (timeSinceLastContact >= 48 && (stage === 'EXPLORATION' || stage === 'INTEREST')) {
      return { shouldIntervene: true, strategy: 'nurture', urgency: 'low' };
    }

    // New lead: trigger welcome sequence
    if (stage === 'EXPLORATION' && timeSinceLastContact < 1) {
      return { shouldIntervene: true, strategy: 'welcome', urgency: 'medium' };
    }

    return { shouldIntervene: false, strategy: 'none', urgency: 'low' };
  }

  /**
   * Generate marketing message based on strategy and archetype.
   */
  generateMessage(
    strategy: string,
    archetype: LeadArchetype,
    businessName: string,
    _customData?: Record<string, string>
  ): string {
    switch (strategy) {
      case 'reactivation':
        return this.getReactivationMessage(archetype, businessName);
      case 'win_back':
        return this.getWinBackMessage(archetype, businessName);
      case 'nurture':
        return this.getNurtureMessage(archetype, businessName);
      case 'welcome':
        return this.getWelcomeMessage(businessName);
      default:
        return `Hola, soy el asistente de ${businessName}. ¿En qué puedo ayudarte?`;
    }
  }

  private getReactivationMessage(archetype: LeadArchetype, businessName: string): string {
    const messages: Record<LeadArchetype, string> = {
      DECISIVE: `Hola, soy de ${businessName}. Hace tiempo no nos contactas. Tengo una opción que te puede interesar. ¿Tienes 5 minutos?`,
      ANALYTICAL: `Hola, de ${businessName}. Actualizamos nuestra oferta y creo que hay datos que te van a interesar. ¿Te los comparto?`,
      SOCIAL: `Hola! De ${businessName}. Quería saludarte y compartirte algo que creo te va a gustar. ¿Cómo has estado?`,
      CAUTIOUS: `Hola, de ${businessName}. Sé que estabas evaluando. Solo quería que supieras que seguimos aquí. Sin presión.`,
      SKEPTICAL: `Hola, de ${businessName}. Tengo un resultado real de un cliente similar. ¿Te interesa verlo?`,
      OVERWHELMED_OWNER: `Hola, de ${businessName}. Sé que estás ocupado. Solo digo: cuando puedas, tenemos algo que te ahorra tiempo.`,
    };
    return messages[archetype];
  }

  private getWinBackMessage(_archetype: LeadArchetype, businessName: string): string {
    return `De ${businessName}: Vimos que no pudiste continuar la conversación. ¿Te gustaría retomar donde quedamos? Sin compromiso.`;
  }

  private getNurtureMessage(_archetype: LeadArchetype, businessName: string): string {
    return `De ${businessName}: Tengo algo que te puede ayudar a tomar una mejor decisión. ¿Te interesa que te comparta info?`;
  }

  private getWelcomeMessage(businessName: string): string {
    return `¡Hola! Bienvenido a ${businessName}. ¿En qué puedo ayudarte hoy?`;
  }

  /**
   * Evaluate campaign performance metrics.
   */
  evaluateCampaignPerformance(stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
  }): { deliveryRate: number; openRate: number; clickRate: number; conversionRate: number; recommendation: string } {
    const deliveryRate = stats.sent > 0 ? stats.delivered / stats.sent : 0;
    const openRate = stats.delivered > 0 ? stats.opened / stats.delivered : 0;
    const clickRate = stats.opened > 0 ? stats.clicked / stats.opened : 0;
    const conversionRate = stats.clicked > 0 ? stats.converted / stats.clicked : 0;

    let recommendation = '';
    if (deliveryRate < 0.8) recommendation = 'Baja tasa de entrega. Revisar números y canal.';
    else if (openRate < 0.3) recommendation = 'Baja apertura. Probar nuevo subject/texto inicial.';
    else if (clickRate < 0.1) recommendation = 'Bajo CTR. Revisar call-to-action.';
    else if (conversionRate < 0.05) recommendation = 'Baja conversión. Ajustar oferta o timing.';
    else recommendation = 'Rendimiento aceptable. Continuar monitoreando.';

    return { deliveryRate, openRate, clickRate, conversionRate, recommendation };
  }

  /**
   * Build MARK's prompt section for the Prompt Compiler.
   */
  getMasterPromptSection(): string {
    return `## MARK — Agente de Marketing Autónomo (ValiAutoFlow)

Eres **MARK**, el agente de marketing del sistema ValiAutoFlow.

No atiendes conversaciones uno a uno (eso es JHON).
Tu rol es **nutrir, segmentar y reactivar leads** a escala.

### RESPONSABILIDADES
- Segmentación dinámica de leads (por comportamiento, etapa, interacciones).
- Envío de campañas automáticas usando templates aprobados.
- Nutrición (drip campaigns) según etapa del lead.
- Análisis de rendimiento de campañas.
- Reactivación de leads inactivos.

### CUÁNDO INTERVIENES
- Un lead pasa X días sin interactuar → campaña de reactivación.
- Se detecta abandono en etapa de interés → contenido educativo.
- Contacto nuevo → secuencia de bienvenida.
- El humano da orden (/campaña) desde Telegram.

### REGLAS
- No interrumpas conversaciones activas de JHON.
- Máximo 2 mensajes de marketing por semana por lead.
- Siempre usar templates aprobados (WhatsApp Cloud API).
- Notificar al humano antes de campañas masivas.
- No enviar campañas fuera de horario de atención.

### FORMATO DE MENSAJES
- Cortos (máximo 2 líneas).
- Con una sola acción clara.
- Sin urgencia falsa.
- Siempre con opción de "no gracias".

IDIOMA: Español neutro LATAM.`;
  }
}

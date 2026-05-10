// ============================================================
// FOLLOWUP ENGINE — The Persistent One (Carnal #5)
// "El que no deja morir los leads"
// ============================================================

import {
  type ConversationStageType,
  type LeadArchetype,
  type MemoryPacket,
} from './types';

export class FollowUpEngine {
  /**
   * Determine if a lead needs follow-up based on context signals.
   */
  shouldFollowUp(
    timeSinceLastContact: number,  // hours
    stage: ConversationStageType,
    churnRisk: number,
    lastMessageDirection: string
  ): { shouldFollowUp: boolean; strategy: string; waitMinutes: number } {
    // Lead said "déjame pensarlo" → schedule follow-up in 24-48h
    if (stage === 'OBJECTION' && lastMessageDirection === 'OUTBOUND') {
      return {
        shouldFollowUp: true,
        strategy: 'objection_recovery',
        waitMinutes: 24 * 60, // 24h
      };
    }

    // Lead unresponsive for 48h → gentle re-engage
    if (timeSinceLastContact >= 48 && lastMessageDirection === 'OUTBOUND') {
      return {
        shouldFollowUp: true,
        strategy: 'gentle_reengage',
        waitMinutes: 0, // immediately
      };
    }

    // Hot lead went silent → re-engage faster (2-4h)
    if (churnRisk > 0.5 && timeSinceLastContact >= 2) {
      return {
        shouldFollowUp: true,
        strategy: 'hot_recovery',
        waitMinutes: 0,
      };
    }

    // Cold lead → nurture sequence
    if (churnRisk < 0.3 && timeSinceLastContact >= 72) {
      return {
        shouldFollowUp: true,
        strategy: 'nurture',
        waitMinutes: 0,
      };
    }

    // Follow-up stage leads
    if (stage === 'FOLLOW_UP' && timeSinceLastContact >= 24) {
      return {
        shouldFollowUp: true,
        strategy: 'follow_up_reengage',
        waitMinutes: 0,
      };
    }

    return { shouldFollowUp: false, strategy: 'none', waitMinutes: 0 };
  }

  /**
   * Generate a follow-up message based on context and archetype.
   * Different strategies per archetype to avoid feeling robotic.
   */
  generateFollowUp(
    stage: ConversationStageType,
    archetype: LeadArchetype,
    memory: MemoryPacket,
    previousAttempts: number
  ): string {
    // Don't follow up more than 5 times
    if (previousAttempts >= 5) {
      return '[MAX_FOLLOWUPS_REACHED] Se alcanzó el máximo de seguimientos.';
    }

    // Escalate urgency with each attempt
    const urgencyLevel = Math.min(previousAttempts, 3);

    switch (archetype) {
      case 'DECISIVE':
        return this.decisiveFollowUp(stage, urgencyLevel, memory);
      case 'ANALYTICAL':
        return this.analyticalFollowUp(stage, urgencyLevel, memory);
      case 'SOCIAL':
        return this.socialFollowUp(stage, urgencyLevel, memory);
      case 'CAUTIOUS':
        return this.cautiousFollowUp(stage, urgencyLevel, memory);
      case 'SKEPTICAL':
        return this.skepticalFollowUp(stage, urgencyLevel, memory);
      case 'OVERWHELMED_OWNER':
        return this.overwhelmedFollowUp(stage, urgencyLevel, memory);
      default:
        return this.cautiousFollowUp(stage, urgencyLevel, memory);
    }
  }

  /**
   * Calculate optimal follow-up window based on stage and temperature.
   */
  calculateOptimalWindow(stage: string, temperature: string): number {
    // Returns minutes until next follow-up
    const baseWindows: Record<string, number> = {
      EXPLORATION: 48 * 60,  // 48h
      INTEREST: 24 * 60,     // 24h
      INTENT: 4 * 60,        // 4h
      OBJECTION: 24 * 60,    // 24h
      CLOSING: 2 * 60,       // 2h
      FOLLOW_UP: 48 * 60,    // 48h
    };

    const temperatureMultiplier: Record<string, number> = {
      HOT: 0.5,    // Faster for hot leads
      WARM: 1.0,
      COLD: 1.5,   // Slower for cold leads
    };

    const base = baseWindows[stage] ?? 24 * 60;
    const multiplier = temperatureMultiplier[temperature] ?? 1.0;
    return Math.round(base * multiplier);
  }

  // ---- ARCHETYPE-SPECIFIC FOLLOW-UPS ----

  private decisiveFollowUp(_stage: string, urgency: number, _memory: MemoryPacket): string {
    const messages = [
      'Tengo los números listos para ti. ¿Cuándo quieres revisarlos?',
      'Solo necesito 10 minutos de tu tiempo para mostrarte el resultado. ¿Hoy o mañana?',
      'Última oportunidad esta semana para agendar. ¿Te animas?',
    ];
    return messages[Math.min(urgency, messages.length - 1)];
  }

  private analyticalFollowUp(_stage: string, urgency: number, _memory: MemoryPacket): string {
    const messages = [
      'Tengo más datos sobre el impacto que te mencioné. ¿Te los comparto?',
      'Preparé un análisis comparativo para tu caso. ¿Cuándo te viene bien revisarlo?',
      'Los datos muestran que businesses como el tuyo ven resultados en 2 semanas. ¿Te interesa ver el estudio?',
    ];
    return messages[Math.min(urgency, messages.length - 1)];
  }

  private socialFollowUp(_stage: string, urgency: number, _memory: MemoryPacket): string {
    const messages = [
      'Hola! Espero que todo vaya bien. Quería compartirte algo que creo te va a gustar.',
      'Cómo vas? Me acordé de ti porque tuve un caso muy similar. ¿Te cuento?',
      'Oye, no quiero ser molesto pero realmente creo que esto te puede ayudar. ¿Me das 5 minutos?',
    ];
    return messages[Math.min(urgency, messages.length - 1)];
  }

  private cautiousFollowUp(_stage: string, urgency: number, _memory: MemoryPacket): string {
    const messages = [
      'Entiendo que necesitas tiempo. Solo quería recordarte que estamos aquí cuando estés listo.',
      'Si tienes dudas, podemos agendar una llamada sin compromiso. Así ves todo con calma.',
      'Quería mencionarte que tenemos garantía. Sé que eso te da más tranquilidad. ¿Te cuento?',
    ];
    return messages[Math.min(urgency, messages.length - 1)];
  }

  private skepticalFollowUp(_stage: string, urgency: number, _memory: MemoryPacket): string {
    const messages = [
      'Tengo un caso real de un cliente que tenía las mismas dudas que tú. ¿Te lo comparto?',
      'Los resultados hablan solos. ¿Te interesa ver testimonios de negocios como el tuyo?',
      'Sé que es difícil confiar. Pero los números no mienten. ¿Quieres ver los datos?',
    ];
    return messages[Math.min(urgency, messages.length - 1)];
  }

  private overwhelmedFollowUp(_stage: string, urgency: number, _memory: MemoryPacket): string {
    const messages = [
      'Sé que estás ocupado. Solo quería recordarte que esto te puede ahorrar tiempo. ¿Cuando puedas?',
      'Hola, solo un mensaje rápido. Esto es muy simple de implementar y te quita trabajo. ¿Te interesa?',
      'No te quiero quitar tiempo. Solo digo: cuando estés listo, estamos aquí. Es súper sencillo.',
    ];
    return messages[Math.min(urgency, messages.length - 1)];
  }
}

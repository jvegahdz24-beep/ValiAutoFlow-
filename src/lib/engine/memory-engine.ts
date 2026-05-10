// ============================================================
// MEMORY ENGINE — The Brain (Carnal #3)
// "El que recuerda todo"
// ============================================================

import { type MemoryPacket, type CognitiveStateInput } from './types';

export class MemoryEngine {
  /**
   * Build a complete memory packet for a lead across 3 dimensions:
   * - Conversational: what was said, objections, tone, interest
   * - Commercial: temperature, score, stage, intention, response time
   * - Operational: who attended, when, what worked, what was promised
   */
  buildMemoryPacket(
    messages: { content: string; direction: string; senderType: string; createdAt: Date }[],
    stateTransitions: { fromStage: string; toStage: string; trigger: string; createdAt: Date }[],
    dealValues: { previousValue: number; newValue: number; reason: string; createdAt: Date }[],
    assignments: { agentType: string; assignedAt: Date; unassignedAt: Date | null; reason: string }[],
    cognitiveState: CognitiveStateInput | null
  ): MemoryPacket {
    return {
      conversational: this.buildConversationalMemory(messages),
      commercial: this.buildCommercialMemory(stateTransitions, dealValues, cognitiveState),
      operational: this.buildOperationalMemory(assignments, messages),
    };
  }

  /**
   * Replay: reconstruct exactly what the system knew at any point.
   * Uses ConversationAssignmentHistory, MessageStatusHistory, StateTransition, DealValueHistory.
   */
  replayCognitive(
    messages: { content: string; direction: string; createdAt: Date }[],
    _stateTransitions: { fromStage: string; toStage: string; trigger: string }[],
    upToIndex?: number
  ): {
    state: CognitiveStateInput;
    policiesApplied: string[];
    decisions: string[];
    responses: string[];
  } {
    const filteredMessages = upToIndex !== undefined ? messages.slice(0, upToIndex + 1) : messages;

    // Reconstruct state from message history
    const inboundMessages = filteredMessages.filter(m => m.direction === 'INBOUND');
    const outboundMessages = filteredMessages.filter(m => m.direction === 'OUTBOUND');

    const state: CognitiveStateInput = {
      temperature: this.inferTemperatureFromMessages(inboundMessages),
      archetype: this.inferArchetypeFromMessages(inboundMessages),
      intentScore: Math.min(inboundMessages.length / 10, 1),
      churnRisk: this.inferChurnRiskFromMessages(inboundMessages, filteredMessages),
      priority: Math.min(Math.round(inboundMessages.length / 2), 10),
      historicalContext: { messageCount: filteredMessages.length },
    };

    return {
      state,
      policiesApplied: this.inferPoliciesFromState(state),
      decisions: outboundMessages.map(m => m.content.substring(0, 100)),
      responses: outboundMessages.map(m => m.content),
    };
  }

  /**
   * Detect promises made to the lead in conversations.
   */
  detectPromises(messages: string[]): string[] {
    const promises: string[] = [];
    const promisePatterns = [
      /voy a enviarte\s+(.+)/gi,
      /te voy a\s+(.+)/gi,
      /agendaré\s+(.+)/gi,
      /te comparto\s+(.+)/gi,
      /te envío\s+(.+)/gi,
      /vamos a\s+(.+)/gi,
      /te agendo\s+(.+)/gi,
      /para la próxima semana\s+(.+)/gi,
    ];

    for (const message of messages) {
      for (const pattern of promisePatterns) {
        const matches = message.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) promises.push(match[1].trim());
        }
      }
    }

    return promises;
  }

  // ---- CONVERSATIONAL MEMORY ----

  private buildConversationalMemory(
    messages: { content: string; direction: string; senderType: string; createdAt: Date }[]
  ): string {
    if (messages.length === 0) return 'Sin historial conversacional previo.';

    const parts: string[] = [];
    const inbound = messages.filter(m => m.direction === 'INBOUND');
    const outbound = messages.filter(m => m.direction === 'OUTBOUND');

    // Message count and recency
    parts.push(`${messages.length} mensajes en total (${inbound.length} del lead, ${outbound.length} del sistema).`);

    // Detect objections
    const objections = inbound.filter(m =>
      /pero|no sé|pensarlo|caro|no tengo|dudo|tal vez/i.test(m.content)
    );
    if (objections.length > 0) {
      parts.push(`Objeciones detectadas: ${objections.length}. Última objeción: "${objections[objections.length - 1].content.substring(0, 80)}".`);
    }

    // Detect interest signals
    const interestSignals = inbound.filter(m =>
      /me interesa|quiero|necesito|cuánto|precio|agendar|cómo funciona/i.test(m.content)
    );
    if (interestSignals.length > 0) {
      parts.push(`Señales de interés: ${interestSignals.length}. Última señal: "${interestSignals[interestSignals.length - 1].content.substring(0, 80)}".`);
    }

    // Tone analysis
    const avgLength = inbound.reduce((sum, m) => sum + m.content.length, 0) / (inbound.length || 1);
    const tone = avgLength < 30 ? 'Breve y directo' : avgLength < 100 ? 'Moderado' : 'Detallado y extenso';
    parts.push(`Tono del lead: ${tone}.`);

    // Promises made
    const promises = this.detectPromises(outbound.map(m => m.content));
    if (promises.length > 0) {
      parts.push(`Promesas hechas: ${promises.slice(0, 3).join('; ')}.`);
    }

    return parts.join(' ');
  }

  // ---- COMMERCIAL MEMORY ----

  private buildCommercialMemory(
    stateTransitions: { fromStage: string; toStage: string; trigger: string; createdAt: Date }[],
    dealValues: { previousValue: number; newValue: number; reason: string; createdAt: Date }[],
    cognitiveState: CognitiveStateInput | null
  ): string {
    const parts: string[] = [];

    if (cognitiveState) {
      parts.push(`Temperatura actual: ${cognitiveState.temperature}. Arquetipo: ${cognitiveState.archetype}. Score de intención: ${(cognitiveState.intentScore * 100).toFixed(0)}%. Riesgo de fuga: ${(cognitiveState.churnRisk * 100).toFixed(0)}%. Prioridad: ${cognitiveState.priority}/10.`);
    }

    if (stateTransitions.length > 0) {
      const latest = stateTransitions[stateTransitions.length - 1];
      parts.push(`Última transición: ${latest.fromStage} → ${latest.toStage} (razón: ${latest.trigger}). Total transiciones: ${stateTransitions.length}.`);
    }

    if (dealValues.length > 0) {
      const latest = dealValues[dealValues.length - 1];
      parts.push(`Valor del deal: $${latest.newValue} (anterior: $${latest.previousValue}, razón: ${latest.reason}). Historial de cambios: ${dealValues.length}.`);
    }

    return parts.length > 0 ? parts.join(' ') : 'Sin historial comercial.';
  }

  // ---- OPERATIONAL MEMORY ----

  private buildOperationalMemory(
    assignments: { agentType: string; assignedAt: Date; unassignedAt: Date | null; reason: string }[],
    messages: { content: string; direction: string; senderType: string; createdAt: Date }[]
  ): string {
    const parts: string[] = [];

    // Who attended and when
    if (assignments.length > 0) {
      const latest = assignments[assignments.length - 1];
      parts.push(`Último agente asignado: ${latest.agentType}. Razón: ${latest.reason}. Total reasignaciones: ${assignments.length}.`);
    }

    // Response time analysis
    const inbound = messages.filter(m => m.direction === 'INBOUND');
    const outbound = messages.filter(m => m.direction === 'OUTBOUND');
    if (inbound.length > 0 && outbound.length > 0) {
      // Simple response time estimation
      const avgResponseMinutes = this.estimateResponseTime(inbound, outbound);
      parts.push(`Tiempo promedio de respuesta: ${avgResponseMinutes} minutos.`);
    }

    // What worked (outbound messages that led to inbound responses)
    const successfulOutbound = outbound.filter(o => {
      const nextInbound = inbound.find(i => new Date(i.createdAt) > new Date(o.createdAt));
      return nextInbound !== undefined;
    });
    if (successfulOutbound.length > 0) {
      parts.push(`Mensajes que generaron respuesta: ${successfulOutbound.length} de ${outbound.length}.`);
    }

    return parts.length > 0 ? parts.join(' ') : 'Sin historial operacional.';
  }

  // ---- HELPERS ----

  private inferTemperatureFromMessages(messages: { content: string; direction: string; createdAt: Date }[]): 'COLD' | 'WARM' | 'HOT' {
    const hotSignals = messages.filter(m =>
      /quiero|necesito|ya|agendar|cuánto|ahora|urgente|hagámoslo/i.test(m.content)
    ).length;
    const warmSignals = messages.filter(m =>
      /me interesa|podría|tal vez|cuéntame|información/i.test(m.content)
    ).length;

    if (hotSignals >= 2) return 'HOT';
    if (warmSignals >= 2 || hotSignals >= 1) return 'WARM';
    return 'COLD';
  }

  private inferArchetypeFromMessages(messages: { content: string; direction: string; createdAt: Date }[]): 'DECISIVE' | 'ANALYTICAL' | 'SOCIAL' | 'CAUTIOUS' | 'SKEPTICAL' | 'OVERWHELMED_OWNER' {
    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / (messages.length || 1);
    const hasQuestions = messages.some(m => m.content.includes('?'));
    const hasSkepticism = messages.some(m => /no creo|dudo|es seguro|confío/i.test(m.content));
    const hasUrgency = messages.some(m => /urgente|ya|rápido|ahora/i.test(m.content));
    const hasSocial = messages.some(m => /gracias|hola|buenos días|amigo/i.test(m.content));
    const hasOverwhelm = messages.some(m => /mucho|ocupado|no tengo tiempo|complicado/i.test(m.content));

    if (hasUrgency && avgLength < 30) return 'DECISIVE';
    if (hasQuestions && avgLength > 80) return 'ANALYTICAL';
    if (hasSocial) return 'SOCIAL';
    if (hasSkepticism) return 'SKEPTICAL';
    if (hasOverwhelm) return 'OVERWHELMED_OWNER';
    return 'CAUTIOUS';
  }

  private inferChurnRiskFromMessages(
    inbound: { content: string; direction: string; createdAt: Date }[],
    all: { content: string; direction: string; createdAt: Date }[]
  ): number {
    const objectionWords = inbound.filter(m => /pero|no sé|pensarlo|caro|después|no tengo/i.test(m.content)).length;
    const timeGaps = this.detectTimeGaps(all);
    const avgGap = timeGaps.length > 0 ? timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length : 0;

    const objectionRisk = Math.min(objectionWords / 3, 1);
    const gapRisk = Math.min(avgGap / 72, 1); // 72h gap = high risk

    return Math.min(objectionRisk * 0.5 + gapRisk * 0.5, 1);
  }

  private detectTimeGaps(messages: { createdAt: Date }[]): number[] {
    const gaps: number[] = [];
    const sorted = messages.map(m => new Date(m.createdAt).getTime()).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60)); // hours
    }
    return gaps;
  }

  private inferPoliciesFromState(state: CognitiveStateInput): string[] {
    const policies: string[] = [];
    if (state.intentScore < 0.4) policies.push('NO_PRICE_EARLY');
    if (state.churnRisk > 0.5) policies.push('SOFT_APPROACH');
    policies.push('MAX_2_QUESTIONS');
    policies.push('ONE_ACTION_NEXT');
    return policies;
  }

  private estimateResponseTime(
    inbound: { createdAt: Date }[],
    outbound: { createdAt: Date }[]
  ): number {
    // Simple: find average gap between inbound and next outbound
    const times: number[] = [];
    for (const inMsg of inbound) {
      const inTime = new Date(inMsg.createdAt).getTime();
      const nextOut = outbound.find(o => new Date(o.createdAt).getTime() > inTime);
      if (nextOut) {
        times.push((new Date(nextOut.createdAt).getTime() - inTime) / (1000 * 60));
      }
    }
    return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  }
}

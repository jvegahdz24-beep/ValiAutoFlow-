// ============================================================
// COGNITIVE STATE RESOLVER
// Builds the real cognitive state of a lead
// ============================================================

import { type CognitiveStateInput, type LeadTemperature, type LeadArchetype } from './types';

export class CognitiveStateResolver {
  resolve(
    currentCognitiveState: CognitiveStateInput | null,
    messages: { content: string; direction: string; createdAt: Date }[],
    stageInfo: { stage: string; confidence: number },
    dealValue: number | null,
    timeSinceLastContact: number
  ): CognitiveStateInput {
    const temperature = this.calculateTemperature(
      currentCognitiveState?.temperature ?? 'COLD',
      messages.filter(m => m.direction === 'INBOUND').length,
      timeSinceLastContact,
      this.countIntentSignals(messages.filter(m => m.direction === 'INBOUND'))
    );

    const archetype = this.detectArchetype(messages.filter(m => m.direction === 'INBOUND'));

    const intentScore = this.calculateIntentScore(
      stageInfo.stage,
      temperature,
      this.countIntentSignals(messages.filter(m => m.direction === 'INBOUND'))
    );

    const churnRisk = this.calculateChurnRisk(
      timeSinceLastContact,
      this.estimateResponsePattern(messages),
      this.countObjections(messages.filter(m => m.direction === 'INBOUND'))
    );

    const priority = this.calculatePriority(temperature, intentScore, churnRisk, dealValue);

    return {
      temperature,
      archetype: currentCognitiveState?.archetype ?? archetype,
      intentScore,
      churnRisk,
      priority,
      historicalContext: {
        ...((currentCognitiveState?.historicalContext as Record<string, unknown>) ?? {}),
        lastUpdated: new Date().toISOString(),
        messageCount: messages.length,
      },
    };
  }

  private calculateTemperature(current: LeadTemperature, inboundCount: number, avgResponseHours: number, intentSignals: number): LeadTemperature {
    let score = 0;
    const tempOrder: Record<LeadTemperature, number> = { COLD: 0, WARM: 1, HOT: 2 };
    score += tempOrder[current] * 2;
    score += Math.min(inboundCount / 5, 2);
    score += Math.min(intentSignals / 2, 2);
    if (avgResponseHours < 1) score += 2;
    else if (avgResponseHours < 24) score += 1;

    if (score >= 5) return 'HOT';
    if (score >= 3) return 'WARM';
    return 'COLD';
  }

  private detectArchetype(messages: { content: string }[]): LeadArchetype {
    const avgLength = messages.reduce((s, m) => s + m.content.length, 0) / (messages.length || 1);
    const hasQ = messages.some(m => m.content.includes('?'));
    const hasUrgency = messages.some(m => /urgente|ya|rápido|ahora/i.test(m.content));
    const hasSkepticism = messages.some(m => /no creo|dudo|es seguro/i.test(m.content));
    const hasSocial = messages.some(m => /gracias|hola|buenos días/i.test(m.content));
    const hasOverwhelm = messages.some(m => /mucho|ocupado|no tengo tiempo/i.test(m.content));

    if (hasUrgency && avgLength < 30) return 'DECISIVE';
    if (hasQ && avgLength > 80) return 'ANALYTICAL';
    if (hasSocial) return 'SOCIAL';
    if (hasSkepticism) return 'SKEPTICAL';
    if (hasOverwhelm) return 'OVERWHELMED_OWNER';
    return 'CAUTIOUS';
  }

  private calculateIntentScore(stage: string, temperature: LeadTemperature, signals: number): number {
    const stageScore: Record<string, number> = { EXPLORATION: 0.1, INTEREST: 0.3, INTENT: 0.6, OBJECTION: 0.4, CLOSING: 0.85, FOLLOW_UP: 0.2 };
    const tempScore: Record<string, number> = { COLD: 0.1, WARM: 0.3, HOT: 0.6 };
    return Math.min((stageScore[stage] ?? 0.1) * 0.5 + (tempScore[temperature] ?? 0.1) * 0.3 + Math.min(signals / 5, 1) * 0.2, 1);
  }

  private calculateChurnRisk(timeSinceLast: number, responsePattern: number, objectionCount: number): number {
    return Math.min(timeSinceLast / 168 * 0.4 + responsePattern * 0.3 + Math.min(objectionCount / 3, 1) * 0.3, 1);
  }

  private calculatePriority(temperature: LeadTemperature, intentScore: number, churnRisk: number, dealValue: number | null): number {
    const tempScore = { COLD: 1, WARM: 3, HOT: 5 }[temperature];
    const dealScore = dealValue ? Math.min(dealValue / 10000, 3) : 0;
    return Math.min(Math.round(tempScore + intentScore * 3 + churnRisk * 2 + dealScore), 10);
  }

  private countIntentSignals(messages: { content: string }[]): number {
    return messages.filter(m => /quiero|necesito|cuánto|precio|agendar|hagámoslo|me animo/i.test(m.content)).length;
  }

  private countObjections(messages: { content: string }[]): number {
    return messages.filter(m => /pero|no sé|pensarlo|caro|no tengo/i.test(m.content)).length;
  }

  private estimateResponsePattern(messages: { direction: string; createdAt: Date }[]): number {
    const inbound = messages.filter(m => m.direction === 'INBOUND');
    const outbound = messages.filter(m => m.direction === 'OUTBOUND');
    if (inbound.length === 0 || outbound.length === 0) return 0.5;

    let totalGap = 0;
    let count = 0;
    for (const inMsg of inbound) {
      const nextOut = outbound.find(o => new Date(o.createdAt) > new Date(inMsg.createdAt));
      if (nextOut) {
        totalGap += (new Date(nextOut.createdAt).getTime() - new Date(inMsg.createdAt).getTime()) / (1000 * 60 * 60);
        count++;
      }
    }
    return count > 0 ? Math.min(totalGap / count / 48, 1) : 0.5;
  }
}

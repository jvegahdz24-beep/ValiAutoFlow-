// ============================================================
// CONVERSATION STAGE DETECTOR
// Detects the current stage of a conversation
// ============================================================

import { type ConversationStageType, type LeadTemperature, type LeadArchetype } from './types';

export class ConversationStageDetector {
  detectStage(
    messageContent: string,
    currentStage: ConversationStageType,
    temperature: LeadTemperature,
    _archetype: LeadArchetype,
    messageCount: number
  ): { stage: ConversationStageType; confidence: number; triggerReason: string } {
    const scores: Record<ConversationStageType, number> = {
      EXPLORATION: 0, INTEREST: 0, INTENT: 0, OBJECTION: 0, CLOSING: 0, FOLLOW_UP: 0,
    };
    const lower = messageContent.toLowerCase();

    // EXPLORATION
    ['hola', 'buenos', 'información', 'qué es', 'cómo funciona', 'me interesa saber', 'cuéntame'].forEach(kw => { if (lower.includes(kw)) scores.EXPLORATION += 2; });
    if (messageCount <= 2) scores.EXPLORATION += 3;

    // INTEREST
    ['me interesa', 'podría funcionar', 'qué incluye', 'cómo sería', 'me gusta', 'parece bien'].forEach(kw => { if (lower.includes(kw)) scores.INTEREST += 2; });
    if (lower.includes('?') && messageCount > 2) scores.INTEREST += 1;

    // INTENT
    ['quiero', 'necesito', 'cuánto cuesta', 'precio', 'inversión', 'cuándo podemos', 'agendar', 'cómo empezamos'].forEach(kw => { if (lower.includes(kw)) scores.INTENT += 3; });

    // OBJECTION
    ['pero', 'no sé', 'pensarlo', 'después', 'caro', 'no tengo tiempo', 'no estoy seguro', 'dudo', 'tal vez'].forEach(kw => { if (lower.includes(kw)) scores.OBJECTION += 3; });

    // CLOSING
    ['hagámoslo', 'va', 'adelante', 'me animo', 'cuándo empezamos', 'firmo', 'procedamos', 'agéndame'].forEach(kw => { if (lower.includes(kw)) scores.CLOSING += 4; });

    // FOLLOW_UP
    ['todavía', 'aún', 'sigo', 'recuerdas', 'habíamos quedado', 'qué pasó'].forEach(kw => { if (lower.includes(kw)) scores.FOLLOW_UP += 2; });

    // Temperature modifiers
    if (temperature === 'HOT') { scores.INTENT += 1; scores.CLOSING += 1; }
    if (temperature === 'COLD') { scores.EXPLORATION += 1; }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return { stage: currentStage, confidence: 0.3, triggerReason: 'No signals' };

    let bestStage = currentStage;
    let bestScore = 0;
    for (const [stage, score] of Object.entries(scores)) {
      if (score > bestScore) { bestScore = score; bestStage = stage as ConversationStageType; }
    }

    // Dampen large jumps
    const order: ConversationStageType[] = ['EXPLORATION', 'INTEREST', 'INTENT', 'OBJECTION', 'CLOSING', 'FOLLOW_UP'];
    if (Math.abs(order.indexOf(bestStage) - order.indexOf(currentStage)) > 2 && bestScore < 5) {
      return { stage: currentStage, confidence: 0.4, triggerReason: `Dampened: ${currentStage}→${bestStage}` };
    }

    return { stage: bestStage, confidence: Math.min(bestScore / 6, 1), triggerReason: `Detected ${bestStage} (score: ${bestScore})` };
  }
}

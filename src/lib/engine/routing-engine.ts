// ============================================================
// ROUTING ENGINE — The Classifier (Carnal #4)
// "El que clasifica y dirige"
// ============================================================

import {
  type ConversationStageType,
  type LeadTemperature,
  type LeadArchetype,
  type CognitiveStateInput,
  type CarnalType,
  type UrgencyLevel,
  type IntentionType,
} from './types';

export class RoutingEngine {
  /**
   * Classify a message and determine the full routing decision.
   * This engine decides: stage, priority, intention, risk, urgency, and which Carnal handles it.
   */
  classify(
    messageContent: string,
    currentStage: ConversationStageType,
    cognitiveState: CognitiveStateInput | null,
    messageCount: number,
    timeSinceLastContact: number
  ): {
    stage: ConversationStageType;
    confidence: number;
    triggerReason: string;
    priority: number;
    urgency: UrgencyLevel;
    intention: IntentionType;
    closeProbability: number;
    riskOfDrop: number;
    assignedAgent: CarnalType;
    escalateToHuman: boolean;
  } {
    // Step 1: Detect stage from message signals
    const stageResult = this.detectStage(messageContent, currentStage, messageCount);

    // Step 2: Calculate risk and probability
    const closeProbability = this.calculateCloseProbability(
      stageResult.stage,
      cognitiveState?.temperature ?? 'COLD',
      cognitiveState?.intentScore ?? 0
    );

    const riskOfDrop = this.calculateDropRisk(
      timeSinceLastContact,
      cognitiveState?.churnRisk ?? 0,
      this.countObjectionSignals(messageContent)
    );

    // Step 3: Determine intention
    const intention = this.determineIntention(stageResult.stage, closeProbability, riskOfDrop);

    // Step 4: Calculate priority and urgency
    const priority = this.calculatePriority(
      cognitiveState?.temperature ?? 'COLD',
      closeProbability,
      riskOfDrop,
      cognitiveState?.priority ?? 5
    );

    const urgency = this.calculateUrgency(priority, riskOfDrop, timeSinceLastContact);

    // Step 5: Route to the appropriate Carnal
    const assignedAgent = this.routeToAgent(stageResult.stage, riskOfDrop, intention);

    // Step 6: Check if escalation to human is needed
    const escalateToHuman = this.shouldEscalateToHuman(cognitiveState, stageResult.stage, riskOfDrop, messageContent);

    return {
      stage: stageResult.stage,
      confidence: stageResult.confidence,
      triggerReason: stageResult.triggerReason,
      priority,
      urgency,
      intention,
      closeProbability,
      riskOfDrop,
      assignedAgent,
      escalateToHuman,
    };
  }

  // ---- STAGE DETECTION ----

  private detectStage(
    message: string,
    currentStage: ConversationStageType,
    messageCount: number
  ): { stage: ConversationStageType; confidence: number; triggerReason: string } {
    const lower = message.toLowerCase();
    const scores: Record<ConversationStageType, number> = {
      EXPLORATION: 0,
      INTEREST: 0,
      INTENT: 0,
      OBJECTION: 0,
      CLOSING: 0,
      FOLLOW_UP: 0,
    };

    // EXPLORATION signals
    const explorationKeywords = ['hola', 'buenos días', 'buenas tardes', 'información', 'qué es', 'cómo funciona', 'me interesa saber', 'quiero saber', 'cuéntame'];
    explorationKeywords.forEach(kw => { if (lower.includes(kw)) scores.EXPLORATION += 2; });
    if (messageCount <= 2) scores.EXPLORATION += 3;

    // INTEREST signals
    const interestKeywords = ['me interesa', 'podría funcionar', 'qué incluye', 'cómo sería', 'me gusta', 'parece bien', 'features', 'características'];
    interestKeywords.forEach(kw => { if (lower.includes(kw)) scores.INTEREST += 2; });
    if (lower.includes('?') && messageCount > 2) scores.INTEREST += 1;

    // INTENT signals
    const intentKeywords = ['quiero', 'necesito', 'cuánto cuesta', 'precio', 'inversión', 'cuándo podemos', 'agendar', 'cómo empezamos', 'quiero empezar'];
    intentKeywords.forEach(kw => { if (lower.includes(kw)) scores.INTENT += 3; });

    // OBJECTION signals
    const objectionKeywords = ['pero', 'no sé', 'pensarlo', 'después', 'caro', 'no tengo tiempo', 'no estoy seguro', 'dudo', 'tal vez', 'lo voy a pensar'];
    objectionKeywords.forEach(kw => { if (lower.includes(kw)) scores.OBJECTION += 3; });

    // CLOSING signals
    const closingKeywords = ['hagámoslo', 'va', 'adelante', 'me animo', 'cuándo empezamos', 'firmo', 'procedamos', 'perfecto', 'agéndame'];
    closingKeywords.forEach(kw => { if (lower.includes(kw)) scores.CLOSING += 4; });

    // FOLLOW_UP signals
    const followUpKeywords = ['todavía', 'aún', 'sigo', 'recuerdas', 'habíamos quedado', 'qué pasó', 'no me contestaron'];
    followUpKeywords.forEach(kw => { if (lower.includes(kw)) scores.FOLLOW_UP += 2; });

    // If no strong signals, maintain current stage
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return { stage: currentStage, confidence: 0.3, triggerReason: 'No strong signals detected, maintaining current stage' };
    }

    // Find the stage with highest score
    let bestStage: ConversationStageType = 'EXPLORATION';
    let bestScore = 0;
    for (const [stage, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestStage = stage as ConversationStageType;
      }
    }

    // Stage transition dampening: don't jump stages too quickly
    const stageOrder: ConversationStageType[] = ['EXPLORATION', 'INTEREST', 'INTENT', 'OBJECTION', 'CLOSING', 'FOLLOW_UP'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const newIndex = stageOrder.indexOf(bestStage);
    if (Math.abs(newIndex - currentIndex) > 2 && bestScore < 5) {
      return { stage: currentStage, confidence: 0.4, triggerReason: `Dampened jump from ${currentStage} to ${bestStage}` };
    }

    const confidence = Math.min(bestScore / 6, 1);
    const triggerReason = `Detected ${bestStage} signals (score: ${bestScore}) in message`;

    return { stage: bestStage, confidence, triggerReason };
  }

  // ---- RISK & PROBABILITY ----

  private calculateCloseProbability(stage: string, temperature: string, intentScore: number): number {
    const stageWeight: Record<string, number> = {
      EXPLORATION: 0.1, INTEREST: 0.25, INTENT: 0.55, OBJECTION: 0.35, CLOSING: 0.85, FOLLOW_UP: 0.2,
    };
    const tempWeight: Record<string, number> = { COLD: 0.1, WARM: 0.3, HOT: 0.6 };

    const base = stageWeight[stage] ?? 0.1;
    const temp = tempWeight[temperature] ?? 0.1;
    return Math.min(base * 0.5 + temp * 0.3 + intentScore * 0.2, 1);
  }

  private calculateDropRisk(timeSinceLastContact: number, churnRisk: number, objectionCount: number): number {
    const timeRisk = Math.min(timeSinceLastContact / 168, 1); // 168h = 1 week
    const objectionRisk = Math.min(objectionCount / 3, 1);
    return Math.min(timeRisk * 0.4 + churnRisk * 0.4 + objectionRisk * 0.2, 1);
  }

  private countObjectionSignals(message: string): number {
    const lower = message.toLowerCase();
    const signals = ['pero', 'no sé', 'pensarlo', 'caro', 'no tengo', 'dudo', 'tal vez', 'problema', 'difícil'];
    return signals.filter(s => lower.includes(s)).length;
  }

  // ---- INTENTION ----

  private determineIntention(stage: string, closeProbability: number, riskOfDrop: number): IntentionType {
    if (riskOfDrop > 0.7) return 'RECOVER';
    if (closeProbability > 0.7) return 'CLOSE';
    switch (stage) {
      case 'EXPLORATION': return 'DIAGNOSE';
      case 'INTEREST': return 'NURTURE';
      case 'INTENT': return 'SELL';
      case 'OBJECTION': return 'RECOVER';
      case 'CLOSING': return 'CLOSE';
      case 'FOLLOW_UP': return 'NURTURE';
      default: return 'DIAGNOSE';
    }
  }

  // ---- PRIORITY & URGENCY ----

  private calculatePriority(temperature: string, closeProbability: number, riskOfDrop: number, basePriority: number): number {
    const tempScore: Record<string, number> = { COLD: 1, WARM: 2, HOT: 3 };
    const tempVal = tempScore[temperature] ?? 1;
    const raw = basePriority * 0.3 + tempVal * 2 + closeProbability * 3 + riskOfDrop * 2;
    return Math.min(Math.round(raw), 10);
  }

  private calculateUrgency(priority: number, riskOfDrop: number, timeSinceLastContact: number): UrgencyLevel {
    if (priority >= 8 || riskOfDrop > 0.7) return 'HIGH';
    if (priority >= 5 || riskOfDrop > 0.4 || timeSinceLastContact > 72) return 'MEDIUM';
    return 'LOW';
  }

  // ---- ROUTING ----

  private routeToAgent(stage: string, riskOfDrop: number, intention: string): CarnalType {
    // High risk of drop → FOLLOWUP engine (recovery mode)
    if (riskOfDrop > 0.7) return 'FOLLOWUP';

    // Otherwise route by stage
    switch (stage) {
      case 'EXPLORATION': return 'JHON';     // JHON in diagnose mode
      case 'INTEREST': return 'JHON';        // JHON in nurture mode
      case 'INTENT': return 'JHON';          // JHON in sell mode
      case 'OBJECTION': return 'JHON';       // JHON in recovery mode
      case 'CLOSING': return 'JHON';         // JHON + TOOL_OS
      case 'FOLLOW_UP': return 'FOLLOWUP';   // FollowUp engine
      default: return 'JHON';
    }
  }

  // ---- ESCALATION ----

  private shouldEscalateToHuman(
    cognitiveState: CognitiveStateInput | null,
    stage: string,
    riskOfDrop: number,
    message: string
  ): boolean {
    // Escalate if lead explicitly asks for human
    const humanKeywords = ['hablar con alguien', 'agente humano', 'persona real', 'gerente', 'supervisor'];
    const lower = message.toLowerCase();
    if (humanKeywords.some(kw => lower.includes(kw))) return true;

    // Escalate if hot lead with high churn risk
    if (cognitiveState?.temperature === 'HOT' && riskOfDrop > 0.7) return true;

    // Escalate if score drops suddenly (would be detected by drift)
    if (cognitiveState && cognitiveState.intentScore < 0.2 && cognitiveState.priority >= 7) return true;

    return false;
  }
}

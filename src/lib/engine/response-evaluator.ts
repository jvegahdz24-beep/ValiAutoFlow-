// ============================================================
// RESPONSE EVALUATOR
// Scores the quality of an AI response on 5 dimensions
// ============================================================

import { type ResponseEvaluationResult } from './types';

export class ResponseEvaluator {
  evaluate(
    response: string,
    stage: string,
    archetype: string,
    objective: string
  ): ResponseEvaluationResult {
    const clarity = this.scoreClarity(response);
    const empathy = this.scoreEmpathy(response, archetype);
    const alignment = this.scoreAlignment(response, stage, objective);
    const pressure = this.scorePressure(response);
    const commercialQuality = this.scoreCommercialQuality(response, stage);

    const overallScore = clarity * 0.2 + empathy * 0.15 + alignment * 0.25 + pressure * 0.2 + commercialQuality * 0.2;

    return {
      clarity,
      empathy,
      alignment,
      pressure,
      commercialQuality,
      overallScore: Math.round(overallScore * 100) / 100,
      feedback: this.generateFeedback(clarity, empathy, alignment, pressure, commercialQuality),
    };
  }

  private scoreClarity(response: string): number {
    let score = 0.7;
    if (response.length > 20 && response.length < 300) score += 0.15;
    if (response.length < 20) score -= 0.2;
    if (response.length > 400) score -= 0.15;
    if (/[.!?]/.test(response)) score += 0.1;
    return Math.max(0, Math.min(score, 1));
  }

  private scoreEmpathy(response: string, archetype: string): number {
    let score = 0.5;
    const empathicWords = /entiendo|comprendo|sé cómo|claro|por supuesto|te entiendo|tiene razón|es válido|es normal/i;
    if (empathicWords.test(response)) score += 0.3;

    const personalWords = /\btu\b|\btú\b|\bti\b|\bte\b/i;
    if (personalWords.test(response)) score += 0.1;

    if (archetype === 'OVERWHELMED_OWNER' && /sé que tienes mucho|simple|sencillo|rápido/i.test(response)) score += 0.1;
    if (archetype === 'SKEPTICAL' && /es válido|tienes razón en dudar|los datos/i.test(response)) score += 0.1;

    return Math.max(0, Math.min(score, 1));
  }

  private scoreAlignment(response: string, stage: string, objective: string): number {
    let score = 0.6;
    const stageActions: Record<string, RegExp> = {
      EXPLORATION: /cómo|qué|cuéntame|dime/i,
      INTEREST: /costo de no|implicación|pasa si/i,
      INTENT: /siguiente paso|agendar|proponer|cuándo/i,
      OBJECTION: /entiendo|pero|sin embargo|reformular/i,
      CLOSING: /confirmar|agendar|proceder|listo/i,
      FOLLOW_UP: /recordar|nuevo|actualización|seguir/i,
    };
    if (stageActions[stage]?.test(response)) score += 0.25;

    if (objective && response.toLowerCase().includes(objective.toLowerCase().substring(0, 10))) score += 0.15;

    return Math.max(0, Math.min(score, 1));
  }

  private scorePressure(response: string): number {
    let score = 0.8; // Start high — low pressure is good
    const pressureWords = /ahora mismo|ya mismo|no esperes|última oportunidad|tiene que ser hoy|ya no habrá/i;
    if (pressureWords.test(response)) score -= 0.4;

    const exclamationCount = (response.match(/!/g) || []).length;
    if (exclamationCount > 2) score -= 0.15;

    const capsWords = (response.match(/[A-Z]{3,}/g) || []).length;
    if (capsWords > 0) score -= 0.1;

    return Math.max(0, Math.min(score, 1));
  }

  private scoreCommercialQuality(response: string, stage: string): number {
    let score = 0.5;
    if (/\?/.test(response)) score += 0.15; // Asks questions
    if (/agendar|llamada|reunión|siguiente paso/i.test(response)) score += 0.2; // Proposes action
    if (/costo de no|pierdes|seguir igual|no hacer nada/i.test(response)) score += 0.15; // Shows cost of inaction

    if (stage === 'EXPLORATION' && /precio|costo|inversión|\$/i.test(response)) score -= 0.3; // Selling too early

    return Math.max(0, Math.min(score, 1));
  }

  private generateFeedback(clarity: number, empathy: number, alignment: number, pressure: number, commercial: number): string {
    const issues: string[] = [];
    if (clarity < 0.5) issues.push('Response may be unclear');
    if (empathy < 0.5) issues.push('Needs more empathy');
    if (alignment < 0.5) issues.push('Not aligned with current stage');
    if (pressure < 0.5) issues.push('Too much pressure');
    if (commercial < 0.5) issues.push('Low commercial quality');

    return issues.length > 0 ? issues.join('. ') : 'Good response quality';
  }
}

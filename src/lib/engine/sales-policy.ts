// ============================================================
// SALES POLICY ENGINE
// Formal engine of commercial rules
// ============================================================

import { type SalesPolicyRule, type BehavioralValidationResult, type BehavioralViolation } from './types';

export class SalesPolicyEngine {
  private policies: SalesPolicyRule[];

  constructor(policies: SalesPolicyRule[]) {
    this.policies = policies.filter(p => p.priority >= 0).sort((a, b) => b.priority - a.priority);
  }

  getActivePolicies(): string[] {
    return this.policies.filter(_p => true).map(p => p.ruleType);
  }

  validate(
    proposedResponse: string,
    stage: string,
    context: Record<string, unknown>
  ): BehavioralValidationResult {
    const violations: BehavioralViolation[] = [];

    for (const policy of this.policies) {
      const violation = this.checkPolicy(policy, proposedResponse, stage, context);
      if (violation) violations.push(violation);
    }

    const overallScore = violations.length > 0
      ? Math.max(0, 1 - violations.reduce((sum, v) => sum + (1 - v.score), 0) / 5)
      : 1;

    return {
      isValid: violations.filter(v => v.severity === 'HIGH').length === 0,
      violations,
      overallScore,
    };
  }

  private checkPolicy(policy: SalesPolicyRule, response: string, stage: string, context: Record<string, unknown>): BehavioralViolation | null {
    switch (policy.ruleType) {
      case 'BLOCK_PRICE_EARLY': return this.checkPriceEarly(response, stage);
      case 'MAX_QUESTIONS': return this.checkQuestionCount(response);
      case 'ONE_ACTION_NEXT': return this.checkOneActionNext(response);
      case 'NO_SELL_WITHOUT_PAIN': return this.checkNoSellWithoutPain(response, context);
      case 'BLOCK_OVER_PRESSURE': return this.checkOverPressure(response, stage);
      default: return null;
    }
  }

  private checkPriceEarly(response: string, stage: string): BehavioralViolation | null {
    const priceTerms = /precio|costo|inversión|\$\d+|cuota|mensualidad|plan/i;
    const earlyStages = ['EXPLORATION', 'INTEREST'];
    if (earlyStages.includes(stage) && priceTerms.test(response)) {
      return { type: 'POLICY_COMPLIANCE', severity: 'HIGH', description: 'Pricing mentioned before INTENT stage', score: 0.2 };
    }
    return null;
  }

  private checkQuestionCount(response: string): BehavioralViolation | null {
    const questionCount = (response.match(/\?/g) || []).length;
    if (questionCount > 2) {
      return { type: 'QUESTION_COUNT', severity: 'MEDIUM', description: `${questionCount} questions in one message (max 2)`, score: Math.max(0, 1 - (questionCount - 2) * 0.2) };
    }
    return null;
  }

  private checkOneActionNext(response: string): BehavioralViolation | null {
    const ctaPatterns = [/agendar|llamar|enviar|revisar|confirmar|hacer click|responder|entrar|comenzar|iniciar/gi];
    const matches = ctaPatterns.reduce((count, pattern) => count + (response.match(pattern) || []).length, 0);
    if (matches > 1) {
      return { type: 'POLICY_COMPLIANCE', severity: 'MEDIUM', description: `${matches} CTAs (should be exactly 1)`, score: 0.5 };
    }
    return null;
  }

  private checkNoSellWithoutPain(response: string, context: Record<string, unknown>): BehavioralViolation | null {
    const sellingTerms = /nuestro servicio|te ofrecemos|nuestra solución|contratar|adquirir|comprar/i;
    const hasPain = context.painIdentified === true || context.hasPainPoint === true;
    if (sellingTerms.test(response) && !hasPain) {
      return { type: 'POLICY_COMPLIANCE', severity: 'HIGH', description: 'Selling before identifying pain point', score: 0.1 };
    }
    return null;
  }

  private checkOverPressure(response: string, stage: string): BehavioralViolation | null {
    const pressurePhrases = /ahora mismo|ya mismo|no esperes|última oportunidad|no dejes pasar|tiene que ser hoy|ya no habrá/i;
    const earlyStages = ['EXPLORATION', 'INTEREST'];
    if (earlyStages.includes(stage) && pressurePhrases.test(response)) {
      return { type: 'PRESSURE_CHECK', severity: 'HIGH', description: 'Too much pressure for current stage', score: 0.15 };
    }
    return null;
  }
}

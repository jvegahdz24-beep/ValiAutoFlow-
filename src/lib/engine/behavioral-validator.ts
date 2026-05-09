// ============================================================
// BEHAVIORAL VALIDATOR
// Evaluates if a response is behaviorally appropriate
// ============================================================

import { type BehavioralValidationResult, type BehavioralViolation } from './types';

export class BehavioralValidator {
  validate(
    response: string,
    stage: string,
    conversationHistory: string[],
    policiesApplied: string[]
  ): BehavioralValidationResult {
    const violations: BehavioralViolation[] = [];

    // Pressure check
    const pressure = this.checkPressure(response, stage);
    if (pressure) violations.push(pressure);

    // Robotic tone
    const robotic = this.checkRoboticTone(response);
    if (robotic) violations.push(robotic);

    // Premature close
    const premature = this.checkPrematureClose(response, stage);
    if (premature) violations.push(premature);

    // Question count
    const qCount = (response.match(/\?/g) || []).length;
    if (qCount > 2) {
      violations.push({ type: 'QUESTION_COUNT', severity: 'LOW', description: `${qCount} questions`, score: 0.5 });
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

  private checkPressure(response: string, stage: string): BehavioralViolation | null {
    const earlyStages = ['EXPLORATION', 'INTEREST'];
    const pressurePhrases = /ahora mismo|ya mismo|no esperes|última oportunidad|no dejes pasar|tiene que ser hoy/i;
    if (earlyStages.includes(stage) && pressurePhrases.test(response)) {
      return { type: 'PRESSURE_CHECK', severity: 'HIGH', description: 'Too much pressure for current stage', score: 0.15 };
    }
    return null;
  }

  private checkRoboticTone(response: string): BehavioralViolation | null {
    const jargonPhrases = /le informamos|nuestra empresa le ofrece|no dude en contactarnos|quedamos a su disposición|estimado cliente|le agradecemos su interés/i;
    if (jargonPhrases.test(response)) {
      return { type: 'ROBOTIC_TONE', severity: 'MEDIUM', description: 'Response sounds robotic/corporate', score: 0.4 };
    }

    // Check pronoun ratio (too many "nosotros" = robotic)
    const nosotros = (response.match(/\bnosotros\b|\bnuestro\b|\bnuestra\b/gi) || []).length;
    const tu = (response.match(/\btu\b|\btú\b|\bti\b|\bte\b|\btu\b/gi) || []).length;
    if (nosotros > tu + 2 && response.length > 50) {
      return { type: 'ROBOTIC_TONE', severity: 'LOW', description: 'Too many "nosotros/nuestro", should be more personal', score: 0.6 };
    }

    return null;
  }

  private checkPrematureClose(response: string, stage: string): BehavioralViolation | null {
    const earlyStages = ['EXPLORATION', 'INTEREST'];
    const closingPhrases = /procedamos con el pago|confirma tu compra|complete el formulario|firma aquí|realiza el pago/i;
    if (earlyStages.includes(stage) && closingPhrases.test(response)) {
      return { type: 'PREMATURE_CLOSE', severity: 'HIGH', description: 'Attempting to close before lead is ready', score: 0.1 };
    }
    return null;
  }
}

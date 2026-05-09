// ============================================================
// OBSERVABILITY ENGINE — The Auditor (Carnal #6)
// "El que rastrea todo"
// ============================================================

import {
  type CognitiveStateInput,
  type BehavioralTraceInput,
  type PipelineResult,
} from './types';

export class ObservabilityEngine {
  /**
   * Detect cognitive drift — when behavior changes unexpectedly.
   * E.g., temperature dropped suddenly, intentScore jumped, archetype shifted.
   */
  detectCognitiveDrift(
    previousState: CognitiveStateInput | null,
    currentState: CognitiveStateInput,
    stageTransition: { from: string; to: string } | null
  ): { driftDetected: boolean; magnitude: number; details: string } {
    if (!previousState) {
      return { driftDetected: false, magnitude: 0, details: 'No previous state for comparison' };
    }

    const drifts: string[] = [];
    let totalMagnitude = 0;

    // Temperature drift
    const tempOrder = { COLD: 0, WARM: 1, HOT: 2 };
    const tempDiff = Math.abs(tempOrder[currentState.temperature] - tempOrder[previousState.temperature]);
    if (tempDiff >= 2) {
      drifts.push(`Temperature jumped from ${previousState.temperature} to ${currentState.temperature}`);
      totalMagnitude += 0.5;
    }

    // Intent score drift
    const intentDiff = Math.abs(currentState.intentScore - previousState.intentScore);
    if (intentDiff > 0.4) {
      drifts.push(`Intent score changed by ${(intentDiff * 100).toFixed(0)}% (${(previousState.intentScore * 100).toFixed(0)}% → ${(currentState.intentScore * 100).toFixed(0)}%)`);
      totalMagnitude += intentDiff * 0.5;
    }

    // Churn risk drift
    const churnDiff = Math.abs(currentState.churnRisk - previousState.churnRisk);
    if (churnDiff > 0.3) {
      drifts.push(`Churn risk changed by ${(churnDiff * 100).toFixed(0)}%`);
      totalMagnitude += churnDiff * 0.4;
    }

    // Archetype shift
    if (currentState.archetype !== previousState.archetype) {
      drifts.push(`Archetype shifted from ${previousState.archetype} to ${currentState.archetype}`);
      totalMagnitude += 0.3;
    }

    // Stage regression
    if (stageTransition) {
      const stageOrder = ['EXPLORATION', 'INTEREST', 'INTENT', 'OBJECTION', 'CLOSING', 'FOLLOW_UP'];
      const fromIdx = stageOrder.indexOf(stageTransition.from);
      const toIdx = stageOrder.indexOf(stageTransition.to);
      if (toIdx < fromIdx - 1) {
        drifts.push(`Stage regressed from ${stageTransition.from} to ${stageTransition.to}`);
        totalMagnitude += 0.4;
      }
    }

    const driftDetected = totalMagnitude > 0.3;
    return {
      driftDetected,
      magnitude: Math.min(totalMagnitude, 1),
      details: drifts.length > 0 ? drifts.join('. ') : 'No significant drift detected',
    };
  }

  /**
   * Detect hallucination in AI response.
   * Checks for: factual errors, policy violations, context drift, invented facts.
   */
  detectHallucination(
    response: string,
    context: string,
    policies: string[]
  ): { isHallucination: boolean; type: string; severity: string; details: string } {
    const issues: { type: string; severity: string; details: string }[] = [];

    // Check for invented pricing
    const pricePattern = /\$\d+[,.]?\d*/g;
    const responsePrices = response.match(pricePattern);
    const contextPrices = context.match(pricePattern);
    if (responsePrices && !contextPrices) {
      issues.push({
        type: 'INVENTED_FACT',
        severity: 'HIGH',
        details: `Response contains pricing ($${responsePrices[0]}) not present in context`,
      });
    }

    // Check for policy violations in response
    if (policies.includes('NO_PRICE_EARLY') && pricePattern.test(response)) {
      issues.push({
        type: 'POLICY_VIOLATION',
        severity: 'MEDIUM',
        details: 'Response includes pricing despite NO_PRICE_EARLY policy',
      });
    }

    // Check for context drift (response not related to context)
    const contextWords = new Set(context.toLowerCase().split(/\s+/));
    const responseWords = response.toLowerCase().split(/\s+/);
    const overlap = responseWords.filter(w => contextWords.has(w)).length;
    const overlapRatio = overlap / (responseWords.length || 1);
    if (overlapRatio < 0.15 && responseWords.length > 10) {
      issues.push({
        type: 'CONTEXT_DRIFT',
        severity: 'LOW',
        details: `Low context overlap (${(overlapRatio * 100).toFixed(0)}%). Response may be drifting from conversation.`,
      });
    }

    // Check for over-promising
    const overPromisePatterns = [
      /garantizo|seguro que|100%|siempre|nunca falla|definitivamente/i,
      /duplicar|triplicar|10x|crecerás/i,
    ];
    for (const pattern of overPromisePatterns) {
      if (pattern.test(response)) {
        issues.push({
          type: 'FACTUAL_ERROR',
          severity: 'MEDIUM',
          details: 'Response contains unrealistic promises or guarantees',
        });
        break;
      }
    }

    if (issues.length === 0) {
      return { isHallucination: false, type: '', severity: 'LOW', details: 'No hallucination detected' };
    }

    // Return the most severe issue
    const severities = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const worst = issues.sort((a, b) => severities[b.severity as keyof typeof severities] - severities[a.severity as keyof typeof severities])[0];

    return {
      isHallucination: true,
      type: worst.type,
      severity: worst.severity,
      details: issues.map(i => `${i.type}: ${i.details}`).join('; '),
    };
  }

  /**
   * Track AI cost based on token usage.
   */
  trackCost(tokens: { input: number; output: number }, model: string): { cost: number; currency: string } {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
      'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
      'gpt-3.5-turbo': { input: 0.5 / 1_000_000, output: 1.5 / 1_000_000 },
    };

    const rates = pricing[model] ?? pricing['gpt-4o'];
    const cost = tokens.input * rates.input + tokens.output * rates.output;

    return { cost: Math.round(cost * 10000) / 10000, currency: 'USD' };
  }

  /**
   * Build a complete behavioral trace from the pipeline result.
   */
  buildBehavioralTrace(pipelineResult: PipelineResult, workspaceId: string): BehavioralTraceInput {
    return {
      stage: pipelineResult.stage.stage,
      archetype: pipelineResult.cognitiveState.archetype,
      policiesApplied: pipelineResult.policiesApplied,
      violations: pipelineResult.validation.violations,
      responseScore: pipelineResult.evaluation.overallScore,
      cognitiveDrift: pipelineResult.cognitiveDrift.magnitude,
      metadata: {
        workspaceId,
        routingAgent: pipelineResult.routing.assignedAgent,
        intention: pipelineResult.routing.intention,
        urgency: pipelineResult.routing.urgency,
        toolActions: pipelineResult.toolActions.map(a => a.toolType),
      },
    };
  }

  /**
   * Build full observability trace spans.
   */
  buildTraceSpans(pipelineResult: PipelineResult): {
    traceId: string;
    spans: { spanId: string; operation: string; duration: number; status: string; agent: string }[];
  } {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const spans = [
      { spanId: `${traceId}_routing`, operation: 'routing.classify', duration: 5, status: 'OK', agent: 'ROUTING' },
      { spanId: `${traceId}_memory`, operation: 'memory.retrieve', duration: 12, status: 'OK', agent: 'MEMORY' },
      { spanId: `${traceId}_cognitive`, operation: 'cognitive.resolve', duration: 8, status: 'OK', agent: 'ORCHESTRATOR' },
      { spanId: `${traceId}_policy`, operation: 'policy.evaluate', duration: 3, status: 'OK', agent: 'ORCHESTRATOR' },
      { spanId: `${traceId}_prompt`, operation: 'prompt.compile', duration: 6, status: 'OK', agent: 'JHON' },
      { spanId: `${traceId}_generate`, operation: 'jhon.generate', duration: 350, status: 'OK', agent: 'JHON' },
      { spanId: `${traceId}_validate`, operation: 'behavioral.validate', duration: 15, status: pipelineResult.validation.isValid ? 'OK' : 'VIOLATION', agent: 'OBSERVABILITY' },
      { spanId: `${traceId}_evaluate`, operation: 'response.evaluate', duration: 10, status: 'OK', agent: 'OBSERVABILITY' },
    ];

    if (pipelineResult.toolActions.length > 0) {
      spans.push({ spanId: `${traceId}_tool`, operation: 'tool.execute', duration: 50, status: 'OK', agent: 'TOOL_OS' });
    }

    if (pipelineResult.cognitiveDrift.detected) {
      spans.push({ spanId: `${traceId}_drift`, operation: 'drift.detect', duration: 4, status: 'DRIFT', agent: 'OBSERVABILITY' });
    }

    return { traceId, spans };
  }
}

// ============================================================
// ORCHESTRATOR — The Director (Carnal #2)
// "El cerebro central que coordina todo"
//
// THE FULL PIPELINE:
// LEAD ENTERS → Routing → Memory → Cognitive State →
// Sales Policy → Prompt Compiler → JHON → Behavioral Validator →
// Response Evaluator → Tool OS → Observability → Result
// ============================================================

import { ConversationStageDetector } from './conversation-stage';
import { CognitiveStateResolver } from './cognitive-state';
import { PromptCompiler } from './prompt-compiler';
import { SalesPolicyEngine } from './sales-policy';
import { BehavioralValidator } from './behavioral-validator';
import { ResponseEvaluator } from './response-evaluator';
import { JHONAgent } from './jhon';
import { RoutingEngine } from './routing-engine';
import { MemoryEngine } from './memory-engine';
import { FollowUpEngine } from './followup-engine';
import { ObservabilityEngine } from './observability-engine';
import { ToolOS } from './tool-os';
import {
  type ConversationStageType,
  type CognitiveStateInput,
  type PipelineResult,
  type SalesPolicyRule,
} from './types';

export class Orchestrator {
  private stateResolver: CognitiveStateResolver;
  private promptCompiler: PromptCompiler;
  private behavioralValidator: BehavioralValidator;
  private responseEvaluator: ResponseEvaluator;
  private jhon: JHONAgent;
  private routingEngine: RoutingEngine;
  private memoryEngine: MemoryEngine;
  private followUpEngine: FollowUpEngine;
  private observabilityEngine: ObservabilityEngine;

  // Reserved for future pipeline expansion (policy checks, tool invocations, stage detection)
  // These are instantiated eagerly so the full 7-Carnal pipeline can be wired incrementally.
  private _stageDetector: ConversationStageDetector;
  private _policyEngine: SalesPolicyEngine;
  private _toolOS: ToolOS;

  /** Access the stage detector (reserved for future pipeline stages) */
  get stageDetector() { return this._stageDetector; }
  /** Access the sales policy engine (reserved for future pipeline stages) */
  get policyEngine() { return this._policyEngine; }
  /** Access the tool OS (reserved for future pipeline stages) */
  get toolOS() { return this._toolOS; }

  constructor(policies?: SalesPolicyRule[]) {
    this._stageDetector = new ConversationStageDetector();
    this.stateResolver = new CognitiveStateResolver();
    this.promptCompiler = new PromptCompiler();
    this._policyEngine = new SalesPolicyEngine(policies || []);
    this.behavioralValidator = new BehavioralValidator();
    this.responseEvaluator = new ResponseEvaluator();
    this.jhon = new JHONAgent();
    this.routingEngine = new RoutingEngine();
    this.memoryEngine = new MemoryEngine();
    this.followUpEngine = new FollowUpEngine();
    this.observabilityEngine = new ObservabilityEngine();
    this._toolOS = new ToolOS();
  }

  /**
   * THE MAIN PIPELINE.
   * Processes a new inbound message through all 7 Carnales and produces a complete decision.
   *
   * Flow:
   * 1. ROUTING ENGINE — Classify: stage, priority, intention, risk, urgency
   * 2. MEMORY ENGINE — Retrieve: conversational, commercial, operational context
   * 3. COGNITIVE STATE RESOLVER — Compute: temperature, archetype, intent, churn, priority
   * 4. SALES POLICY ENGINE — Check: what policies apply
   * 5. PROMPT COMPILER — Build: JHON's system prompt with all context
   * 6. JHON AGENT — Generate: the actual response suggestion
   * 7. BEHAVIORAL VALIDATOR — Validate: response doesn't violate rules
   * 8. RESPONSE EVALUATOR — Score: quality of response
   * 9. TOOL OS — Execute: any actions needed (schedule, deal, followup)
   * 10. OBSERVABILITY ENGINE — Record: full trace of decisions
   * 11. Return complete PipelineResult
   */
  async processMessage(input: {
    conversationId: string;
    messageContent: string;
    currentStage: ConversationStageType;
    currentCognitiveState: CognitiveStateInput | null;
    messages: { content: string; direction: string; senderType: string; createdAt: Date }[];
    leadId: string;
    dealValue: number | null;
    timeSinceLastContact: number;
    activePolicies: SalesPolicyRule[];
    workspaceId: string;
    // Optional memory data from DB
    stateTransitions?: { fromStage: string; toStage: string; trigger: string; createdAt: Date }[];
    dealValueHistory?: { previousValue: number; newValue: number; reason: string; createdAt: Date }[];
    assignments?: { agentType: string; assignedAt: Date; unassignedAt: Date | null; reason: string }[];
  }): Promise<PipelineResult> {
    // Re-init policy engine with latest policies
    const policyEngine = new SalesPolicyEngine(input.activePolicies);

    // ──────────────────────────────────────────────────────────
    // STEP 1: ROUTING ENGINE — Classify the message
    // ──────────────────────────────────────────────────────────
    const routing = this.routingEngine.classify(
      input.messageContent,
      input.currentStage,
      input.currentCognitiveState,
      input.messages.length,
      input.timeSinceLastContact
    );

    // ──────────────────────────────────────────────────────────
    // STEP 2: MEMORY ENGINE — Build memory context
    // ──────────────────────────────────────────────────────────
    const memory = this.memoryEngine.buildMemoryPacket(
      input.messages,
      input.stateTransitions ?? [],
      input.dealValueHistory ?? [],
      input.assignments ?? [],
      input.currentCognitiveState
    );

    // ──────────────────────────────────────────────────────────
    // STEP 3: COGNITIVE STATE RESOLVER — Compute cognitive state
    // ──────────────────────────────────────────────────────────
    const cognitiveState = this.stateResolver.resolve(
      input.currentCognitiveState,
      input.messages,
      { stage: routing.stage, confidence: routing.confidence },
      input.dealValue,
      input.timeSinceLastContact
    );

    // ──────────────────────────────────────────────────────────
    // STEP 4: SALES POLICY ENGINE — Get active policies
    // ──────────────────────────────────────────────────────────
    const policiesApplied = policyEngine.getActivePolicies();

    // ──────────────────────────────────────────────────────────
    // STEP 5: PROMPT COMPILER — Build JHON's system prompt
    // ──────────────────────────────────────────────────────────
    const prompt = this.promptCompiler.compile({
      stage: routing.stage,
      archetype: cognitiveState.archetype,
      temperature: cognitiveState.temperature,
      policies: policiesApplied,
      behavioralHistory: [],
      leadContext: { leadId: input.leadId, dealValue: input.dealValue },
      objective: this.getObjectiveForStage(routing.stage, routing.intention),
    });

    // ──────────────────────────────────────────────────────────
    // STEP 6: JHON AGENT — Generate response
    // ──────────────────────────────────────────────────────────
    const jhonResult = this.jhon.generateResponse(
      routing.stage,
      cognitiveState.archetype,
      cognitiveState.temperature,
      memory,
      policiesApplied,
      input.messageContent
    );

    // ──────────────────────────────────────────────────────────
    // STEP 7: BEHAVIORAL VALIDATOR — Validate response
    // ──────────────────────────────────────────────────────────
    const validation = this.behavioralValidator.validate(
      jhonResult.response,
      routing.stage,
      input.messages.map(m => m.content),
      policiesApplied
    );

    // If validation fails, modify the response
    let finalResponse = jhonResult.response;
    if (!validation.isValid) {
      const highViolations = validation.violations.filter(v => v.severity === 'HIGH');
      if (highViolations.length > 0) {
        // Regenerate with a safer approach
        finalResponse = this.generateSafeResponse(routing.stage, cognitiveState.archetype);
      }
    }

    // Also validate against sales policies
    const policyValidation = policyEngine.validate(
      finalResponse,
      routing.stage,
      { painIdentified: memory.conversational.includes('pain') || memory.conversational.includes('problema') }
    );

    if (!policyValidation.isValid) {
      const highViolations = policyValidation.violations.filter(v => v.severity === 'HIGH');
      if (highViolations.length > 0) {
        finalResponse = this.generateSafeResponse(routing.stage, cognitiveState.archetype);
      }
    }

    const allViolations = [
      ...validation.violations.map(v => `${v.type}: ${v.description}`),
      ...policyValidation.violations.map(v => `${v.type}: ${v.description}`),
    ];

    // ──────────────────────────────────────────────────────────
    // STEP 8: RESPONSE EVALUATOR — Score response quality
    // ──────────────────────────────────────────────────────────
    const evaluation = this.responseEvaluator.evaluate(
      finalResponse,
      routing.stage,
      cognitiveState.archetype,
      this.getObjectiveForStage(routing.stage, routing.intention)
    );

    // ──────────────────────────────────────────────────────────
    // STEP 9: CHECK COGNITIVE DRIFT (Observability Engine)
    // ──────────────────────────────────────────────────────────
    const cognitiveDrift = this.observabilityEngine.detectCognitiveDrift(
      input.currentCognitiveState,
      cognitiveState,
      input.currentStage !== routing.stage ? { from: input.currentStage, to: routing.stage } : null
    );

    // ──────────────────────────────────────────────────────────
    // STEP 10: DECIDE ESCALATION
    // ──────────────────────────────────────────────────────────
    const escalateToHuman = routing.escalateToHuman || this.shouldEscalate(cognitiveState, routing.stage, allViolations);

    // ──────────────────────────────────────────────────────────
    // STEP 11: CHECK FOLLOW-UP NEEDS
    // ──────────────────────────────────────────────────────────
    const followUpCheck = this.followUpEngine.shouldFollowUp(
      input.timeSinceLastContact,
      routing.stage,
      cognitiveState.churnRisk,
      input.messages.length > 0 ? input.messages[input.messages.length - 1].direction : 'INBOUND'
    );

    if (followUpCheck.shouldFollowUp) {
      this.followUpEngine.generateFollowUp(
        routing.stage,
        cognitiveState.archetype,
        memory,
        0 // previous attempts
      );
      // Follow-up suggestion included in pipeline metadata
    }

    // ──────────────────────────────────────────────────────────
    // RETURN FULL PIPELINE RESULT
    // ──────────────────────────────────────────────────────────
    return {
      stage: { stage: routing.stage, confidence: routing.confidence, triggerReason: routing.triggerReason },
      routing: {
        assignedAgent: routing.assignedAgent,
        priority: routing.priority,
        urgency: routing.urgency,
        intention: routing.intention,
        closeProbability: routing.closeProbability,
        riskOfDrop: routing.riskOfDrop,
        escalateToHuman: routing.escalateToHuman,
      },
      memory,
      cognitiveState,
      policiesApplied,
      prompt,
      responseSuggestion: finalResponse,
      toolActions: jhonResult.toolActions,
      validation: {
        isValid: validation.isValid && policyValidation.isValid,
        violations: allViolations,
        overallScore: (validation.overallScore + policyValidation.overallScore) / 2,
      },
      evaluation,
      cognitiveDrift,
      escalateToHuman,
      escalationReason: escalateToHuman ? this.getEscalationReason(cognitiveState, allViolations) : undefined,
    };
  }

  // ---- HELPERS ----

  private getObjectiveForStage(stage: ConversationStageType, _intention: string): string {
    const objectives: Record<ConversationStageType, string> = {
      EXPLORATION: 'Identificar el dolor principal del lead',
      INTEREST: 'Mostrar el costo de no actuar y conectar dolor con solución',
      INTENT: 'Proponer un siguiente paso concreto',
      OBJECTION: 'Reencuadrar la objeción mostrando lo que pierde',
      CLOSING: 'Confirmar acuerdo y agendar siguiente acción',
      FOLLOW_UP: 'Re-engarchar con valor nuevo sin presión',
    };
    return objectives[stage] ?? 'Avanzar la conversación';
  }

  private generateSafeResponse(stage: ConversationStageType, _archetype: string): string {
    const safeResponses: Record<ConversationStageType, string> = {
      EXPLORATION: 'Cuéntame más sobre tu situación actual. ¿Qué es lo que más te preocupa?',
      INTEREST: '¿Has considerado qué pasaría si sigues igual los próximos 3 meses?',
      INTENT: 'Lo que puedo hacer es agendar una llamada rápida para revisar tu caso. ¿Te parece?',
      OBJECTION: 'Entiendo tu punto. ¿Qué específicamente te genera duda para que pueda ayudarte mejor?',
      CLOSING: '¿Qué horario te queda mejor esta semana para avanzar?',
      FOLLOW_UP: 'Hola, quería compartir algo que creo te puede interesar. ¿Tienes un momento?',
    };
    return safeResponses[stage] ?? safeResponses.EXPLORATION;
  }

  private shouldEscalate(cognitiveState: CognitiveStateInput, _stage: string, violations: string[]): boolean {
    if (cognitiveState.temperature === 'HOT' && cognitiveState.churnRisk > 0.7) return true;
    if (cognitiveState.intentScore < 0.2 && cognitiveState.priority >= 7) return true;
    if (violations.filter(v => v.includes('HIGH')).length >= 2) return true;
    return false;
  }

  private getEscalationReason(cognitiveState: CognitiveStateInput, violations: string[]): string {
    if (cognitiveState.temperature === 'HOT' && cognitiveState.churnRisk > 0.7) {
      return 'Lead caliente con alto riesgo de fuga — necesita atención humana inmediata';
    }
    if (violations.length >= 2) {
      return 'Múltiples violaciones de políticas — requiere revisión humana';
    }
    return 'El sistema detectó que este caso requiere intervención humana';
  }
}

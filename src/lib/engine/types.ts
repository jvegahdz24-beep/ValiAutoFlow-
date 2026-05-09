// ============================================================
// ValiAutoFlow — 7 Carnales Type System
// ============================================================

/** The 7 Carnales agent types */
export type CarnalType = 'JHON' | 'ORCHESTRATOR' | 'MEMORY' | 'ROUTING' | 'FOLLOWUP' | 'OBSERVABILITY' | 'TOOL_OS';

/** Conversation stages */
export type ConversationStageType = 'EXPLORATION' | 'INTEREST' | 'INTENT' | 'OBJECTION' | 'CLOSING' | 'FOLLOW_UP';

/** Lead temperature */
export type LeadTemperature = 'COLD' | 'WARM' | 'HOT';

/** Lead archetype */
export type LeadArchetype = 'DECISIVE' | 'ANALYTICAL' | 'SOCIAL' | 'CAUTIOUS' | 'SKEPTICAL' | 'OVERWHELMED_OWNER';

/** Tool types for TOOL_OS */
export type ToolType =
  | 'SCHEDULE_APPOINTMENT'
  | 'CREATE_DEAL'
  | 'UPDATE_CRM'
  | 'SEND_FOLLOWUP'
  | 'GENERATE_QUOTE'
  | 'CHECK_CALENDAR'
  | 'SEND_LINK'
  | 'ACTIVATE_WORKFLOW'
  | 'UPDATE_PIPELINE'
  | 'SEND_REMINDER';

/** Urgency levels */
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** Intention types */
export type IntentionType = 'DIAGNOSE' | 'NURTURE' | 'SELL' | 'CLOSE' | 'RECOVER' | 'ESCALATE';

/** Cognitive state of a lead */
export interface CognitiveStateInput {
  temperature: LeadTemperature;
  archetype: LeadArchetype;
  intentScore: number;       // 0-1
  churnRisk: number;         // 0-1
  priority: number;          // 1-10
  historicalContext: Record<string, unknown>;
}

/** Full pipeline result — output of the Orchestrator processing a message */
export interface PipelineResult {
  // Stage detection (Routing Engine)
  stage: { stage: ConversationStageType; confidence: number; triggerReason: string };
  // Routing decision
  routing: {
    assignedAgent: CarnalType;
    priority: number;
    urgency: UrgencyLevel;
    intention: IntentionType;
    closeProbability: number;
    riskOfDrop: number;
    escalateToHuman: boolean;
  };
  // Memory context (Memory Engine)
  memory: MemoryPacket;
  // Cognitive state (Cognitive State Resolver)
  cognitiveState: CognitiveStateInput;
  // Policies applied (Sales Policy Engine)
  policiesApplied: string[];
  // Compiled prompt (Prompt Compiler)
  prompt: string;
  // Response suggestion (JHON Agent)
  responseSuggestion: string;
  // Tool actions to execute (Tool OS)
  toolActions: { toolType: ToolType; parameters: Record<string, unknown>; reason: string }[];
  // Behavioral validation
  validation: { isValid: boolean; violations: string[]; overallScore: number };
  // Response evaluation
  evaluation: {
    clarity: number;
    empathy: number;
    alignment: number;
    pressure: number;
    commercialQuality: number;
    overallScore: number;
  };
  // Cognitive drift (Observability Engine)
  cognitiveDrift: { detected: boolean; magnitude: number; details: string };
  // Should escalate to human
  escalateToHuman: boolean;
  escalationReason?: string;
}

/** JHON personality configuration */
export interface JHONConfig {
  neverSellBeforeDiagnose: boolean;
  neverCloseWithoutLossAwareness: boolean;
  oneIdeaPerMessage: boolean;
  shortDirectedConversation: boolean;
  consultativeNotAggressive: boolean;
  showCostOfInaction: boolean;
}

/** Agent decision */
export interface AgentDecision {
  agentType: CarnalType;
  action: string;
  reasoning: string;
  confidence: number;
  policiesApplied: string[];
  nextStage?: ConversationStageType;
  responseSuggestion?: string;
  toolActions?: { toolType: ToolType; parameters: Record<string, unknown>; reason: string }[];
}

/** Behavioral trace */
export interface BehavioralTraceInput {
  stage: string;
  archetype: string;
  policiesApplied: string[];
  violations: string[];
  responseScore: number;
  cognitiveDrift: number;
  metadata: Record<string, unknown>;
}

/** Memory packet — 3 dimensions of memory */
export interface MemoryPacket {
  conversational: string;
  commercial: string;
  operational: string;
}

/** Tool execution result */
export interface ToolExecutionResult {
  toolType: ToolType;
  success: boolean;
  result: Record<string, unknown>;
  error?: string;
}

/** Sales policy rule */
export interface SalesPolicyRule {
  id: string;
  name: string;
  ruleType: string;
  config: Record<string, unknown>;
  priority: number;
}

/** Behavioral validation result */
export interface BehavioralValidationResult {
  isValid: boolean;
  violations: BehavioralViolation[];
  overallScore: number;
}

export interface BehavioralViolation {
  type: 'PRESSURE_CHECK' | 'POLICY_COMPLIANCE' | 'QUESTION_COUNT' | 'ROBOTIC_TONE' | 'PREMATURE_CLOSE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  score: number;
}

/** Response evaluation result */
export interface ResponseEvaluationResult {
  clarity: number;
  empathy: number;
  alignment: number;
  pressure: number;
  commercialQuality: number;
  overallScore: number;
  feedback?: string;
}

/** Prompt compilation context */
export interface PromptContext {
  stage: ConversationStageType;
  archetype: LeadArchetype;
  temperature: LeadTemperature;
  policies: string[];
  behavioralHistory: string[];
  leadContext: Record<string, unknown>;
  objective: string;
}

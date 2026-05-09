// ============================================================
// ValiAutoFlow Engine — Index
// Exports all 7 Carnales + supporting modules
// ============================================================

// Types
export type {
  CarnalType,
  ConversationStageType,
  LeadTemperature,
  LeadArchetype,
  ToolType,
  UrgencyLevel,
  IntentionType,
  CognitiveStateInput,
  PipelineResult,
  JHONConfig,
  AgentDecision,
  BehavioralTraceInput,
  MemoryPacket,
  ToolExecutionResult,
  SalesPolicyRule,
  BehavioralValidationResult,
  BehavioralViolation,
  ResponseEvaluationResult,
  PromptContext,
} from './types';

// 7 Carnales
export { JHONAgent } from './jhon';
export { Orchestrator } from './orchestrator';
export { MemoryEngine } from './memory-engine';
export { RoutingEngine } from './routing-engine';
export { FollowUpEngine } from './followup-engine';
export { ObservabilityEngine } from './observability-engine';
export { ToolOS } from './tool-os';

// Supporting modules
export { ConversationStageDetector } from './conversation-stage';
export { CognitiveStateResolver } from './cognitive-state';
export { PromptCompiler } from './prompt-compiler';
export { SalesPolicyEngine } from './sales-policy';
export { BehavioralValidator } from './behavioral-validator';
export { ResponseEvaluator } from './response-evaluator';

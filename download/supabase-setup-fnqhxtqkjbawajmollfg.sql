-- ============================================================
-- ValiAutoFlow — Complete Database Setup Script
-- Project: fnqhxtqkjbawajmollfg
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- STEP 0: Drop any pre-existing tables that conflict with our schema
-- (The project had some template tables that will conflict)
DROP TABLE IF EXISTS "campaign_messages" CASCADE;
DROP TABLE IF EXISTS "follow_up_executions" CASCADE;
DROP TABLE IF EXISTS "follow_up_steps" CASCADE;
DROP TABLE IF EXISTS "follow_up_sequences" CASCADE;
DROP TABLE IF EXISTS "tool_actions" CASCADE;
DROP TABLE IF EXISTS "deals" CASCADE;
DROP TABLE IF EXISTS "pipeline_stages" CASCADE;
DROP TABLE IF EXISTS "pipelines" CASCADE;
DROP TABLE IF EXISTS "webhook_deliveries" CASCADE;
DROP TABLE IF EXISTS "webhook_configs" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "trust_zones" CASCADE;
DROP TABLE IF EXISTS "ai_cost_trackings" CASCADE;
DROP TABLE IF EXISTS "hallucination_detections" CASCADE;
DROP TABLE IF EXISTS "behavioral_traces" CASCADE;
DROP TABLE IF EXISTS "observability_traces" CASCADE;
DROP TABLE IF EXISTS "deal_value_histories" CASCADE;
DROP TABLE IF EXISTS "state_transitions" CASCADE;
DROP TABLE IF EXISTS "conversation_assignment_histories" CASCADE;
DROP TABLE IF EXISTS "response_evaluations" CASCADE;
DROP TABLE IF EXISTS "behavioral_validations" CASCADE;
DROP TABLE IF EXISTS "sales_policies" CASCADE;
DROP TABLE IF EXISTS "cognitive_states" CASCADE;
DROP TABLE IF EXISTS "conversation_stages" CASCADE;
DROP TABLE IF EXISTS "agent_executions" CASCADE;
DROP TABLE IF EXISTS "agents" CASCADE;
DROP TABLE IF EXISTS "message_status_histories" CASCADE;
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "conversations" CASCADE;
DROP TABLE IF EXISTS "lead_tags" CASCADE;
DROP TABLE IF EXISTS "leads" CASCADE;
DROP TABLE IF EXISTS "contacts" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "workspace_members" CASCADE;
DROP TABLE IF EXISTS "verification_tokens" CASCADE;
DROP TABLE IF EXISTS "accounts" CASCADE;
DROP TABLE IF EXISTS "workspace_configs" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "calendar_events" CASCADE;
DROP TABLE IF EXISTS "segments" CASCADE;
DROP TABLE IF EXISTS "campaigns" CASCADE;
DROP TABLE IF EXISTS "google_calendar_configs" CASCADE;
DROP TABLE IF EXISTS "whatsapp_templates" CASCADE;
DROP TABLE IF EXISTS "whatsapp_configs" CASCADE;
DROP TABLE IF EXISTS "telegram_bot_commands" CASCADE;
DROP TABLE IF EXISTS "telegram_bot_sessions" CASCADE;
DROP TABLE IF EXISTS "telegram_bot_configs" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "workspaces" CASCADE;

-- Also drop any template/legacy tables from previous setup
DROP TABLE IF EXISTS "reactivation_templates" CASCADE;
DROP TABLE IF EXISTS "user_settings" CASCADE;
DROP TABLE IF EXISTS "faqs" CASCADE;
DROP TABLE IF EXISTS "ai_settings" CASCADE;
DROP TABLE IF EXISTS "debug_log" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;
DROP TABLE IF EXISTS "secrets" CASCADE;
DROP TABLE IF EXISTS "whatsapp_channels" CASCADE;

-- Drop conflicting views (will recreate with security_invoker)
DROP VIEW IF EXISTS "public"."v_dashboard_summary" CASCADE;
DROP VIEW IF EXISTS "public"."v_reactivaciones_hoy" CASCADE;

-- ============================================================
-- STEP 1: Create all tables (Prisma-generated)
-- ============================================================

CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "avatarUrl" TEXT,
    "workspaceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "temperature" TEXT NOT NULL DEFAULT 'COLD',
    "archetype" TEXT NOT NULL DEFAULT 'CAUTIOUS',
    "score" INTEGER NOT NULL DEFAULT 0,
    "assignedAgentId" TEXT,
    "pipelineStage" TEXT,
    "dealValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lostReason" TEXT,
    "firstContactAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastContactAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lead_tags" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "leadId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStage" TEXT NOT NULL DEFAULT 'EXPLORATION',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "templateUsed" TEXT,
    "whatsappMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_status_histories" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "message_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "config" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "conversationId" TEXT,
    "leadId" TEXT,
    "inputSummary" TEXT NOT NULL DEFAULT '',
    "outputSummary" TEXT NOT NULL DEFAULT '',
    "decisionRationale" TEXT NOT NULL DEFAULT '',
    "policiesApplied" TEXT NOT NULL DEFAULT '[]',
    "cognitiveContext" TEXT NOT NULL DEFAULT '{}',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "tokenUsage" TEXT NOT NULL DEFAULT '{}',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_stages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "triggerReason" TEXT NOT NULL DEFAULT '',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cognitive_states" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "conversationId" TEXT,
    "temperature" TEXT NOT NULL DEFAULT 'COLD',
    "archetype" TEXT NOT NULL DEFAULT 'CAUTIOUS',
    "intentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "historicalContext" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cognitive_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sales_policies" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ruleType" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sales_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "behavioral_validations" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "validatorType" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "details" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "behavioral_validations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "response_evaluations" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "clarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "empathy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alignment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pressure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commercialQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "response_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_assignment_histories" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "agentId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "conversation_assignment_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "state_transitions" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStage" TEXT NOT NULL,
    "toStage" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "state_transitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_value_histories" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deal_value_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "observability_traces" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "spanId" TEXT NOT NULL,
    "parentSpanId" TEXT,
    "agentExecutionId" TEXT,
    "operationName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "attributes" TEXT NOT NULL DEFAULT '{}',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "observability_traces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "behavioral_traces" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT,
    "leadId" TEXT,
    "stage" TEXT,
    "archetype" TEXT,
    "policiesApplied" TEXT NOT NULL DEFAULT '[]',
    "violations" TEXT NOT NULL DEFAULT '[]',
    "responseScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cognitiveDrift" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "behavioral_traces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hallucination_detections" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "detectionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "details" TEXT NOT NULL,
    "suggestedCorrection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hallucination_detections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_cost_trackings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentId" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "operationType" TEXT NOT NULL DEFAULT 'chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_cost_trackings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trust_zones" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "zoneType" TEXT NOT NULL,
    "allowedRoles" TEXT NOT NULL DEFAULT '[]',
    "constraints" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trust_zones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT '[]',
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookConfigId" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isWonStage" BOOLEAN NOT NULL DEFAULT false,
    "isLostStage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "pipelineStageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "expectedCloseDate" TIMESTAMP(3),
    "assignedAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "follow_up_sequences" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "triggerCondition" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "follow_up_sequences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "follow_up_steps" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 60,
    "messageTemplate" TEXT NOT NULL,
    "agentType" TEXT NOT NULL DEFAULT 'FOLLOWUP',
    "conditions" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follow_up_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "follow_up_executions" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "conversationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follow_up_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_actions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT,
    "leadId" TEXT,
    "agentExecutionId" TEXT,
    "toolType" TEXT NOT NULL,
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "result" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tool_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL DEFAULT 'Mi Negocio',
    "businessType" TEXT NOT NULL DEFAULT 'general',
    "schedule" TEXT NOT NULL DEFAULT '{}',
    "products" TEXT NOT NULL DEFAULT '[]',
    "leadFormula" TEXT NOT NULL DEFAULT '{}',
    "customQuestions" TEXT NOT NULL DEFAULT '[]',
    "policies" TEXT NOT NULL DEFAULT '{}',
    "channels" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspace_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "segmentQuery" TEXT NOT NULL DEFAULT '{}',
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "templateId" TEXT,
    "templateBody" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "stats" TEXT NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaign_messages" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "conditions" TEXT NOT NULL DEFAULT '{}',
    "leadCount" INTEGER NOT NULL DEFAULT 0,
    "isDynamic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "leadId" TEXT,
    "googleEventId" TEXT,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdBy" TEXT NOT NULL DEFAULT 'ai',
    "meetLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "recipientId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_bot_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "botUsername" TEXT NOT NULL DEFAULT '',
    "allowedChatIds" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_bot_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_bot_sessions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "currentLeadId" TEXT,
    "currentConversationId" TEXT,
    "lastCommand" TEXT,
    "lastCommandAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_bot_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_bot_commands" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "arguments" TEXT NOT NULL DEFAULT '',
    "response" TEXT,
    "leadId" TEXT,
    "conversationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "telegram_bot_commands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "businessAccountId" TEXT,
    "accessToken" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "wabaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "category" TEXT NOT NULL DEFAULT 'MARKETING',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "body" TEXT NOT NULL,
    "headerType" TEXT,
    "headerText" TEXT,
    "footerText" TEXT,
    "buttons" TEXT NOT NULL DEFAULT '[]',
    "metaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_calendar_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "google_calendar_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 2: Create indexes
-- ============================================================

CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_workspaceId_idx" ON "users"("workspaceId");
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "contacts_workspaceId_idx" ON "contacts"("workspaceId");
CREATE INDEX "leads_workspaceId_idx" ON "leads"("workspaceId");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_contactId_idx" ON "leads"("contactId");
CREATE INDEX "leads_assignedAgentId_idx" ON "leads"("assignedAgentId");
CREATE INDEX "lead_tags_leadId_idx" ON "lead_tags"("leadId");
CREATE INDEX "conversations_workspaceId_idx" ON "conversations"("workspaceId");
CREATE INDEX "conversations_contactId_idx" ON "conversations"("contactId");
CREATE INDEX "conversations_leadId_idx" ON "conversations"("leadId");
CREATE INDEX "conversations_status_idx" ON "conversations"("status");
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
CREATE INDEX "messages_status_idx" ON "messages"("status");
CREATE INDEX "messages_senderType_idx" ON "messages"("senderType");
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");
CREATE INDEX "messages_direction_createdAt_idx" ON "messages"("direction", "createdAt");
CREATE UNIQUE INDEX "messages_whatsappMessageId_key" ON "messages"("whatsappMessageId");
CREATE INDEX "message_status_histories_messageId_idx" ON "message_status_histories"("messageId");
CREATE INDEX "agents_workspaceId_idx" ON "agents"("workspaceId");
CREATE INDEX "agents_type_idx" ON "agents"("type");
CREATE INDEX "agent_executions_agentId_idx" ON "agent_executions"("agentId");
CREATE INDEX "agent_executions_conversationId_idx" ON "agent_executions"("conversationId");
CREATE INDEX "agent_executions_leadId_idx" ON "agent_executions"("leadId");
CREATE INDEX "agent_executions_status_idx" ON "agent_executions"("status");
CREATE INDEX "conversation_stages_conversationId_idx" ON "conversation_stages"("conversationId");
CREATE INDEX "cognitive_states_leadId_idx" ON "cognitive_states"("leadId");
CREATE INDEX "cognitive_states_conversationId_idx" ON "cognitive_states"("conversationId");
CREATE INDEX "sales_policies_workspaceId_idx" ON "sales_policies"("workspaceId");
CREATE INDEX "sales_policies_ruleType_idx" ON "sales_policies"("ruleType");
CREATE INDEX "behavioral_validations_executionId_idx" ON "behavioral_validations"("executionId");
CREATE INDEX "response_evaluations_executionId_idx" ON "response_evaluations"("executionId");
CREATE INDEX "conversation_assignment_histories_conversationId_idx" ON "conversation_assignment_histories"("conversationId");
CREATE INDEX "conversation_assignment_histories_agentId_idx" ON "conversation_assignment_histories"("agentId");
CREATE INDEX "state_transitions_leadId_idx" ON "state_transitions"("leadId");
CREATE INDEX "deal_value_histories_leadId_idx" ON "deal_value_histories"("leadId");
CREATE INDEX "observability_traces_workspaceId_idx" ON "observability_traces"("workspaceId");
CREATE INDEX "observability_traces_traceId_idx" ON "observability_traces"("traceId");
CREATE INDEX "observability_traces_agentExecutionId_idx" ON "observability_traces"("agentExecutionId");
CREATE INDEX "behavioral_traces_workspaceId_idx" ON "behavioral_traces"("workspaceId");
CREATE INDEX "behavioral_traces_conversationId_idx" ON "behavioral_traces"("conversationId");
CREATE INDEX "behavioral_traces_leadId_idx" ON "behavioral_traces"("leadId");
CREATE INDEX "hallucination_detections_executionId_idx" ON "hallucination_detections"("executionId");
CREATE INDEX "ai_cost_trackings_workspaceId_idx" ON "ai_cost_trackings"("workspaceId");
CREATE INDEX "ai_cost_trackings_agentId_idx" ON "ai_cost_trackings"("agentId");
CREATE INDEX "trust_zones_workspaceId_idx" ON "trust_zones"("workspaceId");
CREATE INDEX "audit_logs_workspaceId_idx" ON "audit_logs"("workspaceId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "webhook_configs_workspaceId_idx" ON "webhook_configs"("workspaceId");
CREATE INDEX "webhook_deliveries_webhookConfigId_idx" ON "webhook_deliveries"("webhookConfigId");
CREATE INDEX "pipelines_workspaceId_idx" ON "pipelines"("workspaceId");
CREATE INDEX "pipeline_stages_pipelineId_idx" ON "pipeline_stages"("pipelineId");
CREATE INDEX "deals_workspaceId_idx" ON "deals"("workspaceId");
CREATE INDEX "deals_leadId_idx" ON "deals"("leadId");
CREATE INDEX "deals_pipelineId_idx" ON "deals"("pipelineId");
CREATE INDEX "deals_pipelineStageId_idx" ON "deals"("pipelineStageId");
CREATE INDEX "follow_up_sequences_workspaceId_idx" ON "follow_up_sequences"("workspaceId");
CREATE INDEX "follow_up_steps_sequenceId_idx" ON "follow_up_steps"("sequenceId");
CREATE INDEX "follow_up_executions_stepId_idx" ON "follow_up_executions"("stepId");
CREATE INDEX "follow_up_executions_leadId_idx" ON "follow_up_executions"("leadId");
CREATE INDEX "follow_up_executions_conversationId_idx" ON "follow_up_executions"("conversationId");
CREATE INDEX "tool_actions_workspaceId_idx" ON "tool_actions"("workspaceId");
CREATE INDEX "tool_actions_conversationId_idx" ON "tool_actions"("conversationId");
CREATE INDEX "tool_actions_leadId_idx" ON "tool_actions"("leadId");
CREATE INDEX "tool_actions_agentExecutionId_idx" ON "tool_actions"("agentExecutionId");
CREATE INDEX "tool_actions_status_idx" ON "tool_actions"("status");
CREATE UNIQUE INDEX "workspace_configs_workspaceId_key" ON "workspace_configs"("workspaceId");
CREATE INDEX "workspace_configs_workspaceId_idx" ON "workspace_configs"("workspaceId");
CREATE INDEX "campaigns_workspaceId_idx" ON "campaigns"("workspaceId");
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX "campaign_messages_campaignId_idx" ON "campaign_messages"("campaignId");
CREATE INDEX "campaign_messages_contactId_idx" ON "campaign_messages"("contactId");
CREATE INDEX "campaign_messages_status_idx" ON "campaign_messages"("status");
CREATE INDEX "campaign_messages_campaignId_contactId_idx" ON "campaign_messages"("campaignId", "contactId");
CREATE INDEX "segments_workspaceId_idx" ON "segments"("workspaceId");
CREATE INDEX "calendar_events_workspaceId_idx" ON "calendar_events"("workspaceId");
CREATE INDEX "calendar_events_contactId_idx" ON "calendar_events"("contactId");
CREATE INDEX "calendar_events_leadId_idx" ON "calendar_events"("leadId");
CREATE INDEX "calendar_events_startTime_idx" ON "calendar_events"("startTime");
CREATE INDEX "calendar_events_contactId_startTime_idx" ON "calendar_events"("contactId", "startTime");
CREATE INDEX "notifications_workspaceId_idx" ON "notifications"("workspaceId");
CREATE INDEX "notifications_read_idx" ON "notifications"("read");
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");
CREATE UNIQUE INDEX "telegram_bot_configs_workspaceId_key" ON "telegram_bot_configs"("workspaceId");
CREATE INDEX "telegram_bot_configs_workspaceId_idx" ON "telegram_bot_configs"("workspaceId");
CREATE INDEX "telegram_bot_sessions_workspaceId_idx" ON "telegram_bot_sessions"("workspaceId");
CREATE INDEX "telegram_bot_sessions_chatId_idx" ON "telegram_bot_sessions"("chatId");
CREATE INDEX "telegram_bot_commands_workspaceId_idx" ON "telegram_bot_commands"("workspaceId");
CREATE INDEX "telegram_bot_commands_chatId_idx" ON "telegram_bot_commands"("chatId");
CREATE INDEX "telegram_bot_commands_command_idx" ON "telegram_bot_commands"("command");
CREATE INDEX "telegram_bot_commands_createdAt_idx" ON "telegram_bot_commands"("createdAt");
CREATE UNIQUE INDEX "whatsapp_configs_workspaceId_key" ON "whatsapp_configs"("workspaceId");
CREATE INDEX "whatsapp_configs_workspaceId_idx" ON "whatsapp_configs"("workspaceId");
CREATE INDEX "whatsapp_templates_workspaceId_idx" ON "whatsapp_templates"("workspaceId");
CREATE INDEX "whatsapp_templates_status_idx" ON "whatsapp_templates"("status");
CREATE UNIQUE INDEX "google_calendar_configs_workspaceId_key" ON "google_calendar_configs"("workspaceId");
CREATE INDEX "google_calendar_configs_workspaceId_idx" ON "google_calendar_configs"("workspaceId");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");
CREATE UNIQUE INDEX "workspace_members_userId_workspaceId_key" ON "workspace_members"("userId", "workspaceId");

-- ============================================================
-- STEP 3: Add foreign keys
-- ============================================================

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_status_histories" ADD CONSTRAINT "message_status_histories_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agents" ADD CONSTRAINT "agents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation_stages" ADD CONSTRAINT "conversation_stages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cognitive_states" ADD CONSTRAINT "cognitive_states_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cognitive_states" ADD CONSTRAINT "cognitive_states_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_policies" ADD CONSTRAINT "sales_policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "behavioral_validations" ADD CONSTRAINT "behavioral_validations_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "response_evaluations" ADD CONSTRAINT "response_evaluations_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_assignment_histories" ADD CONSTRAINT "conversation_assignment_histories_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_assignment_histories" ADD CONSTRAINT "conversation_assignment_histories_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "state_transitions" ADD CONSTRAINT "state_transitions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_value_histories" ADD CONSTRAINT "deal_value_histories_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observability_traces" ADD CONSTRAINT "observability_traces_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observability_traces" ADD CONSTRAINT "observability_traces_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "agent_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "behavioral_traces" ADD CONSTRAINT "behavioral_traces_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "behavioral_traces" ADD CONSTRAINT "behavioral_traces_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "behavioral_traces" ADD CONSTRAINT "behavioral_traces_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hallucination_detections" ADD CONSTRAINT "hallucination_detections_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_cost_trackings" ADD CONSTRAINT "ai_cost_trackings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_cost_trackings" ADD CONSTRAINT "ai_cost_trackings_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trust_zones" ADD CONSTRAINT "trust_zones_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookConfigId_fkey" FOREIGN KEY ("webhookConfigId") REFERENCES "webhook_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "pipeline_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_up_sequences" ADD CONSTRAINT "follow_up_sequences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_steps" ADD CONSTRAINT "follow_up_steps_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "follow_up_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_executions" ADD CONSTRAINT "follow_up_executions_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "follow_up_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_executions" ADD CONSTRAINT "follow_up_executions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_executions" ADD CONSTRAINT "follow_up_executions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_actions" ADD CONSTRAINT "tool_actions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_actions" ADD CONSTRAINT "tool_actions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_actions" ADD CONSTRAINT "tool_actions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_actions" ADD CONSTRAINT "tool_actions_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "agent_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_configs" ADD CONSTRAINT "workspace_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "segments" ADD CONSTRAINT "segments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telegram_bot_configs" ADD CONSTRAINT "telegram_bot_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_bot_sessions" ADD CONSTRAINT "telegram_bot_sessions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_bot_commands" ADD CONSTRAINT "telegram_bot_commands_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_calendar_configs" ADD CONSTRAINT "google_calendar_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- STEP 4: Recreate views with security_invoker (fixes CRITICAL lint)
-- ============================================================

-- Dashboard summary view - respects RLS policies
CREATE VIEW public.v_dashboard_summary
WITH (security_invoker = on)
AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'NEW') AS new_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.temperature = 'HOT') AS hot_leads,
  COUNT(DISTINCT c.id) AS total_conversations,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'ACTIVE') AS active_conversations,
  COALESCE(SUM(l."dealValue"), 0) AS total_pipeline_value,
  COALESCE(SUM(l."dealValue") FILTER (WHERE l.temperature = 'HOT'), 0) AS hot_pipeline_value,
  COUNT(DISTINCT d.id) FILTER (WHERE d."pipelineStageId" IS NOT NULL) AS total_deals,
  COUNT(DISTINCT n.id) FILTER (WHERE n.read = false) AS unread_notifications
FROM workspaces w
LEFT JOIN leads l ON l."workspaceId" = w.id
LEFT JOIN conversations c ON c."workspaceId" = w.id
LEFT JOIN deals d ON d."workspaceId" = w.id
LEFT JOIN notifications n ON n."workspaceId" = w.id
GROUP BY w.id, w.name;

-- Reactivaciones de hoy view - respects RLS policies
CREATE VIEW public.v_reactivaciones_hoy
WITH (security_invoker = on)
AS
SELECT
  l.id AS lead_id,
  c.name AS contact_name,
  c.phone AS contact_phone,
  l.temperature,
  l.archetype,
  l.score,
  l."lastContactAt",
  st."toStage" AS current_stage,
  st.trigger AS trigger_reason,
  st."createdAt" AS reactivated_at
FROM leads l
JOIN contacts c ON c.id = l."contactId"
JOIN state_transitions st ON st."leadId" = l.id
WHERE st."toStage" IN ('QUALIFIED', 'PROPOSAL', 'NEGOTIATION')
  AND st."createdAt" >= CURRENT_DATE
  AND st."createdAt" < CURRENT_DATE + INTERVAL '1 day'
ORDER BY st."createdAt" DESC;

-- ============================================================
-- STEP 5: Enable RLS on all tables (security best practice)
-- ============================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_assignment_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_value_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE hallucination_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cost_trackings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: RLS policies - allow service_role full access,
--         authenticated users access their workspace data
-- ============================================================

-- Service role bypasses RLS, so we only need policies for authenticated/anon

-- Workspaces: users can see workspaces they belong to
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    id IN (SELECT "workspaceId" FROM workspace_members WHERE "userId" = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'OWNER')
  );

-- Users: can view own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid()::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid()::text);

-- Workspace-scoped tables: users can access data in their workspaces
-- (The app uses Prisma which connects as the database owner, bypassing RLS.
--  These policies are for direct Supabase client access from the frontend.)

CREATE POLICY "Workspace members can view contacts" ON contacts
  FOR SELECT USING (
    "workspaceId" IN (SELECT "workspaceId" FROM workspace_members WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "Workspace members can view leads" ON leads
  FOR SELECT USING (
    "workspaceId" IN (SELECT "workspaceId" FROM workspace_members WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "Workspace members can view conversations" ON conversations
  FOR SELECT USING (
    "workspaceId" IN (SELECT "workspaceId" FROM workspace_members WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "Workspace members can view messages" ON messages
  FOR SELECT USING (
    "conversationId" IN (
      SELECT id FROM conversations WHERE "workspaceId" IN (
        SELECT "workspaceId" FROM workspace_members WHERE "userId" = auth.uid()::text
      )
    )
  );

CREATE POLICY "Workspace members can view notifications" ON notifications
  FOR SELECT USING (
    "workspaceId" IN (SELECT "workspaceId" FROM workspace_members WHERE "userId" = auth.uid()::text)
  );

-- Allow Prisma migrations table to be created (supabase migration internals)
-- This is needed for Prisma to track its migrations
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  id TEXT NOT NULL PRIMARY KEY,
  checksum TEXT NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name TEXT NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Done! 31 tables created, 2 views fixed, RLS enabled.
-- Next: Run the demo-login endpoint to seed data.
-- ============================================================

// ============================================================
// API VALIDATION — Zod schemas for mutation endpoints
// ============================================================
// Centralized validation to prevent malformed or malicious
// input from reaching the database or cognitive engine.
// ============================================================

import { z } from 'zod'
import { NextResponse } from 'next/server'

// ── Auth ────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100),
})

export const demoLoginSchema = z.object({}).optional()

// ── Workspace Config ────────────────────────────────────────

export const workspaceConfigSchema = z.object({
  businessName: z.string().min(1).max(100),
  businessType: z.string().min(1).max(50),
  schedule: z.object({
    timezone: z.string().max(50),
    days: z.array(z.string()).max(7),
    hours: z.array(z.string()).max(10),
  }).optional(),
  products: z.array(z.object({
    name: z.string().min(1).max(100),
    price: z.number().min(0),
    duration_min: z.number().min(0).optional(),
    note: z.string().max(500).optional(),
  })).max(50).optional(),
  leadFormula: z.object({
    volume_keyword: z.string().max(50).optional(),
    conversion_metric: z.string().max(50).optional(),
    average_ticket: z.number().min(0).optional(),
    funnel_note: z.string().max(500).optional(),
  }).optional(),
  customQuestions: z.array(z.object({
    id: z.string(),
    text: z.string().min(1).max(300),
    purpose: z.string().min(1).max(200),
    stage: z.string().max(30).optional(),
  })).max(20).optional(),
  policies: z.object({
    show_price_early: z.boolean().optional(),
    auto_schedule: z.boolean().optional(),
    max_questions_per_turn: z.number().min(0).max(10).optional(),
    auto_followup: z.boolean().optional(),
  }).optional(),
})

// ── Engine Process ──────────────────────────────────────────

export const engineProcessSchema = z.object({
  conversationId: z.string().min(1),
  messageContent: z.string().min(1).max(5000),
  workspaceId: z.string().min(1),
})

// ── Campaigns ───────────────────────────────────────────────

export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  segmentQuery: z.record(z.string(), z.unknown()).optional(),
  channel: z.string().default('whatsapp'),
  templateBody: z.string().max(2000).optional(),
})

export const campaignSendSchema = z.object({
  dryRun: z.boolean().default(false),
  limit: z.number().min(1).max(10000).optional(),
})

// ── WhatsApp Config ─────────────────────────────────────────

export const whatsappConfigSchema = z.object({
  phoneNumberId: z.string().min(1),
  accessToken: z.string().min(1),
  verifyToken: z.string().min(8),
  businessAccountId: z.string().optional(),
  wabaId: z.string().optional(),
  isActive: z.boolean().default(false),
})

// ── Telegram Config ─────────────────────────────────────────

export const telegramConfigSchema = z.object({
  botToken: z.string().min(20),
  allowedChatIds: z.array(z.string()).max(50).default([]),
  isActive: z.boolean().default(false),
})

// ── Conversations ───────────────────────────────────────────

export const conversationMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  senderType: z.enum(['LEAD', 'AI', 'AGENT', 'HUMAN']),
})

// ── Segments ────────────────────────────────────────────────

export const segmentCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  conditions: z.record(z.string(), z.unknown()),
  isDynamic: z.boolean().default(true),
})

// ── Calendar Events ─────────────────────────────────────────

export const calendarEventSchema = z.object({
  summary: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
})

// ── Lead Update ─────────────────────────────────────────────

export const leadUpdateSchema = z.object({
  status: z.string().optional(),
  temperature: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  dealValue: z.number().min(0).optional(),
  assignedAgentId: z.string().nullable().optional(),
  pipelineStage: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
})

// ── Helper ──────────────────────────────────────────────────

/**
 * Validate request body against a Zod schema.
 * Returns parsed data or a 400 response.
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T } | { error: NextResponse } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const errors = result.error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }))
    return {
      error: NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      ),
    }
  }
  return { data: result.data }
}

-- ============================================================
-- ValiAutoFlow — Complete Seed Script
-- Project: fnqhxtqkjbawajmollfg
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- AFTER running the supabase-setup SQL
--
-- This script is IDEMPOTENT: it checks for existing data before
-- inserting, so it can be re-run safely.
-- ============================================================

DO $$
DECLARE
  -- ── Core IDs ──
  v_workspace_id  TEXT := gen_random_uuid()::TEXT;
  v_user_id       TEXT := gen_random_uuid()::TEXT;
  v_pipeline_id   TEXT := gen_random_uuid()::TEXT;
  v_ws_config_id  TEXT := gen_random_uuid()::TEXT;
  v_seq_id        TEXT := gen_random_uuid()::TEXT;

  -- ── Agent IDs ──
  v_agent_jhon_id            TEXT := gen_random_uuid()::TEXT;
  v_agent_orchestrator_id    TEXT := gen_random_uuid()::TEXT;
  v_agent_memory_id          TEXT := gen_random_uuid()::TEXT;
  v_agent_followup_id        TEXT := gen_random_uuid()::TEXT;
  v_agent_observability_id   TEXT := gen_random_uuid()::TEXT;
  v_agent_routing_id         TEXT := gen_random_uuid()::TEXT;
  v_agent_tool_id            TEXT := gen_random_uuid()::TEXT;

  -- ── Pipeline Stage IDs ──
  v_stage_nuevo_id         TEXT := gen_random_uuid()::TEXT;
  v_stage_contactado_id    TEXT := gen_random_uuid()::TEXT;
  v_stage_calificado_id    TEXT := gen_random_uuid()::TEXT;
  v_stage_propuesta_id     TEXT := gen_random_uuid()::TEXT;
  v_stage_negociacion_id   TEXT := gen_random_uuid()::TEXT;
  v_stage_ganado_id        TEXT := gen_random_uuid()::TEXT;
  v_stage_perdido_id       TEXT := gen_random_uuid()::TEXT;

  -- ── Contact IDs ──
  v_c1  TEXT := gen_random_uuid()::TEXT;
  v_c2  TEXT := gen_random_uuid()::TEXT;
  v_c3  TEXT := gen_random_uuid()::TEXT;
  v_c4  TEXT := gen_random_uuid()::TEXT;
  v_c5  TEXT := gen_random_uuid()::TEXT;
  v_c6  TEXT := gen_random_uuid()::TEXT;
  v_c7  TEXT := gen_random_uuid()::TEXT;
  v_c8  TEXT := gen_random_uuid()::TEXT;
  v_c9  TEXT := gen_random_uuid()::TEXT;
  v_c10 TEXT := gen_random_uuid()::TEXT;
  v_c11 TEXT := gen_random_uuid()::TEXT;
  v_c12 TEXT := gen_random_uuid()::TEXT;
  v_c13 TEXT := gen_random_uuid()::TEXT;
  v_c14 TEXT := gen_random_uuid()::TEXT;
  v_c15 TEXT := gen_random_uuid()::TEXT;

  -- ── Lead IDs ──
  v_l1  TEXT := gen_random_uuid()::TEXT;
  v_l2  TEXT := gen_random_uuid()::TEXT;
  v_l3  TEXT := gen_random_uuid()::TEXT;
  v_l4  TEXT := gen_random_uuid()::TEXT;
  v_l5  TEXT := gen_random_uuid()::TEXT;
  v_l6  TEXT := gen_random_uuid()::TEXT;
  v_l7  TEXT := gen_random_uuid()::TEXT;
  v_l8  TEXT := gen_random_uuid()::TEXT;
  v_l9  TEXT := gen_random_uuid()::TEXT;
  v_l10 TEXT := gen_random_uuid()::TEXT;
  v_l11 TEXT := gen_random_uuid()::TEXT;
  v_l12 TEXT := gen_random_uuid()::TEXT;
  v_l13 TEXT := gen_random_uuid()::TEXT;
  v_l14 TEXT := gen_random_uuid()::TEXT;
  v_l15 TEXT := gen_random_uuid()::TEXT;

  -- ── Conversation IDs ──
  v_conv1 TEXT := gen_random_uuid()::TEXT;
  v_conv2 TEXT := gen_random_uuid()::TEXT;
  v_conv3 TEXT := gen_random_uuid()::TEXT;
  v_conv4 TEXT := gen_random_uuid()::TEXT;
  v_conv5 TEXT := gen_random_uuid()::TEXT;

  -- ── Message IDs ──
  v_msg01 TEXT := gen_random_uuid()::TEXT;
  v_msg02 TEXT := gen_random_uuid()::TEXT;
  v_msg03 TEXT := gen_random_uuid()::TEXT;
  v_msg04 TEXT := gen_random_uuid()::TEXT;
  v_msg05 TEXT := gen_random_uuid()::TEXT;
  v_msg06 TEXT := gen_random_uuid()::TEXT;
  v_msg07 TEXT := gen_random_uuid()::TEXT;
  v_msg08 TEXT := gen_random_uuid()::TEXT;
  v_msg09 TEXT := gen_random_uuid()::TEXT;
  v_msg10 TEXT := gen_random_uuid()::TEXT;
  v_msg11 TEXT := gen_random_uuid()::TEXT;
  v_msg12 TEXT := gen_random_uuid()::TEXT;
  v_msg13 TEXT := gen_random_uuid()::TEXT;
  v_msg14 TEXT := gen_random_uuid()::TEXT;
  v_msg15 TEXT := gen_random_uuid()::TEXT;
  v_msg16 TEXT := gen_random_uuid()::TEXT;
  v_msg17 TEXT := gen_random_uuid()::TEXT;
  v_msg18 TEXT := gen_random_uuid()::TEXT;
  v_msg19 TEXT := gen_random_uuid()::TEXT;
  v_msg20 TEXT := gen_random_uuid()::TEXT;
  v_msg21 TEXT := gen_random_uuid()::TEXT;
  v_msg22 TEXT := gen_random_uuid()::TEXT;
  v_msg23 TEXT := gen_random_uuid()::TEXT;
  v_msg24 TEXT := gen_random_uuid()::TEXT;
  v_msg25 TEXT := gen_random_uuid()::TEXT;
  v_msg26 TEXT := gen_random_uuid()::TEXT;
  v_msg27 TEXT := gen_random_uuid()::TEXT;
  v_msg28 TEXT := gen_random_uuid()::TEXT;
  v_msg29 TEXT := gen_random_uuid()::TEXT;
  v_msg30 TEXT := gen_random_uuid()::TEXT;

  -- ── Follow-up step IDs ──
  v_step1_id TEXT := gen_random_uuid()::TEXT;
  v_step2_id TEXT := gen_random_uuid()::TEXT;
  v_step3_id TEXT := gen_random_uuid()::TEXT;

  -- ── Deal IDs ──
  v_deal1 TEXT := gen_random_uuid()::TEXT;
  v_deal2 TEXT := gen_random_uuid()::TEXT;
  v_deal3 TEXT := gen_random_uuid()::TEXT;
  v_deal4 TEXT := gen_random_uuid()::TEXT;
  v_deal5 TEXT := gen_random_uuid()::TEXT;
  v_deal6 TEXT := gen_random_uuid()::TEXT;
  v_deal7 TEXT := gen_random_uuid()::TEXT;

  -- ── Campaign IDs ──
  v_camp1 TEXT := gen_random_uuid()::TEXT;
  v_camp2 TEXT := gen_random_uuid()::TEXT;
  v_camp3 TEXT := gen_random_uuid()::TEXT;

  -- ── Segment IDs ──
  v_seg1 TEXT := gen_random_uuid()::TEXT;
  v_seg2 TEXT := gen_random_uuid()::TEXT;

  -- ── Calendar Event IDs ──
  v_cal1 TEXT := gen_random_uuid()::TEXT;
  v_cal2 TEXT := gen_random_uuid()::TEXT;
  v_cal3 TEXT := gen_random_uuid()::TEXT;

  -- ── Notification IDs ──
  v_notif1 TEXT := gen_random_uuid()::TEXT;
  v_notif2 TEXT := gen_random_uuid()::TEXT;
  v_notif3 TEXT := gen_random_uuid()::TEXT;
  v_notif4 TEXT := gen_random_uuid()::TEXT;
  v_notif5 TEXT := gen_random_uuid()::TEXT;
  v_notif6 TEXT := gen_random_uuid()::TEXT;

  -- ── Sales Policy IDs ──
  v_pol1 TEXT := gen_random_uuid()::TEXT;
  v_pol2 TEXT := gen_random_uuid()::TEXT;
  v_pol3 TEXT := gen_random_uuid()::TEXT;
  v_pol4 TEXT := gen_random_uuid()::TEXT;
  v_pol5 TEXT := gen_random_uuid()::TEXT;

  -- ── Observability Trace IDs ──
  v_trace1 TEXT := gen_random_uuid()::TEXT;
  v_trace2 TEXT := gen_random_uuid()::TEXT;
  v_trace3 TEXT := gen_random_uuid()::TEXT;
  v_trace4 TEXT := gen_random_uuid()::TEXT;
  v_trace5 TEXT := gen_random_uuid()::TEXT;

  -- ── AI Cost Tracking IDs ──
  v_cost1 TEXT := gen_random_uuid()::TEXT;
  v_cost2 TEXT := gen_random_uuid()::TEXT;
  v_cost3 TEXT := gen_random_uuid()::TEXT;
  v_cost4 TEXT := gen_random_uuid()::TEXT;

  -- ── Agent Execution IDs (for traces) ──
  v_exec1 TEXT := gen_random_uuid()::TEXT;
  v_exec2 TEXT := gen_random_uuid()::TEXT;
  v_exec3 TEXT := gen_random_uuid()::TEXT;
  v_exec4 TEXT := gen_random_uuid()::TEXT;
  v_exec5 TEXT := gen_random_uuid()::TEXT;

  -- ── Cognitive State IDs ──
  v_cog1  TEXT := gen_random_uuid()::TEXT;
  v_cog2  TEXT := gen_random_uuid()::TEXT;
  v_cog3  TEXT := gen_random_uuid()::TEXT;
  v_cog4  TEXT := gen_random_uuid()::TEXT;
  v_cog5  TEXT := gen_random_uuid()::TEXT;
  v_cog6  TEXT := gen_random_uuid()::TEXT;
  v_cog7  TEXT := gen_random_uuid()::TEXT;
  v_cog8  TEXT := gen_random_uuid()::TEXT;
  v_cog9  TEXT := gen_random_uuid()::TEXT;
  v_cog10 TEXT := gen_random_uuid()::TEXT;
  v_cog11 TEXT := gen_random_uuid()::TEXT;
  v_cog12 TEXT := gen_random_uuid()::TEXT;
  v_cog13 TEXT := gen_random_uuid()::TEXT;
  v_cog14 TEXT := gen_random_uuid()::TEXT;
  v_cog15 TEXT := gen_random_uuid()::TEXT;

  -- ── Temp variable ──
  v_existing_count INT;

BEGIN
  -- ============================================================
  -- 1. DEMO USER
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "users" WHERE "email" = 'demo@valiautoflow.com';
  IF v_existing_count = 0 THEN
    INSERT INTO "users" ("id", "email", "emailVerified", "name", "password", "role", "workspaceId", "isActive", "lastSeenAt", "createdAt", "updatedAt")
    VALUES (
      v_user_id,
      'demo@valiautoflow.com',
      NOW() - INTERVAL '7 days',
      'Demo User',
      '$2b$12$3mZ.lSTyf/hWYWN4xOOzG.m/XIB/DTaG3K8tyjuVgQrwSKI26fk1q',
      'OWNER',
      v_workspace_id,
      true,
      NOW() - INTERVAL '5 minutes',
      NOW() - INTERVAL '14 days',
      NOW()
    );
    RAISE NOTICE '[SEED] Created demo user: demo@valiautoflow.com';
  ELSE
    SELECT "id" INTO v_user_id FROM "users" WHERE "email" = 'demo@valiautoflow.com' LIMIT 1;
    RAISE NOTICE '[SEED] Demo user already exists, using existing ID: %', v_user_id;
  END IF;

  -- ============================================================
  -- 2. WORKSPACE
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "workspaces" WHERE "slug" = 'demo-restaurante-la-casa';
  IF v_existing_count = 0 THEN
    INSERT INTO "workspaces" ("id", "name", "slug", "plan", "settings", "createdAt", "updatedAt")
    VALUES (
      v_workspace_id,
      'Restaurante La Casa',
      'demo-restaurante-la-casa',
      'PRO',
      '{"timezone": "America/Mexico_City", "currency": "MXN", "language": "es"}',
      NOW() - INTERVAL '14 days',
      NOW()
    );
    RAISE NOTICE '[SEED] Created workspace: Restaurante La Casa';
  ELSE
    SELECT "id" INTO v_workspace_id FROM "workspaces" WHERE "slug" = 'demo-restaurante-la-casa' LIMIT 1;
    RAISE NOTICE '[SEED] Workspace already exists, using existing ID: %', v_workspace_id;
  END IF;

  -- Update user workspaceId if needed
  UPDATE "users" SET "workspaceId" = v_workspace_id WHERE "id" = v_user_id AND ("workspaceId" IS NULL OR "workspaceId" != v_workspace_id);

  -- ============================================================
  -- 3. WORKSPACE MEMBER
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "workspace_members" WHERE "userId" = v_user_id AND "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "workspace_members" ("id", "userId", "workspaceId", "role", "invitedAt", "acceptedAt", "isActive")
    VALUES (
      gen_random_uuid()::TEXT,
      v_user_id,
      v_workspace_id,
      'OWNER',
      NOW() - INTERVAL '14 days',
      NOW() - INTERVAL '14 days',
      true
    );
    RAISE NOTICE '[SEED] Created workspace member link';
  ELSE
    RAISE NOTICE '[SEED] Workspace member already exists';
  END IF;

  -- ============================================================
  -- 4. WORKSPACE CONFIG (Restaurant)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "workspace_configs" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "workspace_configs" (
      "id", "workspaceId", "businessName", "businessType",
      "schedule", "products", "leadFormula", "customQuestions", "policies", "channels",
      "isActive", "createdAt", "updatedAt"
    ) VALUES (
      v_ws_config_id,
      v_workspace_id,
      'Restaurante La Casa',
      'restaurante',
      '{"timezone": "America/Mexico_City", "days": {"monday": {"open": "12:00", "close": "22:00"}, "tuesday": {"open": "12:00", "close": "22:00"}, "wednesday": {"open": "12:00", "close": "22:00"}, "thursday": {"open": "12:00", "close": "22:00"}, "friday": {"open": "12:00", "close": "23:00"}, "saturday": {"open": "11:00", "close": "23:00"}, "sunday": {"open": "11:00", "close": "18:00"}}}',
      '[{"name": "Menu Degustacion 7 Tiempos", "price": 850, "duration_min": 120, "note": "Incluye maridaje de vinos"}, {"name": "Cena Romantic a 2 Personas", "price": 1200, "duration_min": 90, "note": "Velador y champagne de cortesia"}, {"name": "Brunch Dominical", "price": 450, "duration_min": 60, "note": "Buffet libre con jugos naturales"}, {"name": "Evento Privado (hasta 30 personas)", "price": 15000, "duration_min": 240, "note": "Salon exclusivo y menu personalizado"}, {"name": "Taller de Cocina", "price": 600, "duration_min": 180, "note": "Incluye ingredientes y degustacion"}]',
      '{"volume_keyword": "reservacion", "conversion_metric": "confirmacion_deposito", "average_ticket": 850, "funnel_note": "De consulta a reservacion confirmada en menos de 48h"}',
      '[{"id": "q1", "text": "Para cuantas personas seria la reservacion?", "purpose": "group_size", "stage": "EXPLORATION"}, {"id": "q2", "text": "Es alguna ocasion especial?", "purpose": "event_type", "stage": "EXPLORATION"}, {"id": "q3", "text": "Tiene alguna preferencia alimentaria o alergia?", "purpose": "dietary", "stage": "QUALIFICATION"}, {"id": "q4", "text": "Le gustaria incluir algun paquete especial?", "purpose": "upsell", "stage": "PROPOSAL"}, {"id": "q5", "text": "Prefiere turno de comida o cena?", "purpose": "schedule", "stage": "EXPLORATION"}]',
      '{"show_price_early": true, "auto_schedule": true, "max_questions_per_turn": 2, "auto_followup": true, "followup_delay_hours": 24, "require_deposit_for_groups": true, "min_group_deposit_pct": 30}',
      '{"whatsapp": {"enabled": true, "phoneNumber": "+52 55 1234 5678"}, "telegram": {"enabled": false}, "email": {"enabled": true, "address": "reservas@lacasa.com"}}',
      true,
      NOW() - INTERVAL '14 days',
      NOW()
    );
    RAISE NOTICE '[SEED] Created workspace config';
  ELSE
    RAISE NOTICE '[SEED] Workspace config already exists';
  END IF;

  -- ============================================================
  -- 5. AGENTS (7 Carnales)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "agents" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    -- JHON - Closer Cognitivo
    INSERT INTO "agents" ("id", "workspaceId", "type", "name", "description", "config", "isActive", "version", "createdAt", "updatedAt")
    VALUES (v_agent_jhon_id, v_workspace_id, 'CLOSER', 'JHON', 'Closer Cognitivo — Agente de cierre que adapta su estrategia al arquetipo cognitivo del lead. Detecta senales de compra y ejecuta tecnicas de cierre contextualizadas.',
      '{"max_turns": 8, "temperature": 0.7, "closing_strategies": ["urgency_scarcity", "social_proof", "reciprocity"], "archetype_adaptation": true}', true, 3, NOW() - INTERVAL '14 days', NOW());

    -- ORCHESTRATOR - Router Maestro
    INSERT INTO "agents" ("id", "workspaceId", "type", "name", "description", "config", "isActive", "version", "createdAt", "updatedAt")
    VALUES (v_agent_orchestrator_id, v_workspace_id, 'ORCHESTRATOR', 'ORCHESTRATOR', 'Router Maestro — Distribuye conversaciones al agente especializado correcto basandose en contexto, intencion y etapa del lead.',
      '{"routing_strategy": "cognitive_stage", "fallback_agent": "JHON", "max_reassignments": 2, "context_window": 10}', true, 2, NOW() - INTERVAL '14 days', NOW());

    -- MEMORY ENGINE
    INSERT INTO "agents" ("id", "workspaceId", "type", "name", "description", "config", "isActive", "version", "createdAt", "updatedAt")
    VALUES (v_agent_memory_id, v_workspace_id, 'MEMORY', 'MEMORY ENGINE', 'Motor de Memoria — Gestiona el contexto historico de cada lead, recuerda preferencias, interacciones previas y patrones de comportamiento.',
      '{"retention_days": 90, "summarization_threshold": 20, "recall_depth": 5}', true, 2, NOW() - INTERVAL '14 days', NOW());

    -- FOLLOWUP ENGINE
    INSERT INTO "agents" ("id", "workspaceId", "type", "name", "description", "config", "isActive", "version", "createdAt", "updatedAt")
    VALUES (v_agent_followup_id, v_workspace_id, 'FOLLOWUP', 'FOLLOWUP ENGINE', 'Motor de Follow-up — Ejecuta secuencias de seguimiento personalizadas con timing inteligente y mensajes adaptados al estado cognitivo del lead.',
      '{"max_followups": 5, "interval_strategy": "exponential", "channel": "whatsapp"}', true, 2, NOW() - INTERVAL '14 days', NOW());

    -- OBSERVABILITY ENGINE
    INSERT INTO "agents" ("id", "workspaceId", "type", "name", "description", "config", "isActive", "version", "createdAt", "updatedAt")
    VALUES (v_agent_observability_id, v_workspace_id, 'OBSERVABILITY', 'OBSERVABILITY ENGINE', 'Motor de Observabilidad — Monitorea todas las interacciones en tiempo real, detecta anomalias, alucinaciones y desviaciones de politica.',
      '{"trace_sampling": 1.0, "alert_threshold": 0.7, "hallucination_detection": true}', true, 2, NOW() - INTERVAL '14 days', NOW());

    -- ROUTING ENGINE
    INSERT INTO "agents" ("id", "workspaceId", "type", "name", "description", "config", "isActive", "version", "createdAt", "updatedAt")
    VALUES (v_agent_routing_id, v_workspace_id, 'ROUTING', 'ROUTING ENGINE', 'Motor de Enrutamiento — Decide el canal y agente optimo para cada interaccion basandose en reglas de negocio y contexto del lead.',
      '{"priority_channels": ["whatsapp", "email"], "business_hours_routing": true, "vip_detection": true}', true, 2, NOW() - INTERVAL '14 days', NOW());

    -- TOOL OS
    INSERT INTO "agents" ("id", "workspaceId", "type", "name", "description", "config", "isActive", "version", "createdAt", "updatedAt")
    VALUES (v_agent_tool_id, v_workspace_id, 'TOOL', 'TOOL OS', 'Sistema Operativo de Herramientas — Ejecuta acciones concretas: crear eventos, enviar mensajes, actualizar CRMs, generar documentos y conectarse con APIs externas.',
      '{"allowed_tools": ["calendar_create", "message_send", "crm_update", "payment_link", "email_send"], "require_approval_above": 5000}', true, 2, NOW() - INTERVAL '14 days', NOW());

    RAISE NOTICE '[SEED] Created 7 agents';
  ELSE
    RAISE NOTICE '[SEED] Agents already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 6. PIPELINE + STAGES
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "pipelines" WHERE "workspaceId" = v_workspace_id AND "name" = 'Pipeline de Ventas';
  IF v_existing_count = 0 THEN
    INSERT INTO "pipelines" ("id", "workspaceId", "name", "description", "isActive", "createdAt")
    VALUES (v_pipeline_id, v_workspace_id, 'Pipeline de Ventas', 'Pipeline principal de ventas del restaurante', true, NOW() - INTERVAL '14 days');

    INSERT INTO "pipeline_stages" ("id", "pipelineId", "name", "order", "color", "isDefault", "isWonStage", "isLostStage", "createdAt") VALUES
      (v_stage_nuevo_id,       v_pipeline_id, 'Nuevo',       1, '#3B82F6', true,  false, false, NOW() - INTERVAL '14 days'),
      (v_stage_contactado_id,  v_pipeline_id, 'Contactado',  2, '#8B5CF6', false, false, false, NOW() - INTERVAL '14 days'),
      (v_stage_calificado_id,  v_pipeline_id, 'Calificado',  3, '#F59E0B', false, false, false, NOW() - INTERVAL '14 days'),
      (v_stage_propuesta_id,   v_pipeline_id, 'Propuesta',   4, '#10B981', false, false, false, NOW() - INTERVAL '14 days'),
      (v_stage_negociacion_id, v_pipeline_id, 'Negociacion', 5, '#EC4899', false, false, false, NOW() - INTERVAL '14 days'),
      (v_stage_ganado_id,      v_pipeline_id, 'Ganado',      6, '#22C55E', false, true,  false, NOW() - INTERVAL '14 days'),
      (v_stage_perdido_id,     v_pipeline_id, 'Perdido',     7, '#EF4444', false, false, true,  NOW() - INTERVAL '14 days');

    RAISE NOTICE '[SEED] Created pipeline with 7 stages';
  ELSE
    SELECT "id" INTO v_pipeline_id FROM "pipelines" WHERE "workspaceId" = v_workspace_id AND "name" = 'Pipeline de Ventas' LIMIT 1;
    RAISE NOTICE '[SEED] Pipeline already exists, using existing ID: %', v_pipeline_id;
  END IF;

  -- ============================================================
  -- 7. CONTACTS (15 LATAM)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "contacts" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "contacts" ("id", "workspaceId", "phone", "email", "name", "source", "tags", "metadata", "createdAt", "updatedAt") VALUES
      (v_c1,  v_workspace_id, '+52 55 2345 6789', 'maria.gonzalez@gmail.com',     'Maria Gonzalez',     'WHATSAPP', '["vip","frecuente"]',    '{"city": "CDMX", "last_visit": "2025-01-20"}',     NOW() - INTERVAL '12 days', NOW()),
      (v_c2,  v_workspace_id, '+52 33 1987 6543', 'carlos.herrera@outlook.com',   'Carlos Herrera',     'WHATSAPP', '["nuevo"]',              '{"city": "Guadalajara"}',                          NOW() - INTERVAL '10 days', NOW()),
      (v_c3,  v_workspace_id, '+52 81 3456 7890', 'ana.martinez@gmail.com',       'Ana Martinez',       'WHATSAPP', '["corporativo"]',        '{"city": "Monterrey", "company": "TechSol"}',      NOW() - INTERVAL '9 days',  NOW()),
      (v_c4,  v_workspace_id, '+57 310 456 7890', 'juan.perez@hotmail.com',       'Juan Perez',         'FACEBOOK', '["nuevo"]',              '{"city": "Bogota"}',                               NOW() - INTERVAL '8 days',  NOW()),
      (v_c5,  v_workspace_id, '+52 55 8765 4321', 'lucia.romero@gmail.com',       'Lucia Romero',       'WHATSAPP', '["vip","eventos"]',      '{"city": "CDMX", "events_attended": 3}',           NOW() - INTERVAL '7 days',  NOW()),
      (v_c6,  v_workspace_id, '+56 9 8765 4321',  'pedro.soto@gmail.com',         'Pedro Soto',         'INSTAGRAM','["nuevo"]',              '{"city": "Santiago"}',                             NOW() - INTERVAL '6 days',  NOW()),
      (v_c7,  v_workspace_id, '+52 222 123 4567', 'rosa.diaz@outlook.com',        'Rosa Diaz',          'WHATSAPP', '["frecuente"]',          '{"city": "Puebla"}',                               NOW() - INTERVAL '5 days',  NOW()),
      (v_c8,  v_workspace_id, '+51 999 888 777',  'miguel.torres@gmail.com',      'Miguel Torres',      'WHATSAPP', '["corporativo","vip"]',  '{"city": "Lima", "company": "DelSur Corp"}',       NOW() - INTERVAL '5 days',  NOW()),
      (v_c9,  v_workspace_id, '+52 33 5678 1234', 'isabel.vargas@gmail.com',      'Isabel Vargas',      'FACEBOOK', '["nuevo"]',              '{"city": "Guadalajara"}',                          NOW() - INTERVAL '4 days',  NOW()),
      (v_c10, v_workspace_id, '+54 11 6789 0123', 'fernando.ramos@hotmail.com',   'Fernando Ramos',     'WHATSAPP', '["frecuente"]',          '{"city": "Buenos Aires"}',                         NOW() - INTERVAL '4 days',  NOW()),
      (v_c11, v_workspace_id, '+52 55 4321 8765', 'carmen.luna@gmail.com',        'Carmen Luna',        'WHATSAPP', '["vip"]',                '{"city": "CDMX", "last_visit": "2025-02-01"}',     NOW() - INTERVAL '3 days',  NOW()),
      (v_c12, v_workspace_id, '+52 664 789 0123', 'diego.morales@outlook.com',    'Diego Morales',      'INSTAGRAM','["nuevo"]',              '{"city": "Tijuana"}',                              NOW() - INTERVAL '3 days',  NOW()),
      (v_c13, v_workspace_id, '+52 55 6543 2109', 'valentina.castillo@gmail.com', 'Valentina Castillo', 'WHATSAPP', '["eventos"]',            '{"city": "CDMX"}',                                 NOW() - INTERVAL '2 days',  NOW()),
      (v_c14, v_workspace_id, '+52 333 456 7890', 'alejandro.reyes@hotmail.com',  'Alejandro Reyes',    'WHATSAPP', '["nuevo","corporativo"]','{"city": "Guadalajara", "company": "JaliscoTech"}', NOW() - INTERVAL '1 day',   NOW()),
      (v_c15, v_workspace_id, '+52 55 9876 5432', 'sofia.mendoza@gmail.com',      'Sofia Mendoza',      'WHATSAPP', '["frecuente","vip"]',    '{"city": "CDMX", "last_visit": "2025-02-10"}',     NOW() - INTERVAL '6 hours', NOW());

    RAISE NOTICE '[SEED] Created 15 contacts';
  ELSE
    RAISE NOTICE '[SEED] Contacts already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 8. LEADS (15)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "leads" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "leads" ("id", "workspaceId", "contactId", "status", "temperature", "archetype", "score", "assignedAgentId", "pipelineStage", "dealValue", "currency", "lostReason", "firstContactAt", "lastContactAt", "createdAt", "updatedAt") VALUES
      (v_l1,  v_workspace_id, v_c1,  'QUALIFIED',  'HOT',   'DECISIVE',    85, v_user_id, 'Propuesta',    2400,  'MXN', NULL, NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 hour',    NOW() - INTERVAL '12 days', NOW()),
      (v_l2,  v_workspace_id, v_c2,  'NEW',        'COLD',  'CAUTIOUS',    20, NULL,      'Nuevo',        0,     'MXN', NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days',   NOW() - INTERVAL '10 days', NOW()),
      (v_l3,  v_workspace_id, v_c3,  'PROPOSAL',   'HOT',   'ANALYTICAL',  90, v_user_id, 'Propuesta',    15000, 'MXN', NULL, NOW() - INTERVAL '9 days',  NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '9 days',  NOW()),
      (v_l4,  v_workspace_id, v_c4,  'CONTACTED',  'WARM',  'IMPULSIVE',   55, NULL,      'Contactado',   850,   'MXN', NULL, NOW() - INTERVAL '8 days',  NOW() - INTERVAL '2 days',     NOW() - INTERVAL '8 days',  NOW()),
      (v_l5,  v_workspace_id, v_c5,  'NEGOTIATION','HOT',   'DECISIVE',    92, v_user_id, 'Negociacion',  3600,  'MXN', NULL, NOW() - INTERVAL '7 days',  NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '7 days',  NOW()),
      (v_l6,  v_workspace_id, v_c6,  'NEW',        'COLD',  'CAUTIOUS',    15, NULL,      'Nuevo',        0,     'MXN', NULL, NOW() - INTERVAL '6 days',  NOW() - INTERVAL '6 days',     NOW() - INTERVAL '6 days',  NOW()),
      (v_l7,  v_workspace_id, v_c7,  'QUALIFIED',  'WARM',  'SOCIAL',      65, NULL,      'Calificado',   1700,  'MXN', NULL, NOW() - INTERVAL '5 days',  NOW() - INTERVAL '1 day',      NOW() - INTERVAL '5 days',  NOW()),
      (v_l8,  v_workspace_id, v_c8,  'PROPOSAL',   'HOT',   'DECISIVE',    88, v_user_id, 'Propuesta',    15000, 'MXN', NULL, NOW() - INTERVAL '5 days',  NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '5 days',  NOW()),
      (v_l9,  v_workspace_id, v_c9,  'CONTACTED',  'COLD',  'CAUTIOUS',    30, NULL,      'Contactado',   0,     'MXN', NULL, NOW() - INTERVAL '4 days',  NOW() - INTERVAL '3 days',     NOW() - INTERVAL '4 days',  NOW()),
      (v_l10, v_workspace_id, v_c10, 'QUALIFIED',  'WARM',  'ANALYTICAL',  60, NULL,      'Calificado',   2400,  'MXN', NULL, NOW() - INTERVAL '4 days',  NOW() - INTERVAL '12 hours',   NOW() - INTERVAL '4 days',  NOW()),
      (v_l11, v_workspace_id, v_c11, 'WON',        'HOT',   'DECISIVE',    95, v_user_id, 'Ganado',       1200,  'MXN', NULL, NOW() - INTERVAL '3 days',  NOW() - INTERVAL '1 day',      NOW() - INTERVAL '3 days',  NOW()),
      (v_l12, v_workspace_id, v_c12, 'NEW',        'COLD',  'IMPULSIVE',   10, NULL,      'Nuevo',        0,     'MXN', NULL, NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days',     NOW() - INTERVAL '3 days',  NOW()),
      (v_l13, v_workspace_id, v_c13, 'CONTACTED',  'WARM',  'SOCIAL',      50, NULL,      'Contactado',   850,   'MXN', NULL, NOW() - INTERVAL '2 days',  NOW() - INTERVAL '6 hours',    NOW() - INTERVAL '2 days',  NOW()),
      (v_l14, v_workspace_id, v_c14, 'LOST',       'COLD',  'ANALYTICAL',  25, NULL,      'Perdido',      15000, 'MXN', 'Presupuesto insuficiente', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW()),
      (v_l15, v_workspace_id, v_c15, 'QUALIFIED',  'WARM',  'SOCIAL',      70, v_user_id, 'Calificado',   1700,  'MXN', NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '6 hours', NOW());

    RAISE NOTICE '[SEED] Created 15 leads';
  ELSE
    RAISE NOTICE '[SEED] Leads already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 9. CONVERSATIONS + MESSAGES (5 convos, WhatsApp restaurant)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "conversations" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    -- Conv 1: Maria - Reservacion cena romantica (HOT lead)
    INSERT INTO "conversations" ("id", "workspaceId", "contactId", "leadId", "channel", "status", "currentStage", "lastMessageAt", "createdAt", "updatedAt")
    VALUES (v_conv1, v_workspace_id, v_c1, v_l1, 'WHATSAPP', 'ACTIVE', 'PROPOSAL', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '12 days', NOW());

    INSERT INTO "messages" ("id", "conversationId", "direction", "content", "senderType", "senderId", "metadata", "status", "templateUsed", "createdAt") VALUES
      (v_msg01, v_conv1, 'INBOUND',  'Hola, quiero hacer una reservacion para este sabado, es nuestro aniversario', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '12 days'),
      (v_msg02, v_conv1, 'OUTBOUND', '¡Hola Maria! Muchas felicidades por su aniversario 🎉 En La Casa tenemos una Cena Romantica para 2 personas que incluye velador y champagne de cortesia. ¿Les gustaria reservar ese paquete?', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '12 days' + INTERVAL '2 minutes'),
      (v_msg03, v_conv1, 'INBOUND',  'Si suena genial! A que horas tienen disponibilidad?', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '12 days' + INTERVAL '5 minutes'),
      (v_msg04, v_conv1, 'OUTBOUND', 'Tenemos horarios a las 19:00, 20:00 y 21:00. Para la cena romantica recomiendo 19:00 para disfrutar del atardecer en la terraza 🌅 ¿Que horario les viene mejor?', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '12 days' + INTERVAL '7 minutes'),
      (v_msg05, v_conv1, 'INBOUND',  'Las 19:00 perfecto! Y cual es el costo?', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '12 days' + INTERVAL '10 minutes'),
      (v_msg06, v_conv1, 'OUTBOUND', 'La Cena Romantica para 2 es de $1,200 MXN. Incluye menu de 3 tiempos, bebida de bienvenida, velador en mesa y champagne de cortesia 🥂 ¿Confirmo la reservacion?', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '12 days' + INTERVAL '12 minutes');

    -- Conv 2: Carlos - Consulta menu (COLD lead)
    INSERT INTO "conversations" ("id", "workspaceId", "contactId", "leadId", "channel", "status", "currentStage", "lastMessageAt", "createdAt", "updatedAt")
    VALUES (v_conv2, v_workspace_id, v_c2, v_l2, 'WHATSAPP', 'ACTIVE', 'EXPLORATION', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW());

    INSERT INTO "messages" ("id", "conversationId", "direction", "content", "senderType", "senderId", "metadata", "status", "templateUsed", "createdAt") VALUES
      (v_msg07, v_conv2, 'INBOUND',  'Buenas tardes, tienen menu vegetariano?', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '10 days'),
      (v_msg08, v_conv2, 'OUTBOUND', '¡Hola Carlos! Si, tenemos opciones vegetarianas en nuestro menu. Contamos con ensalada mediterranea, risotto de hongos y pasta con pesto de albahaca. ¿Te gustaria hacer una reservacion para probarlos?', 'AGENT', v_agent_orchestrator_id, '{"agentType": "ORCHESTRATOR"}', 'DELIVERED', NULL, NOW() - INTERVAL '10 days' + INTERVAL '3 minutes'),
      (v_msg09, v_conv2, 'INBOUND',  'Solo estaba preguntando por ahora, gracias', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '10 days' + INTERVAL '20 minutes'),
      (v_msg10, v_conv2, 'OUTBOUND', 'Claro que si, Carlos! Cuando quieras visitarnos aqui estamos. Te guardo el contacto para enviarte nuestras promociones del mes. ¡Te esperamos! 😊', 'AGENT', v_agent_followup_id, '{"agentType": "FOLLOWUP"}', 'DELIVERED', NULL, NOW() - INTERVAL '10 days' + INTERVAL '22 minutes');

    -- Conv 3: Ana - Evento corporativo (HOT lead, big deal)
    INSERT INTO "conversations" ("id", "workspaceId", "contactId", "leadId", "channel", "status", "currentStage", "lastMessageAt", "createdAt", "updatedAt")
    VALUES (v_conv3, v_workspace_id, v_c3, v_l3, 'WHATSAPP', 'ACTIVE', 'PROPOSAL', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '9 days', NOW());

    INSERT INTO "messages" ("id", "conversationId", "direction", "content", "senderType", "senderId", "metadata", "status", "templateUsed", "createdAt") VALUES
      (v_msg11, v_conv3, 'INBOUND',  'Hola, necesito cotizar un evento corporativo para 25 personas, es para el 15 de marzo', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '9 days'),
      (v_msg12, v_conv3, 'OUTBOUND', '¡Hola Ana! Con gusto te ayudo con la cotizacion. Nuestro evento privado para hasta 30 personas incluye salon exclusivo y menu personalizado. Para darte una propuesta exacta, ¿me confirmas: es almuerzo o cena, y hay alguna preferencia de menu?', 'AGENT', v_agent_orchestrator_id, '{"agentType": "ORCHESTRATOR"}', 'DELIVERED', NULL, NOW() - INTERVAL '9 days' + INTERVAL '5 minutes'),
      (v_msg13, v_conv3, 'INBOUND',  'Seria cena, y nos gustaria un menu de 3 tiempos con opcion de vino', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '9 days' + INTERVAL '15 minutes'),
      (v_msg14, v_conv3, 'OUTBOUND', 'Perfecto, Ana. Te preparo una propuesta: Cena corporativa 3 tiempos con maridaje de vinos para 25 personas - $15,000 MXN. Incluye: salon exclusivo 4 horas, menu personalizado, servicio de sommelier, estacionamiento incluido. ¿Te parece bien que agende el 15 de marzo?', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '9 days' + INTERVAL '20 minutes'),
      (v_msg15, v_conv3, 'INBOUND',  'Suena muy bien, lo consulto con mi jefe y les confirmo hoy mismo', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '9 days' + INTERVAL '30 minutes'),
      (v_msg16, v_conv3, 'OUTBOUND', 'Excelente, Ana! Quedo atento a su confirmacion. Mientras tanto, puedo reservarte el horario provisionalmente para que no se llene. ¿Te parece bien?', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '9 days' + INTERVAL '32 minutes');

    -- Conv 4: Lucia - Reservacion brunch (HOT lead, VIP)
    INSERT INTO "conversations" ("id", "workspaceId", "contactId", "leadId", "channel", "status", "currentStage", "lastMessageAt", "createdAt", "updatedAt")
    VALUES (v_conv4, v_workspace_id, v_c5, v_l5, 'WHATSAPP', 'ACTIVE', 'NEGOTIATION', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '7 days', NOW());

    INSERT INTO "messages" ("id", "conversationId", "direction", "content", "senderType", "senderId", "metadata", "status", "templateUsed", "createdAt") VALUES
      (v_msg17, v_conv4, 'INBOUND',  'Hola! Quiero reservar el brunch dominical para 6 personas, somos clientes frecuentes', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '7 days'),
      (v_msg18, v_conv4, 'OUTBOUND', '¡Hola Lucia! Que gusto saludarte, siempre es un placer tenerlos 🌟 Como cliente VIP tienen 15% de descuento en el Brunch Dominical. Serian $2,380 MXN por 6 personas con descuento incluido. ¿Para este domingo?', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '7 days' + INTERVAL '1 minute'),
      (v_msg19, v_conv4, 'INBOUND',  'Si para este domingo! Y pueden acomodarnos en la terraza?', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '7 days' + INTERVAL '8 minutes'),
      (v_msg20, v_conv4, 'OUTBOUND', '¡Por supuesto! Ya te reserve la terraza para 6 personas a las 11:00 AM. Solo necesito confirmar con un deposito del 30% ($714 MXN) para garantizar la reservacion. Te envio el link de pago?', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '7 days' + INTERVAL '10 minutes'),
      (v_msg21, v_conv4, 'INBOUND',  'Si, manda el link. Tambien queremos agregar el taller de cocina despues del brunch', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '7 days' + INTERVAL '15 minutes'),
      (v_msg22, v_conv4, 'OUTBOUND', '¡Excelente eleccion! El Taller de Cocina es de $600 por persona. Para 6 serian $3,600. Con el brunch y taller serian $5,980 MXN total, con tu descuento VIP queda en $5,083 MXN. Te envio el link de pago con todo incluido 🎉', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '7 days' + INTERVAL '18 minutes');

    -- Conv 5: Rosa - Consulta sobre alergias (WARM lead)
    INSERT INTO "conversations" ("id", "workspaceId", "contactId", "leadId", "channel", "status", "currentStage", "lastMessageAt", "createdAt", "updatedAt")
    VALUES (v_conv5, v_workspace_id, v_c7, v_l7, 'WHATSAPP', 'ACTIVE', 'QUALIFICATION', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 days', NOW());

    INSERT INTO "messages" ("id", "conversationId", "direction", "content", "senderType", "senderId", "metadata", "status", "templateUsed", "createdAt") VALUES
      (v_msg23, v_conv5, 'INBOUND',  'Buenos dias, mi hijo es alergico a los frutos secos. Pueden preparar algo seguro?', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '5 days'),
      (v_msg24, v_conv5, 'OUTBOUND', '¡Hola Rosa! Por supuesto, nuestra cocina puede adaptar cualquier platillo sin frutos secos. Tenemos protocolos estrictos de alergenos. ¿Cuantas personas serian y para cuando les gustaria visitarnos?', 'AGENT', v_agent_orchestrator_id, '{"agentType": "ORCHESTRATOR"}', 'DELIVERED', NULL, NOW() - INTERVAL '5 days' + INTERVAL '4 minutes'),
      (v_msg25, v_conv5, 'INBOUND',  'Seriamos 4, para el viernes que viene si hay lugar', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),
      (v_msg26, v_conv5, 'OUTBOUND', 'Si tenemos disponibilidad para el viernes a las 20:00. Para 4 personas en zona sin frutos secos. ¿Les parece bien ese horario? Puedo hacer la reservacion especial con nota para el chef.', 'AGENT', v_agent_jhon_id, '{"agentType": "CLOSER"}', 'DELIVERED', NULL, NOW() - INTERVAL '5 days' + INTERVAL '33 minutes'),
      (v_msg27, v_conv5, 'INBOUND',  'Perfecto, apartalo por favor', 'CONTACT', NULL, '{}', 'DELIVERED', NULL, NOW() - INTERVAL '5 days' + INTERVAL '40 minutes'),
      (v_msg28, v_conv5, 'OUTBOUND', '¡Listo, Rosa! Reservacion confirmada: Viernes, 4 personas, 20:00, sin frutos secos. Recibiras un recordatorio 24h antes. ¡Los esperamos! 😊', 'AGENT', v_agent_tool_id, '{"agentType": "TOOL", "toolUsed": "calendar_create"}', 'DELIVERED', NULL, NOW() - INTERVAL '5 days' + INTERVAL '42 minutes');

    RAISE NOTICE '[SEED] Created 5 conversations with messages';
  ELSE
    RAISE NOTICE '[SEED] Conversations already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 10. COGNITIVE STATES (one per lead)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "cognitive_states" WHERE "leadId" IN (SELECT "id" FROM "leads" WHERE "workspaceId" = v_workspace_id);
  IF v_existing_count = 0 THEN
    INSERT INTO "cognitive_states" ("id", "leadId", "conversationId", "temperature", "archetype", "intentScore", "churnRisk", "priority", "historicalContext", "updatedAt") VALUES
      (v_cog1,  v_l1,  v_conv1, 'HOT',   'DECISIVE',   0.85, 0.10, 9, '{"interactions": 6, "avg_response_time_min": 8, "topics": ["cena_romantica", "aniversario", "reservacion"]}', NOW() - INTERVAL '1 hour'),
      (v_cog2,  v_l2,  v_conv2, 'COLD',  'CAUTIOUS',   0.20, 0.80, 3, '{"interactions": 2, "avg_response_time_min": 120, "topics": ["menu_vegetariano"]}', NOW() - INTERVAL '10 days'),
      (v_cog3,  v_l3,  v_conv3, 'HOT',   'ANALYTICAL', 0.90, 0.15, 10, '{"interactions": 5, "avg_response_time_min": 15, "topics": ["evento_corporativo", "cena", "cotizacion"]}', NOW() - INTERVAL '30 minutes'),
      (v_cog4,  v_l4,  NULL,    'WARM',  'IMPULSIVE',  0.55, 0.45, 6, '{"interactions": 3, "avg_response_time_min": 45, "topics": ["reservacion"]}', NOW() - INTERVAL '2 days'),
      (v_cog5,  v_l5,  v_conv4, 'HOT',   'DECISIVE',   0.92, 0.05, 10, '{"interactions": 8, "avg_response_time_min": 5, "topics": ["brunch", "taller_cocina", "terraza", "vip"]}', NOW() - INTERVAL '15 minutes'),
      (v_cog6,  v_l6,  NULL,    'COLD',  'CAUTIOUS',   0.15, 0.85, 2, '{"interactions": 1, "avg_response_time_min": 0, "topics": []}', NOW() - INTERVAL '6 days'),
      (v_cog7,  v_l7,  v_conv5, 'WARM',  'SOCIAL',     0.65, 0.30, 7, '{"interactions": 4, "avg_response_time_min": 20, "topics": ["alergias", "reservacion", "ninos"]}', NOW() - INTERVAL '1 day'),
      (v_cog8,  v_l8,  NULL,    'HOT',   'DECISIVE',   0.88, 0.12, 9, '{"interactions": 5, "avg_response_time_min": 10, "topics": ["evento_privado", "corporativo"]}', NOW() - INTERVAL '45 minutes'),
      (v_cog9,  v_l9,  NULL,    'COLD',  'CAUTIOUS',   0.30, 0.70, 4, '{"interactions": 2, "avg_response_time_min": 180, "topics": ["menu"]}', NOW() - INTERVAL '3 days'),
      (v_cog10, v_l10, NULL,    'WARM',  'ANALYTICAL', 0.60, 0.35, 6, '{"interactions": 3, "avg_response_time_min": 30, "topics": ["brunch", "precios"]}', NOW() - INTERVAL '12 hours'),
      (v_cog11, v_l11, NULL,    'HOT',   'DECISIVE',   0.95, 0.02, 10, '{"interactions": 7, "avg_response_time_min": 3, "topics": ["cena", "reservacion", "vip"]}', NOW() - INTERVAL '1 day'),
      (v_cog12, v_l12, NULL,    'COLD',  'IMPULSIVE',  0.10, 0.90, 2, '{"interactions": 1, "avg_response_time_min": 0, "topics": []}', NOW() - INTERVAL '3 days'),
      (v_cog13, v_l13, NULL,    'WARM',  'SOCIAL',     0.50, 0.40, 5, '{"interactions": 3, "avg_response_time_min": 60, "topics": ["eventos", "reservacion"]}', NOW() - INTERVAL '6 hours'),
      (v_cog14, v_l14, NULL,    'COLD',  'ANALYTICAL', 0.25, 0.75, 3, '{"interactions": 4, "avg_response_time_min": 1440, "topics": ["evento_corporativo", "presupuesto"], "lost_reason": "budget"}', NOW() - INTERVAL '1 day'),
      (v_cog15, v_l15, NULL,    'WARM',  'SOCIAL',     0.70, 0.25, 7, '{"interactions": 4, "avg_response_time_min": 12, "topics": ["brunch", "frecuente"]}', NOW() - INTERVAL '30 minutes');

    RAISE NOTICE '[SEED] Created 15 cognitive states';
  ELSE
    RAISE NOTICE '[SEED] Cognitive states already exist for leads, skipping';
  END IF;

  -- ============================================================
  -- 11. DEALS (for hot/warm leads)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "deals" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "deals" ("id", "workspaceId", "leadId", "pipelineId", "pipelineStageId", "title", "value", "currency", "probability", "expectedCloseDate", "assignedAgentId", "createdAt", "updatedAt") VALUES
      (v_deal1, v_workspace_id, v_l1,  v_pipeline_id, v_stage_propuesta_id,   'Cena Romantica Aniversario - Maria',      1200,  'MXN', 0.75, NOW() + INTERVAL '2 days',  v_user_id, NOW() - INTERVAL '10 days', NOW()),
      (v_deal2, v_workspace_id, v_l3,  v_pipeline_id, v_stage_propuesta_id,   'Evento Corporativo 25p - TechSol',        15000, 'MXN', 0.80, NOW() + INTERVAL '5 days',  v_user_id, NOW() - INTERVAL '8 days',  NOW()),
      (v_deal3, v_workspace_id, v_l5,  v_pipeline_id, v_stage_negociacion_id, 'Brunch + Taller VIP - Lucia',             5083,  'MXN', 0.90, NOW() + INTERVAL '1 day',   v_user_id, NOW() - INTERVAL '6 days',  NOW()),
      (v_deal4, v_workspace_id, v_l7,  v_pipeline_id, v_stage_calificado_id,  'Cena Familiar Alergenos - Rosa',          1700,  'MXN', 0.55, NOW() + INTERVAL '3 days',  NULL,      NOW() - INTERVAL '4 days',  NOW()),
      (v_deal5, v_workspace_id, v_l8,  v_pipeline_id, v_stage_propuesta_id,   'Evento Privado 30p - DelSur',             15000, 'MXN', 0.70, NOW() + INTERVAL '7 days',  v_user_id, NOW() - INTERVAL '4 days',  NOW()),
      (v_deal6, v_workspace_id, v_l11, v_pipeline_id, v_stage_ganado_id,      'Cena VIP Carmen',                         1200,  'MXN', 1.00, NOW() - INTERVAL '1 day',   v_user_id, NOW() - INTERVAL '2 days',  NOW()),
      (v_deal7, v_workspace_id, v_l15, v_pipeline_id, v_stage_calificado_id,  'Brunch Dominical Sofia',                  1700,  'MXN', 0.60, NOW() + INTERVAL '4 days',  v_user_id, NOW() - INTERVAL '6 hours', NOW());

    RAISE NOTICE '[SEED] Created 7 deals';
  ELSE
    RAISE NOTICE '[SEED] Deals already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 12. CAMPAIGNS (3)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "campaigns" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "campaigns" ("id", "workspaceId", "name", "description", "segmentQuery", "channel", "templateBody", "status", "stats", "startedAt", "completedAt", "createdAt", "updatedAt") VALUES
      (v_camp1, v_workspace_id, 'Bienvenida Nuevos Leads',
       'Secuencia de bienvenida para leads que recien ingresan al restaurante',
       '{"status": "NEW", "temperature": "COLD"}',
       'whatsapp',
       '¡Hola {{nombre}}! Bienvenido a Restaurante La Casa 🏠 Estamos emocionados de conocerte. ¿Te gustaria conocer nuestro menu especial de la semana?',
       'active',
       '{"sent": 8, "delivered": 7, "opened": 5, "clicked": 3, "converted": 1}',
       NOW() - INTERVAL '7 days', NULL,
       NOW() - INTERVAL '10 days', NOW()),

      (v_camp2, v_workspace_id, 'Reactivacion Leads Frios',
       'Campana de reactivacion para leads que no han respondido en mas de 72h',
       '{"status": ["CONTACTED","QUALIFIED"], "lastInteractionDays": 3, "temperature": ["COLD","WARM"]}',
       'whatsapp',
       '¡Hola {{nombre}}! Hace tiempo que no sabemos de ti 😊 Tenemos una sorpresa especial para ti: 20% de descuento en tu primera visita. ¿Te animas?',
       'active',
       '{"sent": 5, "delivered": 4, "opened": 3, "clicked": 2, "converted": 0}',
       NOW() - INTERVAL '3 days', NULL,
       NOW() - INTERVAL '5 days', NOW()),

      (v_camp3, v_workspace_id, 'Promo Sabatino',
       'Promocion especial de sabado con descuento en Menu Degustacion',
       '{"tags": ["vip","frecuente"], "status": ["QUALIFIED","CONTACTED","PROPOSAL"]}',
       'whatsapp',
       '¡{{nombre}}! Este sabado tenemos algo especial para ti 🎉 Menu Degustacion 7 Tiempos con 30% de descuento. Solo este fin de semana. ¿Reservamos tu lugar?',
       'draft',
       '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "converted": 0}',
       NULL, NULL,
       NOW() - INTERVAL '1 day', NOW());

    RAISE NOTICE '[SEED] Created 3 campaigns';
  ELSE
    RAISE NOTICE '[SEED] Campaigns already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 13. SEGMENTS (2)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "segments" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "segments" ("id", "workspaceId", "name", "description", "conditions", "leadCount", "isDynamic", "isActive", "createdAt", "updatedAt") VALUES
      (v_seg1, v_workspace_id, 'Leads Nuevos',
       'Leads que recien ingresaron y aun no han sido calificados',
       '{"status": ["NEW"], "scoreRange": [0, 30]}',
       4, true, true, NOW() - INTERVAL '10 days', NOW()),

      (v_seg2, v_workspace_id, 'VIP',
       'Clientes frecuentes y de alto valor con trato preferencial',
       '{"tags": ["vip"], "scoreRange": [70, 100], "temperature": ["HOT","WARM"]}',
       6, true, true, NOW() - INTERVAL '10 days', NOW());

    RAISE NOTICE '[SEED] Created 2 segments';
  ELSE
    RAISE NOTICE '[SEED] Segments already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 14. CALENDAR EVENTS (3)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "calendar_events" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "calendar_events" ("id", "workspaceId", "contactId", "leadId", "googleEventId", "summary", "description", "startTime", "endTime", "status", "createdBy", "meetLink", "createdAt", "updatedAt") VALUES
      (v_cal1, v_workspace_id, v_c1,  v_l1,  NULL, 'Cena Romantica - Maria Gonzalez (2p)',
       'Aniversario, mesa con velador, champagne de cortesia. Sin frutos secos.',
       NOW() + INTERVAL '2 days' + TIME '19:00',
       NOW() + INTERVAL '2 days' + TIME '21:30',
       'scheduled', 'ai', NULL, NOW() - INTERVAL '12 days', NOW()),

      (v_cal2, v_workspace_id, v_c5,  v_l5,  NULL, 'Brunch + Taller de Cocina - Lucia Romero (6p)',
       'Brunch dominical 6 personas + taller de cocina. Terraza. Cliente VIP 15% desc.',
       NOW() + INTERVAL '4 days' + TIME '11:00',
       NOW() + INTERVAL '4 days' + TIME '15:00',
       'scheduled', 'ai', NULL, NOW() - INTERVAL '7 days', NOW()),

      (v_cal3, v_workspace_id, v_c3,  v_l3,  NULL, 'Evento Corporativo - TechSol (25p) [Provisional]',
       'Cena corporativa 3 tiempos con maridaje. Pendiente confirmacion del cliente.',
       (NOW() + INTERVAL '15 days')::date + TIME '19:00',
       (NOW() + INTERVAL '15 days')::date + TIME '23:00',
       'scheduled', 'ai', NULL, NOW() - INTERVAL '9 days', NOW());

    RAISE NOTICE '[SEED] Created 3 calendar events';
  ELSE
    RAISE NOTICE '[SEED] Calendar events already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 15. NOTIFICATIONS (6)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "notifications" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "notifications" ("id", "workspaceId", "recipientId", "type", "title", "description", "read", "actionUrl", "createdAt") VALUES
      (v_notif1, v_workspace_id, v_user_id, 'alert',    'Lead HOT detectado',             'Ana Martinez tiene una intencion de compra del 90%. Cotizacion de evento por $15,000 MXN.', false, '/leads/' || v_l3,  NOW() - INTERVAL '30 minutes'),
      (v_notif2, v_workspace_id, v_user_id, 'calendar', 'Reservacion proxima',            'Cena Romantica - Maria Gonzalez en 2 dias. Confirmar deposito pendiente.',                 false, '/calendar',        NOW() - INTERVAL '2 hours'),
      (v_notif3, v_workspace_id, v_user_id, 'campaign', 'Campana enviada',                'Campana "Reactivacion Leads Frios" enviada a 5 contacts. 3 abrieron el mensaje.',         true,  '/campaigns',       NOW() - INTERVAL '1 day'),
      (v_notif4, v_workspace_id, v_user_id, 'system',   'Nuevo lead ingreso',             'Diego Morales se registro via Instagram. Temperatura: COLD. Score: 10.',                   false, '/leads/' || v_l12, NOW() - INTERVAL '3 days'),
      (v_notif5, v_workspace_id, v_user_id, 'alert',    'Lead VIP requiere atencion',     'Lucia Romero (VIP) esta en negociacion. Ultimo mensaje hace 15 min. Intervencion humana recomendada.', false, '/leads/' || v_l5,  NOW() - INTERVAL '15 minutes'),
      (v_notif6, v_workspace_id, v_user_id, 'system',   'Deal cerrado exitosamente',      'Deal "Cena VIP Carmen" cerrado por $1,200 MXN. ¡Felicidades! 🎉',                        true,  '/deals',           NOW() - INTERVAL '1 day');

    RAISE NOTICE '[SEED] Created 6 notifications';
  ELSE
    RAISE NOTICE '[SEED] Notifications already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 16. FOLLOW-UP SEQUENCE (1 sequence with 3 steps)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "follow_up_sequences" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "follow_up_sequences" ("id", "workspaceId", "name", "description", "triggerCondition", "isActive", "createdAt", "updatedAt")
    VALUES (v_seq_id, v_workspace_id, 'Secuencia Bienvenida Restaurante',
      'Secuencia automatica de 3 pasos para leads nuevos que no responden en 24h',
      '{"status": "NEW", "temperature": ["COLD","WARM"], "lastInteractionHours": 24}',
      true, NOW() - INTERVAL '10 days', NOW());

    INSERT INTO "follow_up_steps" ("id", "sequenceId", "order", "delayMinutes", "messageTemplate", "agentType", "conditions", "isActive", "createdAt") VALUES
      (v_step1_id, v_seq_id, 1, 1440, -- 24h
       '¡Hola {{nombre}}! Te escribimos de Restaurante La Casa 🏠 Vimos que estabas interesado/a en visitarnos. ¿Tienes alguna duda sobre nuestro menu o horarios?',
       'FOLLOWUP', '{"temperature": ["COLD","WARM"]}', true, NOW() - INTERVAL '10 days'),

      (v_step2_id, v_seq_id, 2, 2880, -- 48h
       '¡Hola {{nombre}}! No queremos que te pierdas nuestra promocion especial 🎉 20% de descuento en tu primera reserva. Solo dime cuando y te aparto el mejor lugar.',
       'FOLLOWUP', '{"temperature": ["COLD","WARM"], "previous_step_responded": false}', true, NOW() - INTERVAL '10 days'),

      (v_step3_id, v_seq_id, 3, 4320, -- 72h
       '¡Hola {{nombre}}! Ultima oportunidad: te guardamos un lugar especial esta semana con cortesia de bienvenida 🥂 ¿Te animas a conocernos?',
       'FOLLOWUP', '{"temperature": ["COLD"], "previous_step_responded": false}', true, NOW() - INTERVAL '10 days');

    RAISE NOTICE '[SEED] Created follow-up sequence with 3 steps';
  ELSE
    RAISE NOTICE '[SEED] Follow-up sequences already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 17. SALES POLICIES (5)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "sales_policies" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "sales_policies" ("id", "workspaceId", "name", "description", "ruleType", "config", "isActive", "priority", "createdAt", "updatedAt") VALUES
      (v_pol1, v_workspace_id, 'No presionar leads frios',
       'Si el lead tiene temperatura COLD y score < 30, no usar tecnicas de cierre agresivo. Solo informar y mantener tono consultivo.',
       'BEHAVIORAL',
       '{"condition": {"temperature": "COLD", "score_max": 30}, "action": "soft_approach_only", "max_closing_attempts": 0}',
       true, 10, NOW() - INTERVAL '14 days', NOW()),

      (v_pol2, v_workspace_id, 'Deposito obligatorio grupos > 8',
       'Para grupos de mas de 8 personas, requerir deposito del 30% antes de confirmar la reservacion.',
       'COMMERCIAL',
       '{"condition": {"group_size_min": 8}, "action": "require_deposit", "deposit_pct": 30, "message": "Para grupos de mas de 8 requerimos un deposito del 30% para confirmar su reservacion."}',
       true, 20, NOW() - INTERVAL '14 days', NOW()),

      (v_pol3, v_workspace_id, 'Descuento VIP automatico',
       'Clientes con tag VIP reciben 15% de descuento automatico en todas las reservaciones.',
       'PRICING',
       '{"condition": {"tags": ["vip"]}, "action": "apply_discount", "discount_pct": 15, "apply_to": "all_services"}',
       true, 15, NOW() - INTERVAL '14 days', NOW()),

      (v_pol4, v_workspace_id, 'Maximo 2 preguntas por turno',
       'No hacer mas de 2 preguntas en una sola respuesta para evitar abrumar al lead.',
       'CONVERSATIONAL',
       '{"condition": {}, "action": "limit_questions", "max_questions_per_turn": 2, "rationale": "Evitar saturacion cognitiva del lead"}',
       true, 5, NOW() - INTERVAL '14 days', NOW()),

      (v_pol5, v_workspace_id, 'Escalacion humana leads HOT sin respuesta',
       'Si un lead HOT no responde en 2 horas, notificar al agente humano para posible intervencion.',
       'ROUTING',
       '{"condition": {"temperature": "HOT", "no_response_hours": 2}, "action": "notify_human", "notification_type": "alert", "escalation_message": "Lead HOT sin respuesta en 2h. Se recomienda intervencion humana."}',
       true, 25, NOW() - INTERVAL '14 days', NOW());

    RAISE NOTICE '[SEED] Created 5 sales policies';
  ELSE
    RAISE NOTICE '[SEED] Sales policies already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 18. OBSERVABILITY TRACES (5)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "observability_traces" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    -- First create some agent executions to link traces to
    INSERT INTO "agent_executions" ("id", "agentId", "conversationId", "leadId", "inputSummary", "outputSummary", "decisionRationale", "policiesApplied", "cognitiveContext", "duration", "tokenUsage", "cost", "status", "createdAt") VALUES
      (v_exec1, v_agent_jhon_id,         v_conv1, v_l1,  'Lead pide reservacion para aniversario',         'Propuesta de cena romantica enviada',           'Lead DECISIVE con alta intencion, aplicar cierre directo',    '["No presionar leads frios","Descuento VIP automatico"]', '{"temperature": "HOT", "archetype": "DECISIVE", "intentScore": 0.85}', 3200, '{"input": 450, "output": 280, "total": 730}',   0.0219, 'SUCCESS', NOW() - INTERVAL '12 days' + INTERVAL '2 minutes'),
      (v_exec2, v_agent_orchestrator_id,  v_conv3, v_l3,  'Consulta evento corporativo 25 personas',       'Enrutado a JHON como closer, respuesta con cotizacion', 'Lead corporativo de alto valor, asignar a closer especializado', '[]', '{"temperature": "HOT", "archetype": "ANALYTICAL"}', 1800, '{"input": 320, "output": 150, "total": 470}', 0.0141, 'SUCCESS', NOW() - INTERVAL '9 days' + INTERVAL '5 minutes'),
      (v_exec3, v_agent_jhon_id,         v_conv4, v_l5,  'Cliente VIP pide brunch para 6',                 'Cotizacion con descuento VIP y upsell taller',  'Cliente VIP recurrente, aplicar descuento y upsell natural',  '["Descuento VIP automatico","Maximo 2 preguntas por turno"]', '{"temperature": "HOT", "archetype": "DECISIVE", "intentScore": 0.92}', 2800, '{"input": 500, "output": 320, "total": 820}',   0.0246, 'SUCCESS', NOW() - INTERVAL '7 days' + INTERVAL '1 minute'),
      (v_exec4, v_agent_followup_id,      v_conv2, v_l2,  'Lead frio no respondio en 24h',                  'Follow-up enviado con promocion 20% descuento', 'Lead CAUTIOUS, aplicar secuencia de follow-up suave',        '["No presionar leads frios"]', '{"temperature": "COLD", "archetype": "CAUTIOUS", "intentScore": 0.20}', 1500, '{"input": 280, "output": 180, "total": 460}',   0.0138, 'SUCCESS', NOW() - INTERVAL '10 days' + INTERVAL '22 minutes'),
      (v_exec5, v_agent_observability_id, NULL,    NULL,  'Monitoreo general - deteccion de anomalia',      'Anomalia detectada: respuesta con precio incorrecto corregida', 'Precio en cotizacion no coincidia con tabla de precios', '[]', '{}', 800, '{"input": 150, "output": 90, "total": 240}', 0.0072, 'SUCCESS', NOW() - INTERVAL '3 days');

    -- Now create the traces
    INSERT INTO "observability_traces" ("id", "workspaceId", "traceId", "spanId", "parentSpanId", "agentExecutionId", "operationName", "eventType", "attributes", "duration", "status", "createdAt") VALUES
      (v_trace1, v_workspace_id, 'tr_' || gen_random_uuid()::TEXT, 'sp_' || gen_random_uuid()::TEXT, NULL,    v_exec1, 'agent.closer.execute',       'AGENT_EXECUTION', '{"agent_type": "CLOSER", "lead_temperature": "HOT", "closing_strategy": "social_proof", "response_time_ms": 3200}', 3200, 'OK', NOW() - INTERVAL '12 days' + INTERVAL '2 minutes'),
      (v_trace2, v_workspace_id, 'tr_' || gen_random_uuid()::TEXT, 'sp_' || gen_random_uuid()::TEXT, NULL,    v_exec2, 'agent.orchestrator.route',    'ROUTING_DECISION', '{"from_agent": "ORCHESTRATOR", "to_agent": "CLOSER", "reason": "high_value_lead", "confidence": 0.92}', 1800, 'OK', NOW() - INTERVAL '9 days' + INTERVAL '5 minutes'),
      (v_trace3, v_workspace_id, 'tr_' || gen_random_uuid()::TEXT, 'sp_' || gen_random_uuid()::TEXT, NULL,    v_exec3, 'agent.closer.vip_upsell',     'POLICY_APPLIED',  '{"policy": "Descuento VIP automatico", "discount_pct": 15, "upsell": "Taller de Cocina", "original_value": 5980, "final_value": 5083}', 2800, 'OK', NOW() - INTERVAL '7 days' + INTERVAL '1 minute'),
      (v_trace4, v_workspace_id, 'tr_' || gen_random_uuid()::TEXT, 'sp_' || gen_random_uuid()::TEXT, NULL,    v_exec4, 'agent.followup.execute',      'FOLLOWUP_SENT',   '{"step": 1, "channel": "whatsapp", "template": "reactivacion_24h", "lead_responded": false}', 1500, 'OK', NOW() - INTERVAL '10 days' + INTERVAL '22 minutes'),
      (v_trace5, v_workspace_id, 'tr_' || gen_random_uuid()::TEXT, 'sp_' || gen_random_uuid()::TEXT, NULL,    v_exec5, 'agent.observability.anomaly', 'ANOMALY_DETECTED', '{"anomaly_type": "price_mismatch", "severity": "MEDIUM", "correction_applied": true, "affected_lead_id": "' || v_l7 || '"}', 800, 'OK', NOW() - INTERVAL '3 days');

    RAISE NOTICE '[SEED] Created 5 agent executions + 5 observability traces';
  ELSE
    RAISE NOTICE '[SEED] Observability traces already exist for workspace, skipping';
  END IF;

  -- ============================================================
  -- 19. AI COST TRACKING (4)
  -- ============================================================
  SELECT COUNT(*) INTO v_existing_count FROM "ai_cost_trackings" WHERE "workspaceId" = v_workspace_id;
  IF v_existing_count = 0 THEN
    INSERT INTO "ai_cost_trackings" ("id", "workspaceId", "agentId", "model", "inputTokens", "outputTokens", "totalTokens", "cost", "currency", "operationType", "createdAt") VALUES
      (v_cost1, v_workspace_id, v_agent_jhon_id,         'gpt-4o',      28500,  14200,  42700,  1.2810, 'USD', 'chat', NOW() - INTERVAL '7 days'),
      (v_cost2, v_workspace_id, v_agent_orchestrator_id,  'gpt-4o-mini', 15200,  6800,   22000,  0.1980, 'USD', 'chat', NOW() - INTERVAL '7 days'),
      (v_cost3, v_workspace_id, v_agent_followup_id,      'gpt-4o-mini', 8900,   4100,   13000,  0.1170, 'USD', 'chat', NOW() - INTERVAL '7 days'),
      (v_cost4, v_workspace_id, v_agent_observability_id, 'gpt-4o-mini', 6200,   2800,   9000,   0.0810, 'USD', 'classification', NOW() - INTERVAL '7 days');

    RAISE NOTICE '[SEED] Created 4 AI cost tracking entries';
  ELSE
    RAISE NOTICE '[SEED] AI cost tracking already exists for workspace, skipping';
  END IF;

  -- ============================================================
  -- DONE
  -- ============================================================
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ValiAutoFlow Seed Complete!';
  RAISE NOTICE 'Workspace: %', v_workspace_id;
  RAISE NOTICE 'User: %', v_user_id;
  RAISE NOTICE 'Pipeline: %', v_pipeline_id;
  RAISE NOTICE 'Login: demo@valiautoflow.com / demo123';
  RAISE NOTICE '============================================';

END $$;

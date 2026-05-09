import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const CARNALS = [
  { type: 'JHON', name: 'JHON', description: 'Motor principal de ventas cognitivas. Analiza intenciones, genera respuestas persuasivas y guía conversaciones hacia el cierre.' },
  { type: 'ORCHESTRATOR', name: 'ORCHESTRATOR', description: 'Coordina todos los motores, decide qué Carnal interviene y cuándo. Gestiona el flujo de ejecución.' },
  { type: 'MEMORY', name: 'MEMORY', description: 'Almacena y recupera contexto conversacional, comercial y operacional para cada lead.' },
  { type: 'ROUTING', name: 'ROUTING', description: 'Clasifica leads por intención, canal y urgencia. Determina el siguiente paso óptimo.' },
  { type: 'FOLLOWUP', name: 'FOLLOWUP', description: 'Gestiona secuencias de seguimiento automatizadas para mantener leads activos.' },
  { type: 'OBSERVABILITY', name: 'OBSERVABILITY', description: 'Detecta alucinaciones, mide deriva cognitiva y asegura la calidad del sistema.' },
  { type: 'TOOL_OS', name: 'TOOL_OS', description: 'Ejecuta acciones concretas: crear citas, actualizar CRMs, generar documentos.' },
]

const STAGES = ['EXPLORATION', 'INTEREST', 'INTENT', 'OBJECTION', 'CLOSING', 'FOLLOW_UP'] as const
const TEMPERATURES = ['COLD', 'WARM', 'HOT'] as const
const ARCHETYPES = ['DECISIVE', 'ANALYTICAL', 'SOCIAL', 'CAUTIOUS', 'SKEPTICAL', 'OVERWHELMED_OWNER'] as const
const CHANNELS = ['WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'WEB_CHAT'] as const
const FIRST_NAMES = ['Carlos', 'María', 'Juan', 'Ana', 'Pedro', 'Sofía', 'Diego', 'Valentina', 'Andrés', 'Camila', 'Roberto', 'Isabella', 'Miguel', 'Lucía', 'Fernando', 'Daniela', 'Alejandro', 'Gabriela', 'Ricardo', 'Natalia']
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'Hernández', 'González', 'Díaz', 'Torres', 'Flores', 'Rivera', 'Morales', 'Jiménez', 'Ruiz', 'Vargas', 'Castro']
const COMPANIES = ['Clínica San Ángel', 'Restaurante El Sazón', 'AutoServicios MX', 'TechCorp', 'Innovadora SA', 'Digital Plus', 'CloudFirst', 'DataVision']
const SOURCES = ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'WEB', 'MANUAL', 'REFERRAL'] as const

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickM<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }

export async function POST() {
  try {
    // Check if workspace already exists
    const existing = await db.workspace.findFirst({ where: { slug: 'valiautoflow-demo' } })
    if (existing) {
      return NextResponse.json({ workspaceId: existing.id, message: 'Workspace already seeded' })
    }

    // Create workspace
    const workspace = await db.workspace.create({
      data: {
        name: 'ValiAutoFlow Demo',
        slug: 'valiautoflow-demo',
        plan: 'PRO',
        settings: JSON.stringify({ timezone: 'America/Mexico_City', language: 'es', currency: 'MXN' }),
      },
    })

    // Create users
    const roles = ['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']
    const users = []
    for (let i = 0; i < 5; i++) {
      const fn = pickM(FIRST_NAMES), ln = pickM(LAST_NAMES)
      const user = await db.user.create({
        data: {
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}@valiautoflow.com`,
          name: `${fn} ${ln}`,
          role: roles[i],
          workspaceId: workspace.id,
          isActive: true,
        },
      })
      users.push(user)
    }

    // Create agents (7 Carnales)
    const agents = []
    for (const c of CARNALS) {
      const agent = await db.agent.create({
        data: {
          workspaceId: workspace.id,
          type: c.type,
          name: c.name,
          description: c.description,
          config: JSON.stringify({ model: 'gpt-4o', temperature: 0.7 }),
          isActive: true,
        },
      })
      agents.push(agent)
    }

    // Create contacts and leads
    const leads = []
    const statuses = ['NEW', 'QUALIFIED', 'INTERESTED', 'INTENT', 'OBJECTION', 'CLOSING', 'WON', 'LOST', 'UNRESPONSIVE']
    for (let i = 0; i < 20; i++) {
      const fn = pickM(FIRST_NAMES), ln = pickM(LAST_NAMES), co = pickM(COMPANIES)
      const contact = await db.contact.create({
        data: {
          workspaceId: workspace.id,
          name: `${fn} ${ln}`,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${co.toLowerCase().replace(/\s/g, '')}.com`,
          phone: `+52 55 ${rand(1000, 9999)} ${rand(1000, 9999)}`,
          source: pick(SOURCES),
          tags: JSON.stringify([pickM(['hot', 'warm', 'cold', 'vip', 'enterprise'])]),
        },
      })

      const lead = await db.lead.create({
        data: {
          workspaceId: workspace.id,
          contactId: contact.id,
          status: pickM(statuses),
          temperature: pick(TEMPERATURES),
          archetype: pick(ARCHETYPES),
          score: rand(20, 95),
          assignedAgentId: Math.random() > 0.5 ? pickM(users).id : null,
          dealValue: rand(5000, 150000),
          currency: 'MXN',
          firstContactAt: new Date(Date.now() - rand(1, 14) * 86400000),
          lastContactAt: new Date(Date.now() - rand(0, 3) * 86400000),
        },
      })
      leads.push(lead)

      // Create cognitive state
      await db.cognitiveState.create({
        data: {
          leadId: lead.id,
          temperature: lead.temperature,
          archetype: lead.archetype,
          intentScore: Math.random(),
          churnRisk: Math.random() * 0.6,
          priority: rand(1, 10),
          historicalContext: JSON.stringify({ source: contact.source, company: co }),
        },
      })
    }

    // Create conversations with messages
    const MSGS_IN = [
      'Hola, me interesa conocer más sobre sus servicios',
      '¿Cuáles son los precios?',
      'Necesito una solución para mi equipo de ventas',
      '¿Tienen demo disponible?',
      'Me gustaría agendar una llamada',
      '¿Pueden integrarse con nuestro CRM?',
      'Estamos evaluando varias opciones',
      '¿Cuál es el tiempo de implementación?',
      'Necesito hablar con alguien',
      'Quiero una cotización personalizada',
    ]
    const MSGS_OUT = [
      '¡Hola! Claro que sí, con gusto te comparto más información. Pero antes, cuéntame: ¿cómo están atendiendo los mensajes que les llegan actualmente?',
      'Antes de hablarte de inversión, déjame entender algo rápido: ¿qué es lo que más te preocupa de tu operación actual?',
      'Entiendo. Lo que veo es que mientras más esperas, más se complica. ¿Has calculado cuánto pierdes mensualmente por este problema?',
      'Sí, tenemos demo disponible. Lo que sugiero es agendar una llamada de 15 minutos para revisar tu caso. ¿Te parece?',
      'Con gusto agendamos. ¿Qué horario te queda mejor esta semana?',
      'Sí, nos integramos con los principales CRMs. Pero primero, cuéntame: ¿qué CRM usan actualmente?',
      'Es válido evaluar opciones. ¿Qué aspectos son los más importantes para ti?',
      'La implementación típica toma entre 2-4 semanas. ¿Te gustaría que revisemos tu caso específico?',
      'Te conecto con nuestro equipo. Pero antes, ¿puedo hacerte una pregunta rápida para direccionarte mejor?',
      'Por supuesto. ¿Podrías compartirme más detalles sobre tu operación para darte una cotización precisa?',
    ]

    for (let i = 0; i < 10; i++) {
      const lead = pickM(leads)
      const contact = await db.contact.findFirst({ where: { id: lead.contactId } })
      const conv = await db.conversation.create({
        data: {
          workspaceId: workspace.id,
          contactId: contact!.id,
          leadId: lead.id,
          channel: pick(CHANNELS),
          status: pickM(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PAUSED', 'CLOSED']),
          currentStage: pickM(STAGES),
          lastMessageAt: new Date(Date.now() - rand(0, 3) * 86400000),
        },
      })

      // Add messages
      const mc = rand(4, 10)
      for (let j = 0; j < mc; j++) {
        const isIn = j % 2 === 0
        await db.message.create({
          data: {
            conversationId: conv.id,
            direction: isIn ? 'INBOUND' : 'OUTBOUND',
            content: isIn ? pickM(MSGS_IN) : pickM(MSGS_OUT),
            senderType: isIn ? 'CONTACT' : 'AGENT_AI',
            senderId: isIn ? contact!.id : pickM(agents).id,
            status: pickM(['DELIVERED', 'READ', 'DELIVERED']),
            createdAt: new Date(Date.now() - (mc - j) * 3600000),
          },
        })
      }

      // Add conversation stage
      await db.conversationStage.create({
        data: {
          conversationId: conv.id,
          stage: conv.currentStage,
          confidence: Math.random() * 0.4 + 0.6,
          triggerReason: 'Auto-detected from message signals',
        },
      })

      // Add tool actions
      if (Math.random() > 0.5) {
        await db.toolAction.create({
          data: {
            workspaceId: workspace.id,
            conversationId: conv.id,
            leadId: lead.id,
            toolType: pickM(['SCHEDULE_APPOINTMENT', 'CREATE_DEAL', 'CHECK_CALENDAR', 'SEND_LINK']),
            parameters: JSON.stringify({ source: 'ai_suggestion' }),
            result: JSON.stringify({ success: true }),
            status: 'COMPLETED',
            executedAt: new Date(),
          },
        })
      }

      // Add behavioral trace
      await db.behavioralTrace.create({
        data: {
          workspaceId: workspace.id,
          conversationId: conv.id,
          leadId: lead.id,
          stage: conv.currentStage,
          archetype: lead.archetype,
          policiesApplied: JSON.stringify(['NO_PRICE_EARLY', 'MAX_2_QUESTIONS']),
          violations: JSON.stringify([]),
          responseScore: Math.random() * 30 + 70,
          cognitiveDrift: Math.random() * 0.2,
        },
      })
    }

    // Create pipeline with stages and deals
    const pipeline = await db.pipeline.create({
      data: { workspaceId: workspace.id, name: 'Pipeline Principal', description: 'Pipeline principal de ventas' },
    })

    const stageColors: Record<string, string> = { EXPLORATION: '#94A3B8', INTEREST: '#38BDF8', INTENT: '#FBBF24', OBJECTION: '#FB923C', CLOSING: '#34D399', FOLLOW_UP: '#A78BFA' }
    const pipelineStages = []
    for (let i = 0; i < STAGES.length; i++) {
      const ps = await db.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          name: STAGES[i],
          order: i,
          color: stageColors[STAGES[i]],
          isWonStage: STAGES[i] === 'CLOSING',
          isLostStage: false,
        },
      })
      pipelineStages.push(ps)
    }

    for (const lead of leads.slice(0, 15)) {
      const stage = pickM(pipelineStages)
      await db.deal.create({
        data: {
          workspaceId: workspace.id,
          leadId: lead.id,
          pipelineId: pipeline.id,
          pipelineStageId: stage.id,
          title: `Deal - ${lead.id.slice(-6)}`,
          value: rand(5000, 100000),
          currency: 'MXN',
          probability: rand(10, 90) / 100,
          assignedAgentId: pickM(users).id,
        },
      })
    }

    // Create follow-up sequences
    for (let i = 0; i < 3; i++) {
      const seqNames = ['Secuencia Bienvenida', 'Re-engagement Cold Leads', 'Post-Demo Follow-up']
      const seq = await db.followUpSequence.create({
        data: {
          workspaceId: workspace.id,
          name: seqNames[i],
          description: 'Secuencia automatizada de seguimiento',
          triggerCondition: JSON.stringify({ stage: pickM(STAGES) }),
        },
      })

      const stepTemplates = [
        { order: 1, delayMinutes: 60, template: 'Hola {{nombre}}, gracias por tu interés. ¿Tienes un momento para conversar?' },
        { order: 2, delayMinutes: 1440, template: 'Quería compartirte un caso de éxito relevante. ¿Te interesa?' },
        { order: 3, delayMinutes: 4320, template: 'Hola, solo quería recordarte que estamos aquí. ¿Hay algo en lo que pueda ayudarte?' },
      ]

      for (const step of stepTemplates) {
        await db.followUpStep.create({
          data: {
            sequenceId: seq.id,
            order: step.order,
            delayMinutes: step.delayMinutes,
            messageTemplate: step.template,
            agentType: 'FOLLOWUP',
          },
        })
      }
    }

    // Create sales policies
    const policyDefs = [
      { name: 'No precio antes de intención', ruleType: 'BLOCK_PRICE_EARLY', priority: 10 },
      { name: 'Máximo 2 preguntas', ruleType: 'MAX_QUESTIONS', priority: 8 },
      { name: 'Una acción siguiente', ruleType: 'ONE_ACTION_NEXT', priority: 7 },
      { name: 'No vender sin dolor', ruleType: 'NO_SELL_WITHOUT_PAIN', priority: 9 },
      { name: 'No presionar demasiado', ruleType: 'BLOCK_OVER_PRESSURE', priority: 6 },
    ]
    for (const p of policyDefs) {
      await db.salesPolicy.create({
        data: {
          workspaceId: workspace.id,
          name: p.name,
          ruleType: p.ruleType,
          priority: p.priority,
          isActive: true,
        },
      })
    }

    // Create agent executions
    for (let i = 0; i < 20; i++) {
      const agent = pickM(agents)
      await db.agentExecution.create({
        data: {
          agentId: agent.id,
          inputSummary: `Lead message processing #${i + 1}`,
          outputSummary: `Response generated with ${pickM(CARNALS).type} engine`,
          decisionRationale: `Stage: ${pickM(STAGES)}, Temperature: ${pick(TEMPERATURES)}`,
          policiesApplied: JSON.stringify([pickM(['NO_PRICE_EARLY', 'MAX_QUESTIONS', 'ONE_ACTION_NEXT'])]),
          cognitiveContext: JSON.stringify({ intentScore: Math.random(), churnRisk: Math.random() * 0.5 }),
          duration: rand(50, 2000),
          cost: Math.round((Math.random() * 0.1 + 0.005) * 10000) / 10000,
          status: pickM(['SUCCESS', 'SUCCESS', 'SUCCESS', 'ERROR']),
        },
      })
    }

    // Create observability traces
    for (let i = 0; i < 30; i++) {
      await db.observabilityTrace.create({
        data: {
          workspaceId: workspace.id,
          traceId: `trace_${Date.now()}_${i}`,
          spanId: `span_${i}`,
          parentSpanId: i > 5 ? `span_${i - 1}` : null,
          operationName: pickM(['routing.classify', 'memory.retrieve', 'cognitive.resolve', 'policy.evaluate', 'jhon.generate', 'behavioral.validate']),
          eventType: pickM(['AGENT_DECISION', 'POLICY_APPLICATION', 'STAGE_TRANSITION', 'MESSAGE_SENT']),
          attributes: JSON.stringify({ model: pickM(['gpt-4o', 'gpt-4o-mini']) }),
          duration: rand(10, 3000),
          status: pickM(['OK', 'OK', 'OK', 'ERROR']),
        },
      })
    }

    // Create AI cost tracking
    for (let i = 0; i < 40; i++) {
      await db.aICostTracking.create({
        data: {
          workspaceId: workspace.id,
          agentId: pickM(agents).id,
          model: pickM(['gpt-4o', 'gpt-4o-mini']),
          inputTokens: rand(100, 2000),
          outputTokens: rand(50, 1000),
          totalTokens: rand(150, 3000),
          cost: Math.round((Math.random() * 0.3 + 0.005) * 10000) / 10000,
          operationType: pickM(['chat', 'classification', 'embedding']),
        },
      })
    }

    // Create hallucination detections (linked to real executions)
    const executions = await db.agentExecution.findMany({ take: 5 })
    for (let i = 0; i < Math.min(5, executions.length); i++) {
      await db.hallucinationDetection.create({
        data: {
          executionId: executions[i].id,
          detectionType: pickM(['FACTUAL_ERROR', 'POLICY_VIOLATION', 'CONTEXT_DRIFT', 'INVENTED_FACT']),
          severity: pickM(['LOW', 'MEDIUM', 'HIGH']),
          details: pickM([
            'El agente mencionó un precio incorrecto',
            'Se citó una característica no existente',
            'Información de empresa incorrecta',
            'Contradicción con datos previos del lead',
            'Promesa fuera de política',
          ]),
          suggestedCorrection: 'Verificar contra base de conocimiento antes de responder',
        },
      })
    }

    // Create audit logs
    const auditActions = ['LEAD_CREATED', 'CONVERSATION_STARTED', 'DEAL_UPDATED', 'POLICY_APPLIED', 'AGENT_EXECUTED', 'FOLLOWUP_TRIGGERED']
    for (let i = 0; i < 25; i++) {
      await db.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: pickM(users).id,
          action: pickM(auditActions),
          resource: pickM(['Lead', 'Conversation', 'Deal', 'Policy', 'Agent', 'Followup']),
          severity: pickM(['INFO', 'INFO', 'WARNING', 'ERROR']),
        },
      })
    }

    // Create trust zones
    const zoneTypes = ['DATA_ACCESS', 'API_CALL', 'WEBHOOK', 'AGENT_EXECUTION', 'EXPORT', 'CONFIGURATION', 'BILLING', 'USER_MANAGEMENT']
    for (const zt of zoneTypes) {
      await db.trustZone.create({
        data: {
          workspaceId: workspace.id,
          name: `Zone: ${zt}`,
          zoneType: zt,
          allowedRoles: JSON.stringify(['OWNER', 'ADMIN']),
          isActive: true,
        },
      })
    }

    return NextResponse.json({ workspaceId: workspace.id })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

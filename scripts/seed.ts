import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CARNALS = [
  { name: 'JHON', carnal: 'JHON', role: 'Ventas Consultivas', description: 'Motor principal de ventas cognitivas.' },
  { name: 'ORCHESTRATOR', carnal: 'ORCHESTRATOR', role: 'Cerebro Central', description: 'Coordina todos los motores.' },
  { name: 'MEMORY', carnal: 'MEMORY', role: 'Memoria', description: 'Almacena y recupera contexto.' },
  { name: 'ROUTING', carnal: 'ROUTING', role: 'Clasificación', description: 'Clasifica leads por intención y urgencia.' },
  { name: 'FOLLOWUP', carnal: 'FOLLOWUP', role: 'Persistencia', description: 'Gestiona seguimientos automatizados.' },
  { name: 'OBSERVABILITY', carnal: 'OBSERVABILITY', role: 'Auditoría Cognitiva', description: 'Detecta alucinaciones y deriva.' },
  { name: 'TOOL_OS', carnal: 'TOOL_OS', role: 'Herramientas', description: 'Ejecuta acciones concretas.' },
]

const STAGES = ['EXPLORATION', 'INTEREST', 'INTENT', 'OBJECTION', 'CLOSING', 'FOLLOW_UP']
const TEMPERATURES = ['COLD', 'WARM', 'HOT']
const CHANNELS = ['WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'WEB']
const ARCHETYPES = ['DECISIVE_BUYER', 'ANALYTICAL_RESEARCHER', 'HESITANT_PROSPECT', 'UNDECIDED']
const FIRST_NAMES = ['Carlos', 'María', 'Juan', 'Ana', 'Pedro', 'Sofía', 'Diego', 'Valentina', 'Andrés', 'Camila']
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'Hernández', 'González', 'Díaz', 'Torres']
const COMPANIES = ['TechCorp MX', 'Innovadora SA', 'Digital Plus', 'CloudFirst', 'DataVision', 'SmartSales']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }

async function main() {
  const workspace = await prisma.workspace.create({ data: { name: 'ValiAutoFlow Workspace' } })
  console.log('Workspace:', workspace.id)

  for (const c of CARNALS) {
    await prisma.agent.create({ data: { workspaceId: workspace.id, name: c.name, carnal: c.carnal, role: c.role, description: c.description, status: 'ACTIVE', executionCount: rand(50, 500), avgScore: Math.round((Math.random() * 30 + 70) * 100) / 100 } })
  }

  const leads: { id: string; company: string; dealValue: number }[] = []
  for (let i = 0; i < 25; i++) {
    const fn = pick(FIRST_NAMES), ln = pick(LAST_NAMES), co = pick(COMPANIES)
    const lead = await prisma.lead.create({ data: { workspaceId: workspace.id, name: `${fn} ${ln}`, email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${co.toLowerCase().replace(/\s/g, '')}.com`, phone: `+52 55 ${rand(1000, 9999)} ${rand(1000, 9999)}`, company: co, status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'CONVERTED']), temperature: pick(TEMPERATURES), score: rand(20, 95), dealValue: rand(5000, 150000), archetype: pick(ARCHETYPES), intentScore: Math.round(Math.random() * 10000) / 100, churnRisk: Math.round(Math.random() * 6000) / 100, lastContact: new Date(Date.now() - rand(0, 7) * 86400000) } })
    leads.push({ id: lead.id, company: co, dealValue: lead.dealValue })
    await prisma.leadMemory.create({ data: { leadId: lead.id, conversational: `Preferencia por ${pick(CHANNELS)}`, commercial: `Presupuesto: $${lead.dealValue}`, operational: 'Zona horaria: CST' } })
  }

  const MSGS_IN = ['Hola, me interesa conocer más', '¿Cuáles son los precios?', 'Necesito una solución para ventas', '¿Tienen demo?', 'Me gustaría agendar una llamada']
  const MSGS_OUT = ['¡Hola! Con gusto te comparto más información.', 'Nuestros planes empiezan desde $5,000 MXN.', 'ValiAutoFlow potencia equipos de ventas con IA.', 'Tenemos demo disponible esta semana.', 'Agendamos una llamada esta semana.']

  for (let i = 0; i < 20; i++) {
    const lead = pick(leads)
    const conv = await prisma.conversation.create({ data: { workspaceId: workspace.id, leadId: lead.id, channel: pick(CHANNELS), stage: pick(STAGES), temperature: pick(TEMPERATURES), intentScore: Math.round(Math.random() * 10000) / 100, churnRisk: Math.round(Math.random() * 6000) / 100, priority: pick(['LOW', 'MEDIUM', 'HIGH']), lastMessage: pick(MSGS_IN), lastMessageAt: new Date(Date.now() - rand(0, 3) * 86400000) } })
    const mc = rand(4, 12)
    for (let j = 0; j < mc; j++) {
      const isIn = j % 2 === 0
      const c = isIn ? null : pick(CARNALS)
      await prisma.message.create({ data: { conversationId: conv.id, direction: isIn ? 'INBOUND' : 'OUTBOUND', content: isIn ? pick(MSGS_IN) : pick(MSGS_OUT), agentId: c?.name || null, carnal: c?.carnal || null, createdAt: new Date(Date.now() - (mc - j) * 3600000) } })
    }
    if (Math.random() > 0.5) await prisma.toolAction.create({ data: { conversationId: conv.id, type: pick(['APPOINTMENT_SCHEDULED', 'DEAL_CREATED', 'NOTE_ADDED', 'CRM_UPDATED']), description: pick(['Cita agendada para demo', 'Nuevo deal creado', 'Nota agregada', 'CRM actualizado']), status: 'COMPLETED' } })
    await prisma.behavioralTrace.create({ data: { conversationId: conv.id, policiesApplied: rand(1, 5), violations: rand(0, 2), responseScore: Math.round((Math.random() * 30 + 70) * 100) / 100, details: 'Pipeline cognitivo evaluado' } })
  }

  const pipeline = await prisma.pipeline.create({ data: { workspaceId: workspace.id, name: 'Pipeline Principal' } })
  const stageColors: Record<string, string> = { EXPLORATION: '#94A3B8', INTEREST: '#38BDF8', INTENT: '#FBBF24', OBJECTION: '#FB923C', CLOSING: '#34D399', FOLLOW_UP: '#A78BFA' }
  for (let i = 0; i < STAGES.length; i++) {
    const stage = await prisma.pipelineStage.create({ data: { pipelineId: pipeline.id, name: STAGES[i], order: i, color: stageColors[STAGES[i]] } })
    for (let j = 0; j < rand(2, 6); j++) { const dl = pick(leads); await prisma.deal.create({ data: { stageId: stage.id, title: `${dl.company} - ${STAGES[i]}`, value: rand(5000, 100000), probability: rand(10, 90), agentId: pick(CARNALS).name, leadId: dl.id } }) }
  }

  for (let i = 0; i < 5; i++) {
    const steps = [{ day: 1, action: 'Enviar bienvenida', channel: 'WHATSAPP' }, { day: 3, action: 'Compartir caso de éxito', channel: 'EMAIL' }, { day: 7, action: 'Invitar a demo', channel: 'WHATSAPP' }]
    const fu = await prisma.followup.create({ data: { workspaceId: workspace.id, name: pick(['Secuencia Bienvenida', 'Re-engagement', 'Post-Demo', 'Win-Back', 'Nurture']), description: 'Secuencia automatizada', status: pick(['ACTIVE', 'ACTIVE', 'PAUSED']), steps: JSON.stringify(steps) } })
    for (let j = 0; j < rand(3, 8); j++) { await prisma.followupExecution.create({ data: { followupId: fu.id, leadId: pick(leads).id, status: pick(['COMPLETED', 'PENDING', 'FAILED']), executedAt: new Date(Date.now() - rand(0, 14) * 86400000) } }) }
  }

  for (let i = 0; i < 8; i++) { await prisma.policy.create({ data: { workspaceId: workspace.id, name: pick(['Descuento máximo 20%', 'No prometer fechas', 'Lenguaje formal', 'Escalation si deal > $100k', 'Máximo 3 seguimientos', 'Validar RFC', 'No datos sensibles', 'Confirmar precio']), type: pick(['SALES', 'COMPLIANCE', 'PRICING', 'COMMUNICATION']), priority: pick(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), enabled: Math.random() > 0.2, description: 'Política operativa' } }) }

  const actions = ['LEAD_CREATED', 'CONVERSATION_STARTED', 'DEAL_UPDATED', 'POLICY_APPLIED', 'AGENT_EXECUTED']
  const entities = ['Lead', 'Conversation', 'Deal', 'Policy', 'Agent']
  for (let i = 0; i < 30; i++) { const idx = rand(0, 4); await prisma.auditLog.create({ data: { workspaceId: workspace.id, action: actions[idx], entity: entities[idx], entityId: pick(leads).id, severity: pick(['INFO', 'WARN', 'ERROR', 'DEBUG']), details: `${actions[idx]} ejecutado` } }) }

  for (let i = 0; i < 40; i++) { await prisma.trace.create({ data: { workspaceId: workspace.id, eventType: pick(['AGENT_CALL', 'PIPELINE_STEP', 'POLICY_CHECK', 'TOOL_EXECUTION']), agentName: pick(CARNALS).name, duration: rand(50, 3000), status: pick(['SUCCESS', 'SUCCESS', 'ERROR']), metadata: JSON.stringify({ model: pick(['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet']), tokens: rand(100, 2000) }) } }) }
  for (let i = 0; i < 50; i++) { await prisma.cost.create({ data: { workspaceId: workspace.id, agentName: pick(CARNALS).name, model: pick(['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet']), tokens: rand(100, 3000), cost: Math.round((Math.random() * 0.5 + 0.01) * 10000) / 10000, createdAt: new Date(Date.now() - rand(0, 30) * 86400000) } }) }
  for (let i = 0; i < 8; i++) { await prisma.hallucination.create({ data: { workspaceId: workspace.id, severity: pick(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), type: pick(['FACTUAL_ERROR', 'CONTEXT_DRIFT', 'FABRICATED_DATA', 'CONTRADICTION']), content: pick(['Precio incorrecto', 'Característica inexistente', 'Empresa incorrecta', 'Contradicción con datos previos']), suggestedCorrection: 'Verificar contra base de conocimiento' } }) }
  for (let i = 0; i < 5; i++) { await prisma.driftEvent.create({ data: { workspaceId: workspace.id, agentName: pick(CARNALS).name, beforeState: pick(['CONSULTATIVE', 'AGGRESSIVE', 'NEUTRAL']), afterState: pick(['AGGRESSIVE', 'NEUTRAL', 'EMPATHETIC']), description: 'Deriva detectada en comportamiento' } }) }

  console.log('✅ Seeding complete!', workspace.id)
}

main().catch(console.error).finally(() => prisma.$disconnect())

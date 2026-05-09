import { db } from "@/lib/db"
import { randomUUID } from "crypto"

/**
 * Seed demo data for the demo workspace.
 * Creates realistic LATAM business data: contacts, leads, conversations,
 * messages, campaigns, calendar events, and notifications.
 */
export async function seedDemoData(workspaceId: string) {
  const now = new Date()

  // ============================================================
  // 1. Workspace Configuration
  // ============================================================
  const existingConfig = await db.workspaceConfig.findUnique({
    where: { workspaceId },
  })

  if (!existingConfig) {
    await db.workspaceConfig.create({
      data: {
        workspaceId,
        businessName: "Restaurante La Casa",
        businessType: "restaurant",
        schedule: JSON.stringify({
          timezone: "America/Mexico_City",
          days: ["mon", "tue", "wed", "thu", "fri", "sat"],
          hours: { start: "12:00", end: "23:00" },
        }),
        products: JSON.stringify([
          { name: "Menu ejecutivo", price: 189, duration_min: 45, note: "Lunes a viernes, 12-16h" },
          { name: "Cena romantica para 2", price: 750, duration_min: 120, note: "Incluye vino" },
          { name: "Reserva de mesa", price: 0, duration_min: 60, note: "Sin consumo minimo" },
          { name: "Evento privado", price: 5000, duration_min: 240, note: "Hasta 30 personas" },
        ]),
        leadFormula: JSON.stringify({
          volumeKeyword: "reservaciones",
          conversionMetric: "mesas confirmadas",
          averageTicket: 450,
          funnelNote: "De cada 10 consultas por WhatsApp, solo 3 reservan. El follow-up a las 2h aumenta 40% la conversion.",
        }),
        customQuestions: JSON.stringify([
          { id: "q1", text: "Para cuantas personas?", purpose: "Asignar mesa adecuada", stage: "exploration" },
          { id: "q2", text: "Es ocasion especial?", purpose: "Ofrecer paquetes premium", stage: "interest" },
          { id: "q3", text: "Prefiere interior o terraza?", purpose: "Preferencia de ubicacion", stage: "interest" },
        ]),
        policies: JSON.stringify({
          showPriceEarly: false,
          autoSchedule: true,
          autoFollowup: true,
          maxQuestionsPerTurn: 2,
          followUpDelayMinutes: 120,
        }),
        channels: JSON.stringify({
          whatsapp: { active: true, template: "bienvenida_v1" },
          telegram: { active: true },
          email: { active: false },
        }),
      },
    })
  }

  // ============================================================
  // 2. Agents (7 Carnales)
  // ============================================================
  const existingAgents = await db.agent.findMany({
    where: { workspaceId },
  })

  if (existingAgents.length === 0) {
    const agentDefs = [
      {
        type: "JHON",
        name: "JHON - Closer Cognitivo",
        description: "Agente de ventas principal con personalidad restringida. Detecta etapa, aplica psicologia y cierra tratos.",
        config: JSON.stringify({
          personality: "Empático, directo, nunca presiona. Habla como un asesor de confianza.",
          maxPressure: 0.3,
          escalationTriggers: ["hot_lead", "objection_price", "ready_to_buy"],
        }),
      },
      {
        type: "ORCHESTRATOR",
        name: "ORCHESTRATOR - Router Maestro",
        description: "Dirige conversaciones al agente correcto. Analiza intencion y contexto para routing inteligente.",
        config: JSON.stringify({ routingStrategy: "intent_based" }),
      },
      {
        type: "MEMORY",
        name: "MEMORY ENGINE - Memoria Contextual",
        description: "Gestiona historial y contexto de cada lead. Alimenta a los demas agentes con informacion relevante.",
        config: JSON.stringify({ retentionDays: 90, compressionStrategy: "semantic" }),
      },
      {
        type: "FOLLOWUP",
        name: "FOLLOWUP ENGINE - Seguimiento Automatico",
        description: "Ejecuta secuencias de follow-up personalizadas basadas en etapa y comportamiento del lead.",
        config: JSON.stringify({ maxFollowups: 5, intervalStrategy: "exponential" }),
      },
      {
        type: "OBSERVABILITY",
        name: "OBSERVABILITY ENGINE - Monitor Cognitivo",
        description: "Vigila calidad de respuestas, detecta alucinaciones y mide deriva cognitiva en tiempo real.",
        config: JSON.stringify({ hallucinationThreshold: 0.7, driftThreshold: 0.3 }),
      },
      {
        type: "ROUTING",
        name: "ROUTING ENGINE - Despachador Inteligente",
        description: "Asigna leads al agente o humano correcto segun reglas de negocio y disponibilidad.",
        config: JSON.stringify({ preferHumanFor: ["complaint", "vip", "high_value"] }),
      },
      {
        type: "TOOL_OS",
        name: "TOOL OS - Sistema de Herramientas",
        description: "Ejecuta acciones: agendar citas, consultar calendario, enviar mensajes, actualizar CRM.",
        config: JSON.stringify({
          tools: ["calendar_check", "calendar_book", "send_message", "update_lead", "create_deal"],
        }),
      },
    ]

    for (const agentDef of agentDefs) {
      await db.agent.create({
        data: {
          id: randomUUID(),
          workspaceId,
          ...agentDef,
          isActive: true,
          version: 1,
        },
      })
    }
  }

  // ============================================================
  // 3. Pipeline
  // ============================================================
  const existingPipelines = await db.pipeline.findMany({
    where: { workspaceId },
  })

  let pipelineId = ""
  let pipelineStages: { id: string; name: string; order: number; color: string }[] = []

  if (existingPipelines.length === 0) {
    const pipeline = await db.pipeline.create({
      data: {
        id: randomUUID(),
        workspaceId,
        name: "Pipeline de Ventas",
        description: "Pipeline principal para leads del restaurante",
      },
    })
    pipelineId = pipeline.id

    const stageDefs = [
      { name: "Nuevo", order: 1, color: "#6366f1", isDefault: true },
      { name: "Contactado", order: 2, color: "#8b5cf6" },
      { name: "Calificado", order: 3, color: "#a855f7" },
      { name: "Propuesta", order: 4, color: "#c084fc" },
      { name: "Negociacion", order: 5, color: "#d946ef" },
      { name: "Ganado", order: 6, color: "#22c55e", isWonStage: true },
      { name: "Perdido", order: 7, color: "#ef4444", isLostStage: true },
    ]

    for (const stageDef of stageDefs) {
      const stage = await db.pipelineStage.create({
        data: {
          id: randomUUID(),
          pipelineId,
          name: stageDef.name,
          order: stageDef.order,
          color: stageDef.color,
          isDefault: stageDef.isDefault ?? false,
          isWonStage: stageDef.isWonStage ?? false,
          isLostStage: stageDef.isLostStage ?? false,
        },
      })
      pipelineStages.push(stage)
    }
  }

  // ============================================================
  // 4. Contacts + Leads + Conversations + Messages
  // ============================================================
  const existingContacts = await db.contact.findMany({
    where: { workspaceId },
  })

  if (existingContacts.length === 0) {
    const contactDefs = [
      { name: "Maria Gonzalez", phone: "+525512345601", email: "maria.gonzalez@email.com", source: "WHATSAPP", tags: ["vip", "frecuente"] },
      { name: "Carlos Mendoza", phone: "+525512345602", email: "carlos.m@email.com", source: "WHATSAPP", tags: ["nuevo"] },
      { name: "Ana Rodriguez", phone: "+525512345603", email: "ana.r@email.com", source: "INSTAGRAM", tags: ["evento"] },
      { name: "Roberto Sanchez", phone: "+525512345604", email: "roberto.s@email.com", source: "WHATSAPP", tags: ["corporativo"] },
      { name: "Laura Martinez", phone: "+525512345605", email: "laura.m@email.com", source: "WHATSAPP", tags: ["frecuente"] },
      { name: "Diego Hernandez", phone: "+525512345606", email: "diego.h@email.com", source: "FACEBOOK", tags: ["nuevo"] },
      { name: "Patricia Torres", phone: "+525512345607", email: "patricia.t@email.com", source: "WHATSAPP", tags: ["aniversario"] },
      { name: "Fernando Garcia", phone: "+525512345608", email: "fernando.g@email.com", source: "WHATSAPP", tags: ["corporativo"] },
      { name: "Sofia Lopez", phone: "+525512345609", email: "sofia.l@email.com", source: "INSTAGRAM", tags: ["nuevo"] },
      { name: "Miguel Angel Diaz", phone: "+525512345610", email: "miguel.d@email.com", source: "WHATSAPP", tags: ["vip"] },
      { name: "Isabel Ramirez", phone: "+525512345611", email: "isabel.r@email.com", source: "GOOGLE", tags: ["evento"] },
      { name: "Jorge Castillo", phone: "+525512345612", email: "jorge.c@email.com", source: "WHATSAPP", tags: ["frecuente"] },
      { name: "Camila Flores", phone: "+525512345613", email: "camila.f@email.com", source: "REFERRAL", tags: ["nuevo"] },
      { name: "Andres Vargas", phone: "+525512345614", email: "andres.v@email.com", source: "WHATSAPP", tags: ["corporativo"] },
      { name: "Lucia Morales", phone: "+525512345615", email: "lucia.m@email.com", source: "WHATSAPP", tags: ["frecuente"] },
    ]

    const leadDefs = [
      { status: "QUALIFIED", temperature: "HOT", archetype: "DECISIVE", score: 92, pipelineStage: 3, dealValue: 750 },
      { status: "NEW", temperature: "WARM", archetype: "ANALYTICAL", score: 65, pipelineStage: 1, dealValue: 0 },
      { status: "QUALIFIED", temperature: "HOT", archetype: "IMPULSIVE", score: 88, pipelineStage: 4, dealValue: 5000 },
      { status: "PROPOSAL", temperature: "WARM", archetype: "CAUTIOUS", score: 72, pipelineStage: 4, dealValue: 3000 },
      { status: "QUALIFIED", temperature: "WARM", archetype: "SOCIAL", score: 68, pipelineStage: 3, dealValue: 450 },
      { status: "NEW", temperature: "COLD", archetype: "CAUTIOUS", score: 35, pipelineStage: 1, dealValue: 0 },
      { status: "QUALIFIED", temperature: "HOT", archetype: "DECISIVE", score: 95, pipelineStage: 5, dealValue: 750 },
      { status: "PROPOSAL", temperature: "WARM", archetype: "ANALYTICAL", score: 70, pipelineStage: 4, dealValue: 5000 },
      { status: "NEW", temperature: "COLD", archetype: "CAUTIOUS", score: 25, pipelineStage: 1, dealValue: 0 },
      { status: "QUALIFIED", temperature: "HOT", archetype: "IMPULSIVE", score: 90, pipelineStage: 5, dealValue: 1200 },
      { status: "NEW", temperature: "WARM", archetype: "SOCIAL", score: 55, pipelineStage: 2, dealValue: 0 },
      { status: "QUALIFIED", temperature: "WARM", archetype: "ANALYTICAL", score: 62, pipelineStage: 3, dealValue: 450 },
      { status: "NEW", temperature: "COLD", archetype: "CAUTIOUS", score: 30, pipelineStage: 1, dealValue: 0 },
      { status: "PROPOSAL", temperature: "WARM", archetype: "SOCIAL", score: 75, pipelineStage: 4, dealValue: 3000 },
      { status: "QUALIFIED", temperature: "HOT", archetype: "DECISIVE", score: 85, pipelineStage: 3, dealValue: 189 },
    ]

    const conversationTemplates = [
      [
        { direction: "inbound", content: "Hola, quisiera reservar una mesa para este sabado", senderType: "contact" },
        { direction: "outbound", content: "Hola Maria! Con gusto te ayudo. Para cuantas personas seria la reserva?", senderType: "agent" },
        { direction: "inbound", content: "Para 2 personas, es nuestro aniversario", senderType: "contact" },
        { direction: "outbound", content: "Felicidades! Tenemos un paquete especial para aniversarios que incluye champagne de bienvenida y un postre cortesia. Te interesa?", senderType: "agent" },
        { direction: "inbound", content: "Si, suena perfecto! A que hora tienen disponibilidad?", senderType: "contact" },
        { direction: "outbound", content: "Tenemos a las 19:30 y 21:00. Ambos horarios en nuestra terraza con vista. Cual prefieres?", senderType: "agent" },
        { direction: "inbound", content: "Las 19:30 por favor", senderType: "contact" },
        { direction: "outbound", content: "Listo! Reserva confirmada: Sabado a las 19:30, mesa para 2 en terraza con paquete aniversario. Te enviamos un recordatorio el viernes. Algo mas en que pueda ayudarte?", senderType: "agent" },
      ],
      [
        { direction: "inbound", content: "Buenas tardes, tienen menu ejecutivo?", senderType: "contact" },
        { direction: "outbound", content: "Hola Carlos! Si, nuestro menu ejecutivo esta disponible de lunes a viernes de 12 a 16h. Incluye entrada, plato fuerte y bebida por $189. Quieres que te cuente las opciones del dia?", senderType: "agent" },
        { direction: "inbound", content: "Si, por favor", senderType: "contact" },
        { direction: "outbound", content: "Hoy tenemos: 1) Pechuga grillada con ensalada, 2) Enchiladas suizas, 3) Filete de pescado con arroz. Todas incluyen sopa del dia y agua de frutas. Deseas hacer una reserva?", senderType: "agent" },
      ],
      [
        { direction: "inbound", content: "Necesito cotizacion para un evento de 25 personas", senderType: "contact" },
        { direction: "outbound", content: "Hola Roberto! Claro que si. Nuestro paquete de evento privado incluye salon exclusivo, menu personalizado y bartender dedicado. El precio base es $5,000 para hasta 30 personas. Que tipo de evento estas planeando?", senderType: "agent" },
        { direction: "inbound", content: "Es una reunion corporativa, necesitamos proyector y microfono", senderType: "contact" },
        { direction: "outbound", content: "Perfecto, incluimos equipo de presentacion sin costo extra. Te puedo agendar una visita al salon para que veas el espacio. Tienes disponibilidad esta semana?", senderType: "agent" },
        { direction: "inbound", content: "El miercoles por la manana si", senderType: "contact" },
        { direction: "outbound", content: "Excelente! Te agendo para el miercoles a las 10:00am. Te enviare la ubicacion y detalles por aca. Algo mas que necesites incluir en la cotizacion?", senderType: "agent" },
      ],
      [
        { direction: "inbound", content: "Hola, vi su publicidad en Instagram, quieren ir este finde", senderType: "contact" },
        { direction: "outbound", content: "Hola Ana! Bienvenida. Tenemos disponibilidad para este fin de semana. Es para cuantas personas?", senderType: "agent" },
        { direction: "inbound", content: "Somos 6 amigas, alguna promo?", senderType: "contact" },
        { direction: "outbound", content: "Para grupos de 6+ tenemos 15% de descuento en la cuenta total. Ademas los sabados tenemos musica en vivo. Desea que le reserve?", senderType: "agent" },
      ],
      [
        { direction: "inbound", content: "Me pueden mandar el menu? Es la primera vez que voy a ir", senderType: "contact" },
        { direction: "outbound", content: "Hola Diego! Claro, con gusto. Nuestro menu incluye cortes, mariscos, pastas y opciones vegetarianas. Los precios van desde $180 hasta $650. Te puedo recomendar nuestros platillos estrella: el Rib Eye y los Tacos Gourmet. Quieres que te reserve una mesa para probarlos?", senderType: "agent" },
      ],
    ]

    const contacts: { id: string }[] = []

    for (let i = 0; i < contactDefs.length; i++) {
      const cDef = contactDefs[i]
      const lDef = leadDefs[i]

      const contact = await db.contact.create({
        data: {
          id: randomUUID(),
          workspaceId,
          phone: cDef.phone,
          email: cDef.email,
          name: cDef.name,
          source: cDef.source,
          tags: JSON.stringify(cDef.tags),
          metadata: JSON.stringify({ notes: "", preferredChannel: "whatsapp" }),
        },
      })
      contacts.push(contact)

      // Create lead
      const stageIndex = lDef.pipelineStage < pipelineStages.length ? lDef.pipelineStage : 0
      const lead = await db.lead.create({
        data: {
          id: randomUUID(),
          workspaceId,
          contactId: contact.id,
          status: lDef.status,
          temperature: lDef.temperature,
          archetype: lDef.archetype,
          score: lDef.score,
          dealValue: lDef.dealValue,
          pipelineStage: pipelineStages[stageIndex]?.name ?? "Nuevo",
          firstContactAt: new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000),
          lastContactAt: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        },
      })

      // Create cognitive state for the lead
      await db.cognitiveState.create({
        data: {
          id: randomUUID(),
          leadId: lead.id,
          temperature: lDef.temperature,
          archetype: lDef.archetype,
          intentScore: lDef.score / 100,
          churnRisk: lDef.temperature === "COLD" ? 0.7 : lDef.temperature === "WARM" ? 0.3 : 0.1,
          priority: lDef.temperature === "HOT" ? 9 : lDef.temperature === "WARM" ? 5 : 2,
          historicalContext: JSON.stringify({
            totalInteractions: Math.floor(Math.random() * 20) + 1,
            avgResponseTime: `${Math.floor(Math.random() * 30) + 5} min`,
            preferredContactTime: "evening",
          }),
        },
      })

      // Create conversation + messages for first 5 contacts
      if (i < conversationTemplates.length) {
        const conversation = await db.conversation.create({
          data: {
            id: randomUUID(),
            workspaceId,
            contactId: contact.id,
            leadId: lead.id,
            channel: cDef.source === "INSTAGRAM" || cDef.source === "FACEBOOK" ? "META" : "WHATSAPP",
            status: i < 2 ? "ACTIVE" : "WAITING",
            currentStage: lDef.temperature === "HOT" ? "INTENTION" : lDef.temperature === "WARM" ? "INTEREST" : "EXPLORATION",
            lastMessageAt: new Date(now.getTime() - Math.random() * 60 * 60 * 1000),
          },
        })

        const msgs = conversationTemplates[i]
        const baseTime = now.getTime() - msgs.length * 15 * 60 * 1000

        for (let j = 0; j < msgs.length; j++) {
          await db.message.create({
            data: {
              id: randomUUID(),
              conversationId: conversation.id,
              direction: msgs[j].direction,
              content: msgs[j].content,
              senderType: msgs[j].senderType,
              status: "DELIVERED",
              createdAt: new Date(baseTime + j * 15 * 60 * 1000),
            },
          })
        }

        // Create agent execution for JHON
        await db.agentExecution.create({
          data: {
            id: randomUUID(),
            agentId: (await db.agent.findFirst({ where: { workspaceId, type: "JHON" } }))?.id ?? "",
            conversationId: conversation.id,
            leadId: lead.id,
            inputSummary: `Conversacion con ${contact.name} - etapa ${lDef.temperature === "HOT" ? "intencion" : "interes"}`,
            outputSummary: `Respuesta generada con empatia y direccion hacia reserva`,
            decisionRationale: `Lead ${lDef.temperature} detectado, aplicando estrategia de cierre suave`,
            policiesApplied: JSON.stringify(["no_presionar", "max_2_preguntas", "confirmar_cita"]),
            cognitiveContext: JSON.stringify({ temperature: lDef.temperature, archetype: lDef.archetype }),
            duration: Math.floor(Math.random() * 3000) + 500,
            tokenUsage: JSON.stringify({ input: Math.floor(Math.random() * 800) + 200, output: Math.floor(Math.random() * 300) + 100 }),
            cost: Math.random() * 0.05,
            status: "SUCCESS",
          },
        })
      }
    }

    // Create deals for hot/warm leads
    if (pipelineStages.length > 0) {
      const hotLeads = await db.lead.findMany({
        where: { workspaceId, temperature: { in: ["HOT", "WARM"] } },
        take: 5,
      })

      for (const lead of hotLeads) {
        const stageIndex = lead.pipelineStage === "Ganado" ? 5 : lead.pipelineStage === "Negociacion" ? 4 : 3
        const safeIndex = Math.min(stageIndex, pipelineStages.length - 1)
        await db.deal.create({
          data: {
            id: randomUUID(),
            workspaceId,
            leadId: lead.id,
            pipelineId,
            pipelineStageId: pipelineStages[safeIndex]?.id ?? pipelineStages[0].id,
            title: `Deal - ${contactDefs.find((_, idx) => contacts[idx]?.id === lead.contactId)?.name ?? "Cliente"}`,
            value: lead.dealValue || 500,
            probability: lead.temperature === "HOT" ? 0.8 : 0.4,
            expectedCloseDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      }
    }
  }

  // ============================================================
  // 5. Campaigns
  // ============================================================
  const existingCampaigns = await db.campaign.findMany({
    where: { workspaceId },
  })

  if (existingCampaigns.length === 0) {
    const campaignDefs = [
      {
        name: "Bienvenida Nuevos Leads",
        description: "Mensaje de bienvenida automatico para leads nuevos",
        channel: "whatsapp",
        templateBody: "Hola {{name}}! Bienvenido a La Casa. Tenemos promociones especiales esta semana. Te gustaria conocerlas?",
        status: "active",
        stats: { sent: 28, delivered: 25, opened: 18, clicked: 8, converted: 4 },
        startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Reactivacion Clientes Frecuentes",
        description: "Seguimiento para clientes que no visitan en 30+ dias",
        channel: "whatsapp",
        templateBody: "Hola {{name}}! Te extrañamos en La Casa. Tenemos un descuento especial para ti: 20% en tu proxima visita. Valido esta semana!",
        status: "active",
        stats: { sent: 15, delivered: 14, opened: 11, clicked: 5, converted: 3 },
        startedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Promo Sabatino",
        description: "Promocion de fin de semana con musica en vivo",
        channel: "whatsapp",
        templateBody: "Este sabado: Musica en vivo + 2x1 en cocteles! Reserva tu mesa ahora y garantiza tu lugar. Solo quedan 5 mesas disponibles.",
        status: "draft",
        stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 },
      },
    ]

    for (const cDef of campaignDefs) {
      await db.campaign.create({
        data: {
          id: randomUUID(),
          workspaceId,
          name: cDef.name,
          description: cDef.description,
          channel: cDef.channel,
          templateBody: cDef.templateBody,
          segmentQuery: JSON.stringify({ tags: ["nuevo"], status: ["NEW"] }),
          status: cDef.status,
          stats: JSON.stringify(cDef.stats),
          startedAt: cDef.startedAt,
        },
      })
    }

    // Create a segment
    await db.segment.create({
      data: {
        id: randomUUID(),
        workspaceId,
        name: "Leads Nuevos",
        description: "Leads que aun no tienen primera interaccion",
        conditions: JSON.stringify({ status: "NEW", daysSinceCreation: { max: 7 } }),
        leadCount: 4,
        isDynamic: true,
      },
    })

    await db.segment.create({
      data: {
        id: randomUUID(),
        workspaceId,
        name: "VIP",
        description: "Clientes frecuentes con alta puntuacion",
        conditions: JSON.stringify({ tags: ["vip"], minScore: 80 }),
        leadCount: 3,
        isDynamic: true,
      },
    })
  }

  // ============================================================
  // 6. Calendar Events
  // ============================================================
  const existingEvents = await db.calendarEvent.findMany({
    where: { workspaceId },
  })

  if (existingEvents.length === 0) {
    const firstContact = await db.contact.findFirst({ where: { workspaceId } })
    const thirdContact = await db.contact.findThird({ where: { workspaceId } })

    const eventDefs = [
      {
        summary: "Reserva - Maria Gonzalez (Aniversario)",
        description: "Mesa terraza para 2, paquete aniversario con champagne",
        startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        contactId: firstContact?.id,
        status: "scheduled",
        createdBy: "ai",
      },
      {
        summary: "Visita salon eventos - Roberto Sanchez",
        description: "Cotizacion para evento corporativo 25 personas",
        startTime: new Date(now.getTime() + 26 * 60 * 60 * 1000), // manana
        endTime: new Date(now.getTime() + 27 * 60 * 60 * 1000),
        contactId: thirdContact?.id,
        status: "scheduled",
        createdBy: "ai",
      },
      {
        summary: "Grupo Ana Rodriguez (6 personas)",
        description: "Mesa para 6 amigas, 15% descuento grupo, sabado noche",
        startTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        contactId: thirdContact?.id,
        status: "scheduled",
        createdBy: "human",
      },
    ]

    for (const eDef of eventDefs) {
      await db.calendarEvent.create({
        data: {
          id: randomUUID(),
          workspaceId,
          ...eDef,
        },
      })
    }
  }

  // ============================================================
  // 7. Notifications
  // ============================================================
  const existingNotifs = await db.notification.findMany({
    where: { workspaceId },
  })

  if (existingNotifs.length === 0) {
    const notifDefs = [
      {
        type: "alert",
        title: "Lead caliente detectado",
        description: "Maria Gonzalez muestra alta intencion de compra. Su score subio a 92. Se recomienda contacto inmediato.",
        read: false,
      },
      {
        type: "calendar",
        title: "Reserva proxima",
        description: "Reserva de Maria Gonzalez en 2 horas. Mesa terraza para 2, paquete aniversario.",
        read: false,
      },
      {
        type: "campaign",
        title: "Campana completada",
        description: "Bienvenida Nuevos Leads: 28 enviados, 18 abiertos, 4 conversiones. ROI estimado: $1,800.",
        read: false,
      },
      {
        type: "system",
        title: "JHON asumo 3 conversaciones",
        description: "El agente JHON tomo control de 3 conversaciones nuevas en la ultima hora. Todas en etapa de exploration.",
        read: true,
      },
      {
        type: "alert",
        title: "Deriva cognitiva detectada",
        description: "Se detecto deriva en conversacion con Diego Hernandez. Score de respuesta bajo 0.6. Revision recomendada.",
        read: false,
      },
      {
        type: "campaign",
        title: "Nuevos leads del fin de semana",
        description: "5 leads nuevos ingresaron por WhatsApp durante el fin de semana. 2 estan calientes.",
        read: true,
      },
    ]

    for (const nDef of notifDefs) {
      await db.notification.create({
        data: {
          id: randomUUID(),
          workspaceId,
          type: nDef.type,
          title: nDef.title,
          description: nDef.description,
          read: nDef.read,
          createdAt: new Date(now.getTime() - Math.random() * 12 * 60 * 60 * 1000),
        },
      })
    }
  }

  // ============================================================
  // 8. Follow-up Sequence
  // ============================================================
  const existingSeqs = await db.followUpSequence.findMany({
    where: { workspaceId },
  })

  if (existingSeqs.length === 0) {
    const sequence = await db.followUpSequence.create({
      data: {
        id: randomUUID(),
        workspaceId,
        name: "Seguimiento Post-Consulta",
        description: "Secuencia automatica despues de primera consulta sin reserva",
        triggerCondition: JSON.stringify({ event: "first_contact", condition: "no_reservation_within_2h" }),
      },
    })

    const steps = [
      { order: 1, delayMinutes: 120, messageTemplate: "Hola {{name}}! Aun estas interesado en reservar? Tengo disponibilidad esta semana.", agentType: "FOLLOWUP" },
      { order: 2, delayMinutes: 1440, messageTemplate: "{{name}}, queria comentarte que tenemos una promo especial hoy. Te interesa?", agentType: "FOLLOWUP" },
      { order: 3, delayMinutes: 4320, messageTemplate: "Hola {{name}}! Hace unos dias nos contactaste. Si cambian los planes, aqui estamos. Un abrazo!", agentType: "JHON" },
    ]

    for (const step of steps) {
      await db.followUpStep.create({
        data: {
          id: randomUUID(),
          sequenceId: sequence.id,
          ...step,
        },
      })
    }
  }

  // ============================================================
  // 9. Sales Policies
  // ============================================================
  const existingPolicies = await db.salesPolicy.findMany({
    where: { workspaceId },
  })

  if (existingPolicies.length === 0) {
    const policyDefs = [
      { name: "No presionar al cliente", ruleType: "behavior", config: JSON.stringify({ maxPressureScore: 0.3, blockUrgencyWords: true }) },
      { name: "Maximo 2 preguntas por turno", ruleType: "conversation", config: JSON.stringify({ maxQuestions: 2, enforceInStages: ["exploration", "interest"] }) },
      { name: "Confirmar antes de agendar", ruleType: "action", config: JSON.stringify({ requireConfirmation: true, doubleCheckForVIP: true }) },
      { name: "No mostrar precio temprano", ruleType: "disclosure", config: JSON.stringify({ hidePriceUntilStage: "intention", exceptions: ["direct_price_question"] }) },
      { name: "Follow-up automatico a 2h", ruleType: "followup", config: JSON.stringify({ delayMinutes: 120, maxAttempts: 3, escalateAfter: 3 }) },
    ]

    for (let i = 0; i < policyDefs.length; i++) {
      await db.salesPolicy.create({
        data: {
          id: randomUUID(),
          workspaceId,
          name: policyDefs[i].name,
          ruleType: policyDefs[i].ruleType,
          config: policyDefs[i].config,
          priority: i + 1,
        },
      })
    }
  }

  // ============================================================
  // 10. Observability Traces + AI Cost
  // ============================================================
  const existingTraces = await db.observabilityTrace.findMany({
    where: { workspaceId },
  })

  if (existingTraces.length === 0) {
    const traceDefs = [
      { operationName: "process_message", eventType: "agent_execution", duration: 2340 },
      { operationName: "detect_stage", eventType: "cognitive_analysis", duration: 890 },
      { operationName: "generate_response", eventType: "llm_call", duration: 3200 },
      { operationName: "validate_behavior", eventType: "policy_check", duration: 150 },
      { operationName: "memory_recall", eventType: "context_fetch", duration: 420 },
    ]

    for (const tDef of traceDefs) {
      const traceId = randomUUID()
      await db.observabilityTrace.create({
        data: {
          id: randomUUID(),
          workspaceId,
          traceId,
          spanId: randomUUID(),
          operationName: tDef.operationName,
          eventType: tDef.eventType,
          duration: tDef.duration,
          status: "OK",
          attributes: JSON.stringify({ model: "gpt-4o", version: "1.0" }),
        },
      })
    }

    // AI Cost tracking
    const costEntries = [
      { model: "gpt-4o", inputTokens: 45000, outputTokens: 12000, cost: 2.34, operationType: "sales_chat" },
      { model: "gpt-4o-mini", inputTokens: 28000, outputTokens: 8000, cost: 0.45, operationType: "stage_detection" },
      { model: "gpt-4o", inputTokens: 15000, outputTokens: 5000, cost: 0.87, operationType: "followup_generation" },
      { model: "text-embedding-3-small", inputTokens: 120000, outputTokens: 0, cost: 0.02, operationType: "memory_indexing" },
    ]

    for (const cost of costEntries) {
      await db.aICostTracking.create({
        data: {
          id: randomUUID(),
          workspaceId,
          model: cost.model,
          inputTokens: cost.inputTokens,
          outputTokens: cost.outputTokens,
          totalTokens: cost.inputTokens + cost.outputTokens,
          cost: cost.cost,
          operationType: cost.operationType,
        },
      })
    }
  }

  return { success: true, workspaceId }
}

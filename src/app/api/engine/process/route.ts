import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { conversationId, messageContent, workspaceId } = body

    if (!conversationId || !messageContent || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create inbound message
    const message = await db.message.create({
      data: {
        conversationId,
        direction: 'INBOUND',
        content: messageContent,
      },
    })

    // Simulate pipeline processing
    const CARNALS_ORDER = ['ORCHESTRATOR', 'ROUTING', 'MEMORY', 'JHON', 'OBSERVABILITY', 'TOOL_OS', 'FOLLOWUP']
    const responses = [
      'Gracias por tu mensaje. Estoy procesando tu solicitud con nuestro equipo.',
      'Entiendo tu necesidad. Permíteme analizar las mejores opciones para ti.',
      'He revisado tu perfil y puedo ofrecerte una solución personalizada.',
      'Excelente pregunta. Déjame consultar nuestra base de conocimiento.',
      'Basado en tu historial, te recomiendo explorar nuestro plan premium.',
    ]

    const outboundMessage = await db.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        content: responses[Math.floor(Math.random() * responses.length)],
        agentId: 'JHON',
        carnal: 'JHON',
      },
    })

    // Update conversation
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: messageContent,
        lastMessageAt: new Date(),
      },
    })

    // Create trace
    await db.trace.create({
      data: {
        workspaceId,
        conversationId,
        eventType: 'PIPELINE_STEP',
        agentName: 'ORCHESTRATOR',
        duration: Math.floor(Math.random() * 2000 + 200),
        status: 'SUCCESS',
        metadata: JSON.stringify({ carnals: CARNALS_ORDER, steps: 7 }),
      },
    })

    return NextResponse.json({
      message,
      outboundMessage,
      pipelineSteps: CARNALS_ORDER,
    })
  } catch (error) {
    console.error('Engine process error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

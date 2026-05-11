import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findMany, findById } from '@/lib/db-supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  try {
    await requireWorkspaceAccess(workspaceId)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    // Supabase REST API fallback when Prisma can't connect
    if (!(await isPrismaReachable())) {
      const conversations = await findMany('conversations', { workspaceId }, { orderBy: 'lastMessageAt', orderAsc: false })

      // Enrich each conversation with its lead data via Supabase REST
      const enriched = await Promise.all(
        conversations.map(async (conv: any) => {
          let lead = null
          if (conv.leadId) {
            const leadData = await findById('leads', conv.leadId, 'id, name, email, company')
            lead = leadData || { id: conv.leadId, name: 'Lead sin nombre', email: null, company: null }
          }
          return {
            ...conv,
            lead,
            messages: [],
            toolActions: [],
            behavioralTraces: [],
          }
        })
      )

      return NextResponse.json(enriched)
    }

    const conversations = await db.conversation.findMany({
      where: { workspaceId },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: 'desc' } },
        toolActions: true,
        behavioralTraces: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return NextResponse.json(conversations)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Conversations] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

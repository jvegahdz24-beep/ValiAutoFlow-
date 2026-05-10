import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getServerSession, requireWorkspaceAccess } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId } = await params

    // Fetch lead to verify workspace access
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { workspaceId: true } })
    if (!lead) {
      return NextResponse.json({
        conversational: '',
        commercial: '',
        operational: '',
      })
    }
    await requireWorkspaceAccess(lead.workspaceId)

    const states = await db.cognitiveState.findMany({
      where: { leadId },
      orderBy: { updatedAt: 'desc' },
    })

    if (states.length === 0) {
      return NextResponse.json({
        conversational: '',
        commercial: '',
        operational: '',
      })
    }

    const latest = states[0]
    const context = JSON.parse(latest.historicalContext || '{}') as Record<string, string>
    return NextResponse.json({
      conversational: context.conversational ?? '',
      commercial: context.commercial ?? '',
      operational: context.operational ?? '',
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Engine/Memory] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

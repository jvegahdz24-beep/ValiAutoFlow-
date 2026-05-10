import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getServerSession, requireWorkspaceAccess } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { conversationId } = await params

    // Fetch conversation to verify workspace access
    const conversation = await db.conversation.findUnique({ where: { id: conversationId }, select: { workspaceId: true } })
    if (!conversation) {
      return NextResponse.json([])
    }
    await requireWorkspaceAccess(conversation.workspaceId)

    const traces = await db.behavioralTrace.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(traces)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Engine/Trace] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

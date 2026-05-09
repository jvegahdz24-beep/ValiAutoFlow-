import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
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
}

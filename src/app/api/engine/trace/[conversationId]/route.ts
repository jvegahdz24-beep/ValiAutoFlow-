import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { conversationId } = await params

  const traces = await db.behavioralTrace.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(traces)
}

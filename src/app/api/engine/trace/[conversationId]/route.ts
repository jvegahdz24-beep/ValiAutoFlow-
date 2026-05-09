import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params

  const traces = await db.behavioralTrace.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(traces)
}

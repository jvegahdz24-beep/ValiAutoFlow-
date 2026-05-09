import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params

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
}

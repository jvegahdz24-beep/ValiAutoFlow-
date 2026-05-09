import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params

  const memories = await db.leadMemory.findMany({
    where: { leadId },
  })

  if (memories.length === 0) {
    return NextResponse.json({
      conversational: '',
      commercial: '',
      operational: '',
    })
  }

  const latest = memories[memories.length - 1]
  return NextResponse.json({
    conversational: latest.conversational,
    commercial: latest.commercial,
    operational: latest.operational,
  })
}

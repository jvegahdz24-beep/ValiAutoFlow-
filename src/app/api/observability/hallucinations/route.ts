import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const hallucinations = await db.hallucinationDetection.findMany({
    where: {
      execution: {
        agent: {
          workspaceId,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(hallucinations)
}

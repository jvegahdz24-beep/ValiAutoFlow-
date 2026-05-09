import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const agents = await db.agent.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(agents)
}

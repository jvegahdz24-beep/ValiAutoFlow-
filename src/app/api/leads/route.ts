import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')
  const status = searchParams.get('status')
  const temperature = searchParams.get('temperature')
  const archetype = searchParams.get('archetype')
  const search = searchParams.get('search')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const where: Record<string, unknown> = { workspaceId }

  if (status) where.status = status
  if (temperature) where.temperature = temperature
  if (archetype) where.archetype = archetype
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ]
  }

  const leads = await db.lead.findMany({
    where,
    include: {
      cognitiveStates: true,
      conversations: {
        take: 1,
        orderBy: { lastMessageAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(leads)
}

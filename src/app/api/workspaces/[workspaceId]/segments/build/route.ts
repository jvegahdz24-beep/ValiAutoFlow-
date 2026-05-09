import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST - Build/preview a segment (count leads matching conditions)
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  try {
    const body = await request.json()
    const { conditions } = body

    const where: any = { workspaceId }
    if (conditions?.minScore) where.score = { gte: conditions.minScore }
    if (conditions?.status) where.status = conditions.status
    if (conditions?.temperature) where.temperature = conditions.temperature

    const [count, leads] = await Promise.all([
      db.lead.count({ where }),
      db.lead.findMany({
        where,
        take: 10,
        select: { id: true, score: true, status: true, temperature: true, contact: { select: { name: true } } },
      }),
    ])

    return NextResponse.json({ count, leads })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to build segment' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - List segments
export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  try {
    const segments = await db.segment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ segments })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

// POST - Create segment
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  try {
    const body = await request.json()
    const { name, description, conditions } = body

    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    // Count matching leads
    const parsedConditions = conditions || {}
    const where: any = { workspaceId }
    if (parsedConditions.minScore) where.score = { gte: parsedConditions.minScore }
    if (parsedConditions.status) where.status = parsedConditions.status

    const leadCount = await db.lead.count({ where })

    const segment = await db.segment.create({
      data: {
        workspaceId,
        name,
        description: description || '',
        conditions: JSON.stringify(parsedConditions),
        leadCount,
      },
    })

    return NextResponse.json({ segment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
  }
}

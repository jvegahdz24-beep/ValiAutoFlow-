import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'

// GET - List segments
export async function GET(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
    const segments = await db.segment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ segments })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

// POST - Create segment
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
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
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
  }
}

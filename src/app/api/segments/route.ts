import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const segment = await db.segment.create({
      data: {
        workspaceId: body.workspaceId,
        name: body.name,
        description: body.description || '',
        conditions: JSON.stringify(body.conditions || {}),
        leadCount: body.leadCount || 0,
        isDynamic: body.isDynamic ?? true,
      },
    })
    return NextResponse.json({ segment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
  }
}

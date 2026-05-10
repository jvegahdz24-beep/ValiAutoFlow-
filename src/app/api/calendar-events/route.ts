import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  try {
    await requireWorkspaceAccess(workspaceId)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const events = await db.calendarEvent.findMany({
      where: { workspaceId },
      orderBy: { startTime: 'asc' },
    })
    return NextResponse.json({ events })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }
    await requireWorkspaceAccess(body.workspaceId)
    const event = await db.calendarEvent.create({
      data: {
        workspaceId: body.workspaceId,
        contactId: body.contactId,
        leadId: body.leadId,
        summary: body.summary,
        description: body.description || '',
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        status: 'scheduled',
        createdBy: body.createdBy || 'ai',
        meetLink: body.meetLink,
      },
    })
    return NextResponse.json({ event }, { status: 201 })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

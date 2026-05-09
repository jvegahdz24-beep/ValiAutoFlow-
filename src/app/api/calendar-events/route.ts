import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  try {
    const events = await db.calendarEvent.findMany({
      where: { workspaceId },
      orderBy: { startTime: 'asc' },
    })
    return NextResponse.json({ events })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

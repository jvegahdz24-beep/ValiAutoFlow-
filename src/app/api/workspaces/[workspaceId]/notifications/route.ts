import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - List notifications
export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  try {
    const notifications = await db.notification.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unread = notifications.filter(n => !n.read).length
    return NextResponse.json({ notifications, unread })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST - Create notification
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  try {
    const body = await request.json()
    const { type, title, description, actionUrl } = body

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const notification = await db.notification.create({
      data: {
        workspaceId,
        type: type || 'system',
        title,
        description: description || '',
        actionUrl,
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

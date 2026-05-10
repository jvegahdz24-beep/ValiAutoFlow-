import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'

// GET - List notifications
export async function GET(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
    const notifications = await db.notification.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unread = notifications.filter(n => !n.read).length
    return NextResponse.json({ notifications, unread })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST - Create notification
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
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
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

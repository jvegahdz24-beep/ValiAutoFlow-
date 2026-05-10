import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'

// POST - Mark notification as read
export async function POST(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string; notificationId: string }> }) {
  try {
    const { workspaceId, notificationId } = await params
    await requireWorkspaceAccess(workspaceId)
    const notification = await db.notification.update({
      where: { id: notificationId, workspaceId },
      data: { read: true },
    })
    return NextResponse.json({ notification })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}

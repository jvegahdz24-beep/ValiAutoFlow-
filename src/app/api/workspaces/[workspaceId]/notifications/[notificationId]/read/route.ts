import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST - Mark notification as read
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; notificationId: string }> }) {
  const { notificationId } = await params
  try {
    const notification = await db.notification.update({
      where: { id: notificationId },
      data: { read: true },
    })
    return NextResponse.json({ notification })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}

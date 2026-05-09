import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

// POST - Mark notification as read
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; notificationId: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { notificationId } = await params
    const notification = await db.notification.update({
      where: { id: notificationId },
      data: { read: true },
    })
    return NextResponse.json({ notification })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}

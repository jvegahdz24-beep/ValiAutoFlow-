import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession, requireWorkspaceAccess } from '@/lib/auth';

// GET /api/conversations/[conversationId]/messages — List messages (paginated)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify workspace access
    await requireWorkspaceAccess(conversation.workspaceId);

    const where: Record<string, unknown> = { conversationId };

    if (cursor) {
      where.id = { lt: cursor };
    }

    const messages = await db.message.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Return in chronological order (oldest first)
    const sortedItems = [...items].reverse();

    return NextResponse.json({
      messages: sortedItems,
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('[MESSAGES_LIST]', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[conversationId]/messages — Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { conversationId } = await params;
    const body = await request.json();
    const { direction, content, senderType, senderId, metadata, templateUsed } =
      body;

    if (!content || !direction || !senderType) {
      return NextResponse.json(
        { error: 'content, direction, and senderType are required' },
        { status: 400 }
      );
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify workspace access
    await requireWorkspaceAccess(conversation.workspaceId);

    // Create message
    const message = await db.message.create({
      data: {
        conversationId,
        direction,
        content,
        senderType,
        senderId,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        status: 'PENDING',
        templateUsed,
      },
    });

    // Create initial status history
    await db.messageStatusHistory.create({
      data: {
        messageId: message.id,
        status: 'PENDING',
        metadata: '{}',
      },
    });

    // Update conversation's lastMessageAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Update lead's lastContactAt if conversation has a lead
    if (conversation.leadId) {
      await db.lead.update({
        where: { id: conversation.leadId },
        data: { lastContactAt: new Date() },
      });
    }

    // Note: In a full implementation, this would trigger the orchestration engine
    // to process the message through the appropriate agent pipeline
    // For now, we just create the message and return it

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('[MESSAGE_CREATE]', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

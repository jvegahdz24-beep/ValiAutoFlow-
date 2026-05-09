import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/conversations/[conversationId] — Get conversation with messages, stage history, cognitive state
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        lead: {
          select: {
            id: true,
            status: true,
            temperature: true,
            score: true,
            archetype: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        conversationStages: {
          orderBy: { detectedAt: 'desc' },
          take: 20,
        },
        cognitiveStates: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
        assignmentHistories: {
          orderBy: { assignedAt: 'desc' },
          take: 10,
        },
        agentExecutions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            agent: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('[CONVERSATION_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[conversationId] — Update conversation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const body = await request.json();
    const { status, currentStage } = body;

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Track stage change if changed
    if (currentStage && currentStage !== conversation.currentStage) {
      await db.conversationStage.create({
        data: {
          conversationId,
          stage: currentStage,
          confidence: 1.0,
          triggerReason: 'MANUAL_UPDATE',
        },
      });
    }

    const updated = await db.conversation.update({
      where: { id: conversationId },
      data: {
        ...(status !== undefined && { status }),
        ...(currentStage !== undefined && { currentStage }),
      },
      include: {
        contact: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, status: true, temperature: true },
        },
      },
    });

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error('[CONVERSATION_UPDATE]', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

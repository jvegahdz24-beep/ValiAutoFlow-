import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

// GET /api/workspaces/[workspaceId] — Get workspace details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { workspaceId } = await params;

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            contacts: true,
            leads: true,
            conversations: true,
            agents: true,
            pipelines: true,
            deals: true,
            followUpSequences: true,
            salesPolicies: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[WORKSPACE_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces/[workspaceId] — Update workspace settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { workspaceId } = await params;
    const body = await request.json();
    const { name, slug, plan, settings } = body;

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // If slug is being changed, check for conflicts
    if (slug && slug !== workspace.slug) {
      const existing = await db.workspace.findUnique({ where: { slug } });
      if (existing) {
        return NextResponse.json(
          { error: 'A workspace with this slug already exists' },
          { status: 409 }
        );
      }
    }

    const updated = await db.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(plan !== undefined && { plan }),
        ...(settings !== undefined && { settings: JSON.stringify(settings) }),
      },
    });

    return NextResponse.json({ workspace: updated });
  } catch (error) {
    console.error('[WORKSPACE_UPDATE]', error);
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    );
  }
}

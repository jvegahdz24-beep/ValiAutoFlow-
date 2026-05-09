import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Helper to mask sensitive fields in the GoogleCalendarConfig response.
 */
function maskConfig(config: Record<string, unknown>) {
  return {
    id: config.id,
    workspaceId: config.workspaceId,
    clientId: config.clientId,
    clientSecret: config.clientSecret
      ? `${(config.clientSecret as string).substring(0, 4)}${'•'.repeat(20)}`
      : null,
    refreshToken: config.refreshToken ? '••••••••' : null,
    accessToken: config.accessToken ? '••••••••' : null,
    tokenExpiry: config.tokenExpiry,
    calendarId: config.calendarId,
    isActive: config.isActive,
    lastSyncAt: config.lastSyncAt,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    // Computed: whether we have a valid refresh token (i.e., user completed OAuth)
    connected: !!config.refreshToken,
  };
}

/**
 * GET /api/workspaces/[workspaceId]/google-calendar
 * Retrieve the Google Calendar config for a workspace.
 * Masks sensitive data (clientSecret, accessToken, refreshToken).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;

    const config = await db.googleCalendarConfig.findUnique({
      where: { workspaceId },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Google Calendar is not configured for this workspace' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      config: maskConfig(config as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error('[GOOGLE_CALENDAR_CONFIG_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Calendar config' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[workspaceId]/google-calendar
 * Set up a new Google Calendar config with clientId and clientSecret.
 * Body:
 *   - clientId: Google OAuth2 Client ID
 *   - clientSecret: Google OAuth2 Client Secret
 *   - calendarId: (optional) Calendar ID to use (defaults to "primary")
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const body = await request.json();
    const { clientId, clientSecret, calendarId } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'clientId and clientSecret are required' },
        { status: 400 }
      );
    }

    // Check if a config already exists for this workspace
    const existing = await db.googleCalendarConfig.findUnique({
      where: { workspaceId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Google Calendar config already exists for this workspace. Use PUT to update.' },
        { status: 409 }
      );
    }

    // Verify the workspace exists
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const config = await db.googleCalendarConfig.create({
      data: {
        workspaceId,
        clientId,
        clientSecret,
        calendarId: calendarId || 'primary',
      },
    });

    return NextResponse.json(
      { config: maskConfig(config as unknown as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    console.error('[GOOGLE_CALENDAR_CONFIG_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create Google Calendar config' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workspaces/[workspaceId]/google-calendar
 * Update the Google Calendar config — toggle active/inactive, update calendarId, etc.
 * Body:
 *   - isActive: (optional) Toggle the integration on/off
 *   - calendarId: (optional) Change the calendar to sync with
 *   - clientId: (optional) Update client ID
 *   - clientSecret: (optional) Update client secret
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const body = await request.json();
    const { isActive, calendarId, clientId, clientSecret } = body;

    const existing = await db.googleCalendarConfig.findUnique({
      where: { workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Google Calendar config not found for this workspace' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (calendarId !== undefined) {
      updateData.calendarId = calendarId;
    }
    if (clientId !== undefined) {
      updateData.clientId = clientId;
    }
    if (clientSecret !== undefined) {
      updateData.clientSecret = clientSecret;
    }

    // If deactivating, we don't remove tokens — just mark inactive
    const updated = await db.googleCalendarConfig.update({
      where: { workspaceId },
      data: updateData,
    });

    return NextResponse.json({
      config: maskConfig(updated as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error('[GOOGLE_CALENDAR_CONFIG_PUT]', error);
    return NextResponse.json(
      { error: 'Failed to update Google Calendar config' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/google-calendar
 * Remove the Google Calendar config entirely from this workspace.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;

    const existing = await db.googleCalendarConfig.findUnique({
      where: { workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Google Calendar config not found for this workspace' },
        { status: 404 }
      );
    }

    await db.googleCalendarConfig.delete({
      where: { workspaceId },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Calendar config removed successfully',
    });
  } catch (error) {
    console.error('[GOOGLE_CALENDAR_CONFIG_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to delete Google Calendar config' },
      { status: 500 }
    );
  }
}

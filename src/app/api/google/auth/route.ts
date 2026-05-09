import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl, getTokensFromCode } from '@/lib/google/auth';
import { db } from '@/lib/db';

/**
 * GET /api/google/auth
 * Start the OAuth flow — generate the Google consent screen URL and redirect.
 * Query params:
 *   - workspaceId: The workspace to associate the Google Calendar config with
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Look up the GoogleCalendarConfig for this workspace
    const config = await db.googleCalendarConfig.findUnique({
      where: { workspaceId },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Google Calendar is not configured for this workspace. Please set up client ID and client secret first.' },
        { status: 404 }
      );
    }

    // Build the redirect URI — points back to this same route for the callback
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const redirectUri = `${protocol}://${host}/api/google/auth`;

    // Generate the OAuth consent URL
    const authUrl = generateAuthUrl(config.clientId, config.clientSecret, redirectUri);

    // Append workspaceId to the state parameter so we can retrieve it on callback
    const stateParam = Buffer.from(JSON.stringify({ workspaceId })).toString('base64');
    const urlWithState = `${authUrl}&state=${stateParam}`;

    return NextResponse.redirect(urlWithState);
  } catch (error) {
    console.error('[GOOGLE_AUTH_GET]', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth flow' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/google/auth
 * Handle the OAuth callback — exchange the authorization code for tokens,
 * save them to the GoogleCalendarConfig, and redirect to dashboard.
 * Body:
 *   - code: Authorization code from Google
 *   - workspaceId: The workspace to associate the tokens with
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, workspaceId } = body;

    if (!code || !workspaceId) {
      return NextResponse.json(
        { error: 'code and workspaceId are required' },
        { status: 400 }
      );
    }

    // Look up the GoogleCalendarConfig for this workspace
    const config = await db.googleCalendarConfig.findUnique({
      where: { workspaceId },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Google Calendar is not configured for this workspace' },
        { status: 404 }
      );
    }

    // Build the same redirect URI used in the initial auth request
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const redirectUri = `${protocol}://${host}/api/google/auth`;

    // Exchange the authorization code for tokens
    const tokenResponse = await getTokensFromCode(
      config.clientId,
      config.clientSecret,
      redirectUri,
      code
    );

    const tokenExpiry = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // Save the tokens to the database
    const updated = await db.googleCalendarConfig.update({
      where: { workspaceId },
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || config.refreshToken,
        tokenExpiry,
        isActive: true,
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        id: updated.id,
        workspaceId: updated.workspaceId,
        isActive: updated.isActive,
        calendarId: updated.calendarId,
        lastSyncAt: updated.lastSyncAt,
      },
    });
  } catch (error) {
    console.error('[GOOGLE_AUTH_POST]', error);
    return NextResponse.json(
      { error: 'Failed to complete Google OAuth callback' },
      { status: 500 }
    );
  }
}

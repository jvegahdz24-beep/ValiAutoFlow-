import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { getAvailableSlots, createEvent, listUpcomingEvents, cancelEvent } from '@/lib/google/calendar';
import type { GoogleCalendarConfig } from '@/lib/google/calendar';

/**
 * GET /api/google/calendar
 * Get available slots or list upcoming events.
 * Query params:
 *   - workspaceId: (required) The workspace whose Google Calendar config to use
 *   - startDate: Start of date range (ISO 8601) for free/busy query
 *   - endDate: End of date range (ISO 8601) for free/busy query
 *   - action: "slots" (default) or "events"
 *   - maxResults: Max number of events to return (default 10, only for action=events)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const action = searchParams.get('action') || 'slots';
    const maxResults = parseInt(searchParams.get('maxResults') || '10', 10);

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Fetch the workspace's Google Calendar config
    const config = await db.googleCalendarConfig.findUnique({
      where: { workspaceId },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Google Calendar is not configured for this workspace' },
        { status: 404 }
      );
    }

    if (!config.isActive) {
      return NextResponse.json(
        { error: 'Google Calendar integration is not active for this workspace' },
        { status: 400 }
      );
    }

    const calendarConfig = config as unknown as GoogleCalendarConfig;

    if (action === 'events') {
      // List upcoming events
      const events = await listUpcomingEvents(calendarConfig, maxResults);
      return NextResponse.json({ events });
    } else {
      // Get free/busy slots
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate are required for free/busy query' },
          { status: 400 }
        );
      }

      const freeBusy = await getAvailableSlots(calendarConfig, {
        start: startDate,
        end: endDate,
      });

      return NextResponse.json({ freeBusy });
    }
  } catch (error) {
    console.error('[GOOGLE_CALENDAR_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/google/calendar
 * Create a calendar event or cancel an existing event.
 * Body:
 *   - workspaceId: (required) The workspace whose Google Calendar config to use
 *   - action: "create" (default) or "cancel"
 *   - For "create":
 *     - summary: Event title
 *     - startTime: Start time (ISO 8601)
 *     - endTime: End time (ISO 8601)
 *     - attendees: Array of { email: string }
 *     - meetLink: Whether to create a Google Meet link (boolean)
 *     - description: Optional event description
 *   - For "cancel":
 *     - eventId: The Google Calendar event ID to cancel
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json();
    const { workspaceId, action = 'create' } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Fetch the workspace's Google Calendar config
    const config = await db.googleCalendarConfig.findUnique({
      where: { workspaceId },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Google Calendar is not configured for this workspace' },
        { status: 404 }
      );
    }

    if (!config.isActive) {
      return NextResponse.json(
        { error: 'Google Calendar integration is not active for this workspace' },
        { status: 400 }
      );
    }

    const calendarConfig = config as unknown as GoogleCalendarConfig;

    if (action === 'cancel') {
      // Cancel an event
      const { eventId } = body;

      if (!eventId) {
        return NextResponse.json(
          { error: 'eventId is required for cancel action' },
          { status: 400 }
        );
      }

      await cancelEvent(calendarConfig, eventId);
      return NextResponse.json({ success: true, message: 'Event cancelled successfully' });
    } else {
      // Create a new event
      const { summary, startTime, endTime, attendees, meetLink, description } = body;

      if (!summary || !startTime || !endTime) {
        return NextResponse.json(
          { error: 'summary, startTime, and endTime are required for create action' },
          { status: 400 }
        );
      }

      const event = await createEvent(calendarConfig, {
        summary,
        startTime,
        endTime,
        attendees: attendees || [],
        meetLink: meetLink || false,
        description,
      });

      return NextResponse.json({ event }, { status: 201 });
    }
  } catch (error) {
    console.error('[GOOGLE_CALENDAR_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process calendar request' },
      { status: 500 }
    );
  }
}

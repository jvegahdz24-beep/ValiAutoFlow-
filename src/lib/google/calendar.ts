// Google Calendar API client using REST API (no googleapis npm package)
// Automatically handles token refresh when access tokens expire.

import { refreshAccessToken } from './auth';
import { db } from '@/lib/db';

const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

export interface GoogleCalendarConfig {
  id: string;
  workspaceId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string | null;
  accessToken: string | null;
  tokenExpiry: Date | null;
  calendarId: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DateRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startTime: string;  // ISO 8601
  endTime: string;    // ISO 8601
  attendees?: Array<{ email: string }>;
  meetLink?: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  hangoutLink?: string;
  status?: string;
  htmlLink?: string;
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface FreeBusyResponse {
  busy: FreeBusySlot[];
}

/**
 * Ensure we have a valid access token, refreshing if necessary.
 * Updates the database with the new token if refreshed.
 */
async function ensureValidToken(
  config: GoogleCalendarConfig
): Promise<string> {
  // Check if the current access token is still valid (with 5 minute buffer)
  if (config.accessToken && config.tokenExpiry) {
    const expiryTime = new Date(config.tokenExpiry).getTime();
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    if (Date.now() < expiryTime - bufferMs) {
      return config.accessToken;
    }
  }

  // Token is expired or missing — need to refresh
  if (!config.refreshToken) {
    throw new Error('No refresh token available. Please re-authenticate with Google.');
  }

  const tokenResponse = await refreshAccessToken(
    config.clientId,
    config.clientSecret,
    config.refreshToken
  );

  const newExpiry = new Date(Date.now() + tokenResponse.expires_in * 1000);

  // Update the database with the new token
  await db.googleCalendarConfig.update({
    where: { id: config.id },
    data: {
      accessToken: tokenResponse.access_token,
      tokenExpiry: newExpiry,
    },
  });

  return tokenResponse.access_token;
}

/**
 * Make an authenticated request to the Google Calendar API.
 * Automatically refreshes the token if expired.
 */
async function calendarRequest(
  config: GoogleCalendarConfig,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    query?: Record<string, string>;
  } = {}
): Promise<Response> {
  const accessToken = await ensureValidToken(config);

  const url = new URL(`${GOOGLE_CALENDAR_BASE}${path}`);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    // Token might have been revoked — attempt one more refresh
    const retryToken = await ensureValidToken(config);
    headers.Authorization = `Bearer ${retryToken}`;

    return fetch(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  return response;
}

/**
 * Check free/busy information for the configured calendar within a date range.
 * Uses calendar.freebusy.query endpoint.
 */
export async function getAvailableSlots(
  config: GoogleCalendarConfig,
  dateRange: DateRange
): Promise<FreeBusyResponse> {
  const response = await calendarRequest(config, '/freeBusy', {
    method: 'POST',
    body: {
      timeMin: dateRange.start,
      timeMax: dateRange.end,
      items: [{ id: config.calendarId }],
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to query free/busy: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const calendarData = data.calendars?.[config.calendarId];

  if (!calendarData) {
    throw new Error('No free/busy data returned for the configured calendar.');
  }

  return {
    busy: (calendarData.busy || []).map((slot: FreeBusySlot) => ({
      start: slot.start,
      end: slot.end,
    })),
  };
}

/**
 * Create a new calendar event with optional Google Meet conferencing.
 * Uses events.insert endpoint.
 */
export async function createEvent(
  config: GoogleCalendarConfig,
  event: CalendarEventInput
): Promise<CalendarEvent> {
  const requestBody: Record<string, unknown> = {
    summary: event.summary,
    start: {
      dateTime: event.startTime,
    },
    end: {
      dateTime: event.endTime,
    },
  };

  if (event.description) {
    requestBody.description = event.description;
  }

  if (event.attendees && event.attendees.length > 0) {
    requestBody.attendees = event.attendees;
  }

  // Add Google Meet conferencing if requested
  if (event.meetLink) {
    requestBody.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    };
  }

  const response = await calendarRequest(
    config,
    `/calendars/${encodeURIComponent(config.calendarId)}/events`,
    {
      method: 'POST',
      body: requestBody,
      query: event.meetLink ? { conferenceDataVersion: '1' } : {},
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create event: ${response.status} - ${errorBody}`);
  }

  const createdEvent = await response.json();

  // Update lastSyncAt timestamp
  await db.googleCalendarConfig.update({
    where: { id: config.id },
    data: { lastSyncAt: new Date() },
  });

  return {
    id: createdEvent.id,
    summary: createdEvent.summary,
    description: createdEvent.description,
    start: createdEvent.start,
    end: createdEvent.end,
    attendees: createdEvent.attendees,
    hangoutLink: createdEvent.hangoutLink,
    status: createdEvent.status,
    htmlLink: createdEvent.htmlLink,
  };
}

/**
 * List upcoming events from the configured calendar.
 * Uses events.list endpoint.
 */
export async function listUpcomingEvents(
  config: GoogleCalendarConfig,
  maxResults: number = 10
): Promise<CalendarEvent[]> {
  const now = new Date().toISOString();

  const response = await calendarRequest(
    config,
    `/calendars/${encodeURIComponent(config.calendarId)}/events`,
    {
      method: 'GET',
      query: {
        maxResults: String(maxResults),
        orderBy: 'startTime',
        singleEvents: 'true',
        timeMin: now,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to list events: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();

  // Update lastSyncAt timestamp
  await db.googleCalendarConfig.update({
    where: { id: config.id },
    data: { lastSyncAt: new Date() },
  });

  return (data.items || []).map((item: CalendarEvent) => ({
    id: item.id,
    summary: item.summary,
    description: item.description,
    start: item.start,
    end: item.end,
    attendees: item.attendees,
    hangoutLink: item.hangoutLink,
    status: item.status,
    htmlLink: item.htmlLink,
  }));
}

/**
 * Cancel (delete) an event from the configured calendar.
 * Uses events.delete endpoint.
 */
export async function cancelEvent(
  config: GoogleCalendarConfig,
  eventId: string
): Promise<void> {
  const response = await calendarRequest(
    config,
    `/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok && response.status !== 204) {
    const errorBody = await response.text();
    throw new Error(`Failed to cancel event: ${response.status} - ${errorBody}`);
  }

  // Update lastSyncAt timestamp
  await db.googleCalendarConfig.update({
    where: { id: config.id },
    data: { lastSyncAt: new Date() },
  });
}

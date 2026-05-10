'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CalendarIcon,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  Trash2,
  Video,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface CalendarSettingsProps {
  workspaceId: string;
}

interface ConfigData {
  id: string;
  workspaceId: string;
  clientId: string;
  clientSecret: string | null;
  refreshToken: string | null;
  accessToken: string | null;
  tokenExpiry: string | null;
  calendarId: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  connected: boolean;
}

interface UpcomingEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  hangoutLink?: string;
  status?: string;
  htmlLink?: string;
}

export default function CalendarSettings({ workspaceId }: CalendarSettingsProps) {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for initial setup
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [calendarId, setCalendarId] = useState('primary');
  const [setupLoading, setSetupLoading] = useState(false);

  // Connect (OAuth) loading state
  const [connectLoading, setConnectLoading] = useState(false);

  // Toggle loading state
  const [toggleLoading, setToggleLoading] = useState(false);

  // Delete loading state
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Create event form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [eventSummary, setEventSummary] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventAttendees, setEventAttendees] = useState('');
  const [eventMeetLink, setEventMeetLink] = useState(true);
  const [createEventLoading, setCreateEventLoading] = useState(false);

  /**
   * Fetch the Google Calendar config for this workspace.
   */
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/google-calendar`
      );
      if (res.status === 404) {
        setConfig(null);
      } else if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load config');
      } else {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  /**
   * Fetch upcoming events from Google Calendar.
   */
  const fetchEvents = useCallback(async () => {
    if (!config?.connected || !config?.isActive) return;
    setEventsLoading(true);
    try {
      const res = await fetch(
        `/api/google/calendar?workspaceId=${workspaceId}&action=events&maxResults=10`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      // Silently fail — events are supplementary
    } finally {
      setEventsLoading(false);
    }
  }, [workspaceId, config?.connected, config?.isActive]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config?.connected && config?.isActive) {
      fetchEvents();
    }
  }, [config?.connected, config?.isActive, fetchEvents]);

  /**
   * Handle initial setup — create a new GoogleCalendarConfig.
   */
  const handleSetup = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;
    setSetupLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/google-calendar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            calendarId: calendarId.trim() || 'primary',
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create config');
        return;
      }
      const data = await res.json();
      setConfig(data.config);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setSetupLoading(false);
    }
  };

  /**
   * Handle Connect — open the Google OAuth consent screen.
   */
  const handleConnect = async () => {
    setConnectLoading(true);
    setError(null);
    try {
      // Redirect to the OAuth flow endpoint
      window.location.href = `/api/google/auth?workspaceId=${workspaceId}`;
    } catch {
      setError('Failed to initiate OAuth flow');
      setConnectLoading(false);
    }
  };

  /**
   * Handle toggling the integration active/inactive.
   */
  const handleToggle = async (checked: boolean) => {
    setToggleLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/google-calendar`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: checked }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update config');
        return;
      }
      const data = await res.json();
      setConfig(data.config);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setToggleLoading(false);
    }
  };

  /**
   * Handle deleting the config entirely.
   */
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove the Google Calendar integration? This will delete all configuration data.')) {
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/google-calendar`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete config');
        return;
      }
      setConfig(null);
      setEvents([]);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setDeleteLoading(false);
    }
  };

  /**
   * Handle creating a new event.
   */
  const handleCreateEvent = async () => {
    if (!eventSummary.trim() || !eventStartTime || !eventEndTime) return;
    setCreateEventLoading(true);
    setError(null);
    try {
      const attendees = eventAttendees
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.includes('@'))
        .map((email) => ({ email }));

      const res = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          action: 'create',
          summary: eventSummary.trim(),
          startTime: new Date(eventStartTime).toISOString(),
          endTime: new Date(eventEndTime).toISOString(),
          attendees,
          meetLink: eventMeetLink,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create event');
        return;
      }

      // Reset form
      setEventSummary('');
      setEventStartTime('');
      setEventEndTime('');
      setEventAttendees('');
      setEventMeetLink(true);
      setShowCreateForm(false);

      // Refresh events list
      await fetchEvents();
    } catch {
      setError('Failed to connect to server');
    } finally {
      setCreateEventLoading(false);
    }
  };

  /**
   * Format a date/time string for display.
   */
  const formatDateTime = (dateTime: string) => {
    try {
      return new Date(dateTime).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTime;
    }
  };

  // ---------- RENDER ----------

  // Loading skeleton
  if (loading) {
    return (
      <Card className="bg-background text-foreground">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background text-foreground">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="size-5 text-primary" />
            <div>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                Connect your Google Calendar to manage appointments and availability
              </CardDescription>
            </div>
          </div>
          {config && (
            <Badge variant={config.connected ? 'default' : 'outline'}>
              {config.connected ? (
                <>
                  <CheckCircle2 className="size-3" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="size-3" />
                  Disconnected
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error display */}
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* No config yet — show setup form */}
        {!config && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set up your Google Calendar integration by providing your Google OAuth2 credentials.
              You can create these in the{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                Google Cloud Console
              </a>.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  placeholder="your-client-id.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="GOCSPX-..."
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="calendarId">Calendar ID</Label>
                <Input
                  id="calendarId"
                  placeholder="primary"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Use &quot;primary&quot; for your main calendar, or enter a specific calendar email address.
                </p>
              </div>
              <Button
                onClick={handleSetup}
                disabled={!clientId.trim() || !clientSecret.trim() || setupLoading}
                className="w-full"
              >
                {setupLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>
        )}

        {/* Config exists — show status and controls */}
        {config && (
          <>
            {/* Connection status & controls */}
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Integration Status</p>
                  <p className="text-xs text-muted-foreground">
                    {config.connected
                      ? `Connected to calendar: ${config.calendarId}`
                      : 'Not connected — authorize access to your Google Calendar'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {config.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Switch
                    checked={config.isActive}
                    onCheckedChange={handleToggle}
                    disabled={toggleLoading || !config.connected}
                  />
                </div>
              </div>

              {!config.connected && (
                <Button
                  onClick={handleConnect}
                  disabled={connectLoading}
                  className="w-full"
                  variant="outline"
                >
                  {connectLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="size-4" />
                  )}
                  Connect Google Calendar
                </Button>
              )}

              {config.connected && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3 text-green-500" />
                  <span>
                    Last synced:{' '}
                    {config.lastSyncAt
                      ? new Date(config.lastSyncAt).toLocaleString()
                      : 'Never'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchEvents}
                    disabled={eventsLoading}
                    className="ml-auto h-6 px-2"
                  >
                    <RefreshCw
                      className={`size-3 ${eventsLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              )}

              {/* Config details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Client ID:</span>
                  <p className="font-mono truncate">{config.clientId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Calendar:</span>
                  <p className="font-mono truncate">{config.calendarId}</p>
                </div>
              </div>
            </div>

            {/* Upcoming events */}
            {config.connected && config.isActive && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Upcoming Events</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                  >
                    <Plus className="size-3.5" />
                    New Event
                  </Button>
                </div>

                {/* Create event form */}
                {showCreateForm && (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h5 className="text-sm font-medium">Create Event</h5>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="eventSummary" className="text-xs">
                          Title
                        </Label>
                        <Input
                          id="eventSummary"
                          placeholder="Meeting with client"
                          value={eventSummary}
                          onChange={(e) => setEventSummary(e.target.value)}
                          className="bg-background text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="eventStart" className="text-xs">
                            Start Time
                          </Label>
                          <Input
                            id="eventStart"
                            type="datetime-local"
                            value={eventStartTime}
                            onChange={(e) => setEventStartTime(e.target.value)}
                            className="bg-background text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="eventEnd" className="text-xs">
                            End Time
                          </Label>
                          <Input
                            id="eventEnd"
                            type="datetime-local"
                            value={eventEndTime}
                            onChange={(e) => setEventEndTime(e.target.value)}
                            className="bg-background text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="eventAttendees" className="text-xs">
                          Attendees (comma-separated emails)
                        </Label>
                        <Input
                          id="eventAttendees"
                          placeholder="john@example.com, jane@example.com"
                          value={eventAttendees}
                          onChange={(e) => setEventAttendees(e.target.value)}
                          className="bg-background text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="meetLink"
                          checked={eventMeetLink}
                          onCheckedChange={setEventMeetLink}
                        />
                        <Label htmlFor="meetLink" className="text-xs">
                          Add Google Meet link
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCreateEvent}
                          disabled={
                            !eventSummary.trim() ||
                            !eventStartTime ||
                            !eventEndTime ||
                            createEventLoading
                          }
                        >
                          {createEventLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <CalendarIcon className="size-3.5" />
                          )}
                          Create
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowCreateForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Events table */}
                {eventsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <CalendarIcon className="mx-auto size-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No upcoming events found
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>End</TableHead>
                          <TableHead className="text-right">Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {event.summary || '(No title)'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(event.start.dateTime)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(event.end.dateTime)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {event.hangoutLink && (
                                  <a
                                    href={event.hangoutLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors"
                                    title="Join Google Meet"
                                  >
                                    <Video className="size-3.5 text-green-500" />
                                  </a>
                                )}
                                {event.htmlLink && (
                                  <a
                                    href={event.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors"
                                    title="Open in Google Calendar"
                                  >
                                    <ExternalLink className="size-3.5" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Footer with delete action */}
      {config && (
        <CardFooter className="border-t pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteLoading}
            className="ml-auto"
          >
            {deleteLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Remove Integration
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

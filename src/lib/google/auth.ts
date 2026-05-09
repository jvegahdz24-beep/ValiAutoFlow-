// Google OAuth2 helpers using REST API (no googleapis npm package)

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

/**
 * Create an OAuth2 configuration object.
 * Since we use REST API directly, we return the config instead of a googleapis client.
 */
export function getOAuth2Client(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): OAuth2Config {
  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate the OAuth consent screen URL for Google Calendar access.
 */
export function generateAuthUrl(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): string {
  const config = getOAuth2Client(clientId, clientSecret, redirectUri);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

/**
 * Exchange an authorization code for OAuth2 tokens.
 */
export async function getTokensFromCode(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${response.status} - ${errorBody}`);
  }

  return response.json() as Promise<TokenResponse>;
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to refresh access token: ${response.status} - ${errorBody}`);
  }

  return response.json() as Promise<TokenResponse>;
}

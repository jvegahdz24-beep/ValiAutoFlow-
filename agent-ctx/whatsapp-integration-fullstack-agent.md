# WhatsApp Cloud API Integration — Work Record

## Task ID: whatsapp-integration
## Agent: Fullstack Agent
## Date: 2025-03-05

## Summary
Created complete WhatsApp Cloud API integration for ValiAutoFlow, consisting of 5 files that handle sending/receiving WhatsApp messages via Meta's Graph API, webhook verification, configuration management, and bridge to the Orchestrator engine.

## Files Created

### 1. `/src/lib/whatsapp/client.ts`
WhatsApp Cloud API client with functions:
- `sendMessage()` — Send text messages via POST to Meta Graph API
- `sendTemplateMessage()` — Send template messages with components
- `markMessageRead()` — Mark messages as read
- `uploadMedia()` — Upload media files (images, documents, etc.)
- `subscribeAppToWaba()` — Subscribe app to WhatsApp Business Account
- `getPhoneNumberDetails()` — Validate phone number credentials

All functions use fetch to `https://graph.facebook.com/v21.0/{phoneNumberId}/...` with `Authorization: Bearer {accessToken}` headers.

### 2. `/src/lib/whatsapp/webhook.ts`
Webhook handler utilities:
- `verifyWebhook(mode, token, verifyToken)` — Verify Meta webhook subscription (checks hub.mode=subscribe, verify_token match)
- `parseIncomingMessage(body)` — Parse incoming WhatsApp message payload, extracting: from, messageId, text, timestamp, type, mediaId, mimeType, fileName, caption, location, plus raw data
- `parseStatusUpdate(body)` — Parse delivery/read/sent/failed status updates with error details

Supports all WhatsApp message types: text, image, document, audio, video, sticker, location, contacts, interactive, button, reaction, order, system.

### 3. `/src/app/api/whatsapp/webhook/route.ts`
API route for Meta webhook:
- **GET**: Webhook verification — looks up WhatsAppConfig by verifyToken, returns hub.challenge
- **POST**: Receives messages and status updates
  - Messages: finds workspace by phoneNumberId → upserts Contact → finds/creates Conversation → creates inbound Message → routes to `/api/engine/process`
  - Status updates: finds existing Message by WhatsApp message ID → updates status → creates MessageStatusHistory
  - **Always returns 200** to Meta, even on errors

### 4. `/src/app/api/workspaces/[workspaceId]/whatsapp/route.ts`
Configuration API:
- **GET**: Retrieves config with masked accessToken (first 8 chars + '...' + last 4 chars)
- **POST**: Creates/updates config, validates credentials with Meta API, subscribes app to WABA
- **PUT**: Updates specific fields, optionally sets up webhook with Meta when activating
- **DELETE**: Removes config
- Uses `{ params }: { params: Promise<{ workspaceId: string }> }` for Next.js 16 params

### 5. `/src/lib/whatsapp/channel-bridge.ts`
Integration with the Orchestrator:
- `sendWhatsAppMessage(workspaceId, conversationId, text)` — Looks up WhatsAppConfig, finds contact phone from conversation, sends via client, creates outbound Message + MessageStatusHistory
- `sendWhatsAppTemplateMessage(workspaceId, conversationId, templateName, language, components)` — Same flow but for template messages

## Key Design Decisions
- All files use `import { db } from '@/lib/db'` (NOT prisma directly)
- Access tokens are NEVER exposed in GET responses (masked pattern)
- Webhook POST always returns 200 to Meta (per Meta's requirements)
- Contact IDs follow pattern: `{workspaceId}_wa_{phone}`
- The webhook route calls `/api/engine/process` to route messages through the 7 Carnales pipeline
- Follows existing patterns from the Telegram integration (cognitive-bridge, bot, etc.)

## Lint Status
✅ All files pass ESLint with zero errors

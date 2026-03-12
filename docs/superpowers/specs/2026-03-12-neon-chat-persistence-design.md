# Neon Chat Persistence Design

Date: 2026-03-12
Status: Approved in chat

## Goal

Persist chat conversations and messages in Neon so chat history survives refresh/reload and users can switch between multiple conversations.

## Scope

In scope for v1:

- Multiple conversations with a history list and conversation switching.
- Anonymous ownership using a stable browser-generated `userId` in `localStorage`.
- Timestamp-based conversation titles.
- Persist user message immediately when sent.
- Persist assistant message after stream completes (if non-empty).
- Load full message history for selected conversation.
- Conversation management in UI: create + switch only.

Out of scope for v1:

- Login/auth UI.
- Rename/delete conversation.
- Pagination for long threads.
- Assistant token-by-token persistence.

## Chosen Approach

Use direct SQL with `@neondatabase/serverless` in Next.js route handlers.

Why this approach:

- Fastest and lowest-risk for current app size.
- Minimal dependency overhead.
- Full control over schema and query behavior.

## Current System Context

- UI uses `useChat` in `app/page.tsx` and currently keeps state in memory.
- Streaming response is handled in `app/api/chat/route.ts` using AI Gateway.
- No persistence exists today.

## Proposed Architecture

Add Neon-backed persistence endpoints while keeping the existing streaming pattern:

- `GET /api/chats`
  - Requires header: `X-Chat-User-Id: <uuid-v4>`.
  - Returns conversations for user, sorted by `updated_at DESC`.
- `POST /api/chats`
  - Creates a new conversation with timestamp title.
  - Requires header: `X-Chat-User-Id: <uuid-v4>`.
- `GET /api/chats/:chatId/messages`
  - Requires header: `X-Chat-User-Id: <uuid-v4>`.
  - Returns full ordered history for selected conversation.
- Update `POST /api/chat`
  - Requires header: `X-Chat-User-Id: <uuid-v4>`.
  - Accepts `conversationId` and `clientMessageId` in request body.
  - Saves user message immediately, streams assistant reply, then saves assistant message after stream completion.

## Data Model

### `chat_users`

- `id text primary key`
- `created_at timestamptz not null default now()`

`id` stores UUIDv4 generated client-side using `crypto.randomUUID()`.

### `conversations`

- `id uuid primary key default gen_random_uuid()`
- `user_id text not null references chat_users(id) on delete cascade`
- `title text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `messages`

- `id uuid primary key default gen_random_uuid()`
- `conversation_id uuid not null references conversations(id) on delete cascade`
- `sequence bigint generated always as identity`
- `client_message_id text`
- `role text not null check (role in ('user', 'assistant', 'system'))`
- `parts jsonb not null`
- `created_at timestamptz not null default now()`

Indexes:

- `create index conversations_user_updated_idx on conversations (user_id, updated_at desc);`
- `create index messages_conversation_created_idx on messages (conversation_id, created_at asc);`
- `create index messages_conversation_created_id_idx on messages (conversation_id, created_at asc, id asc);`
- `create index messages_conversation_sequence_idx on messages (conversation_id, sequence asc);`
- `create unique index messages_conversation_client_message_idx on messages (conversation_id, client_message_id) where client_message_id is not null;`

Migration prerequisite:

- `create extension if not exists pgcrypto;`

DB-level consistency:

- Add trigger `AFTER INSERT ON messages` to update parent conversation `updated_at = now()`.
- Application code may also set `updated_at`, but trigger is authoritative.

## Request and Data Flow

### App load

1. Client ensures a stable anonymous `userId` exists in `localStorage` using `crypto.randomUUID()`.
2. Client fetches conversation list via `GET /api/chats` with `X-Chat-User-Id` header.
3. Client auto-selects the newest conversation (or creates one if none).
4. Client loads full message history for selected conversation with `X-Chat-User-Id` header.

### Sending a message

1. Client sends prompt to `POST /api/chat` with `X-Chat-User-Id` header and body fields `conversationId`, `clientMessageId`, and model.
2. Server validates `X-Chat-User-Id` format (UUIDv4) and ownership of `conversationId`.
3. Server inserts user message row immediately using idempotent write keyed by `(conversation_id, client_message_id)`.
4. Server streams assistant output from AI Gateway.
5. Server buffers streamed assistant text.
6. On successful stream end, server inserts assistant message if content is non-empty using deterministic idempotency key `clientMessageId + ":assistant"`.
7. `updated_at` is updated by DB trigger on each message insert.
8. All message reads must order by `sequence ASC` for deterministic order under rapid concurrent sends.

Anonymous identity model note:

- Possession of `X-Chat-User-Id` grants access to that user's chats in v1.
- This is acceptable for anonymous mode; migrate to authenticated identity in a later phase.

## API Contract

### `GET /api/chats`

- Request headers:
  - `X-Chat-User-Id` (required UUIDv4 string)
- `200` response:
  - `{ conversations: Array<{ id: string, title: string, createdAt: string, updatedAt: string }> }`
- Errors:
  - `400`: `{ code: "invalid_user_id", message: string, retryable: false }`
  - `500`: `{ code: "internal_error", message: string, retryable: true }`

### `POST /api/chats`

- Request headers:
  - `X-Chat-User-Id` (required UUIDv4 string)
- `201` response:
  - `{ conversation: { id: string, title: string, createdAt: string, updatedAt: string } }`
- Errors:
  - `400`: `{ code: "invalid_user_id", message: string, retryable: false }`
  - `500`: `{ code: "internal_error", message: string, retryable: true }`

### `GET /api/chats/:chatId/messages`

- Request headers:
  - `X-Chat-User-Id` (required UUIDv4 string)
- `200` response:
  - `{ messages: Array<{ id: string, role: "user" | "assistant" | "system", parts: unknown, createdAt: string }> }`
- Errors:
  - `400`: `{ code: "invalid_user_id" | "invalid_request", message: string, retryable: false }`
  - `404`: `{ code: "conversation_not_found", message: string, retryable: false }`
  - `500`: `{ code: "internal_error", message: string, retryable: true }`

### `POST /api/chat`

- Request headers:
  - `X-Chat-User-Id` (required UUIDv4 string)
- Request body:
  - `{ conversationId: string, clientMessageId: string, model?: string, messages?: UIMessage[] }`
  - `conversationId` is required; endpoint never auto-creates conversations.
- Success response:
  - Existing AI SDK stream response format.
- Stream failure behavior:
  - If failure occurs before first token, return `500` JSON `{ code, message, retryable, userMessagePersisted, conversationId, clientMessageId }`.
  - If failure occurs after stream starts, terminate stream and emit an AI SDK-compatible error chunk/event with `{ code: "stream_failed", retryable, userMessagePersisted, conversationId, clientMessageId }`.

All timestamps are ISO 8601 strings in API responses.

## Validation and Error Handling

- `400 Bad Request` for missing/invalid `X-Chat-User-Id`, invalid `conversationId`, invalid `clientMessageId`, or malformed payload.
- Missing `conversationId` on `POST /api/chat` returns `400 { code: "invalid_conversation_id", message: string, retryable: false }`.
- `404 Not Found` when conversation does not exist for provided user.
- `500 Internal Server Error` for DB or model provider failures.
- If streaming fails after user message insert:
  - Keep user message persisted.
  - Return structured pre-stream error JSON when no tokens were sent yet.
  - Emit stream error event payload if streaming already started.
  - Do not insert empty assistant message.

## Security and Privacy

- Every query is scoped by both `userId` and `conversationId`.
- Validate `X-Chat-User-Id` as UUIDv4 for every endpoint.
- Use parameterized SQL only.
- Do not log full message bodies by default; log metadata and error context.
- Keep `DATABASE_URL` server-only.

## Operational Notes

- Use Neon pooled connection string to handle serverless concurrency.
- Keep SQL in a small shared server module (for maintainability).
- Timestamp title is generated server-side in UTC as `Chat YYYY-MM-DD HH:mm UTC` for deterministic behavior across clients.

## Testing Strategy

Follow TDD for behavior changes:

- Route tests for `GET /api/chats`:
  - Invalid user ID format returns `400`.
  - Returns only requesting user's conversations.
  - Sorted by `updated_at` descending.
- Route tests for `POST /api/chats`:
  - Creates conversation with timestamp title.
  - Ensures user record exists/created.
- Route tests for `GET /api/chats/:chatId/messages`:
  - Ownership enforcement.
  - Invalid user ID format returns `400` with `invalid_user_id`.
  - Cross-user access returns `404`.
  - Messages ordered by `sequence` ascending.
- Chat route tests for `POST /api/chat`:
  - User message persisted before stream completes.
  - Duplicate `clientMessageId` does not duplicate user message.
  - Assistant message persisted after successful completion.
  - Empty assistant output is not persisted.
  - Stream failure response includes `userMessagePersisted: true` and identifiers for reconciliation.
  - Two rapid sends preserve deterministic in-thread order and valid `updated_at` progression.

## Rollout Plan

1. Add Neon connection utility and SQL schema migration script.
2. Add chat list/create/load endpoints.
3. Integrate `conversationId` and `userId` into existing chat send flow.
4. Add sidebar UI for create/switch conversations.
5. Verify with tests and manual end-to-end run.

## Future Enhancements

- Conversation rename/delete.
- Auth-backed identity migration.
- Pagination and load-more for large threads.
- Optional partial assistant persistence for interrupted streams.

# Neon Chat Persistence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist multi-conversation chat history in Neon with anonymous user ownership and sidebar conversation switching.

**Architecture:** Add server-side Neon SQL access module and REST route handlers for conversation list/create/history, then extend the existing streaming chat route to persist messages idempotently. Update client page state to load and switch conversations while reusing current `useChat` streaming UX.

**Tech Stack:** Next.js App Router, AI SDK (`useChat`, `streamText`), Neon Serverless driver (`@neondatabase/serverless`), Vitest.

---

## Chunk 1: Database and Server Data Layer

### Task 1: Add Neon dependency and schema SQL

**Files:**

- Modify: `package.json`
- Create: `lib/server/chat-schema.sql`

- [ ] **Step 1: Write failing dependency check test**

Write failing tests in `lib/server/chat-store.test.ts` for schema assumptions:

- inserting two messages in one conversation must produce increasing `sequence`
- inserting a message updates parent `conversations.updated_at` via trigger
- duplicate `(conversation_id, client_message_id)` insert is deduped.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL because schema/data layer is not implemented.

- [ ] **Step 3: Add dependency and schema file**

Add `@neondatabase/serverless` and SQL with:

- `create extension if not exists pgcrypto;`
- tables: `chat_users`, `conversations`, `messages`
- identity `messages.sequence`
- indexes:
  - `conversations_user_updated_idx (user_id, updated_at desc)`
  - `messages_conversation_created_idx (conversation_id, created_at asc)`
  - `messages_conversation_created_id_idx (conversation_id, created_at asc, id asc)`
  - `messages_conversation_sequence_idx (conversation_id, sequence asc)`
  - unique partial `messages_conversation_client_message_idx (conversation_id, client_message_id) where client_message_id is not null`
- trigger `AFTER INSERT ON messages` to set `conversations.updated_at = now()`.

- [ ] **Step 4: Apply schema to Neon database**

Run: `psql "$DATABASE_URL" -f lib/server/chat-schema.sql`
Expected: successful DDL output.

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm test`
Expected: PASS for dependency check.

### Task 2: Build chat store module

**Files:**

- Create: `lib/server/chat-store.ts`
- Test: `lib/server/chat-store.test.ts`

- [ ] **Step 1: Write failing tests**

Write tests for:

- `isUuidV4` validation behavior
- parsing `X-Chat-User-Id`
- SQL helper input validation and idempotency key derivation.

- [ ] **Step 2: Run tests to verify fail**

Run: `pnpm test lib/server/chat-store.test.ts`
Expected: FAIL due to missing module/functions.

- [ ] **Step 3: Implement minimal module**

Implement:

- Neon client bootstrap from `DATABASE_URL`
- header validation helper
- `ensureChatUser`, `listConversations`, `createConversation`, `getConversationMessages`, `saveUserMessageIdempotent`, `saveAssistantMessageIdempotent`.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test lib/server/chat-store.test.ts`
Expected: PASS.

## Chunk 2: API Endpoints

### Task 3: Conversation routes

**Files:**

- Create: `app/api/chats/route.ts`
- Create: `app/api/chats/[chatId]/messages/route.ts`
- Test: `app/api/chats/route.test.ts`
- Test: `app/api/chats/[chatId]/messages/route.test.ts`

- [ ] **Step 1: Write failing route tests**

Cover:

- missing/invalid user header -> `400 invalid_user_id`
- invalid `chatId` format -> `400 invalid_request`
- list returns scoped conversations
- list returns conversations sorted by `updated_at DESC` (newest first)
- create returns `201` with timestamp title in UTC format
- messages endpoint returns ordered messages by `sequence ASC`
- messages route returns `404 conversation_not_found` for cross-user access.

- [ ] **Step 2: Run tests to verify fail**

Run: `pnpm test "app/api/chats/route.test.ts" "app/api/chats/[chatId]/messages/route.test.ts"`
Expected: FAIL.

- [ ] **Step 3: Implement route handlers**

Use `chat-store` helpers and return contract-compliant JSON; ensure list ordering is `ORDER BY updated_at DESC` and messages ordering is `ORDER BY sequence ASC`.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test "app/api/chats/route.test.ts" "app/api/chats/[chatId]/messages/route.test.ts"`
Expected: PASS.

### Task 4: Persist within chat streaming route

**Files:**

- Modify: `app/api/chat/route.ts`
- Test: `app/api/chat/route.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- missing/invalid `X-Chat-User-Id` -> `400 invalid_user_id`
- `conversationId` required (`400 invalid_conversation_id`)
- missing/invalid `clientMessageId` returns `400 invalid_request`
- conversation not found or cross-user `conversationId` returns `404 conversation_not_found`
- user message persisted with `clientMessageId`
- duplicate `clientMessageId` does not duplicate user row
- assistant message persisted with `clientMessageId + ":assistant"`
- empty assistant output is not persisted
- two rapid sends preserve deterministic ordering by `sequence ASC`
- rapid sends advance `conversations.updated_at` via trigger
- pre-stream failures return JSON with `{ code, message, retryable, userMessagePersisted, conversationId, clientMessageId }`
- post-stream-start failures emit AI SDK-compatible `stream_failed` payload with `{ code: "stream_failed", retryable, userMessagePersisted, conversationId, clientMessageId }`.

- [ ] **Step 2: Run tests to verify fail**

Run: `pnpm test app/api/chat/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement minimal changes**

Parse and validate `X-Chat-User-Id` (UUIDv4), validate conversation ownership/existence (`404 conversation_not_found` when not owned/not found), persist user row before stream, capture streamed assistant text, persist assistant on completion using `clientMessageId + ":assistant"`, and return/emit the exact structured failure payloads required by the API contract.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test app/api/chat/route.test.ts`
Expected: PASS.

## Chunk 3: Client Integration

### Task 5: Add conversation sidebar and hydration

**Files:**

- Modify: `app/page.tsx`
- Create: `lib/chat-client.ts`
- Test: `lib/chat-client.test.ts`

- [ ] **Step 1: Write failing tests for client helpers**

Cover:

- stable `userId` generation and reuse
- fetch wrappers set `X-Chat-User-Id`
- payload includes `conversationId` and `clientMessageId`.

- [ ] **Step 2: Run tests to verify fail**

Run: `pnpm test lib/chat-client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement helpers and UI wiring**

Add:

- create/switch conversation list UI
- load full history when conversation changes
- send with `conversationId` and generated `clientMessageId`.
- on app load, auto-select newest conversation by `updatedAt DESC`; if none exist, create one automatically, then load its full message history.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test lib/chat-client.test.ts`
Expected: PASS.

## Chunk 4: Verification

### Task 6: Full verification and cleanup

**Files:**

- Modify: `README.md` (env setup note for `DATABASE_URL`)

- [ ] **Step 1: Run targeted tests**

Run: `pnpm test "app/api/chats/route.test.ts" "app/api/chats/[chatId]/messages/route.test.ts" "app/api/chat/route.test.ts" "lib/server/chat-store.test.ts" "lib/chat-client.test.ts"`
Expected: PASS.

- [ ] **Step 2: Run full suite and lint/typecheck**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev`
Expected:

- create conversation,
- switch conversations,
- refresh retains history,
- new message persists and reappears after reload.

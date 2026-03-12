import { neon } from "@neondatabase/serverless"
import type { UIMessage } from "ai"

import { type HeroId, isSupportedHero } from "../heroes"

export type ConversationRecord = {
  id: string
  title: string
  hero: HeroId | null
  createdAt: string
  updatedAt: string
}

export type StoredChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  parts: UIMessage["parts"]
  createdAt: string
  sequence: number
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const CHAT_USER_HEADER = "x-chat-user-id"

function createUtcConversationTitle() {
  const timestamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date())

  return `Chat ${timestamp} UTC`
}

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL on the server.")
  }

  return neon(databaseUrl)
}

export function isUuidV4(value: string | null | undefined): value is string {
  if (!value) {
    return false
  }

  return UUID_V4_PATTERN.test(value)
}

export function parseChatUserId(headers: Headers): string | null {
  const value = headers.get(CHAT_USER_HEADER)
  return isUuidV4(value) ? value : null
}

export function isValidClientMessageId(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 128
  )
}

export async function ensureChatUser(userId: string) {
  const sql = getSqlClient()

  await sql`
    insert into chat_users (id)
    values (${userId})
    on conflict (id) do nothing
  `
}

export async function listConversations(
  userId: string,
  hero?: HeroId
): Promise<ConversationRecord[]> {
  const sql = getSqlClient()

  const rows = (
    hero
      ? await sql`
        select id, title, hero, created_at, updated_at
        from conversations
        where user_id = ${userId}
          and hero = ${hero}
        order by updated_at desc
      `
      : await sql`
        select id, title, hero, created_at, updated_at
        from conversations
        where user_id = ${userId}
        order by updated_at desc
      `
  ) as Array<{
    id: string
    title: string
    hero: string | null
    created_at: string
    updated_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    hero: isSupportedHero(row.hero) ? row.hero : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function createConversation(
  userId: string,
  hero: HeroId
): Promise<ConversationRecord> {
  const sql = getSqlClient()

  const [row] = (await sql`
    insert into conversations (user_id, title, hero)
    values (
      ${userId},
      ${createUtcConversationTitle()},
      ${hero}
    )
    returning id, title, hero, created_at, updated_at
  `) as Array<{
    id: string
    title: string
    hero: string | null
    created_at: string
    updated_at: string
  }>

  return {
    id: row.id,
    title: row.title,
    hero: isSupportedHero(row.hero) ? row.hero : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getConversationHeroForUser(
  userId: string,
  conversationId: string
): Promise<HeroId | null | undefined> {
  const sql = getSqlClient()

  const [row] = (await sql`
    select hero
    from conversations
    where id = ${conversationId}
      and user_id = ${userId}
  `) as Array<{ hero: string | null }>

  if (!row) {
    return undefined
  }

  return isSupportedHero(row.hero) ? row.hero : null
}

export async function conversationExistsForUser(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const sql = getSqlClient()

  const [row] = (await sql`
    select exists(
      select 1
      from conversations
      where id = ${conversationId}
        and user_id = ${userId}
    )
  `) as Array<{ exists: boolean }>

  return row?.exists ?? false
}

export async function getConversationMessages(
  userId: string,
  conversationId: string
): Promise<StoredChatMessage[] | null> {
  const exists = await conversationExistsForUser(userId, conversationId)
  if (!exists) {
    return null
  }

  const sql = getSqlClient()
  const rows = (await sql`
    select id, role, parts, created_at, sequence
    from messages
    where conversation_id = ${conversationId}
    order by sequence asc
  `) as Array<{
    id: string
    role: "user" | "assistant" | "system"
    parts: UIMessage["parts"]
    created_at: string
    sequence: number
  }>

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: row.parts,
    createdAt: row.created_at,
    sequence: row.sequence,
  }))
}

export async function saveUserMessageIdempotent({
  conversationId,
  clientMessageId,
  parts,
}: {
  conversationId: string
  clientMessageId: string
  parts: UIMessage["parts"]
}) {
  const sql = getSqlClient()

  await sql`
    insert into messages (conversation_id, client_message_id, role, parts)
    values (${conversationId}, ${clientMessageId}, 'user', ${JSON.stringify(parts)}::jsonb)
    on conflict (conversation_id, client_message_id)
    where client_message_id is not null
    do update set parts = excluded.parts
  `
}

export async function saveAssistantMessageIdempotent({
  conversationId,
  clientMessageId,
  text,
}: {
  conversationId: string
  clientMessageId: string
  text: string
}) {
  const trimmed = text.trim()
  if (!trimmed) {
    return
  }

  const assistantClientMessageId = `${clientMessageId}:assistant`
  const sql = getSqlClient()

  await sql`
    insert into messages (conversation_id, client_message_id, role, parts)
    values (
      ${conversationId},
      ${assistantClientMessageId},
      'assistant',
      ${JSON.stringify([{ type: "text", text: trimmed }])}::jsonb
    )
    on conflict (conversation_id, client_message_id)
    where client_message_id is not null
    do update set parts = excluded.parts
  `
}

export function extractLatestUserMessageParts(
  messages: UIMessage[]
): UIMessage["parts"] | null {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")
  if (!latestUserMessage || !Array.isArray(latestUserMessage.parts)) {
    return null
  }

  return latestUserMessage.parts
}

export const CHAT_USER_HEADER = "X-Chat-User-Id"

const ANON_USER_ID_KEY = "chat-anonymous-user-id"

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidV4(value: string | null | undefined): value is string {
  if (!value) {
    return false
  }

  return UUID_V4_PATTERN.test(value)
}

export function getOrCreateAnonymousUserId(
  storage: Pick<Storage, "getItem" | "setItem">
): string {
  const existing = storage.getItem(ANON_USER_ID_KEY)
  if (isUuidV4(existing)) {
    return existing
  }

  const userId = crypto.randomUUID()
  storage.setItem(ANON_USER_ID_KEY, userId)
  return userId
}

export function buildChatHeaders(userId: string): Record<string, string> {
  return {
    [CHAT_USER_HEADER]: userId,
  }
}

export function createClientMessageId() {
  return crypto.randomUUID()
}

import { describe, expect, it, vi } from "vitest"

import {
  buildChatHeaders,
  CHAT_USER_HEADER,
  getOrCreateAnonymousUserId,
  isUuidV4,
} from "./chat-client"

describe("chat client helpers", () => {
  it("validates uuid v4 values", () => {
    expect(isUuidV4("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
    expect(isUuidV4("not-a-uuid")).toBe(false)
    expect(isUuidV4(undefined)).toBe(false)
  })

  it("reuses stored anonymous user id when valid", () => {
    const getItem = vi.fn(() => "550e8400-e29b-41d4-a716-446655440000")
    const setItem = vi.fn()

    const userId = getOrCreateAnonymousUserId({ getItem, setItem })

    expect(userId).toBe("550e8400-e29b-41d4-a716-446655440000")
    expect(setItem).not.toHaveBeenCalled()
  })

  it("creates and stores anonymous user id when missing", () => {
    const getItem = vi.fn(() => null)
    const setItem = vi.fn()
    const randomUuid = "123e4567-e89b-42d3-a456-426614174000"
    const randomUuidSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue(randomUuid)

    const userId = getOrCreateAnonymousUserId({ getItem, setItem })

    expect(userId).toBe(randomUuid)
    expect(setItem).toHaveBeenCalledWith("chat-anonymous-user-id", randomUuid)

    randomUuidSpy.mockRestore()
  })

  it("builds request headers for chat endpoints", () => {
    expect(buildChatHeaders("550e8400-e29b-41d4-a716-446655440000")).toEqual({
      [CHAT_USER_HEADER]: "550e8400-e29b-41d4-a716-446655440000",
    })
  })
})

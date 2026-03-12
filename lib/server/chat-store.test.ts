import { describe, expect, it } from "vitest"

import {
  extractLatestUserMessageParts,
  isUuidV4,
  parseChatUserId,
} from "./chat-store"

describe("chat store helpers", () => {
  it("parses valid chat user id header", () => {
    const headers = new Headers({
      "X-Chat-User-Id": "550e8400-e29b-41d4-a716-446655440000",
    })

    expect(parseChatUserId(headers)).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    )
  })

  it("rejects invalid chat user id header", () => {
    const headers = new Headers({
      "X-Chat-User-Id": "abc",
    })

    expect(parseChatUserId(headers)).toBeNull()
    expect(isUuidV4("abc")).toBe(false)
  })

  it("extracts latest user message parts", () => {
    const parts = extractLatestUserMessageParts([
      { id: "1", role: "user", parts: [{ type: "text", text: "hello" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "hi" }] },
      { id: "3", role: "user", parts: [{ type: "text", text: "latest" }] },
    ])

    expect(parts).toEqual([{ type: "text", text: "latest" }])
  })
})

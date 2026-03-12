import { describe, expect, it } from "vitest"

import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL,
  isSupportedChatModel,
} from "./chat-models"

describe("chat models", () => {
  it("uses gpt-4o as the default model", () => {
    expect(DEFAULT_CHAT_MODEL).toBe("openai/gpt-4o")
  })

  it("includes exactly the requested model options", () => {
    expect(CHAT_MODEL_OPTIONS).toEqual([
      { id: "openai/gpt-4o", label: "GPT-4o" },
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
      { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6" },
      { id: "openai/gpt-5.4", label: "GPT-5.4" },
    ])
  })

  it("accepts only supported model IDs", () => {
    expect(isSupportedChatModel("openai/gpt-4o")).toBe(true)
    expect(isSupportedChatModel("anthropic/claude-opus-4.6")).toBe(true)
    expect(isSupportedChatModel("openai/gpt-4.1")).toBe(false)
    expect(isSupportedChatModel(undefined)).toBe(false)
  })
})

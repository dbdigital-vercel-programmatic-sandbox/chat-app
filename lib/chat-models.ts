export const CHAT_MODEL_OPTIONS = [
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6" },
  { id: "openai/gpt-5.4", label: "GPT-5.4" },
] as const

export type ChatModelId = (typeof CHAT_MODEL_OPTIONS)[number]["id"]

export const DEFAULT_CHAT_MODEL: ChatModelId = "openai/gpt-4o"

export function isSupportedChatModel(value: unknown): value is ChatModelId {
  if (typeof value !== "string") {
    return false
  }

  return CHAT_MODEL_OPTIONS.some((model) => model.id === value)
}

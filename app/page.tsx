"use client"

import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BotIcon,
  MessageSquareIcon,
  PlusIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildChatHeaders,
  createClientMessageId,
  getOrCreateAnonymousUserId,
} from "@/lib/chat-client"
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL,
  type ChatModelId,
} from "@/lib/chat-models"
import { HERO_OPTIONS, type HeroId } from "@/lib/heroes"

type ConversationRecord = {
  id: string
  title: string
  hero: HeroId | null
  createdAt: string
  updatedAt: string
}

type StoredMessage = {
  id: string
  role: "user" | "assistant" | "system"
  parts: UIMessage["parts"]
}

function formatChatError(error: unknown): string {
  if (!error) {
    return "Unknown error"
  }

  const tryParseJsonMessage = (message: string) => {
    try {
      const parsed = JSON.parse(message) as {
        code?: string
        message?: string
      }

      if (parsed?.code || parsed?.message) {
        return `${parsed.code ?? "error"}: ${parsed.message ?? "Unknown error"}`
      }
    } catch {
      // Keep raw message when not JSON.
    }

    return message
  }

  const readObjectMessage = (value: unknown): string | null => {
    if (!value || typeof value !== "object") {
      return null
    }

    const record = value as Record<string, unknown>
    const code = typeof record.code === "string" ? record.code : null
    const message = typeof record.message === "string" ? record.message : null

    if (code || message) {
      return `${code ?? "error"}: ${message ?? "Unknown error"}`
    }

    if (record.cause) {
      const causeMessage = readObjectMessage(record.cause)
      if (causeMessage) {
        return causeMessage
      }
    }

    return null
  }

  if (error instanceof Error) {
    if (error.message?.trim()) {
      return tryParseJsonMessage(error.message)
    }

    const withCause = error as Error & { cause?: unknown }
    if (withCause.cause instanceof Error && withCause.cause.message) {
      return withCause.cause.message
    }

    const objectMessage = readObjectMessage(withCause.cause)
    if (objectMessage) {
      return objectMessage
    }

    return error.name || "Unknown error"
  }

  const objectMessage = readObjectMessage(error)
  if (objectMessage) {
    return objectMessage
  }

  if (typeof error === "string" && error.trim()) {
    return tryParseJsonMessage(error)
  }

  return "Unknown error"
}

async function listChats(userId: string, hero: HeroId) {
  const response = await fetch(`/api/chats?hero=${hero}`, {
    headers: buildChatHeaders(userId),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to load conversations")
  }

  const payload = (await response.json()) as {
    conversations: ConversationRecord[]
  }
  return payload.conversations
}

async function createChat(userId: string, hero: HeroId) {
  const response = await fetch("/api/chats", {
    method: "POST",
    headers: {
      ...buildChatHeaders(userId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hero }),
  })

  if (!response.ok) {
    throw new Error("Failed to create conversation")
  }

  const payload = (await response.json()) as {
    conversation: ConversationRecord
  }
  return payload.conversation
}

async function loadMessages(userId: string, chatId: string) {
  const response = await fetch(`/api/chats/${chatId}/messages`, {
    headers: buildChatHeaders(userId),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to load messages")
  }

  const payload = (await response.json()) as { messages: StoredMessage[] }
  return payload.messages
}

export default function Page() {
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedHero, setSelectedHero] = useState<HeroId | null>(null)
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [chatErrorDetails, setChatErrorDetails] = useState<string | null>(null)

  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    onError: (chatError) => {
      console.error("[chat-ui-error]", chatError)
      setChatErrorDetails(formatChatError(chatError))
    },
  })

  const isSending = status === "submitted" || status === "streaming"
  const canSubmit = Boolean(
    userId && selectedConversationId && selectedHero && !isBootstrapping
  )

  const refreshConversations = useCallback(
    async (nextUserId: string, hero: HeroId) => {
      const items = await listChats(nextUserId, hero)
      setConversations(items)
      return items
    },
    [setConversations]
  )

  const hydrateConversationMessages = useCallback(
    async (nextUserId: string, conversationId: string) => {
      const storedMessages = await loadMessages(nextUserId, conversationId)

      setMessages(
        storedMessages.map((message) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
        }))
      )
    },
    [setMessages]
  )

  useEffect(() => {
    let active = true

    async function bootstrap() {
      const nextUserId = getOrCreateAnonymousUserId(window.localStorage)
      if (!active) {
        return
      }

      setUserId(nextUserId)
    }

    bootstrap()
      .catch((setupError) => {
        console.error(setupError)
      })
      .finally(() => {
        if (active) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const selectHero = useCallback(
    async (hero: HeroId) => {
      if (!userId) {
        return
      }

      setChatErrorDetails(null)
      setIsBootstrapping(true)
      setMessages([])
      setSelectedConversationId(null)
      setConversations([])

      try {
        const items = await listChats(userId, hero)

        if (items.length > 0) {
          setConversations(items)
          setSelectedConversationId(items[0].id)
          setSelectedHero(hero)
          return
        }

        const createdConversation = await createChat(userId, hero)
        setConversations([createdConversation])
        setSelectedConversationId(createdConversation.id)
        setSelectedHero(hero)
      } finally {
        setIsBootstrapping(false)
      }
    },
    [userId, setMessages]
  )

  useEffect(() => {
    if (!userId || !selectedConversationId) {
      return
    }

    let active = true

    hydrateConversationMessages(userId, selectedConversationId)
      .then(() => {
        if (!active) {
          return
        }
      })
      .catch((loadError) => {
        console.error(loadError)
      })

    return () => {
      active = false
    }
  }, [hydrateConversationMessages, selectedConversationId, userId])

  const selectedConversationLabel = useMemo(() => {
    return conversations.find(
      (conversation) => conversation.id === selectedConversationId
    )?.title
  }, [conversations, selectedConversationId])

  if (!selectedHero) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Chat with your superhero</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pick who you want to chat with.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {HERO_OPTIONS.map((hero) => (
              <Button
                className="h-auto flex-col items-start gap-2 p-4 text-left"
                disabled={!userId || isBootstrapping}
                key={hero.id}
                onClick={() => {
                  selectHero(hero.id).catch((error) => {
                    console.error(error)
                    setChatErrorDetails(formatChatError(error))
                    setIsBootstrapping(false)
                  })
                }}
                variant="outline"
              >
                <span className="text-base font-semibold">{hero.label}</span>
                <span className="text-xs text-muted-foreground">
                  {hero.blurb}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {chatErrorDetails ? (
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>Could not load hero chat</AlertTitle>
            <AlertDescription>{chatErrorDetails}</AlertDescription>
          </Alert>
        ) : null}
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:px-8">
      <Card className="w-full md:w-72 md:shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversations</CardTitle>
          <Button
            className="mt-2 w-fit"
            onClick={() => {
              setSelectedHero(null)
              setConversations([])
              setSelectedConversationId(null)
              setMessages([])
            }}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon className="size-4" />
            Heroes
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            disabled={!userId || isBootstrapping || !selectedHero}
            onClick={async () => {
              if (!userId || !selectedHero) {
                return
              }

              const conversation = await createChat(userId, selectedHero)
              setConversations((previous) => [conversation, ...previous])
              setSelectedConversationId(conversation.id)
              setMessages([])
            }}
            variant="secondary"
          >
            <PlusIcon className="size-4" />
            New chat
          </Button>

          <div className="flex max-h-[50svh] flex-col gap-2 overflow-y-auto pr-1 md:max-h-[70svh]">
            {conversations.map((conversation) => {
              const isActive = conversation.id === selectedConversationId

              return (
                <Button
                  className="justify-start truncate"
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  variant={isActive ? "default" : "ghost"}
                >
                  <MessageSquareIcon className="size-4" />
                  <span className="truncate">{conversation.title}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-[72svh] flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4">
          <header className="space-y-1 pb-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Chat with{" "}
              {HERO_OPTIONS.find((hero) => hero.id === selectedHero)?.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedConversationLabel ?? "Loading conversation..."}
            </p>
          </header>

          {error || chatErrorDetails ? (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Chat request failed</AlertTitle>
              <AlertDescription>
                {chatErrorDetails ?? formatChatError(error)}
              </AlertDescription>
            </Alert>
          ) : null}

          <Conversation>
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<BotIcon className="size-5" />}
                  title="Start chatting"
                  description="Messages in this conversation are stored in Neon."
                />
              ) : null}

              {messages.map((message) => {
                const renderedParts = message.parts
                  .map((part, index) => {
                    if (part.type !== "text") {
                      return null
                    }

                    if (part.text.trim().length === 0) {
                      return null
                    }

                    return (
                      <MessageResponse key={`${message.id}-${index}`}>
                        {part.text}
                      </MessageResponse>
                    )
                  })
                  .filter(Boolean)

                if (renderedParts.length === 0) {
                  return null
                }

                return (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>{renderedParts}</MessageContent>
                  </Message>
                )
              })}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <PromptInput
            onSubmit={async ({ text }) => {
              const trimmed = text.trim()
              if (!trimmed || !selectedConversationId || !userId) {
                return
              }

              setChatErrorDetails(null)

              try {
                await sendMessage(
                  { text: trimmed },
                  {
                    headers: buildChatHeaders(userId),
                    body: {
                      model,
                      conversationId: selectedConversationId,
                      clientMessageId: createClientMessageId(),
                    },
                  }
                )

                await refreshConversations(userId, selectedHero)
                await hydrateConversationMessages(
                  userId,
                  selectedConversationId
                )
              } catch (sendError) {
                console.error("[chat-send-error]", sendError)
                setChatErrorDetails(formatChatError(sendError))

                await hydrateConversationMessages(
                  userId,
                  selectedConversationId
                )
              }
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                disabled={isSending || !canSubmit}
                placeholder="Type your message..."
              />
            </PromptInputBody>

            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputSelect
                  disabled={isSending || !canSubmit}
                  onValueChange={(value) => setModel(value as ChatModelId)}
                  value={model}
                >
                  <PromptInputSelectTrigger className="w-[200px]">
                    <PromptInputSelectValue />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {CHAT_MODEL_OPTIONS.map((chatModel) => (
                      <PromptInputSelectItem
                        key={chatModel.id}
                        value={chatModel.id}
                      >
                        {chatModel.label}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>

              <PromptInputSubmit onStop={stop} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </CardContent>
      </Card>
    </main>
  )
}

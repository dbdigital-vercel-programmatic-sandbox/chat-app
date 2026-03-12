"use client"

import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import Image from "next/image"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BotIcon,
  CrownIcon,
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
import {
  createHeroImageState,
  nextHeroImageState,
  type HeroImageState,
} from "@/lib/hero-image-state"
import { getHeroById, HERO_OPTIONS, type HeroId } from "@/lib/heroes"
import { cn } from "@/lib/utils"

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

const IMAGE_TIMEOUT_MS = 8_000

function createInitialHeroImageStates(): Record<HeroId, HeroImageState> {
  return HERO_OPTIONS.reduce(
    (accumulator, hero) => {
      accumulator[hero.id] = createHeroImageState()
      return accumulator
    },
    {} as Record<HeroId, HeroImageState>
  )
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
  const [heroImageStates, setHeroImageStates] = useState<
    Record<HeroId, HeroImageState>
  >(() => createInitialHeroImageStates())
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

  const selectedHeroMeta = useMemo(() => {
    return selectedHero ? getHeroById(selectedHero) : null
  }, [selectedHero])

  useEffect(() => {
    const timeoutIds = HERO_OPTIONS.map((hero) => {
      if (heroImageStates[hero.id].status !== "loading") {
        return null
      }

      return window.setTimeout(() => {
        setHeroImageStates((current) => ({
          ...current,
          [hero.id]: nextHeroImageState(current[hero.id], "timeout"),
        }))
      }, IMAGE_TIMEOUT_MS)
    })

    return () => {
      timeoutIds.forEach((timeoutId) => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
      })
    }
  }, [heroImageStates])

  const setHeroImageEvent = useCallback(
    (heroId: HeroId, event: "load" | "error") => {
      setHeroImageStates((current) => ({
        ...current,
        [heroId]: nextHeroImageState(current[heroId], event),
      }))
    },
    []
  )

  if (!selectedHero) {
    return (
      <main className="cinematic-bg mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <header className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/35 p-6 backdrop-blur-sm md:p-9">
          <p className="text-xs tracking-[0.32em] text-white/70 uppercase">
            Superhero Chat
          </p>
          <h1 className="mt-3 [font-family:var(--font-display)] text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Choose Your Champion
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
            Enter a cinematic chat experience with your hero. Each profile has a
            custom visual atmosphere and personality.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          {HERO_OPTIONS.map((hero) => {
            const imageState = heroImageStates[hero.id]
            const imageSrc =
              imageState.status === "failed"
                ? hero.fallbackImage
                : hero.imageUrl

            return (
              <button
                className={cn(
                  "group relative isolate h-[29rem] overflow-hidden rounded-3xl border border-white/20 text-left transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none md:h-[32rem]",
                  "hover:-translate-y-1.5 hover:scale-[1.02] hover:border-white/40",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
                disabled={!userId || isBootstrapping}
                key={hero.id}
                onClick={() => {
                  selectHero(hero.id).catch((error) => {
                    console.error(error)
                    setChatErrorDetails(formatChatError(error))
                    setIsBootstrapping(false)
                  })
                }}
                type="button"
              >
                <Image
                  alt={hero.label}
                  className="object-cover transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                  fill
                  onError={() => setHeroImageEvent(hero.id, "error")}
                  onLoad={() => setHeroImageEvent(hero.id, "load")}
                  priority
                  sizes="(max-width: 768px) 100vw, 33vw"
                  src={imageSrc}
                />

                <div
                  className="absolute inset-0"
                  style={{ background: hero.overlayGradient }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
                <div
                  className="absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100"
                  style={{ boxShadow: `inset 0 0 160px ${hero.accent}66` }}
                />

                <div className="absolute bottom-0 z-10 w-full p-5 md:p-6">
                  <p className="text-xs tracking-[0.3em] text-white/65 uppercase">
                    {hero.tagline}
                  </p>
                  <h2 className="mt-2 [font-family:var(--font-display)] text-3xl font-semibold text-white">
                    {hero.label}
                  </h2>
                  <p className="mt-2 text-sm text-white/75">{hero.blurb}</p>
                  <p className="mt-4 text-xs tracking-[0.24em] text-white/85 uppercase">
                    Enter Chat
                  </p>

                  {imageState.status === "failed" ? (
                    <p className="mt-3 text-xs text-white/70">
                      Using fallback artwork due to network/image error.
                    </p>
                  ) : null}
                </div>
              </button>
            )
          })}
        </section>

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
    <main className="cinematic-bg mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:px-8">
      <Card className="w-full border-white/15 bg-black/45 text-white backdrop-blur-sm md:w-80 md:shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base tracking-wide text-white/90 uppercase">
            Mission Log
          </CardTitle>
          <Button
            className="mt-2 w-fit border-white/20 bg-white/5 text-white hover:bg-white/12"
            onClick={() => {
              setSelectedHero(null)
              setConversations([])
              setSelectedConversationId(null)
              setMessages([])
            }}
            size="sm"
            variant="outline"
          >
            <ArrowLeftIcon className="size-4" />
            Heroes
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full border-white/25 bg-white/10 text-white hover:bg-white/20"
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
                  className={cn(
                    "justify-start truncate border border-transparent text-white/90",
                    isActive
                      ? "border-white/25 bg-white/20 text-white"
                      : "bg-transparent hover:bg-white/10"
                  )}
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  variant="ghost"
                >
                  <MessageSquareIcon className="size-4" />
                  <span className="truncate">{conversation.title}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-[72svh] flex-1 flex-col overflow-hidden border-white/15 bg-black/55 backdrop-blur-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4">
          <header className="relative overflow-hidden rounded-2xl border border-white/15 p-4 md:p-6">
            {selectedHeroMeta ? (
              <Image
                alt={`${selectedHeroMeta.label} banner`}
                className="object-cover"
                fill
                onError={() => setHeroImageEvent(selectedHeroMeta.id, "error")}
                onLoad={() => setHeroImageEvent(selectedHeroMeta.id, "load")}
                sizes="(max-width: 768px) 100vw, 70vw"
                src={
                  heroImageStates[selectedHeroMeta.id].status === "failed"
                    ? selectedHeroMeta.fallbackImage
                    : selectedHeroMeta.imageUrl
                }
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/35" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs tracking-[0.26em] text-white/70 uppercase">
                  Active Hero
                </p>
                <h1 className="[font-family:var(--font-display)] text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Chat with {selectedHeroMeta?.label}
                </h1>
                <p className="text-xs text-white/70 md:text-sm">
                  {selectedHeroMeta?.tagline}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white">
                <CrownIcon className="size-3" />
                Cinematic mode
              </span>
            </div>
            <p className="relative z-10 mt-3 text-sm text-white/75">
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

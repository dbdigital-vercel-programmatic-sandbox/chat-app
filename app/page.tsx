"use client"

import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import Image from "next/image"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BotIcon,
  MenuIcon,
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
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)

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

  const handleBackToHeroes = useCallback(() => {
    setSelectedHero(null)
    setConversations([])
    setSelectedConversationId(null)
    setMessages([])
    setIsMobileSidebarOpen(false)
  }, [setMessages])

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    setIsMobileSidebarOpen(false)
  }, [])

  const handleCreateConversation = useCallback(async () => {
    if (!userId || !selectedHero || isCreatingConversation) {
      return
    }

    setIsCreatingConversation(true)
    setChatErrorDetails(null)

    try {
      const conversation = await createChat(userId, selectedHero)
      setConversations((previous) => [conversation, ...previous])
      setSelectedConversationId(conversation.id)
      setMessages([])
      setIsMobileSidebarOpen(false)
    } catch (createError) {
      setChatErrorDetails(formatChatError(createError))
    } finally {
      setIsCreatingConversation(false)
    }
  }, [isCreatingConversation, selectedHero, setMessages, userId])

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

        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {HERO_OPTIONS.map((hero) => {
            const imageState = heroImageStates[hero.id]
            const imageSrc =
              imageState.status === "failed"
                ? hero.fallbackImage
                : hero.imageUrl

            return (
              <button
                className={cn(
                  "group relative isolate h-[23rem] overflow-hidden rounded-3xl border border-white/20 text-left transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none md:h-[26rem]",
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
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
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
    <main className="cinematic-bg mx-auto flex min-h-svh w-full max-w-6xl gap-4 px-4 py-6 md:px-8">
      <aside className="hidden w-80 shrink-0 md:block md:self-stretch">
        <div className="relative flex h-full min-h-[84svh] flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/75 text-white">
          {selectedHeroMeta ? (
            <Image
              alt={`${selectedHeroMeta.label} sidebar`}
              className="object-cover"
              fill
              onError={() => setHeroImageEvent(selectedHeroMeta.id, "error")}
              onLoad={() => setHeroImageEvent(selectedHeroMeta.id, "load")}
              sizes="320px"
              src={
                heroImageStates[selectedHeroMeta.id].status === "failed"
                  ? selectedHeroMeta.fallbackImage
                  : selectedHeroMeta.imageUrl
              }
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/75 to-black/95" />
          <div className="relative z-10 flex h-full flex-col p-4">
            <p className="text-[11px] tracking-[0.25em] text-white/70 uppercase">
              Mission panel
            </p>
            <h2 className="mt-2 [font-family:var(--font-display)] text-4xl leading-none text-white">
              Mission Log
            </h2>
            <p className="mt-2 text-xs text-white/75">
              {selectedHeroMeta?.tagline}
            </p>

            <div className="mt-4 flex gap-2">
              <Button
                className="border-white/25 bg-black/35 text-white hover:bg-black/50"
                onClick={handleBackToHeroes}
                size="sm"
                variant="outline"
              >
                <ArrowLeftIcon className="size-4" />
                Heroes
              </Button>
              <Button
                className="flex-1 border-white/25 bg-white/12 text-white hover:bg-white/20"
                disabled={
                  !userId ||
                  isBootstrapping ||
                  !selectedHero ||
                  isCreatingConversation
                }
                onClick={handleCreateConversation}
                variant="secondary"
              >
                <PlusIcon className="size-4" />
                {isCreatingConversation ? "Creating..." : "New chat"}
              </Button>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {conversations.map((conversation) => {
                const isActive = conversation.id === selectedConversationId

                return (
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none",
                      isActive
                        ? "border-white/30 bg-white/18 text-white"
                        : "border-white/10 bg-black/28 text-white/88 hover:bg-black/40"
                    )}
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    type="button"
                  >
                    <MessageSquareIcon className="mt-0.5 size-4 shrink-0" />
                    <span className="truncate text-sm">
                      {conversation.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </aside>

      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[88vw] border-white/10 bg-transparent p-0 sm:max-w-[360px]"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Chats</SheetTitle>
          </SheetHeader>
          <div className="h-full p-4">
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/75 text-white">
              {selectedHeroMeta ? (
                <Image
                  alt={`${selectedHeroMeta.label} sidebar`}
                  className="object-cover"
                  fill
                  onError={() =>
                    setHeroImageEvent(selectedHeroMeta.id, "error")
                  }
                  onLoad={() => setHeroImageEvent(selectedHeroMeta.id, "load")}
                  sizes="(max-width: 768px) 88vw, 360px"
                  src={
                    heroImageStates[selectedHeroMeta.id].status === "failed"
                      ? selectedHeroMeta.fallbackImage
                      : selectedHeroMeta.imageUrl
                  }
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/75 to-black/95" />
              <div className="relative z-10 flex h-full flex-col p-4">
                <p className="text-[11px] tracking-[0.24em] text-white/70 uppercase">
                  Mission panel
                </p>
                <h2 className="mt-2 [font-family:var(--font-display)] text-4xl leading-none text-white">
                  Mission Log
                </h2>

                <div className="mt-4 flex gap-2">
                  <Button
                    className="border-white/25 bg-black/35 text-white hover:bg-black/50"
                    onClick={handleBackToHeroes}
                    size="sm"
                    variant="outline"
                  >
                    <ArrowLeftIcon className="size-4" />
                    Heroes
                  </Button>
                  <Button
                    className="flex-1 border-white/25 bg-white/12 text-white hover:bg-white/20"
                    disabled={
                      !userId ||
                      isBootstrapping ||
                      !selectedHero ||
                      isCreatingConversation
                    }
                    onClick={handleCreateConversation}
                    variant="secondary"
                  >
                    <PlusIcon className="size-4" />
                    {isCreatingConversation ? "Creating..." : "New chat"}
                  </Button>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {conversations.map((conversation) => {
                    const isActive = conversation.id === selectedConversationId

                    return (
                      <button
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none",
                          isActive
                            ? "border-white/30 bg-white/18 text-white"
                            : "border-white/10 bg-black/28 text-white/88 hover:bg-black/40"
                        )}
                        key={conversation.id}
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                        type="button"
                      >
                        <MessageSquareIcon className="mt-0.5 size-4 shrink-0" />
                        <span className="truncate text-sm">
                          {conversation.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Card className="flex min-h-[84svh] flex-1 flex-col overflow-hidden border-white/15 bg-black/65 backdrop-blur-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4">
          <header className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.2em] text-white/65 uppercase">
                Active hero
              </p>
              <h1 className="truncate [font-family:var(--font-display)] text-3xl leading-none text-white">
                {selectedHeroMeta?.label}
              </h1>
              <p className="truncate pt-1 text-xs text-white/75">
                {selectedConversationLabel ?? "Loading conversation..."}
              </p>
            </div>
            <Button
              className="border-white/25 bg-black/35 text-white hover:bg-black/50 md:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
              size="sm"
              variant="outline"
            >
              <MenuIcon className="size-4" />
              Chats
            </Button>
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

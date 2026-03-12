"use client"

import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import {
  AlertCircleIcon,
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

type ConversationRecord = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

type StoredMessage = {
  id: string
  role: "user" | "assistant" | "system"
  parts: UIMessage["parts"]
}

async function listChats(userId: string) {
  const response = await fetch("/api/chats", {
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

async function createChat(userId: string) {
  const response = await fetch("/api/chats", {
    method: "POST",
    headers: buildChatHeaders(userId),
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
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const { messages, setMessages, sendMessage, status, stop, error } = useChat()

  const isSending = status === "submitted" || status === "streaming"
  const canSubmit = Boolean(
    userId && selectedConversationId && !isBootstrapping
  )

  const refreshConversations = useCallback(
    async (nextUserId: string) => {
      const items = await listChats(nextUserId)
      setConversations(items)
      return items
    },
    [setConversations]
  )

  useEffect(() => {
    let active = true

    async function bootstrap() {
      const nextUserId = getOrCreateAnonymousUserId(window.localStorage)
      if (!active) {
        return
      }

      setUserId(nextUserId)

      const items = await listChats(nextUserId)
      if (!active) {
        return
      }

      if (items.length > 0) {
        setConversations(items)
        setSelectedConversationId(items[0].id)
        return
      }

      const createdConversation = await createChat(nextUserId)
      if (!active) {
        return
      }

      setConversations([createdConversation])
      setSelectedConversationId(createdConversation.id)
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

  useEffect(() => {
    if (!userId || !selectedConversationId) {
      return
    }

    let active = true

    loadMessages(userId, selectedConversationId)
      .then((storedMessages) => {
        if (!active) {
          return
        }

        setMessages(
          storedMessages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
          }))
        )
      })
      .catch((loadError) => {
        console.error(loadError)
      })

    return () => {
      active = false
    }
  }, [selectedConversationId, setMessages, userId])

  const selectedConversationLabel = useMemo(() => {
    return conversations.find(
      (conversation) => conversation.id === selectedConversationId
    )?.title
  }, [conversations, selectedConversationId])

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:px-8">
      <Card className="w-full md:w-72 md:shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            disabled={!userId || isBootstrapping}
            onClick={async () => {
              if (!userId) {
                return
              }

              const conversation = await createChat(userId)
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
              AI Chat App
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedConversationLabel ?? "Loading conversation..."}
            </p>
          </header>

          {error ? (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Chat request failed</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
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

              await refreshConversations(userId)
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

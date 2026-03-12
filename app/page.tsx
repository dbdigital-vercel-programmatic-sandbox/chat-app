"use client"

import { useChat } from "@ai-sdk/react"
import { AlertCircleIcon, BotIcon } from "lucide-react"

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
import { Card, CardContent } from "@/components/ui/card"
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL,
  type ChatModelId,
} from "@/lib/chat-models"
import { useState } from "react"

export default function Page() {
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL)
  const { messages, sendMessage, status, stop, error } = useChat()

  const isSending = status === "submitted" || status === "streaming"

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AI Chat App</h1>
        <p className="text-sm text-muted-foreground">
          Streaming chat with AI Gateway and switchable models.
        </p>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Chat request failed</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="flex min-h-[72svh] flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4">
          <Conversation>
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<BotIcon className="size-5" />}
                  title="Start chatting"
                  description="GPT-4o is selected by default."
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
              if (!trimmed) {
                return
              }

              await sendMessage(
                { text: trimmed },
                {
                  body: { model },
                }
              )
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                disabled={isSending}
                placeholder="Type your message..."
              />
            </PromptInputBody>

            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputSelect
                  disabled={isSending}
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

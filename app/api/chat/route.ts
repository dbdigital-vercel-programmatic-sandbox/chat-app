import {
  convertToModelMessages,
  createGateway,
  streamText,
  type UIMessage,
} from "ai"

import { DEFAULT_CHAT_MODEL, isSupportedChatModel } from "@/lib/chat-models"
import {
  conversationExistsForUser,
  extractLatestUserMessageParts,
  isValidClientMessageId,
  isUuidV4,
  parseChatUserId,
  saveAssistantMessageIdempotent,
  saveUserMessageIdempotent,
} from "@/lib/server/chat-store"

const gatewayApiKey = process.env.SHARED_AI_GATEWAY_API_KEY

const gateway = createGateway({
  apiKey: gatewayApiKey,
})

type ChatRequestBody = {
  messages?: UIMessage[]
  model?: string
  conversationId?: string
  clientMessageId?: string
}

export async function POST(request: Request) {
  if (!gatewayApiKey) {
    return Response.json(
      { error: "Missing SHARED_AI_GATEWAY_API_KEY on the server." },
      { status: 500 }
    )
  }

  const userId = parseChatUserId(request.headers)
  if (!userId) {
    return Response.json(
      {
        code: "invalid_user_id",
        message: "Missing or invalid X-Chat-User-Id",
        retryable: false,
      },
      { status: 400 }
    )
  }

  const body = (await request.json()) as ChatRequestBody
  const conversationId = body.conversationId
  if (!conversationId || !isUuidV4(conversationId)) {
    return Response.json(
      {
        code: "invalid_conversation_id",
        message: "conversationId is required and must be a UUID v4",
        retryable: false,
      },
      { status: 400 }
    )
  }

  if (!isValidClientMessageId(body.clientMessageId)) {
    return Response.json(
      {
        code: "invalid_request",
        message: "clientMessageId is required and must be a non-empty string",
        retryable: false,
      },
      { status: 400 }
    )
  }

  const ownsConversation = await conversationExistsForUser(
    userId,
    conversationId
  )
  if (!ownsConversation) {
    return Response.json(
      {
        code: "conversation_not_found",
        message: "Conversation not found",
        retryable: false,
      },
      { status: 404 }
    )
  }

  const latestUserMessageParts = extractLatestUserMessageParts(
    body.messages ?? []
  )
  if (!latestUserMessageParts) {
    return Response.json(
      {
        code: "invalid_request",
        message: "No user message found in request",
        retryable: false,
      },
      { status: 400 }
    )
  }

  await saveUserMessageIdempotent({
    conversationId,
    clientMessageId: body.clientMessageId,
    parts: latestUserMessageParts,
  })

  const model = isSupportedChatModel(body.model)
    ? body.model
    : DEFAULT_CHAT_MODEL

  const result = streamText({
    model: gateway(model),
    messages: await convertToModelMessages(body.messages ?? []),
    onFinish: async ({ text }) => {
      await saveAssistantMessageIdempotent({
        conversationId,
        clientMessageId: body.clientMessageId!,
        text,
      })
    },
  })

  return result.toUIMessageStreamResponse()
}

import {
  convertToModelMessages,
  createGateway,
  streamText,
  type UIMessage,
} from "ai"

import { DEFAULT_CHAT_MODEL, isSupportedChatModel } from "@/lib/chat-models"
import { getHeroSystemPrompt } from "@/lib/heroes"
import {
  extractLatestUserMessageParts,
  getConversationHeroForUser,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Unknown error"
}

function formatStreamErrorPayload(error: unknown) {
  const message = getErrorMessage(error)
  return JSON.stringify({
    code: "stream_failed",
    message,
    retryable: true,
  })
}

export async function POST(request: Request) {
  if (!gatewayApiKey) {
    return Response.json(
      {
        code: "missing_gateway_key",
        message: "Missing SHARED_AI_GATEWAY_API_KEY on the server.",
        retryable: false,
      },
      { status: 500 }
    )
  }

  try {
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

    let body: ChatRequestBody

    try {
      body = (await request.json()) as ChatRequestBody
    } catch (error) {
      return Response.json(
        {
          code: "invalid_request",
          message: `Invalid JSON payload: ${getErrorMessage(error)}`,
          retryable: false,
        },
        { status: 400 }
      )
    }

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

    const conversationHero = await getConversationHeroForUser(
      userId,
      conversationId
    )
    if (conversationHero === undefined) {
      return Response.json(
        {
          code: "conversation_not_found",
          message: "Conversation not found",
          retryable: false,
        },
        { status: 404 }
      )
    }

    if (conversationHero === null) {
      return Response.json(
        {
          code: "conversation_hero_unsupported",
          message: "Conversation hero is missing or unsupported",
          retryable: false,
        },
        { status: 409 }
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

    try {
      const model = isSupportedChatModel(body.model)
        ? body.model
        : DEFAULT_CHAT_MODEL

      const messagesWithSystemPrompt: UIMessage[] = [
        {
          id: `system:${conversationId}`,
          role: "system",
          parts: [
            { type: "text", text: getHeroSystemPrompt(conversationHero) },
          ],
        },
        ...(body.messages ?? []),
      ]

      const result = streamText({
        model: gateway(model),
        messages: await convertToModelMessages(messagesWithSystemPrompt),
        onFinish: async ({ text }) => {
          await saveAssistantMessageIdempotent({
            conversationId,
            clientMessageId: body.clientMessageId!,
            text,
          })
        },
      })

      return result.toUIMessageStreamResponse({
        onError: (error) => {
          console.error("[chat-stream-error]", error)
          return formatStreamErrorPayload(error)
        },
      })
    } catch (error) {
      console.error("[chat-stream-setup-failed]", error)
      return Response.json(
        {
          code: "chat_stream_setup_failed",
          message: getErrorMessage(error),
          retryable: true,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[chat-route-unhandled-error]", error)
    return Response.json(
      {
        code: "chat_route_failed",
        message: getErrorMessage(error),
        retryable: false,
      },
      { status: 500 }
    )
  }
}

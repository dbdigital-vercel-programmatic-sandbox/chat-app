import {
  convertToModelMessages,
  createGateway,
  streamText,
  type UIMessage,
} from "ai"

import { DEFAULT_CHAT_MODEL, isSupportedChatModel } from "@/lib/chat-models"

const gatewayApiKey = process.env.SHARED_AI_GATEWAY_API_KEY

const gateway = createGateway({
  apiKey: gatewayApiKey,
})

type ChatRequestBody = {
  messages?: UIMessage[]
  model?: string
}

export async function POST(request: Request) {
  if (!gatewayApiKey) {
    return Response.json(
      { error: "Missing SHARED_AI_GATEWAY_API_KEY on the server." },
      { status: 500 }
    )
  }

  const body = (await request.json()) as ChatRequestBody
  const model = isSupportedChatModel(body.model)
    ? body.model
    : DEFAULT_CHAT_MODEL

  const result = streamText({
    model: gateway(model),
    messages: await convertToModelMessages(body.messages ?? []),
  })

  return result.toUIMessageStreamResponse()
}

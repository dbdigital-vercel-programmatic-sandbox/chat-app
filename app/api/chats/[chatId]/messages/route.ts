import {
  getConversationMessages,
  isUuidV4,
  parseChatUserId,
} from "@/lib/server/chat-store"

type Context = {
  params: Promise<{ chatId: string }>
}

export async function GET(request: Request, context: Context) {
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

  const { chatId } = await context.params
  if (!isUuidV4(chatId)) {
    return Response.json(
      { code: "invalid_request", message: "Invalid chatId", retryable: false },
      { status: 400 }
    )
  }

  const messages = await getConversationMessages(userId, chatId)
  if (!messages) {
    return Response.json(
      {
        code: "conversation_not_found",
        message: "Conversation not found",
        retryable: false,
      },
      { status: 404 }
    )
  }

  return Response.json({ messages })
}

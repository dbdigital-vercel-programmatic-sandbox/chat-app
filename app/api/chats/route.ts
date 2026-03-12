import {
  createConversation,
  ensureChatUser,
  listConversations,
  parseChatUserId,
} from "@/lib/server/chat-store"

export async function GET(request: Request) {
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

  await ensureChatUser(userId)
  const conversations = await listConversations(userId)

  return Response.json({ conversations })
}

export async function POST(request: Request) {
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

  await ensureChatUser(userId)
  const conversation = await createConversation(userId)

  return Response.json({ conversation }, { status: 201 })
}

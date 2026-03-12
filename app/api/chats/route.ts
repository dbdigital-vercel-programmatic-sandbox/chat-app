import {
  createConversation,
  ensureChatUser,
  listConversations,
  parseChatUserId,
} from "@/lib/server/chat-store"
import { parseHero } from "@/lib/heroes"

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

  const hero = parseHero(new URL(request.url).searchParams.get("hero"))
  if (!hero) {
    return Response.json(
      {
        code: "invalid_hero",
        message: "hero query param is required and must be supported",
        retryable: false,
      },
      { status: 400 }
    )
  }

  await ensureChatUser(userId)
  const conversations = await listConversations(userId, hero)

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

  let body: { hero?: string }

  try {
    body = (await request.json()) as { hero?: string }
  } catch {
    return Response.json(
      {
        code: "invalid_request",
        message: "Invalid JSON payload",
        retryable: false,
      },
      { status: 400 }
    )
  }

  const hero = parseHero(body.hero)
  if (!hero) {
    return Response.json(
      {
        code: "invalid_hero",
        message: "hero is required and must be supported",
        retryable: false,
      },
      { status: 400 }
    )
  }

  await ensureChatUser(userId)
  const conversation = await createConversation(userId, hero)

  return Response.json({ conversation }, { status: 201 })
}

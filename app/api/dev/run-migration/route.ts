import { readFile } from "node:fs/promises"
import path from "node:path"

import { Pool } from "@neondatabase/serverless"

export const runtime = "nodejs"

export async function POST() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    return Response.json(
      {
        ok: false,
        message: "Missing DATABASE_URL on the server runtime.",
      },
      { status: 500 }
    )
  }

  const schemaPath = path.join(process.cwd(), "lib/server/chat-schema.sql")
  const pool = new Pool({ connectionString: databaseUrl })

  try {
    const schemaSql = await readFile(schemaPath, "utf8")
    await pool.query(schemaSql)

    return Response.json({
      ok: true,
      message: "Migration applied successfully.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    return Response.json(
      {
        ok: false,
        message: `Migration failed: ${message}`,
      },
      { status: 500 }
    )
  } finally {
    await pool.end()
  }
}

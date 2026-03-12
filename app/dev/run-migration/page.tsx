"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type MigrationResult = {
  ok: boolean
  message: string
}

export default function RunMigrationPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<MigrationResult | null>(null)

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Run Neon Migration</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This runs `lib/server/chat-schema.sql` against `DATABASE_URL` from
            the app runtime.
          </p>

          <Button
            disabled={isRunning}
            onClick={async () => {
              setIsRunning(true)
              setResult(null)

              try {
                const response = await fetch("/api/dev/run-migration", {
                  method: "POST",
                })

                const payload = (await response.json()) as MigrationResult
                setResult(payload)
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : "Unknown error"

                setResult({
                  ok: false,
                  message: `Request failed: ${message}`,
                })
              } finally {
                setIsRunning(false)
              }
            }}
          >
            {isRunning ? "Running..." : "Run migration"}
          </Button>

          {result ? (
            <p
              className={
                result.ok ? "text-sm text-green-600" : "text-sm text-red-600"
              }
            >
              {result.message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}

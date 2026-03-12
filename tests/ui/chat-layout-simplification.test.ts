import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("chat layout simplification", () => {
  it("uses a dedicated hero sidebar and mobile chats drawer", () => {
    const pageSource = readFileSync("app/page.tsx", "utf8")

    expect(pageSource).toContain('from "@/components/ui/sheet"')
    expect(pageSource).toContain(
      "const [isMobileSidebarOpen, setIsMobileSidebarOpen]"
    )
    expect(pageSource).toContain("Mission panel")
    expect(pageSource).toContain("open={isMobileSidebarOpen}")
    expect(pageSource).toContain('side="left"')
    expect(pageSource).toContain("bg-black/75")
    expect(pageSource).not.toContain("Cinematic mode")
  })
})

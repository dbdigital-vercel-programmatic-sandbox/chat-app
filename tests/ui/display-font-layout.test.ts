import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("layout display font", () => {
  it("uses Bebas_Neue for --font-display and removes Cinzel", () => {
    const layoutSource = readFileSync("app/layout.tsx", "utf8")

    expect(layoutSource).toContain("Bebas_Neue")
    expect(layoutSource).toContain('variable: "--font-display"')
    expect(layoutSource).not.toContain("Cinzel")
  })
})

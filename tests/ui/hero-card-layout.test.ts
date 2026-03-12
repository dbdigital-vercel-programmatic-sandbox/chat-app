import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("hero card layout", () => {
  it("uses reduced card heights for clearer artwork", () => {
    const pageSource = readFileSync("app/page.tsx", "utf8")

    expect(pageSource).toContain("h-[23rem]")
    expect(pageSource).toContain("md:h-[26rem]")
    expect(pageSource).not.toContain("h-[29rem]")
    expect(pageSource).not.toContain("md:h-[32rem]")
  })
})

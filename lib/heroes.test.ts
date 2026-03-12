import { describe, expect, it } from "vitest"

import {
  HERO_OPTIONS,
  getHeroSystemPrompt,
  isSupportedHero,
  parseHero,
} from "./heroes"

describe("heroes", () => {
  it("supports the three allowed heroes", () => {
    expect(HERO_OPTIONS.map((hero) => hero.id)).toEqual([
      "spiderman",
      "batman",
      "superman",
    ])
  })

  it("parses supported hero values", () => {
    expect(parseHero("spiderman")).toBe("spiderman")
    expect(parseHero("batman")).toBe("batman")
    expect(parseHero("superman")).toBe("superman")
  })

  it("rejects unsupported hero values", () => {
    expect(parseHero(undefined)).toBeNull()
    expect(parseHero("ironman")).toBeNull()
    expect(isSupportedHero("ironman")).toBe(false)
  })

  it("returns a distinct system prompt for each hero", () => {
    expect(getHeroSystemPrompt("spiderman")).toContain("Spider-Man")
    expect(getHeroSystemPrompt("batman")).toContain("Batman")
    expect(getHeroSystemPrompt("superman")).toContain("Superman")
  })
})

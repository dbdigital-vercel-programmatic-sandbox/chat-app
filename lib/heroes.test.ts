import { describe, expect, it } from "vitest"

import {
  HERO_OPTIONS,
  getHeroSystemPrompt,
  isSupportedHero,
  parseHero,
} from "./heroes"

describe("heroes", () => {
  it("supports the justice league hero roster", () => {
    expect(HERO_OPTIONS.map((hero) => hero.id)).toEqual([
      "superman",
      "batman",
      "wonder-woman",
      "green-lantern",
      "the-flash",
      "aquaman",
      "cyborg",
    ])
  })

  it("parses supported hero values", () => {
    expect(parseHero("superman")).toBe("superman")
    expect(parseHero("batman")).toBe("batman")
    expect(parseHero("wonder-woman")).toBe("wonder-woman")
    expect(parseHero("green-lantern")).toBe("green-lantern")
    expect(parseHero("the-flash")).toBe("the-flash")
    expect(parseHero("aquaman")).toBe("aquaman")
    expect(parseHero("cyborg")).toBe("cyborg")
  })

  it("rejects unsupported hero values", () => {
    expect(parseHero(undefined)).toBeNull()
    expect(parseHero("ironman")).toBeNull()
    expect(isSupportedHero("ironman")).toBe(false)
  })

  it("returns a distinct system prompt for each hero", () => {
    expect(getHeroSystemPrompt("superman")).toContain("Superman")
    expect(getHeroSystemPrompt("batman")).toContain("Batman")
    expect(getHeroSystemPrompt("wonder-woman")).toContain("Wonder Woman")
    expect(getHeroSystemPrompt("green-lantern")).toContain("Green Lantern")
    expect(getHeroSystemPrompt("the-flash")).toContain("The Flash")
    expect(getHeroSystemPrompt("aquaman")).toContain("Aquaman")
    expect(getHeroSystemPrompt("cyborg")).toContain("Cyborg")
  })
})

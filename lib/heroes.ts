export const HERO_OPTIONS = [
  {
    id: "spiderman",
    label: "Spider-Man",
    blurb: "Friendly neighborhood hero with heart and humor.",
  },
  {
    id: "batman",
    label: "Batman",
    blurb: "Strategic, intense detective from Gotham.",
  },
  {
    id: "superman",
    label: "Superman",
    blurb: "Hopeful, calm protector with unwavering values.",
  },
] as const

export type HeroId = (typeof HERO_OPTIONS)[number]["id"]

const HERO_ID_SET = new Set<string>(HERO_OPTIONS.map((hero) => hero.id))

const HERO_SYSTEM_PROMPTS: Record<HeroId, string> = {
  spiderman:
    "You are Spider-Man (Peter Parker). Be witty, warm, and encouraging. Keep replies practical and upbeat, use occasional light humor, and emphasize responsibility and helping others.",
  batman:
    "You are Batman (Bruce Wayne). Be concise, tactical, and analytical. Speak with calm intensity, focus on strategy and discipline, and avoid jokes unless dry and minimal.",
  superman:
    "You are Superman (Clark Kent). Be confident, kind, and hopeful. Give clear guidance, prioritize compassion and integrity, and reinforce courage and doing the right thing.",
}

export function isSupportedHero(value: unknown): value is HeroId {
  return typeof value === "string" && HERO_ID_SET.has(value)
}

export function parseHero(value: unknown): HeroId | null {
  return isSupportedHero(value) ? value : null
}

export function getHeroSystemPrompt(hero: HeroId): string {
  return HERO_SYSTEM_PROMPTS[hero]
}

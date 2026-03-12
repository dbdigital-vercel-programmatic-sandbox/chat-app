export const HERO_OPTIONS = [
  {
    id: "spiderman",
    label: "Spider-Man",
    blurb: "Friendly neighborhood hero with heart and humor.",
    tagline: "Swing Into The Skyline",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/thumb/2/21/Web_of_Spider-Man_Vol_1_129-1.png/640px-Web_of_Spider-Man_Vol_1_129-1.png",
    fallbackImage: "/heroes/spiderman-fallback.svg",
    accent: "#ff3b30",
    overlayGradient:
      "linear-gradient(170deg, rgba(123,14,18,0.1) 0%, rgba(16,16,18,0.88) 60%)",
  },
  {
    id: "batman",
    label: "Batman",
    blurb: "Strategic, intense detective from Gotham.",
    tagline: "Own The Night",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/c/c7/Batman_Infobox.jpg",
    fallbackImage: "/heroes/batman-fallback.svg",
    accent: "#f0c15b",
    overlayGradient:
      "linear-gradient(170deg, rgba(70,58,34,0.16) 0%, rgba(10,10,11,0.9) 62%)",
  },
  {
    id: "superman",
    label: "Superman",
    blurb: "Hopeful, calm protector with unwavering values.",
    tagline: "Rise Above The Storm",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/thumb/3/35/Supermanflying.png/640px-Supermanflying.png",
    fallbackImage: "/heroes/superman-fallback.svg",
    accent: "#45a6ff",
    overlayGradient:
      "linear-gradient(170deg, rgba(16,78,136,0.14) 0%, rgba(9,11,20,0.88) 62%)",
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

export function getHeroById(heroId: HeroId) {
  return HERO_OPTIONS.find((hero) => hero.id === heroId)
}

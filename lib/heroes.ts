export const HERO_OPTIONS = [
  {
    id: "superman",
    label: "Superman",
    blurb: "Hopeful, calm protector with unwavering values.",
    tagline: "Rise Above The Storm",
    imageUrl:
      "https://static.dc.com/2023-02/Char_WhosWho_Superman_20190116_5c3fc71f524f38.28405711.jpg",
    fallbackImage: "/heroes/superman-fallback.svg",
    accent: "#45a6ff",
    overlayGradient:
      "linear-gradient(170deg, rgba(16,78,136,0.14) 0%, rgba(9,11,20,0.88) 62%)",
  },
  {
    id: "batman",
    label: "Batman",
    blurb: "Strategic, intense detective from Gotham.",
    tagline: "Own The Night",
    imageUrl:
      "https://static.dc.com/2023-02/Char_WhosWho_Batman_20190116_5c3fc4b40faf04.59002472.jpg",
    fallbackImage: "/heroes/batman-fallback.svg",
    accent: "#f0c15b",
    overlayGradient:
      "linear-gradient(170deg, rgba(70,58,34,0.16) 0%, rgba(10,10,11,0.9) 62%)",
  },
  {
    id: "wonder-woman",
    label: "Wonder Woman",
    blurb: "Fearless warrior diplomat driven by truth and justice.",
    tagline: "Lead With Courage",
    imageUrl:
      "https://static.dc.com/2023-02/Char_WhosWho_WonderWoman_20190116_5c3fc6aa51d124.25659603.jpg",
    fallbackImage: "/heroes/superman-fallback.svg",
    accent: "#f64f4f",
    overlayGradient:
      "linear-gradient(170deg, rgba(133,34,35,0.15) 0%, rgba(18,8,10,0.9) 64%)",
  },
  {
    id: "green-lantern",
    label: "Green Lantern",
    blurb: "Willpower-powered guardian who thrives under pressure.",
    tagline: "Will Is The Weapon",
    imageUrl:
      "https://static.dc.com/2023-02/Char_WhosWho_GreenLantern20200721_5f173adcedb982.94529743.jpg",
    fallbackImage: "/heroes/superman-fallback.svg",
    accent: "#38d66b",
    overlayGradient:
      "linear-gradient(170deg, rgba(12,84,44,0.16) 0%, rgba(6,20,10,0.9) 64%)",
  },
  {
    id: "the-flash",
    label: "The Flash",
    blurb: "Fastest man alive with relentless optimism and momentum.",
    tagline: "Outrun The Impossible",
    imageUrl:
      "https://static.dc.com/2023-02/Char_WhosWho_Flash_20190116_5c3fcadbc6a963.74676553.jpg",
    fallbackImage: "/heroes/superman-fallback.svg",
    accent: "#ff9b1f",
    overlayGradient:
      "linear-gradient(170deg, rgba(150,54,8,0.16) 0%, rgba(24,8,4,0.9) 64%)",
  },
  {
    id: "aquaman",
    label: "Aquaman",
    blurb: "Ocean-forged king balancing might, duty, and diplomacy.",
    tagline: "Rule The Depths",
    imageUrl:
      "https://static.dc.com/2023-02/Char_WhosWho_Aquaman_5c411a95e710b9.62155274.jpg",
    fallbackImage: "/heroes/superman-fallback.svg",
    accent: "#2bd3ff",
    overlayGradient:
      "linear-gradient(170deg, rgba(17,90,104,0.16) 0%, rgba(8,17,24,0.9) 64%)",
  },
  {
    id: "cyborg",
    label: "Cyborg",
    blurb: "Half human, half machine tactician connected to any system.",
    tagline: "Power Meets Precision",
    imageUrl:
      "https://static.dc.com/2023-02/Char_WhosWho_Cyborg_20190116_5c3fcd9048a1a2.67778180.jpg",
    fallbackImage: "/heroes/superman-fallback.svg",
    accent: "#ff5a4f",
    overlayGradient:
      "linear-gradient(170deg, rgba(93,97,110,0.2) 0%, rgba(8,9,13,0.92) 66%)",
  },
] as const

export type HeroId = (typeof HERO_OPTIONS)[number]["id"]

const HERO_ID_SET = new Set<string>(HERO_OPTIONS.map((hero) => hero.id))

const HERO_SYSTEM_PROMPTS: Record<HeroId, string> = {
  superman:
    "You are Superman (Clark Kent). Be confident, kind, and hopeful. Give clear guidance, prioritize compassion and integrity, and reinforce courage and doing the right thing.",
  batman:
    "You are Batman (Bruce Wayne). Be concise, tactical, and analytical. Speak with calm intensity, focus on strategy and discipline, and avoid jokes unless dry and minimal.",
  "wonder-woman":
    "You are Wonder Woman (Diana Prince). Be wise, direct, and compassionate. Lead with truth, courage, and empathy while encouraging honorable action.",
  "green-lantern":
    "You are Green Lantern (Hal Jordan). Be bold, focused, and encouraging. Emphasize willpower, discipline under pressure, and practical action.",
  "the-flash":
    "You are The Flash (Barry Allen). Be energetic, positive, and thoughtful. Explain clearly, move quickly to solutions, and keep an optimistic tone.",
  aquaman:
    "You are Aquaman (Arthur Curry). Be grounded, decisive, and protective. Balance strength with diplomacy and speak with calm authority.",
  cyborg:
    "You are Cyborg (Victor Stone). Be precise, strategic, and supportive. Blend technical clarity with humanity and teamwork.",
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

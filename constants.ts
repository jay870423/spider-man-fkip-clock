import { CharacterId, CharacterIdEnum, ThemeConfig } from './types';

export const THEMES: Record<CharacterId, ThemeConfig> = {
  [CharacterIdEnum.JUDY]: {
    id: CharacterIdEnum.JUDY,
    name: "Judy Hopps",
    role: "ZPD Officer",
    primaryColor: "bg-[#1a237e]", // Deep indigo/blue
    secondaryColor: "bg-[#283593]",
    accentColor: "text-pink-400",
    bgGradient: "from-[#0d1b45] via-[#1a237e] to-[#311b92]",
    animationClass: "animate-flip-down",
    avatarUrl: "https://picsum.photos/id/64/200/200", 
    emoji: "🐰",
    quotePrompt: "You are Judy Hopps. Enthusiastic, optimistic cop. Keep replies short (max 20 words) and energetic."
  },
  [CharacterIdEnum.NICK]: {
    id: CharacterIdEnum.NICK,
    name: "Nick Wilde",
    role: "Hustler",
    primaryColor: "bg-[#bf360c]", // Deep burnt orange
    secondaryColor: "bg-[#d84315]",
    accentColor: "text-yellow-300",
    bgGradient: "from-[#3e2723] via-[#bf360c] to-[#e65100]",
    animationClass: "animate-flip-down",
    avatarUrl: "https://picsum.photos/id/1025/200/200",
    emoji: "🦊",
    quotePrompt: "You are Nick Wilde. Sly, charming, cynical fox. Keep replies short (max 20 words), witty, and cool."
  },
  [CharacterIdEnum.FLASH]: {
    id: CharacterIdEnum.FLASH,
    name: "Flash",
    role: "DMV Specialist",
    primaryColor: "bg-[#3e2723]", // Very dark brown/stone
    secondaryColor: "bg-[#4e342e]",
    accentColor: "text-emerald-400",
    bgGradient: "from-[#1b1b1b] via-[#3e2723] to-[#212121]",
    animationClass: "animate-flip-down-slow",
    avatarUrl: "https://picsum.photos/id/237/200/200",
    emoji: "🦥",
    quotePrompt: "You are Flash the Sloth. You speak... very... slowly... Keep replies extremely short (3-5 words) with many ellipses."
  }
};
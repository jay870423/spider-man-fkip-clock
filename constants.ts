
import { CharacterId, CharacterIdEnum, ThemeConfig } from './types';

export const THEMES: Record<CharacterId, ThemeConfig> = {
  [CharacterIdEnum.JUDY]: {
    id: CharacterIdEnum.JUDY,
    name: "Judy Hopps",
    role: "ZPD Officer",
    primaryColor: "bg-[#1a237e]", 
    secondaryColor: "bg-[#283593]",
    accentColor: "text-pink-400",
    bgGradient: "from-[#0d1b45] via-[#1a237e] to-[#311b92]",
    animationClass: "animate-flip-down",
    avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Judy&backgroundColor=b6e3f4", 
    emoji: "🐰",
    quotePrompt: "You are Judy Hopps. Enthusiastic, optimistic cop. Keep replies energetic and friendly."
  },
  [CharacterIdEnum.NICK]: {
    id: CharacterIdEnum.NICK,
    name: "Nick Wilde",
    role: "Hustler",
    primaryColor: "bg-[#bf360c]", 
    secondaryColor: "bg-[#d84315]",
    accentColor: "text-yellow-300",
    bgGradient: "from-[#3e2723] via-[#bf360c] to-[#e65100]",
    animationClass: "animate-flip-down",
    avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Nick&backgroundColor=b6e3f4",
    emoji: "🦊",
    quotePrompt: "You are Nick Wilde. Sly, charming fox. Keep replies witty and cool."
  },
  [CharacterIdEnum.FLASH]: {
    id: CharacterIdEnum.FLASH,
    name: "Flash",
    role: "DMV Specialist",
    primaryColor: "bg-[#3e2723]", 
    secondaryColor: "bg-[#4e342e]",
    accentColor: "text-emerald-400",
    bgGradient: "from-[#1b1b1b] via-[#3e2723] to-[#212121]",
    animationClass: "animate-flip-down-slow",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Flash&backgroundColor=b6e3f4",
    emoji: "🦥",
    quotePrompt: "You are Flash the Sloth. You speak... very... slowly... with many ellipses."
  }
};


export enum CharacterIdEnum {
  JUDY = 'JUDY',
  NICK = 'NICK',
  FLASH = 'FLASH'
}

export type CharacterId = CharacterIdEnum | string;

export type AIProvider = 'GEMINI' | 'DEEPSEEK';

export type MoodType = 'neutral' | 'calm' | 'cheerful' | 'focus' | 'supportive';

export interface ThemeConfig {
  id: CharacterId;
  name: string;
  role: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgGradient: string;
  animationClass: string;
  avatarUrl: string;
  quotePrompt: string;
  emoji: string;
}

export interface TimeState {
  hours: string;
  minutes: string;
  seconds: string;
  ampm: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string; // New: Supports AI generated images
}

export interface Alarm {
  id: string;
  time: string;
  soundType: 'digital' | 'nature' | 'energetic' | 'classical';
  isActive: boolean;
}

export interface StreamUpdate {
  textChunk?: string;
  fullText?: string;
  nextCharacterId?: CharacterId;
  alarmConfig?: {
    time?: string;
    soundType?: string;
  };
  imagePrompt?: string; // New: Request to generate image
  generatedImageUrl?: string; // New: The final image
  moodMusic?: MoodType; // New: Update background music mood
  stopAlarm?: boolean;
  isComplete?: boolean;
}

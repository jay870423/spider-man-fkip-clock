
export enum CharacterIdEnum {
  JUDY = 'JUDY',
  NICK = 'NICK',
  FLASH = 'FLASH'
}

export type CharacterId = CharacterIdEnum | string;

export type AIProvider = 'GEMINI' | 'DEEPSEEK';

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
}

export interface Alarm {
  id: string;
  time: string; // HH:mm 24-hour format
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
  stopAlarm?: boolean;
  isComplete?: boolean;
}

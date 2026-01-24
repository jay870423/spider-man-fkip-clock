
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

export interface MusicMetadata {
  title: string;
  artist: string;
  mood: MoodType;
  externalUrl?: string; // New: Link to real music platforms
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string; 
  music?: MusicMetadata;
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
  musicSuggestion?: MusicMetadata;
  moodMusic?: MoodType; 
  stopAlarm?: boolean;
  isComplete?: boolean;
}


import { GoogleGenAI, Chat, Type, Part } from "@google/genai";
import { ThemeConfig, StreamUpdate, MoodType } from "../types";

/**
 * GLOBAL FETCH INTERCEPTOR (ROBUST IMPLEMENTATION)
 */
if (typeof window !== 'undefined' && !(window as any)._fetchIntercepted) {
  try {
    const originalFetch = window.fetch.bind(window);
    (window as any)._fetchIntercepted = true;
    
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: async (resource: RequestInfo | URL, config?: RequestInit) => {
        const url = typeof resource === 'string' ? resource : resource instanceof URL ? resource.href : (resource as Request).url;
        
        if (url.includes('generativelanguage.googleapis.com')) {
          const newUrl = url.replace('https://generativelanguage.googleapis.com', `${window.location.origin}/google-proxy`);
          return originalFetch(newUrl, config);
        }
        return originalFetch(resource, config);
      }
    });
  } catch (e) {
    console.warn("Global fetch intercept failed, falling back to baseUrl config:", e);
  }
}

let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

const getAiClient = () => {
  const isBrowser = typeof window !== 'undefined';
  const config: any = { 
    apiKey: process.env.API_KEY || ''
  };

  if (isBrowser) {
    config.baseUrl = `${window.location.origin}/google-proxy`;
  }

  return new GoogleGenAI(config);
};

// Helper to detect Chinese characters
const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

export async function* sendMessageToCharacterStream(theme: ThemeConfig, userMessage: string): AsyncGenerator<StreamUpdate, void, unknown> {
    if (!process.env.API_KEY) {
      yield { textChunk: "Error: API_KEY is missing. Please set it in your environment variables.", isComplete: true };
      return;
    }

    const client = getAiClient();
    
    if (!chatSession || currentThemeId !== theme.id) {
      currentThemeId = theme.id;
      chatSession = client.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `SYSTEM INSTRUCTIONS: 
          - Identity: You are ${theme.name} from Zootopia. ${theme.quotePrompt}.
          
          CORE RULES:
          1. COMPANIONSHIP: Be friendly, witty, and helpful.
          2. LANGUAGE: Detect user language. Reply in the SAME language.
          3. MEDIA & PLATFORMS (CRITICAL): 
             - For CHINESE users: Suggest music/media from Baidu Music (Taihe), QQ Music, or Kugou.
             - For INTERNATIONAL users: Suggest music, movies, or videos ONLY from YouTube.
          4. TOOL USE: Use 'provideMusic' for both music and video/movie recommendations. Use 'setAlarm' for clocks.
          5. NO DUPLICATION: Do NOT repeat the song/movie name or description after the tool executes. Do NOT say "I will now search for..." or "Here is the result...". Let the tool output speak for itself with a very brief (max 1 sentence) intro.`,
          tools: [{ functionDeclarations: [
            {
                name: "provideMusic",
                description: "Suggest a real song, movie, or video. Use YouTube for international and Chinese platforms for Chinese users.",
                parameters: { 
                  type: Type.OBJECT, 
                  properties: { 
                    title: { type: Type.STRING },
                    artist: { type: Type.STRING, description: "Artist or Movie Director/Studio" },
                    mood: { type: Type.STRING, enum: ["neutral", "calm", "cheerful", "focus", "supportive"] },
                    externalUrl: { type: Type.STRING, description: "Direct link to the media on the appropriate platform." }
                  }, 
                  required: ["title", "artist", "mood"] 
                }
            },
            {
                name: "setAlarm",
                description: "Set a flip clock alarm.",
                parameters: { 
                  type: Type.OBJECT, 
                  properties: { 
                    time: { type: Type.STRING, description: "HH:mm format" } 
                  }, 
                  required: ["time"] 
                }
            }
          ] }],
        },
      });
    }

    try {
        let resultStream = await chatSession.sendMessageStream({ message: userMessage });
        let functionCalls: any[] = [];
        
        for await (const chunk of resultStream) {
          // Filter out text that looks like reasoning or tool preamble to prevent duplicate-feeling output
          const chunkText = chunk.text;
          if (chunkText && !chunkText.includes('provideMusic') && !chunkText.includes('setAlarm')) { 
            yield { textChunk: chunkText }; 
          }
          if (chunk.functionCalls) { functionCalls.push(...chunk.functionCalls); }
        }

        if (functionCalls.length > 0) {
          const toolResponses: Part[] = [];
          for (const call of functionCalls) {
            let resultData: any = { status: "ok" };
            
            if (call.name === "provideMusic") {
                const title = call.args.title as string;
                const artist = call.args.artist as string;
                const isChineseRequest = containsChinese(userMessage) || containsChinese(title) || containsChinese(artist);
                
                let fallbackUrl = "";
                if (isChineseRequest) {
                  // Prioritize Baidu Music or Search for Chinese users
                  fallbackUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(title + ' ' + artist + ' 音乐')}`;
                } else {
                  // Everything else goes to YouTube
                  fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + artist)}`;
                }

                yield { musicSuggestion: { 
                    title, 
                    artist, 
                    mood: call.args.mood as MoodType,
                    externalUrl: (call.args.externalUrl as string) || fallbackUrl
                }};
            } else if (call.name === "setAlarm") {
                yield { alarmConfig: { time: call.args.time as string } };
            }
            toolResponses.push({ functionResponse: { name: call.name, response: resultData, id: call.id } });
          }
          
          // Execute second turn to close the tool call loop without adding extra text
          const secondTurn = await chatSession.sendMessageStream({ message: toolResponses });
          for await (const chunk of secondTurn) { 
             // We generally ignore text from the second turn if it's just repetition
             if (chunk.text && chunk.text.length > 5 && !chunk.text.toLowerCase().includes('ok')) {
                yield { textChunk: chunk.text }; 
             }
          }
        }
    } catch (e: any) { 
      console.error("Gemini Stream Error:", e);
      yield { textChunk: `\n⚠️ 连接中...`, isComplete: true }; 
    }
}

export async function generateNewCharacterTheme(name: string): Promise<ThemeConfig | null> {
    const client = getAiClient();
    try {
        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a Zootopia character theme for "${name}". Return JSON.`,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.OBJECT, 
                    properties: { 
                        role: { type: Type.STRING }, 
                        primaryColor: { type: Type.STRING }, 
                        bgGradient: { type: Type.STRING }, 
                        animationClass: { type: Type.STRING }, 
                        quotePrompt: { type: Type.STRING }, 
                        emoji: { type: Type.STRING } 
                    }, 
                    required: ["role", "primaryColor", "bgGradient", "animationClass", "quotePrompt", "emoji"] 
                } 
            }
        });
        const data = JSON.parse(response.text || '{}');
        return { 
          id: `char-${Date.now()}`, 
          name, 
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4`, 
          ...data, 
          secondaryColor: '', 
          accentColor: '' 
        };
    } catch (e) { return null; }
}

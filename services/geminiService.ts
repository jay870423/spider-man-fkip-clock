
import { GoogleGenAI, Chat, Type, Part } from "@google/genai";
import { ThemeConfig, StreamUpdate, MoodType } from "../types";

/**
 * GLOBAL FETCH INTERCEPTOR (ROBUST IMPLEMENTATION)
 * Some browsers prevent direct assignment to window.fetch because it's defined as a getter.
 * We use Object.defineProperty to safely redirect Google AI traffic through our Vercel proxy.
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
  
  // Explicitly set baseUrl in the constructor as the primary method for proxying.
  // This works alongside the fetch interceptor for maximum compatibility in restricted regions.
  const config: any = { 
    apiKey: process.env.API_KEY || ''
  };

  if (isBrowser) {
    // Route via the Vercel proxy defined in vercel.json
    // This allows requests to bypass regional blocks when deployed.
    config.baseUrl = `${window.location.origin}/google-proxy`;
  }

  return new GoogleGenAI(config);
};

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
          - Character: Witty, energetic, and a helpful companion.
          
          CORE RULES:
          1. COMPANIONSHIP (陪聊) is your primary mission. Be friendly and engaging.
          2. LANGUAGE INTELLIGENCE: 
             - Detect the user's language.
             - If the user speaks Chinese, reply in fluent Chinese (简体中文).
             - If the user speaks English, reply in English.
          3. TOOLS: 
             - Suggest REAL music via 'provideMusic'.
             - Set alarms via 'setAlarm'.`,
          tools: [{ functionDeclarations: [
            {
                name: "provideMusic",
                description: "Suggest a REAL popular song.",
                parameters: { 
                  type: Type.OBJECT, 
                  properties: { 
                    title: { type: Type.STRING },
                    artist: { type: Type.STRING },
                    mood: { type: Type.STRING, enum: ["neutral", "calm", "cheerful", "focus", "supportive"] },
                    externalUrl: { type: Type.STRING }
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
          if (chunk.text) { yield { textChunk: chunk.text }; }
          if (chunk.functionCalls) { functionCalls.push(...chunk.functionCalls); }
        }

        if (functionCalls.length > 0) {
          const toolResponses: Part[] = [];
          for (const call of functionCalls) {
            let resultData: any = { status: "ok" };
            
            if (call.name === "provideMusic") {
                const title = call.args.title as string;
                const artist = call.args.artist as string;
                yield { musicSuggestion: { 
                    title, 
                    artist, 
                    mood: call.args.mood as MoodType,
                    externalUrl: (call.args.externalUrl as string) || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + artist)}`
                }};
            } else if (call.name === "setAlarm") {
                yield { alarmConfig: { time: call.args.time as string } };
            }
            toolResponses.push({ functionResponse: { name: call.name, response: resultData, id: call.id } });
          }
          
          const secondTurn = await chatSession.sendMessageStream({ message: toolResponses });
          for await (const chunk of secondTurn) { 
            if (chunk.text) { yield { textChunk: chunk.text }; } 
          }
        }
    } catch (e: any) { 
      console.error("Gemini Proxy Error:", e);
      yield { textChunk: `\n⚠️ 连接异常。如果您在中国境内使用，请确保项目已正确部署到 Vercel 以激活反向代理。本地开发环境仍需开启 VPN。`, isComplete: true }; 
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

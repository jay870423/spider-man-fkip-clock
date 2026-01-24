
import { GoogleGenAI, Chat, Type, Part } from "@google/genai";
import { ThemeConfig, StreamUpdate, MoodType } from "../types";

let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

const getAiClient = () => {
  const isBrowser = typeof window !== 'undefined';
  
  // Base URL pointing to our namespaced Vercel proxy.
  // When deployed, this allows users in restricted regions to access Gemini.
  // Note: Local development still requires a VPN unless you have a local proxy.
  const baseUrl = isBrowser ? `${window.location.origin}/google-proxy` : '';
  
  return new GoogleGenAI({ 
    apiKey: process.env.API_KEY || '',
    baseUrl: baseUrl 
  } as any);
};

export async function* sendMessageToCharacterStream(theme: ThemeConfig, userMessage: string): AsyncGenerator<StreamUpdate, void, unknown> {
    if (!process.env.API_KEY) {
      yield { textChunk: "Error: API_KEY is missing from environment.", isComplete: true };
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
             - If the user speaks Chinese, reply in fluent Chinese.
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
      console.error("Gemini Stream Error:", e);
      yield { textChunk: `\n⚠️ Connection reset. If you are in a restricted region, please ensure the Vercel deployment is active.`, isComplete: true }; 
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

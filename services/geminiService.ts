
import { GoogleGenAI, Chat, Type, Part } from "@google/genai";
import { ThemeConfig, StreamUpdate, MoodType } from "../types";

let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

const getAiClient = () => {
  const isBrowser = typeof window !== 'undefined';
  const origin = isBrowser ? window.location.origin.replace(/\/$/, '') : '';
  return new GoogleGenAI({ 
    apiKey: process.env.API_KEY || '',
    baseUrl: origin 
  } as any);
};

export async function* sendMessageToCharacterStream(theme: ThemeConfig, userMessage: string): AsyncGenerator<StreamUpdate, void, unknown> {
    if (!process.env.API_KEY) {
      yield { textChunk: "错误: 请在环境变量中配置 API_KEY。", isComplete: true };
      return;
    }

    const client = getAiClient();
    
    if (!chatSession || currentThemeId !== theme.id) {
      currentThemeId = theme.id;
      chatSession = client.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `${theme.quotePrompt}. 你是疯狂动物城的 ${theme.name}。
          - 如果用户想要听音乐、放松或来点旋律，请使用 provideMusic 工具。
          - 设闹钟使用 setAlarm。
          - 你只能通过文字聊天，不提供画图功能。
          - 回答简短，多用 Emoji，必须说中文。`,
          tools: [{ functionDeclarations: [
            {
                name: "provideMusic",
                description: "Suggest a song based on the user's mood or request.",
                parameters: { 
                  type: Type.OBJECT, 
                  properties: { 
                    title: { type: Type.STRING, description: "Song title" },
                    artist: { type: Type.STRING, description: "Artist name" },
                    mood: { type: Type.STRING, enum: ["neutral", "calm", "cheerful", "focus", "supportive"], description: "The vibe of the song" }
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
                yield { musicSuggestion: { 
                    title: call.args.title as string, 
                    artist: call.args.artist as string, 
                    mood: call.args.mood as MoodType 
                }};
                resultData = { result: "Music player displayed." };
            } else if (call.name === "setAlarm") {
                yield { alarmConfig: { time: call.args.time as string } };
                resultData = { result: "Alarm set." };
            }
            toolResponses.push({ functionResponse: { name: call.name, response: resultData, id: call.id } });
          }
          
          const secondTurn = await chatSession.sendMessageStream({ message: toolResponses });
          for await (const chunk of secondTurn) { 
            if (chunk.text) { yield { textChunk: chunk.text }; } 
          }
        }
    } catch (e: any) { 
      yield { textChunk: `\n⚠️ 连接中断: ${e.message}`, isComplete: true }; 
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
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}&backgroundColor=b6e3f4`, 
          ...data, 
          secondaryColor: '', 
          accentColor: '' 
        };
    } catch (e) { return null; }
}

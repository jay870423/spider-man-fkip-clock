
import { GoogleGenAI, Chat, Type, Part } from "@google/genai";
import { ThemeConfig, StreamUpdate } from "../types";

// Persist chat session state
let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

/**
 * Creates a new instance of GoogleGenAI.
 * For domestic access (China), we use the Vercel rewrite proxy.
 * Ensure the baseUrl points to the origin so /v1beta/ calls are proxied.
 */
const getAiClient = () => {
  const isBrowser = typeof window !== 'undefined';
  // Use window.location.origin to point back to our Vercel server for rewriting
  const baseUrl = isBrowser ? window.location.origin : undefined;
  
  return new GoogleGenAI({ 
    apiKey: process.env.API_KEY || '',
    baseUrl: baseUrl 
  } as any);
};

/**
 * Sends a message to a character chat session and streams the response.
 */
export async function* sendMessageToCharacterStream(theme: ThemeConfig, userMessage: string): AsyncGenerator<StreamUpdate, void, unknown> {
    if (!process.env.API_KEY) {
      yield { textChunk: "错误: API Key 未配置。请在 Vercel 环境变量中设置 API_KEY。", isComplete: true };
      return;
    }

    const client = getAiClient();
    
    // Initialize or reset chat session if theme changes
    if (!chatSession || currentThemeId !== theme.id) {
      currentThemeId = theme.id;
      chatSession = client.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `${theme.quotePrompt}. 你是疯狂动物城的伙伴。你可以画图、设闹钟。回答务必简短生动，多使用 Emoji。务必使用中文交流。`,
          tools: [{ functionDeclarations: [
            {
                name: "generateImage",
                description: "根据描述画一张画",
                parameters: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING } }, required: ["prompt"] }
            },
            {
                name: "setAlarm",
                description: "设置闹钟",
                parameters: { type: Type.OBJECT, properties: { time: { type: Type.STRING, description: "格式 HH:mm" } }, required: ["time"] }
            }
          ] }],
        },
      });
    }

    try {
        let resultStream = await chatSession.sendMessageStream({ message: userMessage });
        let fullText = "";
        let functionCalls: any[] = [];
        
        for await (const chunk of resultStream) {
          if (chunk.text) { 
            fullText += chunk.text; 
            yield { textChunk: chunk.text, fullText }; 
          }
          if (chunk.functionCalls) {
            functionCalls.push(...chunk.functionCalls);
          }
        }

        // Handle tool calls
        if (functionCalls.length > 0) {
          const toolResponses: Part[] = [];
          for (const call of functionCalls) {
            let resultData: any = { status: "ok" };
            
            if (call.name === "generateImage") {
                try {
                  const response = await client.models.generateContent({
                      model: 'gemini-2.5-flash-image',
                      contents: { parts: [{ text: call.args.prompt as string }] },
                  });
                  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                  const img = part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
                  if (img) yield { generatedImageUrl: img };
                  resultData = { result: img ? "已展示图片" : "生成失败" };
                } catch (imgErr) {
                  console.error("Image gen error:", imgErr);
                  resultData = { result: "图片生成连接超时" };
                }
            } else if (call.name === "setAlarm") {
                yield { alarmConfig: { time: call.args.time as string } };
                resultData = { result: "闹钟已设定" };
            }
            
            toolResponses.push({ 
                functionResponse: { 
                    name: call.name, 
                    response: resultData, 
                    id: call.id 
                } 
            });
          }
          
          const secondTurn = await chatSession.sendMessageStream({ message: toolResponses });
          for await (const chunk of secondTurn) { 
            if (chunk.text) { 
              fullText += chunk.text; 
              yield { textChunk: chunk.text, fullText }; 
            } 
          }
        }
    } catch (e) { 
      console.error("Gemini Error:", e);
      // More descriptive error for domestic users
      yield { textChunk: "连接超时。由于国内访问限制，请确保您已在 Vercel 环境变量中正确设置 API_KEY，或尝试刷新页面重新连接。", isComplete: true }; 
    }
}

/**
 * Generates a new character theme configuration using JSON response.
 */
export async function generateNewCharacterTheme(name: string): Promise<ThemeConfig | null> {
    const client = getAiClient();
    try {
        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `为《疯狂动物城》角色 ${name} 设计主题方案。返回 JSON。`,
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
          // Using a more reliable avatar source or dynamic fallback
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`, 
          ...data, 
          secondaryColor: '', 
          accentColor: '' 
        };
    } catch (e) { 
      console.error("Generate theme error:", e);
      return null; 
    }
}

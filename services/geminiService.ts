
import { GoogleGenAI, Chat, Type, Part } from "@google/genai";
import { ThemeConfig, StreamUpdate } from "../types";

// Persist chat session state
let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

/**
 * Creates a new instance of GoogleGenAI.
 * For domestic access, we proxy through the current origin.
 */
const getAiClient = () => {
  const isBrowser = typeof window !== 'undefined';
  // Ensure origin is clean with no trailing slash
  const origin = isBrowser ? window.location.origin.replace(/\/$/, '') : '';
  
  return new GoogleGenAI({ 
    apiKey: process.env.API_KEY || '',
    baseUrl: origin // Vercel rewrite handles /v1beta/
  } as any);
};

export async function* sendMessageToCharacterStream(theme: ThemeConfig, userMessage: string): AsyncGenerator<StreamUpdate, void, unknown> {
    if (!process.env.API_KEY) {
      yield { textChunk: "错误: 未配置 API_KEY。请检查环境变量。", isComplete: true };
      return;
    }

    const client = getAiClient();
    
    if (!chatSession || currentThemeId !== theme.id) {
      currentThemeId = theme.id;
      chatSession = client.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `${theme.quotePrompt}. 你是疯狂动物城的伙伴。回答务必简短生动，多用 Emoji。必须使用中文交流。`,
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
                  resultData = { result: img ? "已生成图片" : "生成失败" };
                } catch (e) { resultData = { result: "图片生成接口异常" }; }
            } else if (call.name === "setAlarm") {
                yield { alarmConfig: { time: call.args.time as string } };
                resultData = { result: "闹钟已设定" };
            }
            toolResponses.push({ functionResponse: { name: call.name, response: resultData, id: call.id } });
          }
          const secondTurn = await chatSession.sendMessageStream({ message: toolResponses });
          for await (const chunk of secondTurn) { 
            if (chunk.text) { fullText += chunk.text; yield { textChunk: chunk.text, fullText }; } 
          }
        }
    } catch (e: any) { 
      console.error("Gemini Error:", e);
      yield { textChunk: `连接失败: ${e.message || '网络异常'}。请确认已在 Vercel 绑定 API_KEY 并通过您的自定义域名访问。`, isComplete: true }; 
    }
}

export async function generateNewCharacterTheme(name: string): Promise<ThemeConfig | null> {
    const client = getAiClient();
    try {
        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `为疯狂动物城角色 ${name} 设计主题。返回 JSON。`,
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
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`, 
          ...data, 
          secondaryColor: '', 
          accentColor: '' 
        };
    } catch (e) { return null; }
}

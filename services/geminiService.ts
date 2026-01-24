
import { GoogleGenAI, Chat, Type, Part } from "@google/genai";
import { ThemeConfig, StreamUpdate } from "../types";

// Persist chat session state
let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

/**
 * Creates a new instance of GoogleGenAI using the process.env.API_KEY.
 * Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
 */
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Sends a message to a character chat session and streams the response.
 */
export async function* sendMessageToCharacterStream(theme: ThemeConfig, userMessage: string): AsyncGenerator<StreamUpdate, void, unknown> {
    const client = getAiClient();
    
    // Initialize or reset chat session if theme changes
    if (!chatSession || currentThemeId !== theme.id) {
      currentThemeId = theme.id;
      chatSession = client.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `${theme.quotePrompt}. 你是疯狂动物城的伙伴。你可以画图、设闹钟。回答务必简短生动。`,
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
        // chat.sendMessageStream only accepts the message parameter, do not use contents.
        let resultStream = await chatSession.sendMessageStream({ message: userMessage });
        let fullText = "";
        let functionCalls: any[] = [];
        
        for await (const chunk of resultStream) {
          // Access .text property directly, do not call .text()
          if (chunk.text) { 
            fullText += chunk.text; 
            yield { textChunk: chunk.text, fullText }; 
          }
          if (chunk.functionCalls) {
            functionCalls.push(...chunk.functionCalls);
          }
        }

        // Handle tool calls if any
        if (functionCalls.length > 0) {
          const toolResponses: Part[] = [];
          for (const call of functionCalls) {
            let resultData: any = { status: "ok" };
            
            if (call.name === "generateImage") {
                // Correctly use generateContent to generate images with nano banana models
                const response = await client.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: call.args.prompt as string }] },
                });
                
                // Find the image part, do not assume it is the first part.
                const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                const img = part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
                
                if (img) yield { generatedImageUrl: img };
                resultData = { result: img ? "已展示图片" : "生成失败" };
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
          
          // Send tool responses back to update model context via chat session
          const secondTurn = await chatSession.sendMessageStream({ message: toolResponses });
          for await (const chunk of secondTurn) { 
            if (chunk.text) { 
              fullText += chunk.text; 
              yield { textChunk: chunk.text, fullText }; 
            } 
          }
        }
    } catch (e) { 
      yield { textChunk: "连接异常，请重试。", isComplete: true }; 
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
        // Access response.text property directly
        const data = JSON.parse(response.text || '{}');
        return { 
          id: `char-${Date.now()}`, 
          name, 
          avatarUrl: `https://picsum.photos/seed/${name}/200`, 
          ...data, 
          secondaryColor: '', 
          accentColor: '' 
        };
    } catch (e) { 
      return null; 
    }
}

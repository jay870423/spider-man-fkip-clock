
import { GoogleGenAI, Chat, Type, Part, Modality } from "@google/genai";
import { ThemeConfig, StreamUpdate, MoodType } from "../types";
import { decodeAudio } from "../utils/audioUtils";

let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

const getAiClient = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

/**
 * 生成基于角色的个性化唤醒语音
 */
export async function generatePersonalizedAlarmVoice(theme: ThemeConfig): Promise<Uint8Array | null> {
  const client = getAiClient();
  if (!client) return null;
  
  const hour = new Date().getHours();
  const timeContext = hour < 11 ? "早上" : (hour < 17 ? "下午" : "晚上");
  const prompt = `你是《疯狂动物城》里的${theme.name}。现在是${timeContext}，请用你特有的语气说一句短小的（15字以内）唤醒语，充满活力或你的个性特征。`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: theme.id === 'FLASH' ? 'Puck' : 'Kore' }
            }
        }
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioData ? decodeAudio(audioData) : null;
  } catch (e) {
    console.error("TTS Generation Error", e);
    return null;
  }
}

export async function* sendMessageToCharacterStream(theme: ThemeConfig, userMessage: string): AsyncGenerator<StreamUpdate, void, unknown> {
    const client = getAiClient();
    if (!client) { yield { textChunk: "API Key Error", isComplete: true }; return; }
    
    if (!chatSession || currentThemeId !== theme.id) {
      currentThemeId = theme.id;
      chatSession = client.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `${theme.quotePrompt}. You are an emotional partner in Zootopia. You can draw pictures and play music to comfort the user. Use tools whenever appropriate.`,
          tools: [{ functionDeclarations: [
            {
                name: "generateImage",
                description: "Draw a picture.",
                parameters: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING } }, required: ["prompt"] }
            },
            {
                name: "playMusic",
                description: "Play music vibe.",
                parameters: { type: Type.OBJECT, properties: { mood: { type: Type.STRING } }, required: ["mood"] }
            },
            {
                name: "setAlarm",
                description: "Set an alarm.",
                parameters: { type: Type.OBJECT, properties: { time: { type: Type.STRING } }, required: ["time"] }
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
          if (chunk.text) { fullText += chunk.text; yield { textChunk: chunk.text, fullText }; }
          if (chunk.functionCalls) functionCalls.push(...chunk.functionCalls);
        }

        if (functionCalls.length > 0) {
          const toolResponses: Part[] = [];
          for (const call of functionCalls) {
            let resultData: any = { status: "success" };
            if (call.name === "generateImage") {
                const response = await client.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: [{ parts: [{ text: call.args.prompt as string }] }],
                });
                const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                const img = part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
                if (img) yield { generatedImageUrl: img };
                resultData = { result: img ? "Image displayed" : "Failed" };
            } else if (call.name === "playMusic") {
                yield { moodMusic: call.args.mood as MoodType };
                resultData = { result: `Playing ${call.args.mood} music` };
            } else if (call.name === "setAlarm") {
                yield { alarmConfig: { time: call.args.time as string } };
                resultData = { result: "Alarm set" };
            }
            toolResponses.push({ functionResponse: { name: call.name, response: resultData, id: call.id } });
          }
          const secondTurn = await chatSession.sendMessageStream({ message: toolResponses });
          for await (const chunk of secondTurn) { if (chunk.text) { fullText += chunk.text; yield { textChunk: chunk.text, fullText }; } }
        }
        yield { isComplete: true, fullText };
    } catch (e) { yield { textChunk: "Connection lost...", isComplete: true }; }
}

export const connectLiveVoice = async (theme: ThemeConfig, callbacks: any) => {
    const client = getAiClient();
    if (!client) throw new Error("API Key missing");
    return client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: theme.id === 'FLASH' ? 'Puck' : 'Kore' } } },
        systemInstruction: `${theme.quotePrompt}.`,
      }
    });
};

export function resetChatSession() { chatSession = null; currentThemeId = null; }

export async function generateNewCharacterTheme(name: string): Promise<ThemeConfig | null> {
    const client = getAiClient();
    if (!client) return null;
    try {
        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Create Zootopia persona for: ${name}. Return JSON.`,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.OBJECT, 
                    properties: { 
                        role: { type: Type.STRING }, 
                        primaryColor: { type: Type.STRING }, 
                        secondaryColor: { type: Type.STRING }, 
                        accentColor: { type: Type.STRING }, 
                        bgGradient: { type: Type.STRING }, 
                        animationClass: { type: Type.STRING }, 
                        quotePrompt: { type: Type.STRING }, 
                        emoji: { type: Type.STRING } 
                    }, 
                    required: ["role", "primaryColor", "secondaryColor", "accentColor", "bgGradient", "animationClass", "quotePrompt", "emoji"] 
                } 
            }
        });
        const text = response.text;
        return text ? { id: name + Date.now(), name, avatarUrl: `https://picsum.photos/seed/${name}/200`, ...JSON.parse(text) } : null;
    } catch (e) {
        console.error("Generate Theme Error", e);
        return null;
    }
}

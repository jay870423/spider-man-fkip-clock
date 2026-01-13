
import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse, Part } from "@google/genai";
import { ThemeConfig, StreamUpdate, AIProvider } from "../types";

// --- STATE MANAGEMENT ---
let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

// DeepSeek/OpenAI History Type
interface OpenAIMessage {
  role: string;
  content: string | null;
  tool_calls?: any[];
  name?: string;
  tool_call_id?: string;
}
let deepSeekHistory: OpenAIMessage[] = [];

// --- CONFIGURATION ---
const getAiClient = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

// --- GEMINI TOOLS DEFINITION ---
const switchCharacterTool: FunctionDeclaration = {
  name: "switchCharacter",
  description: "Switch the active character based on the user's mood or conversation context.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      characterId: {
        type: Type.STRING,
        description: "The ID of the character to switch to (e.g., JUDY, NICK, FLASH).",
      },
      reason: {
        type: Type.STRING,
        description: "The reason for switching based on user sentiment.",
      },
    },
    required: ["characterId"],
  },
};

const setAlarmTool: FunctionDeclaration = {
  name: "setAlarm",
  description: "Set or update the alarm. If time is omitted, only updates sound (if provided). If sound is omitted, defaults to 'digital' or keeps current.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      time: {
        type: Type.STRING,
        description: "The time to set the alarm in HH:mm 24-hour format (e.g. '08:30'). Optional if only changing sound.",
      },
      soundType: {
        type: Type.STRING,
        description: "The type of sound. Options: 'digital' (default), 'nature' (birds), 'energetic'. Optional.",
      },
    },
    required: [],
  },
};

const stopAlarmTool: FunctionDeclaration = {
  name: "stopAlarm",
  description: "Stop the currently ringing alarm. Use this when the user asks to stop, silence, or turn off the alarm.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// --- OPENAI/DEEPSEEK TOOLS FORMAT MAPPING ---
const openAITools = [
  {
    type: "function",
    function: {
      name: "switchCharacter",
      description: "Switch character.",
      parameters: {
        type: "object",
        properties: {
          characterId: { type: "string" },
          reason: { type: "string" }
        },
        required: ["characterId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "setAlarm",
      description: "Set or update alarm. Time and soundType are optional.",
      parameters: {
        type: "object",
        properties: {
          time: { type: "string", description: "HH:mm format" },
          soundType: { type: "string", enum: ["digital", "nature", "energetic"] }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "stopAlarm",
      description: "Stop ringing alarm.",
      parameters: { type: "object", properties: {} }
    }
  }
];

export function resetChatSession() {
    chatSession = null;
    currentThemeId = null;
    deepSeekHistory = [];
}

// --- GENERATE CHARACTER ---
export async function generateNewCharacterTheme(name: string): Promise<ThemeConfig | null> {
  const client = getAiClient();
  if (!client) return null;

  const prompt = `
    Create a complete design theme for a Zootopia-style character named "${name}".
    Return JSON.
    Schema:
    {
      role: string;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      bgGradient: string;
      animationClass: string;
      quotePrompt: string;
      emoji: string;
    }
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
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
            emoji: { type: Type.STRING },
          },
          required: ["role", "primaryColor", "secondaryColor", "accentColor", "bgGradient", "animationClass", "quotePrompt", "emoji"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      const randomImageId = Math.floor(Math.random() * 1000); 
      return {
        id: name.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now(),
        name: name,
        avatarUrl: `https://picsum.photos/id/${randomImageId}/200/200`,
        ...data
      };
    }
    return null;

  } catch (error) {
    console.error("Failed to generate character:", error);
    return null;
  }
}

// --- MAIN CHAT FUNCTION ---
export async function* sendMessageToCharacterStream(
  theme: ThemeConfig,
  userMessage: string,
  provider: AIProvider = 'GEMINI',
  apiKey?: string
): AsyncGenerator<StreamUpdate, void, unknown> {

  if (provider === 'DEEPSEEK') {
    yield* streamDeepSeek(theme, userMessage, apiKey);
  } else {
    yield* streamGemini(theme, userMessage);
  }
}

// --- GEMINI IMPLEMENTATION ---
async function* streamGemini(theme: ThemeConfig, userMessage: string): AsyncGenerator<StreamUpdate, void, unknown> {
  const client = getAiClient();
  if (!client) {
    yield { textChunk: "Please configure process.env.API_KEY for Gemini.", isComplete: true };
    return;
  }

  // Init Session
  if (!chatSession || currentThemeId !== theme.id) {
    currentThemeId = theme.id;
    const systemInstruction = `
      ${theme.quotePrompt}
      IMPORTANT:
      - Call 'switchCharacter' if user asks to switch.
      - Call 'setAlarm' (HH:mm 24h) if user sets alarm or wants to change sound.
      - Call 'stopAlarm' if user says stop/shut up.
      - After calling a tool, wait for the result and then confirm to the user naturally.
    `;

    chatSession = client.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemInstruction,
        temperature: 1, 
        maxOutputTokens: 250,
        tools: [{ functionDeclarations: [switchCharacterTool, setAlarmTool, stopAlarmTool] }],
      },
    });
  }

  try {
    // 1. Send User Message
    let resultStream = await chatSession.sendMessageStream({ message: userMessage });
    let fullText = "";
    let functionCallsToProcess: any[] = [];
    
    // Process First Turn
    for await (const chunk of resultStream) {
      const content = chunk as GenerateContentResponse;
      if (content.text) {
        fullText += content.text;
        yield { textChunk: content.text, fullText };
      }
      if (content.functionCalls) {
        functionCallsToProcess.push(...content.functionCalls);
      }
    }

    // 2. Handle Function Calls (Multi-turn loop)
    if (functionCallsToProcess.length > 0) {
      const functionResponses: Part[] = [];

      for (const call of functionCallsToProcess) {
        const args = call.args || {};
        let result = { result: "ok" }; 

        if (call.name === "switchCharacter") {
            const nextId = args['characterId'] as string;
            yield { nextCharacterId: nextId };
            result = { result: `Switching to ${nextId}` };
        }
        else if (call.name === "setAlarm") {
            const time = args['time'] as string | undefined;
            const soundType = args['soundType'] as string | undefined;
            yield { alarmConfig: { time, soundType } };
            result = { result: `Alarm set/updated. Time: ${time || 'unchanged'}, Sound: ${soundType || 'unchanged'}` };
        }
        else if (call.name === "stopAlarm") {
            yield { stopAlarm: true };
            result = { result: "Alarm stopped" };
        }

        functionResponses.push({
            functionResponse: {
                name: call.name,
                response: result,
                id: call.id
            }
        });
      }

      // 3. Send Tool Results Back to Model
      // FIX: Must pass as { message: Part[] } or just Part[] depending on exact SDK version, 
      // but guidelines say use named parameter `message`.
      const toolResultStream = await chatSession.sendMessageStream({ message: functionResponses });
      
      // Process Second Turn (Model's confirmation text)
      for await (const chunk of toolResultStream) {
        const content = chunk as GenerateContentResponse;
        if (content.text) {
          fullText += content.text;
          yield { textChunk: content.text, fullText };
        }
      }
    }

    yield { isComplete: true, fullText };

  } catch (error) {
    console.error("Gemini Error:", error);
    yield { textChunk: "\n(Gemini Connection Error: " + (error instanceof Error ? error.message : String(error)) + ")", isComplete: true };
  }
}

// --- DEEPSEEK IMPLEMENTATION ---
async function* streamDeepSeek(theme: ThemeConfig, userMessage: string, apiKey?: string): AsyncGenerator<StreamUpdate, void, unknown> {
    if (!apiKey) {
        yield { textChunk: "Please provide DeepSeek API Key in settings.", isComplete: true };
        return;
    }

    if (currentThemeId !== theme.id) {
        currentThemeId = theme.id;
        deepSeekHistory = [
            { 
                role: "system", 
                content: `${theme.quotePrompt}
                IMPORTANT:
                - Call 'switchCharacter' function if user asks to switch.
                - Call 'setAlarm' (HH:mm 24h) if user sets alarm.
                - Call 'stopAlarm' if user wants to stop the alarm.
                - Keep replies concise.`
            }
        ];
    }

    deepSeekHistory.push({ role: "user", content: userMessage });

    // Internal function to fetch stream
    async function* fetchDeepSeekStream(messages: OpenAIMessage[]): AsyncGenerator<StreamUpdate | { toolCallBuffer: any }, void, unknown> {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                stream: true,
                temperature: 1.0,
                tools: openAITools,
                tool_choice: "auto"
            })
        });

        if (!response.body) throw new Error("No response body");
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        let toolCallAccumulator: any = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
                if (!line.trim() || line.trim() === "data: [DONE]") continue;
                if (!line.startsWith("data: ")) continue;
                try {
                    const json = JSON.parse(line.replace("data: ", ""));
                    const delta = json.choices[0]?.delta;
                    
                    if (delta?.content) {
                        yield { textChunk: delta.content };
                    }
                    if (delta?.tool_calls) {
                        const tc = delta.tool_calls[0];
                        if (!toolCallAccumulator) toolCallAccumulator = { id: tc.id, function: { name: "", arguments: "" } };
                        if (tc.function?.name) toolCallAccumulator.function.name += tc.function.name;
                        if (tc.function?.arguments) toolCallAccumulator.function.arguments += tc.function.arguments;
                    }
                } catch (e) { console.warn(e); }
            }
        }
        if (toolCallAccumulator) {
            yield { toolCallBuffer: toolCallAccumulator };
        }
    }

    try {
        let fullText = "";
        let toolCallFound = null;

        // 1. First Pass
        const generator = fetchDeepSeekStream(deepSeekHistory);
        for await (const update of generator) {
            if ('toolCallBuffer' in update) {
                toolCallFound = update.toolCallBuffer;
            } else if (update.textChunk) {
                fullText += update.textChunk;
                yield { textChunk: update.textChunk, fullText };
            }
        }

        // 2. Handle Tool Call
        if (toolCallFound) {
            const funcName = toolCallFound.function.name;
            const funcArgs = JSON.parse(toolCallFound.function.arguments);

            // Add Assistant message with tool call to history
            deepSeekHistory.push({
                role: "assistant",
                content: fullText || null, // Content can be null if it was just a tool call
                tool_calls: [{
                    id: toolCallFound.id || `call_${Date.now()}`,
                    type: "function",
                    function: toolCallFound.function
                }]
            });

            // Execute logic
            let toolOutput = "done";
            if (funcName === "switchCharacter") {
                yield { nextCharacterId: funcArgs.characterId };
                toolOutput = `Switching to ${funcArgs.characterId}`;
            } else if (funcName === "setAlarm") {
                const { time, soundType } = funcArgs;
                yield { alarmConfig: { time, soundType } };
                toolOutput = `Alarm updated. Time: ${time}, Sound: ${soundType}`;
            } else if (funcName === "stopAlarm") {
                yield { stopAlarm: true };
                toolOutput = "Alarm stopped";
            }

            // Add Tool message to history
            deepSeekHistory.push({
                role: "tool",
                tool_call_id: toolCallFound.id || `call_${Date.now()}`,
                content: toolOutput,
                name: funcName
            } as any);

            // 3. Second Pass (Get confirmation text)
            const secondGenerator = fetchDeepSeekStream(deepSeekHistory);
            for await (const update of secondGenerator) {
                if ('textChunk' in update && update.textChunk) {
                    fullText += update.textChunk;
                    yield { textChunk: update.textChunk, fullText };
                }
            }
        } else {
            // Normal text response
            deepSeekHistory.push({ role: "assistant", content: fullText });
        }

        yield { isComplete: true, fullText };

    } catch (error) {
        console.error("DeepSeek Error:", error);
        yield { textChunk: "\n(Connection Error: " + (error instanceof Error ? error.message : String(error)) + ")", isComplete: true };
    }
}

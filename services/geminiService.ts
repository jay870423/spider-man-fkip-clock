import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import { ThemeConfig, CharacterId, StreamUpdate, CharacterIdEnum } from "../types";

let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let currentThemeId: string | null = null;

const getAiClient = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

// Tool: Switch Character
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

// Tool: Set Alarm
const setAlarmTool: FunctionDeclaration = {
  name: "setAlarm",
  description: "Set an alarm for a specific time. Always convert user time to 24-hour format HH:mm.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      time: {
        type: Type.STRING,
        description: "The time to set the alarm in HH:mm 24-hour format (e.g. '08:30', '14:00', '23:15').",
      },
      soundType: {
        type: Type.STRING,
        description: "The type of sound. Options: 'digital' (default/beep), 'nature' (birds/forest), 'energetic' (loud/fast).",
      },
    },
    required: ["time"],
  },
};

// Tool: Stop Alarm
const stopAlarmTool: FunctionDeclaration = {
  name: "stopAlarm",
  description: "Stop the currently ringing alarm. Use this when the user asks to stop, silence, or turn off the alarm.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export function resetChatSession() {
    chatSession = null;
    currentThemeId = null;
}

export async function generateNewCharacterTheme(name: string): Promise<ThemeConfig | null> {
  const client = getAiClient();
  if (!client) return null;

  const prompt = `
    Create a complete design theme for a Zootopia-style character named "${name}".
    
    You must return a valid JSON object.
    
    Requirements:
    - 'role': A funny or fitting job title (e.g., "Mafia Boss", "Receptionist").
    - 'primaryColor': A Tailwind CSS background class with a specific hex code that fits the character's fur or outfit (e.g., "bg-[#1E3A8A]").
    - 'secondaryColor': A slightly lighter/different Tailwind CSS background class (e.g., "bg-[#93C5FD]").
    - 'accentColor': A Tailwind CSS text color class for highlights (e.g., "text-pink-400").
    - 'bgGradient': A Tailwind CSS gradient string (e.g., "from-[#0d1b45] via-[#1a237e] to-[#311b92]"). It should be dark and atmospheric.
    - 'animationClass': Either "animate-flip-up" (normal speed) or "animate-flip-up-slow" (if the character is known to be slow).
    - 'quotePrompt': A system instruction for an AI to roleplay this character. Include personality traits.
    - 'emoji': A single emoji representing the animal species.
    
    The JSON structure matches this TypeScript interface:
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
      // Construct the full object with a unique ID and a placeholder image
      // We use a random number for picsum to get a consistent unique image
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

export async function* sendMessageToCharacterStream(
  theme: ThemeConfig,
  userMessage: string
): AsyncGenerator<StreamUpdate, void, unknown> {
  const client = getAiClient();
  if (!client) {
    yield { textChunk: "Please configure API_KEY to chat with me!", isComplete: true };
    return;
  }

  // Reset chat if theme changes
  if (!chatSession || currentThemeId !== theme.id) {
    currentThemeId = theme.id;
    
    const systemInstruction = `
      ${theme.quotePrompt}
      
      IMPORTANT: You are part of a web app.
      - If user asks to switch character, call 'switchCharacter'.
      - If user asks to set an alarm/timer, call 'setAlarm'. Convert natural language times (e.g. "Wake me at 8am") to 24hr format HH:MM (e.g. "08:00").
      - If user specifies a sound (nature, energetic, birds, loud), pass it to soundType. Default is 'digital'.
      - If user asks to stop the alarm (e.g. "stop", "shut up", "turn it off"), call 'stopAlarm'.
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
    const resultStream = await chatSession.sendMessageStream({ message: userMessage });
    
    let fullText = "";
    
    for await (const chunk of resultStream) {
      const content = chunk as GenerateContentResponse;
      
      // Handle Text
      const text = content.text;
      if (text) {
        fullText += text;
        yield { textChunk: text, fullText: fullText };
      }

      // Handle Function Calls
      const functionCalls = content.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
            if (call.name === "switchCharacter") {
                const nextId = call.args['characterId'] as string;
                yield { nextCharacterId: nextId };
            }
            if (call.name === "setAlarm") {
                const time = call.args['time'] as string;
                const soundType = (call.args['soundType'] as string) || 'digital';
                yield { alarmConfig: { time, soundType } };
                
                // Yield a confirmation text if the model didn't generate one
                if (!fullText) {
                    const msg = `\n(Alarm set for ${time})`;
                    fullText += msg;
                    yield { textChunk: msg, fullText };
                }
            }
            if (call.name === "stopAlarm") {
                yield { stopAlarm: true };
                // Yield a confirmation text
                if (!fullText) {
                    const msg = `\n(Alarm stopped)`;
                    fullText += msg;
                    yield { textChunk: msg, fullText };
                }
            }
        }
      }
    }
    
    yield { isComplete: true, fullText: fullText };

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    yield { textChunk: "\n(Connection lost...)", isComplete: true };
  }
}
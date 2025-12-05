import { GoogleGenAI, Modality } from "@google/genai";

// Helper to decode Base64 to Uint8Array
const decodeBase64 = (base64String: string): Uint8Array => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Manual PCM decoding for Gemini TTS (Raw PCM 24kHz)
const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  // Ensure we process an even number of bytes for 16-bit samples
  const safeLength = data.length - (data.length % 2);
  
  // Create Int16Array view directly from the Uint8Array's buffer, respecting offset
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, safeLength / 2);
  
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize 16-bit integer to float [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

export const generatePronunciation = async (letter: string, word: string): Promise<AudioBuffer | null> => {
  let tempCtx: AudioContext | null = null;
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API Key not found");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Using the TTS model as specified
    const model = "gemini-2.5-flash-preview-tts";
    
    // Prompt design: Explicitly request English to ensure correct pronunciation of letters
    // (e.g., ensuring 'A' is read as /eɪ/ and not as a localized particle)
    const prompt = `Speak in English. Say the letter "${letter}", then say the word "${word}".`;

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Using 'Kore' for a sweet/clear voice suitable for kids
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      console.error("No audio data returned from Gemini");
      return null;
    }

    // Create a temporary AudioContext to generate the buffer
    tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Decode base64 to raw bytes
    const audioBytes = decodeBase64(base64Audio);
    
    // Decode PCM data to AudioBuffer
    const audioBuffer = await decodeAudioData(audioBytes, tempCtx, 24000, 1);
    
    return audioBuffer;

  } catch (error) {
    console.error("Error generating pronunciation:", error);
    return null;
  } finally {
    if (tempCtx) {
      try {
        await tempCtx.close();
      } catch (e) {
        console.error("Error closing temporary AudioContext", e);
      }
    }
  }
};
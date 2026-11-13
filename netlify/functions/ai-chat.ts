import { GoogleGenAI } from '@google/genai';
import {
  ERROREX_AI_SYSTEM_INSTRUCTION,
  buildGeminiContents,
  generateErrorexAiFallback
} from '../../src/lib/errorexAiEngine';

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let message = '';
  let history: any[] = [];

  try {
    const body = await req.json();
    message = typeof body?.message === 'string' ? body.message : '';
    history = Array.isArray(body?.history) ? body.history : [];
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!message.trim()) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const contents = buildGeminiContents(message, history);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents,
          config: {
            systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION
          }
        });

        if (response?.text && response.text.trim()) {
          return new Response(JSON.stringify({ reply: response.text.trim(), engine: 'gemini' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (err: any) {
        console.warn(`[Netlify AI Function] Gemini attempt ${attempt + 1}:`, err?.message || err);
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
    }
  }

  const fallbackReply = generateErrorexAiFallback(message, history);
  return new Response(JSON.stringify({ reply: fallbackReply, engine: 'fallback' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

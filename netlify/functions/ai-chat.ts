import { GoogleGenAI } from '@google/genai';
import { ERROREX_AI_SYSTEM_INSTRUCTION, generateErrorexAiFallback } from '../../src/lib/errorexAiEngine';

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const contents: any[] = [];
      for (const item of history.slice(-6)) {
        if (item?.sender === 'user' && item?.text) {
          contents.push({ role: 'user', parts: [{ text: item.text }] });
        } else if (item?.sender === 'ai' && item?.text) {
          contents.push({ role: 'model', parts: [{ text: item.text }] });
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION
        }
      });

      if (response?.text) {
        return new Response(JSON.stringify({ reply: response.text }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      console.warn('[Netlify AI Function] Gemini fallback:', err);
    }
  }

  const fallbackReply = generateErrorexAiFallback(message, history);
  return new Response(JSON.stringify({ reply: fallbackReply }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

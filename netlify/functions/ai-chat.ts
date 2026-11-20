import { generateErrorexAiFallback } from '../../src/lib/errorexAiEngine';
import { generateServerAiReply } from '../../src/lib/serverAiRunner';

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

  try {
    const result = await generateServerAiReply(message, history);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    const fallbackReply = generateErrorexAiFallback(message, history);
    return new Response(JSON.stringify({ reply: fallbackReply, engine: 'fallback' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

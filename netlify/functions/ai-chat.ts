import { generateErrorexAiFallback } from '../../src/lib/errorexAiEngine';
import { generateServerAiReply, generateServerAiStream } from '../../src/lib/serverAiRunner';

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
  let streamRequested = false;

  try {
    const body = await req.json();
    message = typeof body?.message === 'string' ? body.message : '';
    history = Array.isArray(body?.history) ? body.history : [];
    streamRequested = Boolean(body?.stream) || (req.headers.get('accept') || '').includes('text/event-stream');
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

  if (streamRequested) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await generateServerAiStream(message, history, chunk => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, engine: result.engine })}\n\n`));
        } catch {
          const fallbackReply = generateErrorexAiFallback(message, history);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: fallbackReply, done: true, engine: 'fallback' })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
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

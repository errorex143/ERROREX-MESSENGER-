import { generateErrorexAiFallback } from '../../../src/lib/errorexAiEngine';
import { generateServerAiReply, generateServerAiStream } from '../../../src/lib/serverAiRunner';

interface CloudflarePagesContext {
  request: Request;
  env: Record<string, string | undefined>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
};

export const onRequestPost = async (context: CloudflarePagesContext): Promise<Response> => {
  const { request, env } = context;

  const geminiApiKey = String(
    env?.GEMINI_API_KEY ||
      env?.GOOGLE_API_KEY ||
      (typeof process !== 'undefined' && process?.env
        ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        : '') ||
      ''
  ).trim();

  let message = '';
  let history: any[] = [];
  let streamRequested = false;

  try {
    const body = (await request.json()) as any;
    message = typeof body?.message === 'string' ? body.message : '';
    history = Array.isArray(body?.history) ? body.history : [];
    streamRequested =
      Boolean(body?.stream) || (request.headers.get('accept') || '').includes('text/event-stream');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  if (!message.trim()) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  if (streamRequested) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueueJson = (payload: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch {
            // stream closed by client
          }
        };

        try {
          const result = await generateServerAiStream(
            message,
            history,
            chunk => {
              enqueueJson({ chunk });
            },
            geminiApiKey
          );
          enqueueJson({ done: true, engine: result.engine });
        } catch {
          const fallbackReply = generateErrorexAiFallback(message, history);
          enqueueJson({ chunk: fallbackReply, done: true, engine: 'fallback' });
        } finally {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        ...CORS_HEADERS
      }
    });
  }

  try {
    const result = await generateServerAiReply(message, history, geminiApiKey);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch {
    const fallbackReply = generateErrorexAiFallback(message, history);
    return new Response(JSON.stringify({ reply: fallbackReply, engine: 'fallback' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
};

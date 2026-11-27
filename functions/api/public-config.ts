interface CloudflarePagesContext {
  request: Request;
  env: Record<string, string | undefined>;
}

function readEnvVar(env: Record<string, string | undefined> | undefined, name: string): string {
  const fromCf = env && typeof env[name] === 'string' ? env[name] : '';
  const fromProc =
    typeof process !== 'undefined' && process?.env && typeof process.env[name] === 'string'
      ? process.env[name]
      : '';
  return String(fromCf || fromProc || '').trim();
}

const DEFAULT_PUBLIC_SUPABASE_URL = 'https://vdjwuymrmqgcwmlhtgvm.supabase.co';
const DEFAULT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_1I48ahxZVdKhgUwsS2Qrrg_JNH5Fwj8';

export const onRequest = async (context: CloudflarePagesContext): Promise<Response> => {
  if (context.request?.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const supabaseUrl =
    readEnvVar(context.env, 'VITE_SUPABASE_URL') ||
    readEnvVar(context.env, 'SUPABASE_URL') ||
    readEnvVar(context.env, 'NEXT_PUBLIC_SUPABASE_URL') ||
    readEnvVar(context.env, 'PUBLIC_SUPABASE_URL') ||
    DEFAULT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    readEnvVar(context.env, 'VITE_SUPABASE_ANON_KEY') ||
    readEnvVar(context.env, 'SUPABASE_ANON_KEY') ||
    readEnvVar(context.env, 'SUPABASE_KEY') ||
    readEnvVar(context.env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    readEnvVar(context.env, 'PUBLIC_SUPABASE_ANON_KEY') ||
    DEFAULT_PUBLIC_SUPABASE_ANON_KEY;

  return new Response(
    JSON.stringify({
      supabaseUrl,
      supabaseAnonKey,
      platform: 'cloudflare',
      configured: Boolean(
        supabaseUrl &&
          supabaseAnonKey &&
          !supabaseUrl.includes('your-project') &&
          !supabaseAnonKey.includes('your-anon')
      )
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
};

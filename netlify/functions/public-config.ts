function readEnvVar(name: string): string {
  const fromNetlify =
    typeof (globalThis as any).Netlify?.env?.get === 'function'
      ? (globalThis as any).Netlify.env.get(name)
      : '';
  const fromProc =
    typeof process !== 'undefined' && process?.env ? process.env[name] : '';
  return String(fromNetlify || fromProc || '').trim();
}

export default async (req?: Request): Promise<Response> => {
  if (req && req.method === 'OPTIONS') {
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
    readEnvVar('VITE_SUPABASE_URL') ||
    readEnvVar('SUPABASE_URL') ||
    readEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
    readEnvVar('PUBLIC_SUPABASE_URL');
  const supabaseAnonKey =
    readEnvVar('VITE_SUPABASE_ANON_KEY') ||
    readEnvVar('SUPABASE_ANON_KEY') ||
    readEnvVar('SUPABASE_KEY') ||
    readEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    readEnvVar('PUBLIC_SUPABASE_ANON_KEY');

  return new Response(
    JSON.stringify({
      supabaseUrl,
      supabaseAnonKey,
      platform: 'netlify',
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

function readEnvVar(name: string): string {
  const fromNetlify =
    typeof (globalThis as any).Netlify?.env?.get === 'function'
      ? (globalThis as any).Netlify.env.get(name)
      : '';
  const fromProc =
    typeof process !== 'undefined' && process?.env ? process.env[name] : '';
  return String(fromNetlify || fromProc || '').trim();
}

export default async (): Promise<Response> => {
  const supabaseUrl = readEnvVar('VITE_SUPABASE_URL') || readEnvVar('SUPABASE_URL');
  const supabaseAnonKey = readEnvVar('VITE_SUPABASE_ANON_KEY') || readEnvVar('SUPABASE_ANON_KEY');

  return new Response(
    JSON.stringify({
      supabaseUrl,
      supabaseAnonKey,
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

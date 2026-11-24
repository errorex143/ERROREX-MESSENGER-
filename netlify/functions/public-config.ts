export default async (): Promise<Response> => {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

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
        'Cache-Control': 'no-store'
      }
    }
  );
};

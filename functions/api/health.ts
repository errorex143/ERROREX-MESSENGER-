export const onRequest = async (): Promise<Response> => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      app: 'ERROREX',
      time: new Date().toISOString(),
      mode: 'cloudflare-pages',
      configured: true
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

export default async (): Promise<Response> => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      app: 'ERROREX',
      time: new Date().toISOString(),
      mode: 'netlify-serverless',
      configured: true
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

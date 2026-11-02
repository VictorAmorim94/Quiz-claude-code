// CORS restrito ao(s) domínio(s) do front. ALLOWED_ORIGIN aceita uma lista
// separada por vírgula (ex.: "http://localhost:5173,https://quiz.vercel.app").

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] ?? '');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

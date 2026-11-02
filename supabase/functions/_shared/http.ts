// Wrapper comum das Edge Functions: CORS, método, parse/validação do JSON,
// formato de erro e log estruturado.
import type { ZodTypeAny, z } from 'npm:zod@3.25.76';
import { corsHeaders, parseAllowedOrigins } from './cors.ts';
import { ApiError } from './errors.ts';

export interface HandlerContext {
  req: Request;
}

export function log(
  level: 'info' | 'warn' | 'error',
  event: string,
  data: Record<string, unknown> = {},
) {
  console[level](JSON.stringify({ level, event, ts: new Date().toISOString(), ...data }));
}

export function serveJson<S extends ZodTypeAny>(
  name: string,
  schema: S,
  handler: (body: z.infer<S>, ctx: HandlerContext) => Promise<unknown>,
) {
  const allowed = parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGIN'));

  Deno.serve(async (req) => {
    const cors = corsHeaders(req.headers.get('origin'), allowed);
    const respond = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const started = performance.now();
    try {
      if (req.method !== 'POST') {
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST.');
      }
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        throw new ApiError(400, 'BAD_REQUEST', 'JSON inválido.');
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        throw new ApiError(400, 'BAD_REQUEST', 'Requisição inválida.');
      }
      const result = await handler(parsed.data, { req });
      log('info', `${name}.ok`, { ms: Math.round(performance.now() - started) });
      return respond(200, result);
    } catch (err) {
      if (err instanceof ApiError) {
        log(err.status >= 500 ? 'error' : 'warn', `${name}.error`, {
          code: err.code,
          status: err.status,
          ms: Math.round(performance.now() - started),
        });
        return respond(err.status, { error: { code: err.code, message: err.message } });
      }
      log('error', `${name}.unhandled`, { message: String((err as Error)?.message ?? err) });
      return respond(500, {
        error: { code: 'INTERNAL', message: 'Erro interno. Tente novamente.' },
      });
    }
  });
}

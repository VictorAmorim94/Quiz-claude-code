import { assertEquals } from 'jsr:@std/assert@1';
import { fromDbError } from './errors.ts';
import { corsHeaders, parseAllowedOrigins } from './cors.ts';
import { getClientIp, sha256Hex } from './hash.ts';

Deno.test('mapeia erros do SQL para status e código da API', () => {
  const cases: [string, number][] = [
    ['SESSION_NOT_FOUND', 404],
    ['SESSION_EXPIRED', 410],
    ['OUT_OF_ORDER', 409],
    ['ALREADY_ANSWERED', 409],
    ['NOT_FINISHED', 400],
    ['ALREADY_SUBMITTED', 409],
    ['SUSPICIOUS_RUN', 422],
  ];
  for (const [code, status] of cases) {
    const err = fromDbError({ message: code });
    assertEquals([err.status, err.code], [status, code]);
  }
});

Deno.test('erro desconhecido vira 500 INTERNAL sem vazar detalhes', () => {
  const err = fromDbError({ message: 'relation "questions" does not exist' });
  assertEquals([err.status, err.code], [500, 'INTERNAL']);
  assertEquals(err.message.includes('relation'), false);
});

Deno.test('CORS ecoa só origens permitidas', () => {
  const allowed = parseAllowedOrigins('http://localhost:5173, https://quiz.vercel.app/');
  assertEquals(allowed, ['http://localhost:5173', 'https://quiz.vercel.app']);
  assertEquals(
    corsHeaders('https://quiz.vercel.app', allowed)['Access-Control-Allow-Origin'],
    'https://quiz.vercel.app',
  );
  assertEquals(
    corsHeaders('https://evil.example', allowed)['Access-Control-Allow-Origin'],
    'http://localhost:5173',
  );
});

Deno.test('IP: usa o primeiro x-forwarded-for e gera hash sha256', async () => {
  assertEquals(getClientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })), '1.2.3.4');
  assertEquals(getClientIp(new Headers()), 'unknown');
  assertEquals(
    await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

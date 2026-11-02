/**
 * Teste de integração do backend contra o projeto Supabase de DEV.
 * Cobre as regras que vivem no SQL: ordem, resposta única, retry idempotente,
 * expiração, rodada suspeita, envio único e o sigilo do gabarito.
 *
 * Uso: npx tsx scripts/integration-backend.ts   (lê .env.local)
 * Requer: migration aplicada, functions publicadas e perguntas seedadas.
 */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

const env = loadEnv(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);
const url = env.VITE_SUPABASE_URL;
const anon = createClient(url, env.VITE_SUPABASE_ANON_KEY);
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const createdSessions: string[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- respostas variam por endpoint
async function call(fn: string, body: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
      Origin: 'http://localhost:5173',
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function startSession(level = 'mixed') {
  const r = await call('start-session', { level, recentQuestionIds: [] });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  createdSessions.push(r.json.sessionId);
  return r.json as { sessionId: string; questions: Record<string, unknown>[] };
}

const steps: [string, () => Promise<void>][] = [
  [
    'anon não lê nenhuma tabela',
    async () => {
      for (const table of ['questions', 'sessions', 'session_answers', 'leaderboard']) {
        const { data } = await anon.from(table).select('*').limit(1);
        assert.ok(!data || data.length === 0, `anon leu ${table}`);
      }
      const { error } = await anon.rpc('record_answer', {
        p_session_id: crypto.randomUUID(),
        p_position: 0,
        p_answer: true,
      });
      assert.ok(error, 'anon conseguiu executar record_answer');
    },
  ],
  [
    'start-session não devolve gabarito',
    async () => {
      const s = await startSession('mixed');
      assert.equal(s.questions.length, 10);
      for (const q of s.questions) {
        assert.deepEqual(Object.keys(q).sort(), [
          'category',
          'id',
          'level',
          'position',
          'statement',
        ]);
      }
    },
  ],
  [
    'ordem, resposta única, retry idempotente e rodada suspeita',
    async () => {
      const s = await startSession('beginner');
      const id = s.sessionId;

      let r = await call('submit-answer', { sessionId: id, position: 1, answer: true });
      assert.equal(r.json.error?.code, 'OUT_OF_ORDER');

      r = await call('submit-answer', { sessionId: id, position: 0, answer: true });
      assert.equal(r.status, 200);
      const first = r.json;
      assert.ok(first.explanation && first.docUrl);

      r = await call('submit-answer', { sessionId: id, position: 0, answer: true });
      assert.equal(r.status, 200, 'retry com a mesma resposta deveria devolver 200');
      assert.deepEqual(r.json, first);

      r = await call('submit-answer', { sessionId: id, position: 0, answer: false });
      assert.equal(r.json.error?.code, 'ALREADY_ANSWERED');

      r = await call('submit-score', { sessionId: id, nickname: 'itest_user' });
      assert.equal(r.json.error?.code, 'NOT_FINISHED');

      for (let p = 1; p < 10; p++) {
        r = await call('submit-answer', { sessionId: id, position: p, answer: p % 2 === 0 });
        assert.equal(r.status, 200);
      }
      assert.equal(r.json.finished, true);
      assert.equal(typeof r.json.result.durationMs, 'number');

      r = await call('submit-score', { sessionId: id, nickname: 'itest_user' });
      assert.equal(r.json.error?.code, 'SUSPICIOUS_RUN');
    },
  ],
  [
    'nickname inválido, envio ao ranking e envio único',
    async () => {
      const s = await startSession('advanced');
      const id = s.sessionId;
      for (let p = 0; p < 10; p++) {
        await call('submit-answer', { sessionId: id, position: p, answer: true });
      }
      // Simula uma rodada de 20s (o teste não espera os 15s reais).
      await admin.from('sessions').update({ duration_ms: 20_000 }).eq('id', id);

      let r = await call('submit-score', { sessionId: id, nickname: 'porra' });
      assert.equal(r.json.error?.code, 'INVALID_NICKNAME');
      r = await call('submit-score', { sessionId: id, nickname: ' espaco' });
      assert.equal(r.json.error?.code, 'INVALID_NICKNAME');

      const nickname = `itest_${Math.random().toString(36).slice(2, 8)}`;
      r = await call('submit-score', { sessionId: id, nickname });
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.equal(r.json.level, 'advanced');
      assert.ok(r.json.rank >= 1);

      r = await call('submit-score', { sessionId: id, nickname });
      assert.equal(r.json.error?.code, 'ALREADY_SUBMITTED');

      const { data, error } = await anon.rpc('get_leaderboard', {
        p_level: 'advanced',
        p_period: 'week',
        p_limit: 100,
      });
      assert.ifError(error);
      assert.ok(data.some((row: { nickname: string }) => row.nickname === nickname));
    },
  ],
  [
    'sessão expirada',
    async () => {
      const s = await startSession('intermediate');
      await admin
        .from('sessions')
        .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq('id', s.sessionId);
      const r = await call('submit-answer', { sessionId: s.sessionId, position: 0, answer: true });
      assert.equal(r.status, 410);
      assert.equal(r.json.error?.code, 'SESSION_EXPIRED');
    },
  ],
  [
    'entrada inválida',
    async () => {
      const r = await call('submit-answer', { sessionId: 'x', position: 0, answer: 'yes' });
      assert.equal(r.status, 400);
      assert.equal(r.json.error?.code, 'BAD_REQUEST');
    },
  ],
];

let failed = 0;
try {
  for (const [name, fn] of steps) {
    try {
      await fn();
      console.log(`ok    ${name}`);
    } catch (err) {
      failed++;
      console.log(`FAIL  ${name}\n      ${(err as Error).message}`);
    }
  }
} finally {
  if (createdSessions.length) {
    await admin.from('leaderboard').delete().in('session_id', createdSessions);
    await admin.from('sessions').delete().in('id', createdSessions);
  }
}
console.log(`\n${steps.length - failed}/${steps.length} passaram`);
process.exit(failed ? 1 : 0);

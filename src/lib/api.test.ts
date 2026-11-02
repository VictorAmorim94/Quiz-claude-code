import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQuestions, makeResult, SESSION_ID } from '../test/fixtures';
import {
  ApiError,
  friendlyMessage,
  getLeaderboard,
  startSession,
  submitAnswer,
  submitScore,
} from './api';

const URL = 'https://proj.supabase.co';
const JWT_KEY = 'eyJhbGciOiJIUzI1NiJ9.e30.sig';

function mockFetch(status: number, body: unknown) {
  const fn = vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('api', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', JWT_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('startSession envia nível e recentes e valida a resposta', async () => {
    const questions = makeQuestions();
    const fetchMock = mockFetch(200, { sessionId: SESSION_ID, expiresAt: 'x', questions });
    const res = await startSession('beginner', ['beg-001']);
    expect(res.questions).toHaveLength(10);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${URL}/functions/v1/start-session`);
    expect(JSON.parse(init.body)).toEqual({ level: 'beginner', recentQuestionIds: ['beg-001'] });
    expect(init.headers).toMatchObject({ apikey: JWT_KEY, Authorization: `Bearer ${JWT_KEY}` });
  });

  it('chave publishable vai só no apikey (sem Authorization)', async () => {
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_abc');
    const fetchMock = mockFetch(200, makeResult());
    await submitAnswer(SESSION_ID, 0, true);
    expect(fetchMock.mock.calls[0]![1].headers).not.toHaveProperty('Authorization');
  });

  it('rejeita resposta que traria o gabarito em formato inesperado', async () => {
    mockFetch(200, { sessionId: SESSION_ID, expiresAt: 'x', questions: [] });
    await expect(startSession('beginner', [])).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });

  it('converte o formato de erro da API em ApiError', async () => {
    mockFetch(410, { error: { code: 'SESSION_EXPIRED', message: 'Sua rodada expirou.' } });
    const err = await submitAnswer(SESSION_ID, 3, false).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 410, code: 'SESSION_EXPIRED', retryable: false });
  });

  it('erro sem corpo padrão vira HTTP_<status>, retentável se 5xx', async () => {
    mockFetch(502, undefined);
    await expect(submitScore(SESSION_ID, 'ana')).rejects.toMatchObject({
      code: 'HTTP_502',
      retryable: true,
    });
  });

  it('falha de rede vira NETWORK (retentável)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(submitAnswer(SESSION_ID, 0, true)).rejects.toMatchObject({
      code: 'NETWORK',
      retryable: true,
    });
  });

  it('getLeaderboard chama a RPC e converte rank', async () => {
    const fetchMock = mockFetch(200, [
      { rank: '1', nickname: 'ana', score: 9, duration_ms: 50_000, finished_at: '2026-11-01' },
    ]);
    const rows = await getLeaderboard('mixed', 'week');
    expect(rows[0]!.rank).toBe(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(`${URL}/rest/v1/rpc/get_leaderboard`);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      p_level: 'mixed',
      p_period: 'week',
      p_limit: 50,
    });
  });

  it('sem configuração, falha com CONFIG', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    await expect(startSession('beginner', [])).rejects.toMatchObject({ code: 'CONFIG' });
  });

  it('friendlyMessage cobre os casos do PRD §9', () => {
    expect(friendlyMessage({ code: 'RATE_LIMITED', message: '' })).toMatch(/Muitas rodadas/);
    expect(friendlyMessage({ code: 'OTHER', message: 'X' })).toBe('X');
    expect(friendlyMessage(null)).toMatch(/Algo deu errado/);
  });
});

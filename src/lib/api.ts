import { z } from 'zod';
import {
  BOARD_LEVELS,
  CATEGORIES,
  QUIZ_LEVELS,
  type AnswerResult,
  type BoardLevel,
  type Period,
  type PublicQuestion,
} from '../types';

/**
 * Cliente HTTP do backend (Supabase Edge Functions + RPC do ranking).
 * Usa fetch direto em vez do supabase-js: são só 4 chamadas e economiza bundle.
 * Toda resposta é validada com Zod antes de chegar à UI.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Falhas transitórias: vale a pena reenviar o mesmo payload. */
  get retryable(): boolean {
    return this.code === 'NETWORK' || this.status >= 500 || this.status === 0;
  }
}

// ---------------------------------------------------------------------------
// Schemas das respostas
// ---------------------------------------------------------------------------

export const PublicQuestionSchema: z.ZodType<PublicQuestion> = z.object({
  position: z.number().int().min(0).max(9),
  id: z.string(),
  level: z.enum(QUIZ_LEVELS),
  category: z.enum(CATEGORIES),
  statement: z.string(),
});

const StartSessionResponse = z.object({
  sessionId: z.string().uuid(),
  expiresAt: z.string(),
  questions: z.array(PublicQuestionSchema).length(10),
});
export type StartSessionResult = z.infer<typeof StartSessionResponse>;

export const AnswerResultSchema: z.ZodType<AnswerResult> = z.object({
  correct: z.boolean(),
  correctAnswer: z.boolean(),
  explanation: z.string(),
  docUrl: z.string(),
  scoreSoFar: z.number().int(),
  finished: z.boolean(),
  result: z.object({ score: z.number().int(), durationMs: z.number().int() }).nullable(),
});

const SubmitScoreResponse = z.object({
  rank: z.number().int().nullable(),
  level: z.enum(BOARD_LEVELS),
});
export type SubmitScoreResult = z.infer<typeof SubmitScoreResponse>;

const LeaderboardRowSchema = z.object({
  rank: z.coerce.number().int(),
  nickname: z.string(),
  score: z.number().int(),
  duration_ms: z.number().int(),
  finished_at: z.string(),
});
const LeaderboardResponse = z.array(LeaderboardRowSchema);
export type LeaderboardRow = z.infer<typeof LeaderboardRowSchema>;

const ErrorBody = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

// ---------------------------------------------------------------------------
// Transporte
// ---------------------------------------------------------------------------

function config() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new ApiError(0, 'CONFIG', 'Configuração do Supabase ausente (veja .env.example).');
  }
  return { url: url.replace(/\/$/, ''), key };
}

function headers(key: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', apikey: key };
  // Chave anon legada é um JWT; a publishable (sb_publishable_…) vai só no apikey.
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

async function post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const { url, key } = config();
  let res: Response;
  try {
    res = await fetch(`${url}${path}`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(body),
    });
  } catch {
    if (import.meta.env.DEV) {
      // Falha de rede em dev quase sempre é CORS: a origem da página não está
      // no secret ALLOWED_ORIGIN das Edge Functions (ex.: Vite em outra porta).
      console.warn(
        `[api] Falha de rede em ${path}. Se for CORS, confira se "${window.location.origin}" ` +
          'está no secret ALLOWED_ORIGIN das Edge Functions.',
      );
    }
    throw new ApiError(0, 'NETWORK', 'Não foi possível conectar. Verifique sua internet.');
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Corpo vazio ou não-JSON: tratado abaixo.
  }

  if (!res.ok) {
    const err = ErrorBody.safeParse(json);
    if (err.success) throw new ApiError(res.status, err.data.error.code, err.data.error.message);
    throw new ApiError(res.status, `HTTP_${res.status}`, 'Erro inesperado. Tente novamente.');
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error('Resposta inválida do servidor', path, parsed.error.issues);
    throw new ApiError(res.status, 'BAD_RESPONSE', 'Resposta inesperada do servidor.');
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Endpoints (contratos em prd.md §8.4)
// ---------------------------------------------------------------------------

export function startSession(
  level: BoardLevel,
  recentQuestionIds: string[],
): Promise<StartSessionResult> {
  return post('/functions/v1/start-session', { level, recentQuestionIds }, StartSessionResponse);
}

export function submitAnswer(
  sessionId: string,
  position: number,
  answer: boolean,
): Promise<AnswerResult> {
  return post('/functions/v1/submit-answer', { sessionId, position, answer }, AnswerResultSchema);
}

export function submitScore(sessionId: string, nickname: string): Promise<SubmitScoreResult> {
  return post('/functions/v1/submit-score', { sessionId, nickname }, SubmitScoreResponse);
}

export function getLeaderboard(
  level: BoardLevel,
  period: Period,
  limit = 50,
): Promise<LeaderboardRow[]> {
  return post(
    '/rest/v1/rpc/get_leaderboard',
    { p_level: level, p_period: period, p_limit: limit },
    LeaderboardResponse,
  );
}

/** Mensagem amigável para os erros conhecidos (prd.md §9). */
export function friendlyMessage(err: { code: string; message: string } | null | undefined): string {
  if (!err) return 'Algo deu errado. Tente novamente.';
  switch (err.code) {
    case 'NETWORK':
      return 'Não foi possível enviar. Verifique sua conexão e tente novamente.';
    case 'RATE_LIMITED':
      return 'Muitas rodadas em pouco tempo. Tente novamente em alguns minutos.';
    case 'SESSION_EXPIRED':
      return 'Sua rodada expirou.';
    case 'SUSPICIOUS_RUN':
      return 'Rodada muito rápida para entrar no ranking.';
    case 'INSUFFICIENT_QUESTIONS':
      return 'O banco de perguntas está indisponível no momento. Tente mais tarde.';
    default:
      return err.message || 'Algo deu errado. Tente novamente.';
  }
}

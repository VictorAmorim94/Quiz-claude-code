// Formato de erro padrão: { "error": { "code": "...", "message": "..." } }

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'OUT_OF_ORDER'
  | 'ALREADY_ANSWERED'
  | 'NOT_FINISHED'
  | 'ALREADY_SUBMITTED'
  | 'INVALID_NICKNAME'
  | 'SUSPICIOUS_RUN'
  | 'INSUFFICIENT_QUESTIONS'
  | 'INTERNAL';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Erros levantados pelas funções SQL (raise exception '<CODE>'). */
const DB_ERRORS: Partial<Record<ErrorCode, [number, string]>> = {
  SESSION_NOT_FOUND: [404, 'Sessão não encontrada.'],
  SESSION_EXPIRED: [410, 'Sua rodada expirou.'],
  OUT_OF_ORDER: [409, 'Responda as perguntas na ordem.'],
  ALREADY_ANSWERED: [409, 'Esta pergunta já foi respondida.'],
  NOT_FINISHED: [400, 'A rodada ainda não terminou.'],
  ALREADY_SUBMITTED: [409, 'Esta rodada já foi enviada ao ranking.'],
  SUSPICIOUS_RUN: [422, 'Rodada muito rápida para entrar no ranking.'],
};

export function fromDbError(err: { message?: string } | null | undefined): ApiError {
  const code = (err?.message ?? '').trim() as ErrorCode;
  const known = DB_ERRORS[code];
  if (known) return new ApiError(known[0], code, known[1]);
  return new ApiError(500, 'INTERNAL', 'Erro interno. Tente novamente.');
}

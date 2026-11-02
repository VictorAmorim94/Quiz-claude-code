// POST /functions/v1/start-session — sorteia a rodada e devolve as perguntas SEM gabarito.
import { drawQuestions, InsufficientQuestionsError, type DrawCandidate } from '../_shared/draw.ts';
import { ApiError } from '../_shared/errors.ts';
import { getClientIp, hashIp } from '../_shared/hash.ts';
import { log, serveJson } from '../_shared/http.ts';
import { StartSessionBody } from '../_shared/schemas.ts';
import { adminClient, envInt } from '../_shared/supabase.ts';

interface QuestionRow extends DrawCandidate {
  category: string;
  statement: string;
}

serveJson('start-session', StartSessionBody, async (body, { req }) => {
  const db = adminClient();
  const salt = Deno.env.get('IP_HASH_SALT');
  if (!salt) throw new Error('IP_HASH_SALT not set');

  // RN15: rate limit por hash de IP.
  const ipHash = await hashIp(getClientIp(req.headers), salt);
  const limit = envInt('RATE_LIMIT_PER_HOUR', 30);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await db
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('started_at', since);
  if (countError) throw countError;
  if ((count ?? 0) >= limit) {
    throw new ApiError(
      429,
      'RATE_LIMITED',
      'Muitas rodadas em pouco tempo. Tente novamente em alguns minutos.',
    );
  }

  const levels = body.level === 'mixed' ? ['beginner', 'intermediate', 'advanced'] : [body.level];
  const { data: pool, error: poolError } = await db
    .from('questions')
    .select('id, level, category, statement, answer')
    .eq('active', true)
    .in('level', levels)
    .returns<QuestionRow[]>();
  if (poolError) throw poolError;

  let drawn: DrawCandidate[];
  try {
    drawn = drawQuestions(pool ?? [], body.level, body.recentQuestionIds);
  } catch (err) {
    if (err instanceof InsufficientQuestionsError) {
      log('error', 'start-session.insufficient_questions', { message: err.message });
      throw new ApiError(503, 'INSUFFICIENT_QUESTIONS', 'Banco de perguntas indisponível.');
    }
    throw err;
  }

  const byId = new Map((pool ?? []).map((q) => [q.id, q]));
  const questionIds = drawn.map((q) => q.id);

  const { data: session, error: insertError } = await db
    .from('sessions')
    .insert({ level: body.level, question_ids: questionIds, ip_hash: ipHash })
    .select('id, expires_at')
    .single();
  if (insertError) throw insertError;

  // Princípio central: answer, explanation e doc_url NUNCA saem daqui.
  return {
    sessionId: session.id,
    expiresAt: session.expires_at,
    questions: questionIds.map((id, position) => {
      const q = byId.get(id)!;
      return { position, id, level: q.level, category: q.category, statement: q.statement };
    }),
  };
});

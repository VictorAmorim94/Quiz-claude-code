// POST /functions/v1/submit-score — envia uma rodada concluída ao ranking.
import { ApiError, fromDbError } from '../_shared/errors.ts';
import { serveJson } from '../_shared/http.ts';
import { NICKNAME_MESSAGES, validateNickname } from '../_shared/nickname.ts';
import { SubmitScoreBody } from '../_shared/schemas.ts';
import { adminClient } from '../_shared/supabase.ts';

/** RN14: rodadas abaixo disso não entram no ranking. */
const MIN_RUN_DURATION_MS = 15_000;

serveJson('submit-score', SubmitScoreBody, async (body) => {
  const nicknameError = validateNickname(body.nickname);
  if (nicknameError) {
    // Não expõe a lista de palavrões: só uma mensagem genérica.
    throw new ApiError(422, 'INVALID_NICKNAME', NICKNAME_MESSAGES[nicknameError]);
  }

  const { data, error } = await adminClient().rpc('submit_to_leaderboard', {
    p_session_id: body.sessionId,
    p_nickname: body.nickname,
    p_min_duration_ms: MIN_RUN_DURATION_MS,
  });
  if (error) throw fromDbError(error);
  return data;
});

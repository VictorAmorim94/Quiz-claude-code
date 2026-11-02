// POST /functions/v1/submit-answer — corrige uma resposta (lógica atômica em record_answer).
import { fromDbError } from '../_shared/errors.ts';
import { serveJson } from '../_shared/http.ts';
import { SubmitAnswerBody } from '../_shared/schemas.ts';
import { adminClient } from '../_shared/supabase.ts';

serveJson('submit-answer', SubmitAnswerBody, async (body) => {
  const { data, error } = await adminClient().rpc('record_answer', {
    p_session_id: body.sessionId,
    p_position: body.position,
    p_answer: body.answer,
  });
  if (error) throw fromDbError(error);
  return data;
});

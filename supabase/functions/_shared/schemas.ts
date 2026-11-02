import { z } from 'npm:zod@3.25.76';

const boardLevel = z.enum(['beginner', 'intermediate', 'advanced', 'mixed']);
const questionId = z.string().regex(/^(beg|int|adv)-\d{3}$/);

export const StartSessionBody = z.object({
  level: boardLevel,
  recentQuestionIds: z.array(questionId).max(30).default([]),
});

export const SubmitAnswerBody = z.object({
  sessionId: z.string().uuid(),
  position: z.number().int().min(0).max(9),
  answer: z.boolean(),
});

// Formato/palavrões do nickname são validados em nickname.ts, para devolver INVALID_NICKNAME.
export const SubmitScoreBody = z.object({
  sessionId: z.string().uuid(),
  nickname: z.string().max(100),
});

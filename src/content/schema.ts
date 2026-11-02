import { z } from 'zod';
import { CATEGORIES, QUIZ_LEVELS, type Category, type QuizLevel } from '../types';

const ID_PREFIX: Record<QuizLevel, string> = {
  beginner: 'beg',
  intermediate: 'int',
  advanced: 'adv',
};

export const QuestionSchema = z
  .object({
    id: z.string().regex(/^(beg|int|adv)-\d{3}$/, 'id deve ser {beg|int|adv}-NNN'),
    level: z.enum(QUIZ_LEVELS),
    category: z.enum(CATEGORIES),
    statement: z.string().trim().min(10).max(200),
    answer: z.boolean(),
    explanation: z.string().trim().min(20),
    doc_url: z
      .string()
      .url()
      .refine(
        (u) => /^https:\/\/(docs\.claude\.com|docs\.anthropic\.com|code\.claude\.com)\//.test(u),
        'doc_url deve apontar para a documentação oficial',
      ),
    active: z.boolean(),
  })
  .strict()
  .refine((q) => q.id.startsWith(`${ID_PREFIX[q.level]}-`), {
    message: 'o prefixo do id não corresponde ao level',
    path: ['id'],
  });

export type Question = z.infer<typeof QuestionSchema>;

export const QuestionFileSchema = z.array(QuestionSchema);

/** Distribuição sugerida por categoria (prd.md §6.1). */
export const CATEGORY_TARGETS: Record<QuizLevel, Partial<Record<Category, number>>> = {
  beginner: {
    fundamentos: 8,
    interfaces: 6,
    seguranca: 6,
    contexto: 5,
    comandos: 3,
    workflows: 2,
  },
  intermediate: {
    fundamentos: 2,
    interfaces: 3,
    seguranca: 5,
    contexto: 6,
    comandos: 7,
    workflows: 5,
    extensibilidade: 2,
  },
  advanced: {
    seguranca: 3,
    contexto: 3,
    comandos: 2,
    workflows: 3,
    extensibilidade: 12,
    automacao: 7,
  },
};

import { QUIZ_LEVELS } from '../types';
import { CATEGORY_TARGETS, QuestionFileSchema, type Question } from './schema';

export type ValidationMode = 'strict' | 'dev';

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  questions: Question[];
}

const PER_LEVEL_STRICT = 30;
/** Mínimo para o sorteio funcionar (10 por rodada, 4 no bloco do Misto). */
const PER_LEVEL_DEV = 10;

/**
 * Valida o arquivo de perguntas.
 * - strict: regras do PRD (§6.1, RN03) — usado antes do seed de produção.
 * - dev: só o necessário para jogar (fixture do projeto de dev).
 */
export function validateQuestions(raw: unknown, mode: ValidationMode = 'strict'): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = QuestionFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [index, field] = issue.path;
      const id =
        Array.isArray(raw) && typeof index === 'number'
          ? ((raw[index] as { id?: string })?.id ?? `#${index}`)
          : '';
      errors.push(`${id}${field ? `.${String(field)}` : ''}: ${issue.message}`);
    }
    return { ok: false, errors, warnings, questions: [] };
  }

  const questions = parsed.data;
  const seen = new Set<string>();
  const statements = new Map<string, string>();
  for (const q of questions) {
    if (seen.has(q.id)) errors.push(`${q.id}: id duplicado`);
    seen.add(q.id);
    const key = q.statement.toLowerCase().replace(/\s+/g, ' ');
    const dup = statements.get(key);
    if (dup) errors.push(`${q.id}: mesma afirmação de ${dup}`);
    statements.set(key, q.id);
    if (mode === 'strict' && q.statement.includes('[DEV]')) {
      errors.push(`${q.id}: item de fixture [DEV] no arquivo de produção`);
    }
    const sentences = q.explanation.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    if (sentences < 2 || sentences > 4) {
      warnings.push(`${q.id}: explicação com ${sentences} frase(s) (esperado 2–4)`);
    }
  }

  for (const level of QUIZ_LEVELS) {
    const active = questions.filter((q) => q.active && q.level === level);
    const trues = active.filter((q) => q.answer).length;
    const ratio = active.length ? trues / active.length : 0;

    if (mode === 'strict') {
      if (active.length !== PER_LEVEL_STRICT) {
        errors.push(`${level}: ${active.length} perguntas ativas (esperado ${PER_LEVEL_STRICT})`);
      }
      if (active.length && (ratio < 0.4 || ratio > 0.6)) {
        errors.push(`${level}: ${Math.round(ratio * 100)}% verdadeiras (esperado 40–60%, RN03)`);
      }
      for (const [category, target] of Object.entries(CATEGORY_TARGETS[level])) {
        const n = active.filter((q) => q.category === category).length;
        if (n !== target)
          warnings.push(`${level}/${category}: ${n} perguntas (sugerido ${target})`);
      }
      const unexpected = active.filter((q) => !(q.category in CATEGORY_TARGETS[level]));
      for (const q of unexpected) {
        warnings.push(`${q.id}: categoria ${q.category} não prevista para ${level}`);
      }
    } else {
      if (active.length < PER_LEVEL_DEV) {
        errors.push(`${level}: ${active.length} perguntas ativas (mínimo ${PER_LEVEL_DEV} no dev)`);
      }
      if (active.length && (trues < 3 || active.length - trues < 3)) {
        errors.push(`${level}: precisa de ao menos 3 verdadeiras e 3 falsas para o sorteio`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, questions };
}

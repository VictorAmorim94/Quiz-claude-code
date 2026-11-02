import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Question } from './schema';
import { validateQuestions } from './validate';

const PREFIX = { beginner: 'beg', intermediate: 'int', advanced: 'adv' } as const;
const CATEGORIES = {
  beginner: [
    ...Array(8).fill('fundamentos'),
    ...Array(6).fill('interfaces'),
    ...Array(6).fill('seguranca'),
    ...Array(5).fill('contexto'),
    ...Array(3).fill('comandos'),
    ...Array(2).fill('workflows'),
  ],
  intermediate: [
    ...Array(2).fill('fundamentos'),
    ...Array(3).fill('interfaces'),
    ...Array(5).fill('seguranca'),
    ...Array(6).fill('contexto'),
    ...Array(7).fill('comandos'),
    ...Array(5).fill('workflows'),
    ...Array(2).fill('extensibilidade'),
  ],
  advanced: [
    ...Array(3).fill('seguranca'),
    ...Array(3).fill('contexto'),
    ...Array(2).fill('comandos'),
    ...Array(3).fill('workflows'),
    ...Array(12).fill('extensibilidade'),
    ...Array(7).fill('automacao'),
  ],
} as Record<keyof typeof PREFIX, Question['category'][]>;

function makeBank(): Question[] {
  return (Object.keys(PREFIX) as (keyof typeof PREFIX)[]).flatMap((level) =>
    Array.from({ length: 30 }, (_, i) => ({
      id: `${PREFIX[level]}-${String(i + 1).padStart(3, '0')}`,
      level,
      category: CATEGORIES[level][i]!,
      statement: `Afirmação número ${i + 1} do nível ${level} para teste.`,
      answer: i % 2 === 0,
      explanation: 'Primeira frase da explicação. Segunda frase da explicação.',
      doc_url: 'https://docs.claude.com/en/docs/claude-code/overview',
      active: true,
    })),
  );
}

describe('validateQuestions (estrito)', () => {
  it('aceita um banco completo e equilibrado sem avisos', () => {
    const r = validateQuestions(makeBank());
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('exige 30 ativas por nível (inativas não contam)', () => {
    const bank = makeBank();
    bank[0]!.active = false;
    const r = validateQuestions(bank);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('beginner: 29 perguntas ativas (esperado 30)');
  });

  it('exige 40–60% de verdadeiras por nível', () => {
    const bank = makeBank().map((q) => (q.level === 'advanced' ? { ...q, answer: true } : q));
    const r = validateQuestions(bank);
    expect(r.errors).toContain('advanced: 100% verdadeiras (esperado 40–60%, RN03)');
  });

  it('detecta id duplicado e afirmação repetida', () => {
    const bank = makeBank();
    bank[1] = { ...bank[1]!, id: bank[0]!.id };
    bank[3] = { ...bank[3]!, statement: bank[2]!.statement };
    const r = validateQuestions(bank);
    expect(r.errors).toContain('beg-001: id duplicado');
    expect(r.errors.some((e) => e.includes('mesma afirmação'))).toBe(true);
  });

  it('valida campos: prefixo do id, tamanho, categoria, doc_url e campos extras', () => {
    const bank: unknown[] = makeBank();
    bank[0] = { ...(bank[0] as Question), id: 'adv-001' };
    bank[1] = { ...(bank[1] as Question), statement: 'x'.repeat(201) };
    bank[2] = { ...(bank[2] as Question), category: 'marketing' };
    bank[3] = { ...(bank[3] as Question), doc_url: 'https://example.com/blog' };
    bank[4] = { ...(bank[4] as Question), extra: 1 };
    const r = validateQuestions(bank);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(5);
    expect(r.errors[0]).toMatch(/^adv-001\.id: o prefixo/);
  });

  it('bloqueia itens [DEV] no arquivo de produção', () => {
    const bank = makeBank();
    bank[0]!.statement = '[DEV] Afirmação de teste.';
    expect(validateQuestions(bank).errors).toContain(
      'beg-001: item de fixture [DEV] no arquivo de produção',
    );
  });

  it('avisa (sem falhar) sobre distribuição de categorias e explicação fora de 2–4 frases', () => {
    const bank = makeBank();
    bank[0]!.category = 'workflows';
    bank[1]!.explanation = 'Uma frase só, sem continuação';
    const r = validateQuestions(bank);
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('beginner/fundamentos: 7 perguntas (sugerido 8)');
    expect(r.warnings).toContain('beg-002: explicação com 1 frase(s) (esperado 2–4)');
  });
});

describe('arquivos de conteúdo', () => {
  it('o fixture de dev passa no modo dev', () => {
    const raw = JSON.parse(readFileSync('content/questions.dev.json', 'utf8'));
    const r = validateQuestions(raw, 'dev');
    expect(r.errors).toEqual([]);
  });

  const prod = JSON.parse(readFileSync('content/questions.json', 'utf8')) as unknown[];
  // Fica pendente até o banco real (90 perguntas) ser escrito.
  it.skipIf(prod.length < 90)('content/questions.json passa no modo estrito', () => {
    expect(validateQuestions(prod, 'strict').errors).toEqual([]);
  });
});

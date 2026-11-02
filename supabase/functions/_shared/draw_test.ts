import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  type DrawCandidate,
  drawQuestions,
  InsufficientQuestionsError,
  type QuizLevel,
} from './draw.ts';

const PREFIX: Record<QuizLevel, string> = { beginner: 'beg', intermediate: 'int', advanced: 'adv' };

/** V/F intercalados em blocos de 4 (0.5 → V V F F …, 0.75 → V V V F …). */
function makePool(level: QuizLevel, n: number, trueRatio = 0.5): DrawCandidate[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${PREFIX[level]}-${String(i + 1).padStart(3, '0')}`,
    level,
    answer: i % 4 < trueRatio * 4,
  }));
}

const FULL_POOL = [
  ...makePool('beginner', 30),
  ...makePool('intermediate', 30),
  ...makePool('advanced', 30),
];

/** RNG determinístico (mulberry32) para testes reprodutíveis. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

Deno.test('sorteia 10 perguntas distintas do nível pedido', () => {
  for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
    const drawn = drawQuestions(FULL_POOL, level, [], seeded(1));
    assertEquals(drawn.length, 10);
    assertEquals(new Set(drawn.map((q) => q.id)).size, 10);
    assert(drawn.every((q) => q.level === level));
  }
});

Deno.test('misto: 3 iniciante, 4 intermediário, 3 avançado, em ordem crescente', () => {
  for (let seed = 0; seed < 50; seed++) {
    const drawn = drawQuestions(FULL_POOL, 'mixed', [], seeded(seed));
    assertEquals(
      drawn.map((q) => q.level),
      [
        'beginner',
        'beginner',
        'beginner',
        'intermediate',
        'intermediate',
        'intermediate',
        'intermediate',
        'advanced',
        'advanced',
        'advanced',
      ],
    );
  }
});

Deno.test('toda rodada tem de 3 a 7 verdadeiras', () => {
  for (let seed = 0; seed < 500; seed++) {
    for (const level of ['beginner', 'mixed'] as const) {
      const trues = drawQuestions(FULL_POOL, level, [], seeded(seed)).filter(
        (q) => q.answer,
      ).length;
      assert(trues >= 3 && trues <= 7, `seed ${seed} ${level}: ${trues} verdadeiras`);
    }
  }
});

Deno.test('refaz o sorteio quando cai fora do equilíbrio', () => {
  // 12 perguntas, só 3 falsas: sem refazer, muitos sorteios teriam 8+ verdadeiras.
  const pool = makePool('beginner', 12, 0.75);
  for (let seed = 0; seed < 200; seed++) {
    const trues = drawQuestions(pool, 'beginner', [], seeded(seed)).filter((q) => q.answer).length;
    assert(trues <= 7, `seed ${seed}: ${trues}`);
  }
});

Deno.test('evita perguntas recentes quando há perguntas suficientes', () => {
  const recent = FULL_POOL.filter((q) => q.level === 'beginner')
    .slice(0, 20)
    .map((q) => q.id);
  for (let seed = 0; seed < 50; seed++) {
    const drawn = drawQuestions(FULL_POOL, 'beginner', recent, seeded(seed));
    assert(drawn.every((q) => !recent.includes(q.id)));
  }
});

Deno.test('equilíbrio V/F (RN03) tem prioridade sobre evitar recentes (RN16)', () => {
  const pool = makePool('beginner', 30);
  // As 10 não recentes são todas falsas: evitar recentes daria 0 verdadeiras.
  const freshIds = new Set(
    pool
      .filter((q) => !q.answer)
      .slice(0, 10)
      .map((q) => q.id),
  );
  const recent = pool.filter((q) => !freshIds.has(q.id)).map((q) => q.id);
  const trues = drawQuestions(pool, 'beginner', recent, seeded(7)).filter((q) => q.answer).length;
  assert(trues >= 3 && trues <= 7);
});

Deno.test('ignora o filtro de recentes quando o banco é pequeno', () => {
  const pool = makePool('beginner', 12);
  const recent = pool.slice(0, 5).map((q) => q.id); // sobram só 7 não recentes
  const drawn = drawQuestions(pool, 'beginner', recent, seeded(3));
  assertEquals(drawn.length, 10);
});

Deno.test('erro quando o nível não tem perguntas suficientes', () => {
  assertThrows(
    () => drawQuestions(makePool('advanced', 9), 'advanced'),
    InsufficientQuestionsError,
  );
  assertThrows(
    () => drawQuestions([...makePool('beginner', 30), ...makePool('intermediate', 3)], 'mixed'),
    InsufficientQuestionsError,
  );
});

Deno.test('banco impossível de equilibrar ainda devolve 10 perguntas', () => {
  const drawn = drawQuestions(makePool('beginner', 10, 1), 'beginner', [], seeded(1), 5);
  assertEquals(drawn.length, 10);
});

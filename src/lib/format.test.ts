import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, scoreMessage } from './format';

describe('formatDuration', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [1000, '00:01'],
    [95_321, '01:35'],
    [600_000, '10:00'],
    [3_725_000, '62:05'],
    [-5, '00:00'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('formata no fuso de São Paulo', () => {
    // 02:00 UTC do dia 2 ainda é dia 1 em São Paulo (UTC-3).
    expect(formatDate('2026-11-02T02:00:00Z')).toBe('01/11/2026');
  });

  it('devolve string vazia para data inválida', () => {
    expect(formatDate('não é data')).toBe('');
  });
});

describe('scoreMessage', () => {
  it.each([
    [0, 'Bom começo'],
    [4, 'Bom começo'],
    [5, 'Mandou bem'],
    [7, 'Mandou bem'],
    [8, 'Excelente'],
    [9, 'Excelente'],
    [10, 'Perfeito'],
  ])('%i acertos', (score, prefix) => {
    expect(scoreMessage(score)).toMatch(new RegExp(`^${prefix}`));
  });
});

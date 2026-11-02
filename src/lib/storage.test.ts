import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getBestScores,
  getRecentQuestionIds,
  getTheme,
  pushRecentQuestionIds,
  read,
  recordBestScore,
  remove,
  write,
} from './storage';

describe('storage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lê e grava valores JSON', () => {
    write('qcc:lastNickname', 'carla_dev');
    expect(read('qcc:lastNickname')).toBe('carla_dev');
    remove('qcc:lastNickname');
    expect(read('qcc:lastNickname')).toBeNull();
  });

  it('devolve null para JSON corrompido', () => {
    window.localStorage.setItem('qcc:bestScores', '{oops');
    expect(read('qcc:bestScores')).toBeNull();
    expect(getBestScores()).toEqual({});
  });

  it('usa "system" quando o tema salvo é inválido', () => {
    window.localStorage.setItem('qcc:theme', JSON.stringify('purple'));
    expect(getTheme()).toBe('system');
  });

  it('mantém só as últimas 30 perguntas vistas, sem duplicatas', () => {
    pushRecentQuestionIds(Array.from({ length: 25 }, (_, i) => `beg-${i}`));
    pushRecentQuestionIds(['beg-0', ...Array.from({ length: 9 }, (_, i) => `int-${i}`)]);
    const ids = getRecentQuestionIds();
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(ids.at(-10)).toBe('beg-0');
    expect(ids.at(-1)).toBe('int-8');
  });

  it('só substitui o recorde quando o novo é melhor', () => {
    expect(recordBestScore('beginner', 7, 90_000)).toBe(true);
    expect(recordBestScore('beginner', 6, 10_000)).toBe(false);
    expect(recordBestScore('beginner', 7, 80_000)).toBe(true);
    expect(recordBestScore('beginner', 7, 85_000)).toBe(false);
    expect(getBestScores().beginner).toMatchObject({ score: 7, durationMs: 80_000 });
  });

  describe('com localStorage indisponível', () => {
    it('não lança erro e degrada para valores padrão', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      expect(() => write('qcc:theme', 'dark')).not.toThrow();
      expect(() => remove('qcc:theme')).not.toThrow();
      expect(read('qcc:theme')).toBeNull();
      expect(getTheme()).toBe('system');
      expect(getRecentQuestionIds()).toEqual([]);
      expect(() => pushRecentQuestionIds(['beg-001'])).not.toThrow();
      expect(() => recordBestScore('mixed', 5, 1000)).not.toThrow();
    });

    it('funciona quando o acesso a window.localStorage lança', () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(read('qcc:lastNickname')).toBeNull();
      expect(() => write('qcc:lastNickname', 'x')).not.toThrow();
    });
  });
});

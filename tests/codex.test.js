import { describe, it, expect } from 'vitest';
import { CODEX } from '../js/data/codexData.js';

describe('旅の書データ', () => {
  it('idが一意', () => {
    const ids = CODEX.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('全エントリが必須フィールドを持つ', () => {
    for (const e of CODEX) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.kana).toBeTruthy();
      expect(['かみ', 'ちめい', 'ことば']).toContain(e.category);
      expect(e.desc.length).toBeGreaterThan(10);
      expect(e.excerpt.length).toBeGreaterThan(5);
      expect(e.source).toMatch(/巻/);
    }
  });
  it('30件以上ある', () => expect(CODEX.length).toBeGreaterThanOrEqual(30));
});

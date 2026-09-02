import { describe, it, expect } from 'vitest';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { canEnter } from '../js/engine/movement.js';
import { CODEX } from '../js/data/codexData.js';
import { BOSSES } from '../js/data/bosses.js';

describe('マップ・章データの整合性', () => {
  for (const [id, ch] of Object.entries(CHAPTERS)) {
    it(`${id}: 行の長さが揃っている`, () => {
      const w = ch.map.rows[0].length;
      for (const row of ch.map.rows) expect(row.length).toBe(w);
    });
    it(`${id}: entryとトリガーが通行可能タイル上にある`, () => {
      expect(canEnter(ch.map, ch.entry.x, ch.entry.y)).toBe(true);
      for (const t of ch.triggers || []) expect(canEnter(ch.map, t.x, t.y)).toBe(true);
    });
    it(`${id}: イベント内のcodex/battle参照が実在する`, () => {
      const ids = new Set(CODEX.map((e) => e.id));
      const walk = (cmds) => { for (const c of cmds) {
        if (c.codex) expect(ids.has(c.codex)).toBe(true);
        if (c.battle) expect(BOSSES[c.battle]).toBeTruthy();
        if (c.if) { walk(c.then || []); walk(c.else || []); }
      } };
      for (const t of ch.triggers || []) walk(t.event || []);
      for (const n of ch.npcs || []) walk(n.event || []);
    });
    it(`${id}: トリガー座標が重複していない`, () => {
      const seen = new Set();
      for (const t of ch.triggers || []) {
        const key = `${t.x},${t.y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
    it(`${id}: クイズのanswerが選択肢の範囲内`, () => {
      for (const q of ch.quiz || []) {
        expect(q.choices.length).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
        expect(q.explain.length).toBeGreaterThan(5);
      }
    });
  }
});

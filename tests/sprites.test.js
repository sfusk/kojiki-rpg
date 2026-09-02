import { describe, it, expect } from 'vitest';
import { PAL, SPRITES, buildSprites } from '../js/data/sprites.js';

const REQUIRED_NAMES = [
  'hero_down', 'hero_up', 'hero_left', 'hero_right',
  'elder', 'lady', 'lord', 'warrior', 'rabbit', 'snake', 'flame',
];

describe('sprites.js', () => {
  it('PALは1文字キーの色コードを持つ', () => {
    expect(Object.keys(PAL).length).toBeGreaterThan(0);
    for (const [key, value] of Object.entries(PAL)) {
      expect(key.length).toBe(1);
      expect(value).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    }
  });

  it('全スプライトが32行×32文字である', () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
      expect(rows.length, `${name} の行数`).toBe(32);
      for (const [i, row] of rows.entries()) {
        expect(row.length, `${name} の${i}行目の文字数`).toBe(32);
      }
    }
  });

  it('全スプライトはPALのキーか透過(.)のみで構成される', () => {
    const validChars = new Set([...Object.keys(PAL), '.']);
    for (const [name, rows] of Object.entries(SPRITES)) {
      for (const [i, row] of rows.entries()) {
        for (const ch of row) {
          expect(validChars.has(ch), `${name} の${i}行目に不正な文字 '${ch}'`).toBe(true);
        }
      }
    }
  });

  it('必要なスプライト名（各方向・NPC）が揃っている', () => {
    const names = Object.keys(SPRITES);
    for (const base of REQUIRED_NAMES) {
      expect(names.some((n) => n.startsWith(`${base}_`)), `${base} のスプライトが存在しない`).toBe(true);
    }
  });

  it('主人公は4方向×2フレーム（計8枚）持つ', () => {
    const heroNames = Object.keys(SPRITES).filter((n) => n.startsWith('hero_'));
    expect(heroNames.length).toBe(8);
    for (const dir of ['down', 'up', 'left', 'right']) {
      expect(SPRITES[`hero_${dir}_0`]).toBeDefined();
      expect(SPRITES[`hero_${dir}_1`]).toBeDefined();
    }
  });

  it('buildSpritesは関数としてエクスポートされている（DOM依存のため呼び出しはブラウザ側で目視確認）', () => {
    expect(typeof buildSprites).toBe('function');
  });
});

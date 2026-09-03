// 海を船で渡る仕組みの検証。
// ワールドマップだけが sailable で、章の中の川や池は従来どおり渡れない。
import { describe, it, expect } from 'vitest';
import { canEnter, isSea, tryStep } from '../js/engine/movement.js';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { SPRITES } from '../js/data/sprites.js';

const sea = { sailable: true, rows: ['~~~~', '~..~', '~.M~', '~~~~'] };
const lake = { rows: ['....', '.~~.', '.~~.', '....'] };

describe('航行', () => {
  it('sailableなマップでは海に入れる', () => {
    expect(canEnter(sea, 0, 0)).toBe(true);
    expect(canEnter(sea, 1, 1)).toBe(true); // 陸も従来どおり
  });

  it('sailableでないマップの水には入れない', () => {
    expect(canEnter(lake, 1, 1)).toBe(false);
    expect(canEnter(lake, 0, 0)).toBe(true);
  });

  it('海でも山や岩は越えられない', () => {
    expect(canEnter(sea, 2, 2)).toBe(false);
  });

  it('マップ外へは出られない', () => {
    expect(canEnter(sea, -1, 0)).toBe(false);
    expect(canEnter(sea, 4, 0)).toBe(false);
    expect(canEnter(sea, 0, 4)).toBe(false);
  });

  it('陸から海へ、海から陸へ進める', () => {
    const toSea = tryStep(sea, { x: 1, y: 1, dir: 'up' }, 'up');
    expect(toSea).toEqual({ moved: true, pos: { x: 1, y: 0, dir: 'up' } });
    const toLand = tryStep(sea, { x: 1, y: 0, dir: 'down' }, 'down');
    expect(toLand).toEqual({ moved: true, pos: { x: 1, y: 1, dir: 'down' } });
  });

  it('isSeaが海と陸を見分ける', () => {
    expect(isSea(sea, 0, 0)).toBe(true);
    expect(isSea(sea, 1, 1)).toBe(false);
    expect(isSea(sea, -1, 0)).toBe(false); // 範囲外
  });
});

describe('船の見た目', () => {
  it('四方向ぶんの船の絵がそろっている', () => {
    const missing = [];
    for (const dir of ['up', 'down', 'left', 'right']) {
      for (const frame of [0, 1]) {
        if (!SPRITES[`ship_${dir}_${frame}`]) missing.push(`ship_${dir}_${frame}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('船の絵が32x32で定義されている', () => {
    const bad = [];
    for (const dir of ['up', 'down', 'left', 'right']) {
      const grid = SPRITES[`ship_${dir}_0`];
      if (grid.length !== 32) bad.push(`ship_${dir}_0: ${grid.length}行`);
      for (const row of grid) {
        if (row.length !== 32) bad.push(`ship_${dir}_0: ${row.length}文字の行`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('左右の船は互いの鏡像である（向きの取り違えを防ぐ）', () => {
    const right = SPRITES.ship_right_0;
    const left = SPRITES.ship_left_0;
    const mirrored = right.map((row) => [...row].reverse().join(''));
    expect(left).toEqual(mirrored);
  });
});

describe('マップごとの航行可否', () => {
  it('ワールドマップだけが航行可能', () => {
    expect(CHAPTERS.world.map.sailable).toBe(true);
    for (const [id, chapter] of Object.entries(CHAPTERS)) {
      if (id === 'world') continue;
      expect(chapter.map.sailable, `${id}が航行可能になっている`).toBeFalsy();
    }
  });

  it('章の中の水面には入れない（第三章の川など）', () => {
    // 第三章のマップには川（~）がある。船で渡れてしまわないこと
    const ch3 = CHAPTERS.ch3.map;
    const hasWater = ch3.rows.some((r) => r.includes('~'));
    expect(hasWater).toBe(true);
    for (let y = 0; y < ch3.rows.length; y++) {
      for (let x = 0; x < ch3.rows[y].length; x++) {
        if (ch3.rows[y][x] === '~') expect(canEnter(ch3, x, y)).toBe(false);
      }
    }
  });
});

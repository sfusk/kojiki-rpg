import { describe, it, expect } from 'vitest';
import { canEnter, tryStep, DIRS } from '../js/engine/movement.js';

const map = { rows: ['~~~~', '~..T', '~.M.', '~~~~'] };

describe('移動判定', () => {
  it('草原には入れる', () => expect(canEnter(map, 1, 1)).toBe(true));
  it('水・木・山には入れない', () => {
    expect(canEnter(map, 0, 0)).toBe(false);
    expect(canEnter(map, 3, 1)).toBe(false);
    expect(canEnter(map, 2, 2)).toBe(false);
  });
  it('マップ外には入れない', () => {
    expect(canEnter(map, -1, 0)).toBe(false);
    expect(canEnter(map, 4, 0)).toBe(false);
    expect(canEnter(map, 0, 4)).toBe(false);
  });
  it('tryStep: 進めるとき座標と向きが更新される', () => {
    const r = tryStep(map, { x: 1, y: 1, dir: 'down' }, 'down');
    expect(r).toEqual({ moved: true, pos: { x: 1, y: 2, dir: 'down' } });
  });
  it('tryStep: 進めないときは向きだけ変わる', () => {
    const r = tryStep(map, { x: 1, y: 1, dir: 'down' }, 'up');
    expect(r).toEqual({ moved: false, pos: { x: 1, y: 1, dir: 'up' } });
  });
});

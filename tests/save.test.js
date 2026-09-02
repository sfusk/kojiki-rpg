import { describe, it, expect } from 'vitest';
import { serialize, deserialize, saveGame, loadGame } from '../js/engine/save.js';
import { createState, setFlag, addItem } from '../js/engine/flags.js';

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

describe('セーブ', () => {
  it('serialize→deserializeで状態が復元される', () => {
    const s = createState();
    setFlag(s, 'ch1_clear'); addItem(s, 'もものみ');
    s.pos = { map: 'ch2', x: 5, y: 6, dir: 'left' };
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it('壊れたJSONはnull', () => expect(deserialize('{oops')).toBeNull());
  it('形状が違うJSONはnull', () => expect(deserialize('{"a":1}')).toBeNull());
  it('saveGame/loadGameがstorage経由で往復する', () => {
    const st = fakeStorage();
    const s = createState(); setFlag(s, 'x');
    saveGame(s, st);
    expect(loadGame(st)).toEqual(s);
  });
  it('セーブがないときloadGameはnull', () => expect(loadGame(fakeStorage())).toBeNull());
});

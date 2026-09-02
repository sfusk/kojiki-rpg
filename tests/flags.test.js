import { describe, it, expect } from 'vitest';
import { createState, setFlag, hasFlag, addItem, hasItem, removeItem, addOrb, addCodex } from '../js/engine/flags.js';

describe('flags 状態管理', () => {
  it('初期状態は空でorbs=0', () => {
    const s = createState();
    expect(s.orbs).toBe(0);
    expect(s.flags).toEqual([]);
    expect(hasFlag(s, 'ch1_clear')).toBe(false);
  });
  it('setFlagは同じフラグを二重登録しない', () => {
    const s = createState();
    setFlag(s, 'ch1_clear'); setFlag(s, 'ch1_clear');
    expect(s.flags).toEqual(['ch1_clear']);
    expect(hasFlag(s, 'ch1_clear')).toBe(true);
  });
  it('アイテムの追加・所持判定・削除', () => {
    const s = createState();
    addItem(s, 'もものみ');
    expect(hasItem(s, 'もものみ')).toBe(true);
    removeItem(s, 'もものみ');
    expect(hasItem(s, 'もものみ')).toBe(false);
  });
  it('存在しないアイテムのremoveItemは何もしない', () => {
    const s = createState();
    removeItem(s, 'ない'); expect(s.items).toEqual([]);
  });
  it('addOrbとaddCodex（図鑑も重複なし）', () => {
    const s = createState();
    addOrb(s); addOrb(s);
    addCodex(s, 'izanagi'); addCodex(s, 'izanagi');
    expect(s.orbs).toBe(2);
    expect(s.codex).toEqual(['izanagi']);
  });
});

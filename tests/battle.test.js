import { describe, it, expect } from 'vitest';
import { createBattle, battleAct } from '../js/engine/battle.js';

const orochi = { id: 'orochi', name: 'ヤマタノオロチ', maxHp: 30, atk: 4,
  gimmickItem: 'やしおおりのさけ', gimmickMsg: 'オロチは さけを のみ ねむってしまった！',
  hint: 'つよい さけが あれば…', escape: false };
const yomotsu = { id: 'yomotsu', name: 'よもつしこめ', maxHp: 999, atk: 3,
  gimmickItem: 'もものみ', gimmickMsg: 'ももの ちからで しこめは ひるんだ！',
  hint: 'ももには ふしぎな ちからが…', escape: true };

describe('ボス戦', () => {
  it('ギミック前の攻撃は1ダメージで反撃を受ける', () => {
    const b = createBattle(orochi);
    battleAct(b, 'attack');
    expect(b.bossHp).toBe(29);
    expect(b.playerHp).toBe(26);
  });
  it('正しいアイテムでギミック達成、以後10ダメージ', () => {
    const b = createBattle(orochi);
    battleAct(b, 'item', 'やしおおりのさけ');
    expect(b.gimmickDone).toBe(true);
    battleAct(b, 'attack');
    expect(b.bossHp).toBe(20);
  });
  it('間違ったアイテムは効果なし（反撃は受ける）', () => {
    const b = createBattle(orochi);
    battleAct(b, 'item', 'もものみ');
    expect(b.gimmickDone).toBe(false);
    expect(b.playerHp).toBe(26);
  });
  it('HPを削り切ると勝利しボスの反撃はない', () => {
    const b = createBattle(orochi);
    battleAct(b, 'item', 'やしおおりのさけ');
    battleAct(b, 'attack'); battleAct(b, 'attack');
    const hpBefore = b.playerHp;
    battleAct(b, 'attack');
    expect(b.over).toBe(true); expect(b.result).toBe('win');
    expect(b.playerHp).toBe(hpBefore);
  });
  it('逃走戦: ギミック前のにげるは失敗、達成後は勝利', () => {
    const b = createBattle(yomotsu);
    battleAct(b, 'run');
    expect(b.over).toBe(false);
    battleAct(b, 'item', 'もものみ');
    battleAct(b, 'run');
    expect(b.result).toBe('win');
  });
  it('playerHpが尽きるとlose', () => {
    const b = createBattle(orochi);
    for (let i = 0; i < 8; i++) battleAct(b, 'attack');
    expect(b.result).toBe('lose');
  });
});

// 実データ（BOSSES・各章イベント）で全ボスが実際に攻略できるかを検証する。
// battle.test.js はモックのボスを使うため、アイテム名の不一致や
// 攻略不能なパラメータ設定（HPが高すぎて削り切る前に力尽きる等）を検出できない。
import { describe, it, expect } from 'vitest';
import { BOSSES } from '../js/data/bosses.js';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { createBattle, battleAct } from '../js/engine/battle.js';

// イベントコマンド列を再帰的にたどり、条件分岐の中も含めて全コマンドを平坦化する
function flattenCommands(commands, out = []) {
  for (const cmd of commands || []) {
    out.push(cmd);
    if (cmd.then) flattenCommands(cmd.then, out);
    if (cmd.else) flattenCommands(cmd.else, out);
  }
  return out;
}

// その章のNPC・トリガーが持つ全コマンドを集める
function allCommandsOf(chapter) {
  const out = [];
  for (const npc of chapter.npcs || []) flattenCommands(npc.event, out);
  for (const tr of chapter.triggers || []) flattenCommands(tr.event, out);
  return out;
}

describe('ボスの攻略可能性（実データ）', () => {
  // 各ボスがどの章で戦われるかをイベントデータから逆引きする
  const bossChapter = {};
  for (const [mapId, chapter] of Object.entries(CHAPTERS)) {
    for (const cmd of allCommandsOf(chapter)) {
      if (cmd.battle) bossChapter[cmd.battle] = mapId;
    }
  }

  it('全ボスがいずれかの章で戦闘イベントに登場する', () => {
    expect(Object.keys(bossChapter).sort()).toEqual(Object.keys(BOSSES).sort());
  });

  for (const [id, boss] of Object.entries(BOSSES)) {
    const mapId = bossChapter[id];

    it(`${boss.name}: 攻略アイテム「${boss.gimmickItem}」が同じ章で手に入る`, () => {
      // ボス戦のある章、またはそれ以前の章で give されていれば良い
      const givenAnywhere = Object.values(CHAPTERS)
        .flatMap((c) => allCommandsOf(c))
        .filter((cmd) => cmd.give === boss.gimmickItem);
      expect(givenAnywhere.length).toBeGreaterThan(0);
    });

    it(`${boss.name}: 正攻法（アイテム→${boss.escape ? 'にげる' : '攻撃'}）で必ず勝てる`, () => {
      const b = createBattle(boss);
      battleAct(b, 'item', boss.gimmickItem);
      expect(b.gimmickDone).toBe(true);

      if (boss.escape) {
        battleAct(b, 'run');
      } else {
        // 削り切るまで攻撃する（無限ループ防止に上限を設ける）
        for (let i = 0; i < 100 && !b.over; i++) battleAct(b, 'attack');
      }
      expect(b.result).toBe('win');
      expect(b.playerHp).toBeGreaterThan(0);
    });

    if (!boss.escape) {
      it(`${boss.name}: ギミックなしでは削り切る前に力尽きる（ギミックが必須）`, () => {
        const b = createBattle(boss);
        for (let i = 0; i < 200 && !b.over; i++) battleAct(b, 'attack');
        expect(b.result).toBe('lose');
      });
    } else {
      it(`${boss.name}: 逃走戦ではアイテムなしで逃げられない`, () => {
        const b = createBattle(boss);
        battleAct(b, 'run');
        expect(b.over).toBe(false);
        // 攻撃で倒そうとしても勝てない相手であること
        const b2 = createBattle(boss);
        for (let i = 0; i < 200 && !b2.over; i++) battleAct(b2, 'attack');
        expect(b2.result).toBe('lose');
      });

      it(`${boss.name}: 手詰まりにならないよう次の一手が案内される`, () => {
        // アイテム使用後は「にげる」を促す文言が出る
        const b = createBattle(boss);
        battleAct(b, 'item', boss.gimmickItem);
        expect(b.log.join('')).toContain('にげる');
        // アイテムを使わず逃げ損ねたときはヒントが出る
        const b2 = createBattle(boss);
        battleAct(b2, 'run');
        expect(b2.log.join('')).toContain(boss.hint);
      });
    }
  }
});

// 最終レビューで指摘された「到達可能性」「図鑑網羅」「UI境界」を検証する回帰テスト。
import { describe, it, expect } from 'vitest';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { canEnter } from '../js/engine/movement.js';
import { CODEX } from '../js/data/codexData.js';
import {
  SCREEN_H, MAX_ITEMS,
  BATTLE_ITEM_WIN_Y, BATTLE_ITEM_MAX_VISIBLE, battleItemWinHeight,
  POWER_WIN_Y, powerWinHeight,
} from '../js/data/uiLayout.js';

const DIR_OFFSETS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

// entryから4方向移動のみでcanEnterなタイルをすべて辿るBFS（movement.jsのcanEnterを使う）
function bfsReachable(map, start) {
  const key = (x, y) => `${x},${y}`;
  const seen = new Set([key(start.x, start.y)]);
  const queue = [start];
  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of DIR_OFFSETS) {
      const nx = x + dx, ny = y + dy;
      if (canEnter(map, nx, ny) && !seen.has(key(nx, ny))) {
        seen.add(key(nx, ny));
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return seen;
}

describe('到達可能性：各章のentryから全NPC・全トリガーへBFSで到達できる', () => {
  for (const [chId, ch] of Object.entries(CHAPTERS)) {
    it(`${chId}: entry(${ch.entry.x},${ch.entry.y})から全座標に到達できる`, () => {
      const reachable = bfsReachable(ch.map, ch.entry);
      const targets = [
        ...(ch.npcs || []).map((n) => ({ label: `npc:${n.id}`, x: n.x, y: n.y })),
        ...(ch.triggers || []).map((t) => ({ label: `trigger:(${t.x},${t.y})`, x: t.x, y: t.y })),
      ];
      for (const t of targets) {
        const directlyReachable = reachable.has(`${t.x},${t.y}`);
        // NPC自体が通行不能タイル（壁・岩など）に立っている場合は、隣接4マスのいずれかから
        // 話しかけられればよい（frontTile越しにNPCへ話しかける仕様のため）。
        const neighborReachable = DIR_OFFSETS.some(
          ([dx, dy]) => reachable.has(`${t.x + dx},${t.y + dy}`),
        );
        expect(
          directlyReachable || neighborReachable,
          `${chId} ${t.label} が entryから到達不能（直接到達も隣接到達も不可）`,
        ).toBe(true);
      }
    });
  }
});

describe('図鑑網羅：CODEXの全idがいずれかの章イベントに登場する', () => {
  it('全32件がchapter events内の{codex}参照でカバーされている', () => {
    const referenced = new Set();
    const walk = (cmds) => {
      for (const c of cmds || []) {
        if (c.codex) referenced.add(c.codex);
        if (c.if) { walk(c.then); walk(c.else); }
      }
    };
    for (const ch of Object.values(CHAPTERS)) {
      for (const t of ch.triggers || []) walk(t.event);
      for (const n of ch.npcs || []) walk(n.event);
    }
    const missing = CODEX.map((e) => e.id).filter((id) => !referenced.has(id));
    expect(missing, `未参照のCODEX id: ${missing.join(', ')}`).toEqual([]);
    expect(referenced.size).toBe(CODEX.length);
  });
});

describe('UI境界：戦闘どうぐ・つよさ表示が内部解像度224px内に収まる', () => {
  // ゲーム内で入手できるどうぐの総数（ch1〜ch8の give を全て収集）
  const obtainableItemIds = new Set();
  for (const ch of Object.values(CHAPTERS)) {
    const walk = (cmds) => {
      for (const c of cmds || []) {
        if (c.give) obtainableItemIds.add(c.give);
        if (c.if) { walk(c.then); walk(c.else); }
      }
    };
    for (const t of ch.triggers || []) walk(t.event);
    for (const n of ch.npcs || []) walk(n.event);
  }

  it(`入手可能などうぐ種はMAX_ITEMS(${MAX_ITEMS})件と一致する`, () => {
    expect(obtainableItemIds.size).toBe(MAX_ITEMS);
  });

  it('戦闘どうぐウィンドウ：全どうぐ所持+もどる でも画面外へはみ出さない', () => {
    const itemCount = MAX_ITEMS + 1; // 「もどる」を含む最大行数
    const h = battleItemWinHeight(itemCount);
    expect(BATTLE_ITEM_WIN_Y + h).toBeLessThanOrEqual(SCREEN_H);
    // maxVisible件以上は必ずスクロール表示にする（一覧が画面外へ伸び続けないことの保証）
    expect(itemCount).toBeGreaterThan(BATTLE_ITEM_MAX_VISIBLE);
    expect(h).toBe(22 * BATTLE_ITEM_MAX_VISIBLE + 16);
  });

  it('つよさウィンドウ：最大所持数(4アイテム)を1行ずつ表示しても画面外へはみ出さない', () => {
    const h = powerWinHeight(MAX_ITEMS);
    expect(POWER_WIN_Y + h).toBeLessThanOrEqual(SCREEN_H);
  });

  it('つよさウィンドウ：0件（なし表示）でも画面外へはみ出さない', () => {
    const h = powerWinHeight(0);
    expect(POWER_WIN_Y + h).toBeLessThanOrEqual(SCREEN_H);
  });
});

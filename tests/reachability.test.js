// NPCを障害物として扱った状態で、入口から全NPC・全トリガーへ到達できるかを検証する。
// NPCすり抜けを禁止した結果、通路に立つNPCが背後のNPCや出口を封鎖して
// 章が進行不能になる事故を防ぐ（実際に第二章で発生した）。
import { describe, it, expect } from 'vitest';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { canEnter, DIRS } from '../js/engine/movement.js';

// 入口から歩いて行けるタイルの集合を返す（NPCのマスには入れない）
function walkableFrom(chapter, start) {
  const blocked = new Set((chapter.npcs || []).map((n) => `${n.x},${n.y}`));
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const { dx, dy } of Object.values(DIRS)) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      if (!canEnter(chapter.map, nx, ny)) continue;
      if (blocked.has(key)) continue; // NPCのマスは通り抜けられない
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

// 対象マスに隣接する到達可能タイルがあるか（＝正面に立って話しかけられるか）
function canFace(reachable, x, y) {
  return Object.values(DIRS).some(({ dx, dy }) => reachable.has(`${x - dx},${y - dy}`));
}

describe('入口からの到達可能性（NPCを障害物として扱う）', () => {
  for (const [mapId, chapter] of Object.entries(CHAPTERS)) {
    const entry = chapter.entry;
    if (!entry) continue;

    it(`${mapId}: 全NPCに話しかけられる`, () => {
      const reachable = walkableFrom(chapter, entry);
      const unreachable = (chapter.npcs || [])
        .filter((npc) => !canFace(reachable, npc.x, npc.y))
        .map((npc) => `${npc.id}(${npc.x},${npc.y})`);
      expect(unreachable).toEqual([]);
    });

    it(`${mapId}: 全トリガー（出口・イベント）を踏める`, () => {
      const reachable = walkableFrom(chapter, entry);
      const unreachable = (chapter.triggers || [])
        .filter((tr) => !reachable.has(`${tr.x},${tr.y}`))
        .map((tr) => `(${tr.x},${tr.y})`);
      expect(unreachable).toEqual([]);
    });
  }
});

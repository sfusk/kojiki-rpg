// 全章の全NPCについて、隣接する通行可能タイルから四方向すべての進入を試し、
// 必ずブロックされることを検証する（NPCすり抜けのリグレッション防止）。
import { describe, it, expect } from 'vitest';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { tryStep, canEnter, DIRS } from '../js/engine/movement.js';

describe('NPCすり抜け防止（全章総当たり）', () => {
  for (const [mapId, chapter] of Object.entries(CHAPTERS)) {
    const npcs = chapter.npcs || [];
    if (npcs.length === 0) continue;

    it(`${mapId}: ${npcs.length}体のNPCへどの方向からも進入できない`, () => {
      const breaches = [];
      for (const npc of npcs) {
        for (const [dir, { dx, dy }] of Object.entries(DIRS)) {
          // NPCの反対側の隣接タイルからNPCへ向かって1歩踏み出す
          const fromX = npc.x - dx;
          const fromY = npc.y - dy;
          if (!canEnter(chapter.map, fromX, fromY)) continue; // そもそも立てない位置は対象外
          const r = tryStep(chapter.map, { x: fromX, y: fromY, dir }, dir, npcs);
          if (r.moved) {
            breaches.push(`${npc.id}(${npc.x},${npc.y}) へ ${dir} から進入できた`);
          }
        }
      }
      expect(breaches).toEqual([]);
    });

    it(`${mapId}: 進入を阻まれても向きは変わる（話しかけられる）`, () => {
      for (const npc of npcs) {
        for (const [dir, { dx, dy }] of Object.entries(DIRS)) {
          const fromX = npc.x - dx;
          const fromY = npc.y - dy;
          if (!canEnter(chapter.map, fromX, fromY)) continue;
          const r = tryStep(chapter.map, { x: fromX, y: fromY, dir }, dir, npcs);
          expect(r.pos.dir).toBe(dir);
          expect(r.pos).toMatchObject({ x: fromX, y: fromY });
        }
      }
    });
  }

  it('全NPCが少なくとも1方向から話しかけられる（孤立していない）', () => {
    const unreachable = [];
    for (const [mapId, chapter] of Object.entries(CHAPTERS)) {
      for (const npc of chapter.npcs || []) {
        const approachable = Object.values(DIRS).some(
          ({ dx, dy }) => canEnter(chapter.map, npc.x - dx, npc.y - dy),
        );
        if (!approachable) unreachable.push(`${mapId}:${npc.id}`);
      }
    }
    expect(unreachable).toEqual([]);
  });
});

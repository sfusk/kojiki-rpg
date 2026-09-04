// 地面の光の目印（sparkle）の検証。
// 目印は「まだ見届けていないイベント」を示し、見届けると消える。
// 消えるためには sparkle のフラグ名が、そのイベントで実際に立つフラグと
// 一致していなければならない（不一致だと永久に光り続ける）。
import { describe, it, expect } from 'vitest';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { WORLD } from '../js/data/world.js';
import { pendingMarkers } from '../js/engine/markers.js';

// イベントコマンドを条件分岐の中まで含めて平坦化する
function flatten(commands, out = []) {
  for (const cmd of commands || []) {
    out.push(cmd);
    if (cmd.then) flatten(cmd.then, out);
    if (cmd.else) flatten(cmd.else, out);
  }
  return out;
}

const chapters = Object.entries(CHAPTERS);

describe('光の目印', () => {
  it('目印のフラグは、そのイベントを最後まで見ると必ず立つ', () => {
    const broken = [];
    for (const [mapId, chapter] of chapters) {
      for (const tr of chapter.triggers || []) {
        if (!tr.sparkle) continue;
        const sets = flatten(tr.event).filter((c) => c.set).map((c) => c.set);
        if (!sets.includes(tr.sparkle)) {
          broken.push(`${mapId}(${tr.x},${tr.y}): sparkle「${tr.sparkle}」を立てるsetがない`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  // 場所を移動するトリガー（章の出入口）は鳥居・洞窟・階段のタイルで
  // すでに位置が分かるため、光の目印の対象外とする
  const movesPlayer = (tr) => flatten(tr.event).some((c) => c.warp);

  it('その場で起きるイベントにはすべて目印がある', () => {
    const missing = [];
    for (const [mapId, chapter] of chapters) {
      for (const tr of chapter.triggers || []) {
        if (movesPlayer(tr)) continue;
        if (!tr.sparkle) missing.push(`${mapId}(${tr.x},${tr.y})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('章の出入口には目印を付けない', () => {
    const wrong = [];
    for (const [mapId, chapter] of chapters) {
      for (const tr of chapter.triggers || []) {
        if (movesPlayer(tr) && tr.sparkle) wrong.push(`${mapId}(${tr.x},${tr.y})`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('目印つきのイベントは二度目に別の反応を返す（繰り返し取得できない）', () => {
    const noGuard = [];
    for (const [mapId, chapter] of chapters) {
      for (const tr of chapter.triggers || []) {
        if (!tr.sparkle) continue;
        // 先頭の分岐が sparkle フラグで済みかどうかを見分けていること
        const first = (tr.event || [])[0];
        if (!first || first.if !== tr.sparkle) {
          noGuard.push(`${mapId}(${tr.x},${tr.y}): 「${tr.sparkle}」での分岐がない`);
        }
      }
    }
    expect(noGuard).toEqual([]);
  });

  it('アイテムを配るイベントは必ず取得済み判定を持つ', () => {
    const unguarded = [];
    for (const [mapId, chapter] of chapters) {
      for (const tr of chapter.triggers || []) {
        const cmds = flatten(tr.event);
        if (!cmds.some((c) => c.give)) continue;
        if (!tr.sparkle) unguarded.push(`${mapId}(${tr.x},${tr.y})`);
      }
    }
    expect(unguarded).toEqual([]);
  });
});


describe('次の章の入口を示す光（beacon）', () => {
  const chapterIds = Object.keys(CHAPTERS).filter((id) => id !== 'world');

  it('ワールドの全8章の入口に光がある', () => {
    const marked = WORLD.triggers.filter((tr) => tr.beacon).length;
    expect(marked).toBe(chapterIds.length);
  });

  it('光のフラグは、その章を最後まで進めると必ず立つ', () => {
    // フラグが立たないと入口が永久に光り続ける
    const broken = [];
    for (const tr of WORLD.triggers) {
      if (!tr.beacon) continue;
      const chapterId = flatten(tr.event).find((c) => c.warp).warp.map;
      const chapter = CHAPTERS[chapterId];
      const sets = [
        ...flatten(chapter.triggers ? chapter.triggers.flatMap((t) => t.event || []) : []),
        ...flatten((chapter.npcs || []).flatMap((n) => n.event || [])),
      ].filter((c) => c.set).map((c) => c.set);
      if (!sets.includes(tr.beacon)) broken.push(`${chapterId}: 「${tr.beacon}」を立てるsetがない`);
    }
    expect(broken).toEqual([]);
  });

  it('光るのは条件を満たした「次の章」の入口ひとつだけ', () => {
    // 章を順にクリアしていくと、光が次の入口へ移っていく
    const flags = [];
    for (const id of chapterIds) {
      const lit = pendingMarkers(WORLD.triggers, flags, 'beacon');
      const expected = WORLD.triggers.find((tr) => tr.beacon === `${id}_clear`);
      expect(lit).toEqual([{ x: expected.x, y: expected.y }]);
      flags.push(`${id}_clear`);
    }
    // すべてクリアするとどこも光らない
    expect(pendingMarkers(WORLD.triggers, flags, 'beacon')).toEqual([]);
  });

  it('クリア済みの章の入口は光らない', () => {
    const flags = ['ch1_clear'];
    const lit = pendingMarkers(WORLD.triggers, flags, 'beacon');
    const ch1 = WORLD.triggers.find((tr) => tr.beacon === 'ch1_clear');
    expect(lit.some((p) => p.x === ch1.x && p.y === ch1.y)).toBe(false);
  });

  it('章の中のトリガーには beacon を付けない（ワールド専用の道しるべ）', () => {
    const wrong = [];
    for (const [mapId, chapter] of chapters) {
      if (mapId === 'world') continue;
      for (const tr of chapter.triggers || []) {
        if (tr.beacon) wrong.push(`${mapId}(${tr.x},${tr.y})`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

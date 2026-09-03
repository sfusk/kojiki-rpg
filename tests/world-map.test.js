// ワールドマップ（日本列島）の検証。
// 章の入口と、各章から戻ってくる位置が食い違うと海の上に出たり
// 戻った瞬間に同じ章へ再突入したりするため、対応関係を保証する。
import { describe, it, expect } from 'vitest';
import { WORLD } from '../js/data/world.js';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { canEnter, DIRS } from '../js/engine/movement.js';

function flatten(commands, out = []) {
  for (const cmd of commands || []) {
    out.push(cmd);
    if (cmd.then) flatten(cmd.then, out);
    if (cmd.else) flatten(cmd.else, out);
  }
  return out;
}

// ワールド上の「章の入口」座標を map の id で引けるようにする
const entrances = {};
for (const tr of WORLD.triggers) {
  const warp = flatten(tr.event).find((c) => c.warp);
  if (warp) entrances[warp.warp.map] = { x: tr.x, y: tr.y };
}

// 各章からワールドへ戻る座標
const returns = {};
for (const [id, chapter] of Object.entries(CHAPTERS)) {
  if (id === 'world') continue;
  for (const tr of chapter.triggers || []) {
    const warp = flatten(tr.event).find((c) => c.warp && c.warp.map === 'world');
    if (warp) returns[id] = warp.warp;
  }
}

const chapterIds = Object.keys(CHAPTERS).filter((id) => id !== 'world');

describe('ワールドマップ', () => {
  it('マップの各行が同じ幅である', () => {
    const widths = new Set(WORLD.map.rows.map((r) => r.length));
    expect(widths.size).toBe(1);
  });

  it('全8章の入口がある', () => {
    expect(Object.keys(entrances).sort()).toEqual(chapterIds.sort());
  });

  it('入口はすべて鳥居か洞窟の上にある（草原に隠れない）', () => {
    const bad = [];
    for (const [id, { x, y }] of Object.entries(entrances)) {
      const tile = WORLD.map.rows[y][x];
      if (tile !== 't' && tile !== 'c') bad.push(`${id}(${x},${y})='${tile}'`);
    }
    expect(bad).toEqual([]);
  });

  it('プレイヤーの初期位置とすべての入口へ歩いて行ける', () => {
    const start = WORLD.entry;
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const { dx, dy } of Object.values(DIRS)) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !canEnter(WORLD.map, nx, ny)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    expect(canEnter(WORLD.map, start.x, start.y)).toBe(true);
    const unreachable = Object.entries(entrances)
      .filter(([, { x, y }]) => !seen.has(`${x},${y}`))
      .map(([id]) => id);
    expect(unreachable).toEqual([]);
  });

  it('各章から戻る位置が陸地である', () => {
    const bad = [];
    for (const [id, w] of Object.entries(returns)) {
      if (!canEnter(WORLD.map, w.x, w.y)) bad.push(`${id} → (${w.x},${w.y})`);
    }
    expect(bad).toEqual([]);
  });

  it('戻る位置は入口の隣であり、入口そのものではない（再突入しない）', () => {
    const bad = [];
    for (const id of chapterIds) {
      const e = entrances[id];
      const w = returns[id];
      if (!e || !w) { bad.push(`${id}: 入口か戻り先がない`); continue; }
      if (e.x === w.x && e.y === w.y) { bad.push(`${id}: 戻り先が入口と同じ`); continue; }
      const dist = Math.abs(e.x - w.x) + Math.abs(e.y - w.y);
      if (dist !== 1) bad.push(`${id}: 戻り先が入口の隣ではない（距離${dist}）`);
    }
    expect(bad).toEqual([]);
  });

  it('戻る位置が別の章の入口と重ならない', () => {
    const bad = [];
    for (const [id, w] of Object.entries(returns)) {
      for (const [otherId, e] of Object.entries(entrances)) {
        if (e.x === w.x && e.y === w.y) bad.push(`${id}の戻り先が${otherId}の入口と同じ`);
      }
    }
    expect(bad).toEqual([]);
  });
});

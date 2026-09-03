import { PASSABLE } from '../data/tiles.js';
export const DIRS = { up:{dx:0,dy:-1}, down:{dx:0,dy:1}, left:{dx:-1,dy:0}, right:{dx:1,dy:0} };
export function canEnter(map, x, y) {
  if (y < 0 || y >= map.rows.length) return false;
  if (x < 0 || x >= map.rows[y].length) return false;
  return PASSABLE.has(map.rows[y][x]);
}
// blockers: 通行を塞ぐ存在（NPC等）の {x, y} 配列。タイルが通行可でも塞がっていれば進めない
export function tryStep(map, pos, dir, blockers = []) {
  const { dx, dy } = DIRS[dir];
  const nx = pos.x + dx, ny = pos.y + dy;
  const blocked = blockers.some((b) => b.x === nx && b.y === ny);
  if (!blocked && canEnter(map, nx, ny)) return { moved: true, pos: { x: nx, y: ny, dir } };
  return { moved: false, pos: { x: pos.x, y: pos.y, dir } };
}

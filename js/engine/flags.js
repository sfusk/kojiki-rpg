export function createState() {
  return { flags: [], items: [], orbs: 0, codex: [],
           // 旅立ちの地は淡路島の対岸（近畿の海辺）。world.js の entry と揃えること
           pos: { map: 'world', x: 12, y: 26, dir: 'down' } };
}
export function setFlag(s, name) { if (!s.flags.includes(name)) s.flags.push(name); }
export function hasFlag(s, name) { return s.flags.includes(name); }
export function addItem(s, id) { if (!s.items.includes(id)) s.items.push(id); }
export function hasItem(s, id) { return s.items.includes(id); }
export function removeItem(s, id) { const i = s.items.indexOf(id); if (i >= 0) s.items.splice(i, 1); }
export function addOrb(s) { s.orbs += 1; }
export function addCodex(s, id) { if (!s.codex.includes(id)) s.codex.push(id); }

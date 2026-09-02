const KEY = 'kamugatari_save';
export function serialize(state) { return JSON.stringify(state); }
export function deserialize(json) {
  try {
    const s = JSON.parse(json);
    if (!s || !Array.isArray(s.flags) || !Array.isArray(s.items) ||
        typeof s.orbs !== 'number' || !Array.isArray(s.codex) ||
        !s.pos || typeof s.pos.map !== 'string') return null;
    return s;
  } catch { return null; }
}
export function saveGame(state, storage) { storage.setItem(KEY, serialize(state)); }
export function loadGame(storage) {
  const raw = storage.getItem(KEY);
  return raw === null ? null : deserialize(raw);
}

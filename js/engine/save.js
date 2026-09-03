// ゲーム名を「RPG古事記」に改めた後もキーは旧名のまま据え置く。
// 変更すると既存のセーブデータが読めなくなるため（改名は表示名だけの変更に留める）。
export const KEY = 'kamugatari_save';
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

// ── 設定（音楽の入切など）───────────────────────────────
// セーブデータとは別に保存する。「はじめから」で消えては困る種類の情報のため。
export const SETTINGS_KEY = 'kamugatari_settings';

export function saveSettings(settings, storage) {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// 保存が無い・壊れている場合は既定値（音楽は入）を返す
export function loadSettings(storage) {
  const raw = storage.getItem(SETTINGS_KEY);
  if (raw === null) return { bgm: true };
  try {
    const s = JSON.parse(raw);
    return { bgm: typeof s?.bgm === 'boolean' ? s.bgm : true };
  } catch { return { bgm: true }; }
}

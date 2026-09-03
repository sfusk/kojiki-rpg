import { describe, it, expect } from 'vitest';
import {
  serialize, deserialize, saveGame, loadGame,
  saveSettings, loadSettings, KEY, SETTINGS_KEY,
} from '../js/engine/save.js';
import { createState, setFlag, addItem } from '../js/engine/flags.js';

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

describe('セーブ', () => {
  it('serialize→deserializeで状態が復元される', () => {
    const s = createState();
    setFlag(s, 'ch1_clear'); addItem(s, 'もものみ');
    s.pos = { map: 'ch2', x: 5, y: 6, dir: 'left' };
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it('壊れたJSONはnull', () => expect(deserialize('{oops')).toBeNull());
  it('形状が違うJSONはnull', () => expect(deserialize('{"a":1}')).toBeNull());
  it('saveGame/loadGameがstorage経由で往復する', () => {
    const st = fakeStorage();
    const s = createState(); setFlag(s, 'x');
    saveGame(s, st);
    expect(loadGame(st)).toEqual(s);
  });
  it('セーブがないときloadGameはnull', () => expect(loadGame(fakeStorage())).toBeNull());
});

describe('設定の保存', () => {
  // localStorage の代わりに使う最小限のモック
  const makeStorage = (initial = {}) => {
    const data = { ...initial };
    return {
      getItem: (k) => (k in data ? data[k] : null),
      setItem: (k, v) => { data[k] = String(v); },
      removeItem: (k) => { delete data[k]; },
      _data: data,
    };
  };

  it('保存が無いときは音楽ONが既定値', () => {
    expect(loadSettings(makeStorage())).toEqual({ bgm: true });
  });

  it('保存した設定を読み戻せる', () => {
    const st = makeStorage();
    saveSettings({ bgm: false }, st);
    expect(loadSettings(st)).toEqual({ bgm: false });
  });

  it('壊れた設定は既定値に落とす', () => {
    expect(loadSettings(makeStorage({ [SETTINGS_KEY]: '{壊れた' }))).toEqual({ bgm: true });
    expect(loadSettings(makeStorage({ [SETTINGS_KEY]: 'null' }))).toEqual({ bgm: true });
    expect(loadSettings(makeStorage({ [SETTINGS_KEY]: '{"bgm":"はい"}' }))).toEqual({ bgm: true });
  });

  it('設定はセーブデータとは別のキーに保存する', () => {
    const st = makeStorage();
    saveSettings({ bgm: false }, st);
    expect(st.getItem(KEY)).toBeNull();
    expect(st.getItem(SETTINGS_KEY)).not.toBeNull();
  });
});

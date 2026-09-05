// キー入力管理。押下中のキーをSetで保持する。
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const TRACKED_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'z', 'x']);
// 別キー割り当て：Enter=決定(z)、Escape=キャンセル(x)。内部では正規化後のキー名で扱う。
const KEY_ALIASES = { Enter: 'z', Escape: 'x', Z: 'z', X: 'x' };

export function createInput(target) {
  const down = new Set();

  const onKeyDown = (e) => {
    if (ARROW_KEYS.has(e.key)) e.preventDefault();
    const key = KEY_ALIASES[e.key] || e.key;
    if (!TRACKED_KEYS.has(key)) return;
    // 長押し中のネイティブkeydownリピートを無視する。
    // これを無視しないと、consume()で一度取り出して消したキーが
    // リピートイベントで即座に再追加され、単発入力のはずが連続発火してしまう。
    if (e.repeat) return;
    down.add(key);
  };
  const onKeyUp = (e) => {
    const key = KEY_ALIASES[e.key] || e.key;
    if (!TRACKED_KEYS.has(key)) return;
    down.delete(key);
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  return {
    // 押下中かどうか（連続判定。移動キーのホールド判定に使う）
    isDown(key) { return down.has(key); },
    // 押下を1回だけ拾い、Setから取り除く（決定・キャンセル等の単発入力に使う）
    consume(key) {
      if (down.has(key)) { down.delete(key); return true; }
      return false;
    },
    // メッセージ送り。決定キー（Z/Enter）に加えて下矢印でも次へ進める。
    // 「文章を下へ送る」動作として下向きの矢印が自然なため。
    // カーソル移動に下矢印を使う場面（メニュー・クイズの選択）では呼ばない。
    consumeAdvance() {
      if (down.has('z')) { down.delete('z'); return true; }
      if (down.has('ArrowDown')) { down.delete('ArrowDown'); return true; }
      return false;
    },
    // イベントリスナーの解除（テスト・再生成時に使用）
    destroy() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
    },
  };
}

// キー入力管理。押下中のキーをSetで保持する。
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const TRACKED_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'z', 'x']);

export function createInput(target) {
  const down = new Set();

  const onKeyDown = (e) => {
    if (ARROW_KEYS.has(e.key)) e.preventDefault();
    if (!TRACKED_KEYS.has(e.key)) return;
    // 長押し中のネイティブkeydownリピートを無視する。
    // これを無視しないと、consume()で一度取り出して消したキーが
    // リピートイベントで即座に再追加され、単発入力のはずが連続発火してしまう。
    if (e.repeat) return;
    down.add(e.key);
  };
  const onKeyUp = (e) => {
    if (!TRACKED_KEYS.has(e.key)) return;
    down.delete(e.key);
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
    // イベントリスナーの解除（テスト・再生成時に使用）
    destroy() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
    },
  };
}

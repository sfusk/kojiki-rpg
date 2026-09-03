// UI境界レイアウト定数。
// main.jsの描画（drawBattle/drawMenu）とtests/coverage.test.jsの両方から参照し、
// 内部解像度256x224に、行数に応じて可変するウィンドウが必ず収まることを保証する。

export const SCREEN_W = 256; // 内部解像度の幅
export const SCREEN_H = 224; // 内部解像度の高さ
export const MAX_ITEMS = 4;  // どうぐの最大所持数（ゲーム内で入手できるどうぐ種の総数）

// ── 戦闘「どうぐ」選択ウィンドウ ─────────────────────────
// もちものが多いとき（もどる込みで5件など）でも画面外へはみ出さないよう、
// maxVisible件だけ描画しスクロールさせる（window.jsのdrawChoiceWindow参照）。
export const BATTLE_ITEM_WIN_X = 8;
export const BATTLE_ITEM_WIN_Y = 142;
export const BATTLE_ITEM_WIN_W = 168;
export const BATTLE_ITEM_LINE_H = 22;
export const BATTLE_ITEM_MAX_VISIBLE = 3;
export const BATTLE_ITEM_PAD = 16; // ウィンドウ上下の余白ぶん

// どうぐ選択ウィンドウの高さ（itemCountには「もどる」を含む件数を渡す）
export function battleItemWinHeight(itemCount) {
  return BATTLE_ITEM_LINE_H * Math.min(itemCount, BATTLE_ITEM_MAX_VISIBLE) + BATTLE_ITEM_PAD;
}

// ── メニュー「つよさ」ウィンドウ ─────────────────────────
// もちものを折り返しなしの1行に詰め込むと画面外へはみ出すため、1行1アイテムで表示する。
export const POWER_WIN_X = 8;
export const POWER_WIN_Y = 8;
export const POWER_WIN_W = 240;
export const POWER_LOCATION_Y = 16;    // 絶対y座標：現在地
export const POWER_ORB_Y = 38;         // 絶対y座標：玉の数
export const POWER_ITEMS_LABEL_Y = 60; // 絶対y座標：「持ち物：」の見出し
export const POWER_ITEM_START_Y = 80;  // 絶対y座標：もちもの一覧の先頭行
export const POWER_ITEM_LINE_H = 16;
export const POWER_FOOTER_GAP = 14;    // 最終アイテム行と「もどる」案内文の間隔

// つよさウィンドウの高さ（itemCountは所持どうぐの件数。0件でも「なし」の1行を確保する）
export function powerWinHeight(itemCount) {
  const lines = Math.max(itemCount, 1);
  const lastItemY = POWER_ITEM_START_Y + (lines - 1) * POWER_ITEM_LINE_H;
  const footerY = lastItemY + POWER_ITEM_LINE_H + POWER_FOOTER_GAP;
  return footerY + 16 - POWER_WIN_Y; // 16=フォント1行ぶんの余白
}

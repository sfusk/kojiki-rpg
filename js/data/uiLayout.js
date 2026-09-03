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

// ── クイズ画面 ───────────────────────────────────────────
// 選択肢にふりがなを添えるぶん行間を広げる。問題文は最大4行になるため、
// 問題文の窓＋選択肢の窓が画面下端（SCREEN_H）を越えないことをテストで保証する。
export const QUIZ_WIN_X = 8;
export const QUIZ_WIN_Y = 8;
export const QUIZ_WIN_W = 240;
export const QUIZ_Q_LINE_H = 18;      // 問題文の行間
export const QUIZ_Q_PAD = 16;         // 問題文の窓の上下余白
export const QUIZ_GAP = 8;            // 問題文の窓と選択肢の窓の間隔
export const QUIZ_CHOICE_LINE_H = 26; // 選択肢の行間（ふりがなのぶん広め）
export const QUIZ_CHOICE_PAD = 25;    // 選択肢の窓の上下余白（1行目のふりがなのぶん含む）

export function quizQuestionWinHeight(lineCount) {
  return QUIZ_Q_PAD + lineCount * QUIZ_Q_LINE_H;
}

export function quizChoiceWinHeight(choiceCount) {
  return QUIZ_CHOICE_LINE_H * choiceCount + QUIZ_CHOICE_PAD;
}

// 選択肢の窓の下端（画面内に収まるかの判定に使う）
export function quizBottom(questionLineCount, choiceCount) {
  const qh = quizQuestionWinHeight(questionLineCount);
  return QUIZ_WIN_Y + qh + QUIZ_GAP + quizChoiceWinHeight(choiceCount);
}

// ── メニュー最初の画面の地名ウィンドウ ─────────────────────
// 右側の選択肢ウィンドウ（x=140〜248）と重ならない幅に収める。
// 章題は「第一章 オノゴロ島」のように空白で章と地名に分かれるため、
// 描画側は空白で行を分けて1行あたりの文字数を抑えている。
export const MENU_LOC_WIN_X = 8;
export const MENU_LOC_WIN_W = 124;
export const MENU_LOC_PAD = 12;   // 左右の内側余白
export const MENU_LOC_CHAR_W = 16; // 全角1文字の幅（16pxフォント）

// 地名ウィンドウの1行に収まる最大文字数
export function menuLocationMaxChars() {
  return Math.floor((MENU_LOC_WIN_W - MENU_LOC_PAD) / MENU_LOC_CHAR_W);
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

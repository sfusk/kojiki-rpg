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
// 選択肢の行間。ふりがな（RUBY_OFFSET_Y上）と本文（TEXT_H）を積んだうえで、
// 上の行の本文と次の行のふりがなの間に読みやすい隙間が空くよう決めている。
export const TEXT_H = 16;             // 本文フォントの高さ
export const RUBY_OFFSET_Y = 9;       // 本文上端から何px上にふりがなを描くか
export const RUBY_CLEARANCE = 5;      // 上の行の本文と次の行のふりがなの間隔
export const QUIZ_CHOICE_LINE_H = TEXT_H + RUBY_CLEARANCE + RUBY_OFFSET_Y; // = 30
export const QUIZ_CHOICE_TOP_PAD = 10;    // 窓上端から1行目のふりがな上端まで
export const QUIZ_CHOICE_BOTTOM_PAD = 8;  // 最終行の本文下端から窓下端まで

export function quizQuestionWinHeight(lineCount) {
  return QUIZ_Q_PAD + lineCount * QUIZ_Q_LINE_H;
}

// 1行目の本文上端（窓上端からの相対位置）。ふりがなを描く余地を上に確保する
export function quizChoiceFirstLineY() {
  return QUIZ_CHOICE_TOP_PAD + RUBY_OFFSET_Y;
}

export function quizChoiceWinHeight(choiceCount) {
  const lastTextBottom = quizChoiceFirstLineY()
    + QUIZ_CHOICE_LINE_H * (choiceCount - 1) + TEXT_H;
  return lastTextBottom + QUIZ_CHOICE_BOTTOM_PAD;
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

// ── 地名の文字列組み立て ─────────────────────────────────
// 章題（例「第一章 オノゴロ島」）に、そこに相当する現在の地名を
// かっこ書きで添える（例「（淡路島）」）。神話の舞台が今のどこかを
// すぐ結びつけられるようにするための表示。描画とテストで同じ関数を使う。
export function modernNameText(chapter) {
  return chapter && chapter.modern ? `（${chapter.modern}）` : '';
}

// フィールド左上・つよさ画面など、1行に収める場合の表記
export function locationText(chapter) {
  const label = (chapter && (chapter.title || chapter.name)) || '';
  return label + modernNameText(chapter);
}

// メニュー最初の画面用。章題を空白で割り、現在の地名を最後の行として足す
export function menuLocationLines(chapter) {
  const label = (chapter && (chapter.title || chapter.name)) || '';
  const lines = label.split(' ').filter((s) => s.length > 0);
  const modern = modernNameText(chapter);
  if (modern) lines.push(modern);
  return lines;
}

// ── フィールド左上の現在地ラベル ─────────────────────────
// 12pxフォントの小さな窓。画面幅からはみ出さない文字数を上限とする。
export const FIELD_LOC_WIN_X = 4;
export const FIELD_LOC_CHAR_W = 12; // 全角1文字の幅（12pxフォント）
export const FIELD_LOC_PAD = 16;    // 窓の左右の内側余白
export function fieldLocationMaxChars() {
  return Math.floor((SCREEN_W - FIELD_LOC_WIN_X * 2 - FIELD_LOC_PAD) / FIELD_LOC_CHAR_W);
}

// ── メニュー「つよさ」ウィンドウ ─────────────────────────
// もちものを折り返しなしの1行に詰め込むと画面外へはみ出すため、1行1アイテムで表示する。
export const POWER_WIN_X = 8;
export const POWER_WIN_Y = 8;
export const POWER_WIN_W = 240;
// 現在地は「現在地：第二章 黄泉比良坂」＋「（東出雲）」の2行に分ける。
// 1行に続けると窓幅240pxを越えるため。
export const POWER_LOCATION_Y = 16;        // 絶対y座標：現在地（章題）
export const POWER_LOCATION_MODERN_Y = 34; // 絶対y座標：現在の地名（かっこ書き）
export const POWER_LOCATION_INDENT = 64;   // 「現在地：」4文字ぶん。かっこ書きの字下げ
export const POWER_ORB_Y = 56;         // 絶対y座標：玉の数
export const POWER_ITEMS_LABEL_Y = 78; // 絶対y座標：「持ち物：」の見出し
export const POWER_ITEM_START_Y = 98;  // 絶対y座標：もちもの一覧の先頭行
export const POWER_LOC_PREFIX = '現在地：';
export const POWER_LOC_PAD = 12;       // 左右の内側余白
// つよさ画面の現在地1行に収まる最大文字数（「現在地：」を含む）
export function powerLocationMaxChars() {
  return Math.floor((POWER_WIN_W - POWER_LOC_PAD) / MENU_LOC_CHAR_W);
}
export const POWER_ITEM_LINE_H = 16;
export const POWER_FOOTER_GAP = 14;    // 最終アイテム行と「もどる」案内文の間隔

// つよさウィンドウの高さ（itemCountは所持どうぐの件数。0件でも「なし」の1行を確保する）
export function powerWinHeight(itemCount) {
  const lines = Math.max(itemCount, 1);
  const lastItemY = POWER_ITEM_START_Y + (lines - 1) * POWER_ITEM_LINE_H;
  const footerY = lastItemY + POWER_ITEM_LINE_H + POWER_FOOTER_GAP;
  return footerY + 16 - POWER_WIN_Y; // 16=フォント1行ぶんの余白
}

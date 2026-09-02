import { describe, it, expect } from 'vitest';
import {
  paginateText, createMessageBox, advanceMessageBox, isMessageBoxLastPage,
  tickMessageBox, isBlinkVisible, moveCursor, createChoiceWindow, moveChoiceCursor,
} from '../js/engine/window.js';

describe('paginateText（テキストのページング）', () => {
  it('charsPerLine未満のテキストは1行1ページになる', () => {
    expect(paginateText('こんにちは', 18, 2)).toEqual([['こんにちは']]);
  });

  it('charsPerLineを超えると折り返す', () => {
    const text = 'あ'.repeat(20); // charsPerLine=18なので18文字+2文字で2行
    const pages = paginateText(text, 18, 2);
    expect(pages).toEqual([['あ'.repeat(18), 'あ'.repeat(2)]]);
  });

  it('linesPerPageを超えると次ページに分かれる', () => {
    const text = 'あ'.repeat(18 * 3); // 3行ぶん→2行/ページで2ページ
    const pages = paginateText(text, 18, 2);
    expect(pages.length).toBe(2);
    expect(pages[0]).toEqual(['あ'.repeat(18), 'あ'.repeat(18)]);
    expect(pages[1]).toEqual(['あ'.repeat(18)]);
  });

  it('\\nは明示的な改行として扱われる', () => {
    const pages = paginateText('ひとつめ\nふたつめ', 18, 2);
    expect(pages).toEqual([['ひとつめ', 'ふたつめ']]);
  });

  it('空文字でも最低1ページ（空行）を返す', () => {
    expect(paginateText('', 18, 2)).toEqual([['']]);
    expect(paginateText(undefined, 18, 2)).toEqual([['']]);
  });
});

describe('MessageBox（メッセージ送り）', () => {
  it('Z送りでページが進み、最終ページではfalseを返す', () => {
    const box = createMessageBox('あ'.repeat(18 * 3), { charsPerLine: 18, linesPerPage: 2 });
    expect(box.pages.length).toBe(2);
    expect(box.pageIndex).toBe(0);
    expect(isMessageBoxLastPage(box)).toBe(false);
    expect(advanceMessageBox(box)).toBe(true);
    expect(box.pageIndex).toBe(1);
    expect(isMessageBoxLastPage(box)).toBe(true);
    expect(advanceMessageBox(box)).toBe(false); // 最終ページ：これ以上は進まない
    expect(box.pageIndex).toBe(1); // ページ番号は変わらない
  });

  it('1ページのみのメッセージは最初からisMessageBoxLastPageがtrue', () => {
    const box = createMessageBox('みじかい ぶん');
    expect(isMessageBoxLastPage(box)).toBe(true);
    expect(advanceMessageBox(box)).toBe(false);
  });

  it('▼点滅：blinkTickの前半だけ表示、cycleで一周する', () => {
    const box = createMessageBox('てすと');
    expect(box.blinkTick).toBe(0);
    expect(isBlinkVisible(box, 30)).toBe(true);
    for (let i = 0; i < 30; i++) tickMessageBox(box, 60);
    expect(box.blinkTick).toBe(30);
    expect(isBlinkVisible(box, 30)).toBe(false); // 後半は非表示
    for (let i = 0; i < 30; i++) tickMessageBox(box, 60);
    expect(box.blinkTick).toBe(0); // 60で一周
    expect(isBlinkVisible(box, 30)).toBe(true);
  });
});

describe('moveCursor（カーソル移動・純粋関数）', () => {
  it('下に移動して末尾を超えたら先頭にラップする', () => {
    expect(moveCursor(0, 1, 3)).toBe(1);
    expect(moveCursor(1, 1, 3)).toBe(2);
    expect(moveCursor(2, 1, 3)).toBe(0);
  });

  it('上に移動して先頭を超えたら末尾にラップする', () => {
    expect(moveCursor(0, -1, 3)).toBe(2);
    expect(moveCursor(1, -1, 3)).toBe(0);
  });

  it('countが0以下なら常に0を返す', () => {
    expect(moveCursor(0, 1, 0)).toBe(0);
    expect(moveCursor(0, -1, 0)).toBe(0);
  });
});

describe('ChoiceWindow（縦選択肢）', () => {
  it('初期カーソルは0', () => {
    const win = createChoiceWindow(['たたかう', 'どうぐ', 'にげる']);
    expect(win.cursor).toBe(0);
  });

  it('moveChoiceCursorで上下に移動しラップする', () => {
    const win = createChoiceWindow(['たたかう', 'どうぐ', 'にげる']);
    moveChoiceCursor(win, 1);
    expect(win.cursor).toBe(1);
    moveChoiceCursor(win, 1);
    expect(win.cursor).toBe(2);
    moveChoiceCursor(win, 1); // 末尾から先頭へラップ
    expect(win.cursor).toBe(0);
    moveChoiceCursor(win, -1); // 先頭から末尾へラップ
    expect(win.cursor).toBe(2);
  });

  it('選択肢が1件のときは常に0のまま', () => {
    const win = createChoiceWindow(['とじる']);
    moveChoiceCursor(win, 1);
    expect(win.cursor).toBe(0);
    moveChoiceCursor(win, -1);
    expect(win.cursor).toBe(0);
  });
});

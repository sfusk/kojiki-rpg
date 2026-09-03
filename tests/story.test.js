// 章の導入（prologue）・締め（epilogue）の語りが、
// 全章に用意され、画面内に収まり、実際にゲーム中で呼び出されることを検証する。
import { describe, it, expect } from 'vitest';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { WORLD } from '../js/data/world.js';
import { paginateText } from '../js/engine/window.js';

const CHARS_PER_LINE = 12; // メッセージ窓の1行あたり文字数
const STORY_LINES_PER_PAGE = 8; // main.js の STORY_LINES_PER_PAGE と揃える

// イベントコマンドを条件分岐の中まで含めて平坦化する
function flatten(commands, out = []) {
  for (const cmd of commands || []) {
    out.push(cmd);
    if (cmd.then) flatten(cmd.then, out);
    if (cmd.else) flatten(cmd.else, out);
  }
  return out;
}

const chapterIds = Object.keys(CHAPTERS).filter((id) => id !== 'world');

describe('章の語り（prologue / epilogue）', () => {
  for (const id of chapterIds) {
    const chapter = CHAPTERS[id];

    it(`${id}: 導入と締めの本文がある`, () => {
      expect(typeof chapter.prologue).toBe('string');
      expect(chapter.prologue.length).toBeGreaterThan(50);
      expect(typeof chapter.epilogue).toBe('string');
      expect(chapter.epilogue.length).toBeGreaterThan(50);
    });

    it(`${id}: 本文が折り返しても窓からはみ出さない`, () => {
      for (const which of ['prologue', 'epilogue']) {
        // 折り返し後の各行が窓幅に収まること
        const pages = paginateText(chapter[which], CHARS_PER_LINE, STORY_LINES_PER_PAGE);
        for (const page of pages) {
          expect(page.length).toBeLessThanOrEqual(STORY_LINES_PER_PAGE);
          for (const line of page) {
            expect(line.length).toBeLessThanOrEqual(CHARS_PER_LINE);
          }
        }
      }
    });

    it(`${id}: 締めの語りが章クリア時に呼び出される`, () => {
      const commands = [];
      for (const npc of chapter.npcs || []) flatten(npc.event, commands);
      for (const tr of chapter.triggers || []) flatten(tr.event, commands);
      expect(commands.some((c) => c.story === 'epilogue')).toBe(true);
    });
  }

  it('全章の導入がワールドマップの入口から呼び出される', () => {
    const withPrologue = new Set();
    for (const tr of WORLD.triggers || []) {
      const cmds = flatten(tr.event);
      const warp = cmds.find((c) => c.warp);
      const hasStory = cmds.some((c) => c.story === 'prologue');
      if (warp && hasStory) withPrologue.add(warp.warp.map);
    }
    expect([...withPrologue].sort()).toEqual(chapterIds.sort());
  });

  it('本文に英単語が紛れ込んでいない（推敲漏れの検出）', () => {
    const found = [];
    for (const id of chapterIds) {
      for (const which of ['prologue', 'epilogue']) {
        const m = CHAPTERS[id][which].match(/[A-Za-z]{2,}/g);
        if (m) found.push(`${id}.${which}: ${m.join(',')}`);
      }
    }
    expect(found).toEqual([]);
  });
});

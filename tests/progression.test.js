import { describe, it, expect } from 'vitest';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { createState, hasFlag, hasItem } from '../js/engine/flags.js';
import { startEvent, stepEvent } from '../js/engine/events.js';
import { createQuiz, answerQuiz } from '../js/engine/quiz.js';
import { createBattle, battleAct } from '../js/engine/battle.js';
import { BOSSES } from '../js/data/bosses.js';

function runEvent(commands, state) {
  const ev = startEvent(commands);
  let r;
  while ((r = stepEvent(ev, state)).kind !== 'done') {
    if (r.kind === 'quiz') {
      const ch = Object.values(CHAPTERS).find((c) => c.id === r.id);
      const quiz = createQuiz(ch.quiz);
      for (const q of ch.quiz) answerQuiz(quiz, q.answer);
    } else if (r.kind === 'battle') {
      const boss = BOSSES[r.id];
      // プレイヤーは所持しているアイテムしか使えない
      // （章データがgiveし忘れているとここで落ちる）
      expect(hasItem(state, boss.gimmickItem)).toBe(true);
      const b = createBattle(boss);
      battleAct(b, 'item', boss.gimmickItem);
      if (boss.escape) battleAct(b, 'run');
      else while (!b.over) battleAct(b, 'attack');
      expect(b.result).toBe('win');
    }
  }
}

// requiresを尊重しつつ、起動できるイベントがなくなるまで繰り返す。
// プレイヤーがマップ内を行き来して話しかけ直す動きに相当し、
// データの列挙順に依存しない。
function playChapter(ch, state) {
  const entities = [...(ch.triggers || []), ...(ch.npcs || [])];
  const done = new Set();
  let progressed = true;
  while (progressed) {
    progressed = false;
    entities.forEach((e, i) => {
      if (done.has(i)) return;
      if (e.requires && !hasFlag(state, e.requires)) return; // ロック中は起動しない
      runEvent(e.event || [], state);
      done.add(i);
      progressed = true;
    });
  }
}

describe('全章の通し進行', () => {
  it('第1〜8章を順にクリアすると玉が各章ちょうど1個ずつ増える', () => {
    const state = createState();
    for (let n = 1; n <= 8; n++) {
      const ch = CHAPTERS[`ch${n}`];
      expect(ch).toBeTruthy();
      const before = state.orbs;
      playChapter(ch, state);
      expect(hasFlag(state, `ch${n}_clear`)).toBe(true);
      expect(state.orbs).toBe(before + 1);
    }
    expect(state.orbs).toBe(8);
  });
  it('ワールドの章入口はch1が無条件、ch2〜ch8が直前章クリアを順に要求する', () => {
    const world = CHAPTERS.world;
    const reqs = (world.triggers || []).filter((t) => t.requires)
      .map((t) => t.requires).sort();
    expect(reqs).toEqual(['ch1_clear', 'ch2_clear', 'ch3_clear', 'ch4_clear',
                          'ch5_clear', 'ch6_clear', 'ch7_clear']);
  });
});

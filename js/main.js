// ゲームループ（field/msg/quiz/battle/menu モード）。
// 内部解像度256x224（16x14タイル）を2倍描画し、512x448の物理canvasに表示する。
import { buildSprites } from './data/sprites.js';
import { createInput } from './engine/input.js';
import { createRenderer, drawField, TILE } from './engine/renderer.js';
import { tryStep, DIRS } from './engine/movement.js';
import { createState } from './engine/flags.js';
import { startEvent, stepEvent } from './engine/events.js';
import { createQuiz, answerQuiz } from './engine/quiz.js';
import { createBattle, battleAct } from './engine/battle.js';
import { BOSSES } from './data/bosses.js';
import { CODEX } from './data/codexData.js';
import {
  drawWindow, drawText, drawMessageBox, drawChoiceWindow,
  createMessageBox, advanceMessageBox, tickMessageBox,
  createChoiceWindow, moveChoiceCursor,
} from './engine/window.js';

const TWEEN_FRAMES = 8; // 1タイル移動にかけるフレーム数

// ── 仮データ（Task 10以降で本実装のマップ/クイズ/イベントデータに差し替えて削除する）──
const testMap = {
  rows: [
    '#########',
    '#.......#',
    '#.M.....#',
    '#...T...#',
    '#.......#',
    '#.......#',
    '#########',
  ],
};

const npcs = [
  { name: 'elder', x: 5, y: 2, frame: 0, eventId: 'elderTalk' },
  { name: 'rabbit', x: 6, y: 4, frame: 0 },
];

// 会話→クイズ→戦闘UIの一連の流れを目視確認するための仮イベント
const DEMO_EVENTS = {
  elderTalk: [
    {
      if: 'met_elder',
      then: [{ msg: 'また あそびにきたか たびびとよ' }],
      else: [
        { msg: 'おお たびびとよ よくきた' },
        { msg: 'まずは こじきの ちしきを ためそう' },
        { quiz: 'demoQuiz' },
        { msg: 'みごとじゃ！ ちからを さずけよう' },
        { give: 'へびのひれ' },
        { set: 'met_elder' },
        { msg: 'では さいごに この さきの へびを しずめてくるのじゃ' },
        { battle: 'hebi' },
        { msg: 'おお もどったか！ たびびとよ' },
      ],
    },
  ],
};

const DEMO_QUIZZES = {
  demoQuiz: [
    { q: 'イザナギの つまの なは？', choices: ['アマテラス', 'イザナミ', 'スセリビメ', 'クシナダヒメ'],
      answer: 1, explain: 'イザナミです。くにうみの おんながみです。' },
    { q: 'あまのいわとに かくれたのは だれ？', choices: ['ツクヨミ', 'スサノオ', 'アマテラス', 'オオクニヌシ'],
      answer: 2, explain: 'アマテラスです。よが やみに つつまれました。' },
  ],
};
// ── 仮データここまで ──────────────────────────────────

function createHero(tx, ty) {
  return {
    tx, ty,
    px: tx * TILE, py: ty * TILE,
    dir: 'down',
    frame: 0,
    moving: false,
    tweenFrame: 0,
    fromPx: tx * TILE, fromPy: ty * TILE,
    targetTx: tx, targetTy: ty,
  };
}

function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(2, 2); // 内部解像度256x224 → 物理512x448

  const sprites = buildSprites();
  const input = createInput(window);
  const renderer = createRenderer(ctx, sprites);

  const state = {
    ...createState(),
    mode: 'field', // field/msg/quiz/battle/menu
    hero: createHero(1, 1),
    animTick: 0,
    returnPos: null,   // 戦闘敗北時に戻すフィールド上の位置
    activeEvent: null, // 進行中のevent（startEventの戻り値）
    msg: null,         // フィールド会話用MessageBox
    quiz: null,        // { data, id, win, phase: 'ask'|'result', resultMsg }
    battle: null,      // { data, id, phase: 'command'|'item'|'log', cmdWin, itemWin, logBox }
    menu: null,        // { section: 'root'|'power'|'book'|'detail', rootWin, bookWin, detailText }
  };

  // ── イベント進行の共通処理 ──────────────────────────
  function beginEvent(commands) {
    state.activeEvent = startEvent(commands);
    advanceActiveEvent();
  }

  // stepEventを1回進め、返り値のkindに応じてモードを切り替える
  function advanceActiveEvent() {
    if (!state.activeEvent) { state.mode = 'field'; return; }
    const r = stepEvent(state.activeEvent, state);
    if (r.kind === 'msg') {
      state.mode = 'msg';
      state.msg = createMessageBox(r.text);
    } else if (r.kind === 'quiz') {
      const questions = DEMO_QUIZZES[r.id] || [];
      state.quiz = { data: createQuiz(questions), id: r.id, phase: 'ask', win: null, question: null, result: null, resultMsg: null };
      startQuizQuestion();
      state.mode = 'quiz';
    } else if (r.kind === 'battle') {
      const boss = BOSSES[r.id];
      state.returnPos = { tx: state.hero.tx, ty: state.hero.ty, dir: state.hero.dir };
      state.battle = {
        data: createBattle(boss), id: r.id, phase: 'command',
        cmdWin: createChoiceWindow(['たたかう', 'どうぐ', 'にげる']),
        itemWin: null, logBox: null,
      };
      state.mode = 'battle';
    } else {
      state.activeEvent = null;
      state.mode = 'field';
    }
  }

  function startQuizQuestion() {
    // quiz.questionに設問を保持しておく：正解するとquiz.data.indexは即座に次へ進むため、
    // result表示中（前の設問の解説を見せている間）にindexから再取得すると
    // 最終問題を正解した直後は範囲外を参照してしまう。描画は必ずこのquestionを使う。
    const q = state.quiz.data.questions[state.quiz.data.index];
    state.quiz.question = q;
    state.quiz.win = createChoiceWindow(q.choices);
    state.quiz.phase = 'ask';
  }

  function startBattleLog(battle) {
    battle.logBox = createMessageBox(battle.data.log.join('\n'));
    battle.phase = 'log';
  }

  function openMenu() {
    state.menu = {
      section: 'root',
      rootWin: createChoiceWindow(['つよさ', 'たびのしょ', 'とじる']),
      bookWin: null,
      detailText: null,
    };
    state.mode = 'menu';
  }

  // ── field：移動＋前方インタラクト ──────────────────
  function frontTile(hero) {
    const { dx, dy } = DIRS[hero.dir];
    return { x: hero.tx + dx, y: hero.ty + dy };
  }

  function findNpcAt(x, y) {
    return npcs.find((n) => n.x === x && n.y === y);
  }

  function updateField() {
    const hero = state.hero;
    state.animTick++;
    if (state.animTick % 30 === 0) {
      for (const npc of npcs) npc.frame = npc.frame ? 0 : 1;
    }

    if (input.consume('x')) { openMenu(); return; }

    if (input.consume('z')) {
      const front = frontTile(hero);
      const npc = findNpcAt(front.x, front.y);
      if (npc && DEMO_EVENTS[npc.eventId]) { beginEvent(DEMO_EVENTS[npc.eventId]); return; }
    }

    if (!hero.moving) {
      let dir = null;
      if (input.isDown('ArrowUp')) dir = 'up';
      else if (input.isDown('ArrowDown')) dir = 'down';
      else if (input.isDown('ArrowLeft')) dir = 'left';
      else if (input.isDown('ArrowRight')) dir = 'right';

      if (dir) {
        hero.dir = dir;
        const result = tryStep(testMap, { x: hero.tx, y: hero.ty, dir }, dir);
        if (result.moved) {
          hero.moving = true;
          hero.tweenFrame = 0;
          hero.fromPx = hero.px;
          hero.fromPy = hero.py;
          hero.targetTx = result.pos.x;
          hero.targetTy = result.pos.y;
        }
      } else {
        hero.frame = 0;
      }
    } else {
      hero.tweenFrame++;
      const t = Math.min(hero.tweenFrame / TWEEN_FRAMES, 1);
      const targetPx = hero.targetTx * TILE;
      const targetPy = hero.targetTy * TILE;
      hero.px = hero.fromPx + (targetPx - hero.fromPx) * t;
      hero.py = hero.fromPy + (targetPy - hero.fromPy) * t;
      hero.frame = hero.tweenFrame < TWEEN_FRAMES / 2 ? 0 : 1;

      if (hero.tweenFrame >= TWEEN_FRAMES) {
        hero.tx = hero.targetTx;
        hero.ty = hero.targetTy;
        hero.px = targetPx;
        hero.py = targetPy;
        hero.moving = false;
        hero.frame = 0;
      }
    }
  }

  // ── msg：フィールド会話（Z送り→イベント継続） ──────
  function updateMsg() {
    tickMessageBox(state.msg);
    if (input.consume('z')) {
      const more = advanceMessageBox(state.msg);
      if (!more) {
        state.msg = null;
        advanceActiveEvent();
      }
    }
  }

  function drawMsg() {
    drawMessageBox(ctx, state.msg, 8, 156, 240, 60);
  }

  // ── quiz：問題文＋4択ChoiceWindow ───────────────────
  function updateQuiz() {
    const quiz = state.quiz;
    if (quiz.phase === 'ask') {
      if (input.consume('ArrowUp')) moveChoiceCursor(quiz.win, -1);
      else if (input.consume('ArrowDown')) moveChoiceCursor(quiz.win, 1);
      else if (input.consume('z')) {
        const r = answerQuiz(quiz.data, quiz.win.cursor);
        quiz.result = r;
        quiz.resultMsg = createMessageBox(r.correct ? `せいかい！ ${r.explain}` : `ちがう…　${r.explain}`);
        quiz.phase = 'result';
      }
    } else {
      tickMessageBox(quiz.resultMsg);
      if (input.consume('z')) {
        const more = advanceMessageBox(quiz.resultMsg);
        if (more) return;
        if (quiz.result.finished) {
          state.quiz = null;
          advanceActiveEvent();
        } else if (quiz.result.correct) {
          startQuizQuestion();
        } else {
          quiz.phase = 'ask'; // 不正解：同じ問題に戻ってやり直す
        }
      }
    }
  }

  function drawQuiz() {
    const quiz = state.quiz;
    const q = quiz.question; // quiz.data.indexは正解直後に進んでしまうため使わない
    drawWindow(ctx, 8, 8, 240, 36);
    drawText(ctx, q.q, 14, 16);
    if (quiz.phase === 'ask') {
      drawChoiceWindow(ctx, quiz.win, 8, 52, 240, 22 * q.choices.length + 16);
    } else {
      drawMessageBox(ctx, quiz.resultMsg, 8, 156, 240, 60);
    }
  }

  // ── battle：たたかう／どうぐ／にげる、ログはZ送り ──
  function updateBattle() {
    const b = state.battle;
    if (b.phase === 'command') {
      if (input.consume('ArrowUp')) moveChoiceCursor(b.cmdWin, -1);
      else if (input.consume('ArrowDown')) moveChoiceCursor(b.cmdWin, 1);
      else if (input.consume('z')) {
        const cmd = b.cmdWin.cursor;
        if (cmd === 0) { battleAct(b.data, 'attack'); startBattleLog(b); }
        else if (cmd === 1) {
          if (state.items.length === 0) {
            b.data.log = ['どうぐを もっていない！'];
            startBattleLog(b);
          } else {
            b.itemWin = createChoiceWindow([...state.items, 'もどる']);
            b.phase = 'item';
          }
        } else if (cmd === 2) { battleAct(b.data, 'run'); startBattleLog(b); }
      }
    } else if (b.phase === 'item') {
      if (input.consume('ArrowUp')) moveChoiceCursor(b.itemWin, -1);
      else if (input.consume('ArrowDown')) moveChoiceCursor(b.itemWin, 1);
      else if (input.consume('x')) { b.phase = 'command'; }
      else if (input.consume('z')) {
        const idx = b.itemWin.cursor;
        if (idx === state.items.length) { b.phase = 'command'; } // もどる
        else {
          const itemId = state.items[idx];
          battleAct(b.data, 'item', itemId);
          startBattleLog(b);
        }
      }
    } else if (b.phase === 'log') {
      tickMessageBox(b.logBox);
      if (input.consume('z')) {
        const more = advanceMessageBox(b.logBox);
        if (more) return;
        if (b.data.over) {
          if (b.data.result === 'win') {
            state.battle = null;
            advanceActiveEvent();
          } else {
            // lose：直前位置に戻す。playerHpは戦闘オブジェクト自体を破棄するのでリセットされる。
            const pos = state.returnPos;
            state.hero.tx = pos.tx; state.hero.ty = pos.ty; state.hero.dir = pos.dir;
            state.hero.px = pos.tx * TILE; state.hero.py = pos.ty * TILE;
            state.hero.moving = false;
            state.battle = null;
            state.activeEvent = null; // イベントは中断する
            state.msg = createMessageBox('めのまえが まっくらになった…');
            state.mode = 'msg';
          }
        } else {
          b.cmdWin.cursor = 0;
          b.phase = 'command';
        }
      }
    }
  }

  function drawBattle() {
    const b = state.battle;
    drawWindow(ctx, 8, 8, 240, 36);
    drawText(ctx, `${b.data.boss.name}`, 14, 12);
    drawText(ctx, `てき HP:${Math.max(b.data.bossHp, 0)}`, 14, 30);
    drawWindow(ctx, 8, 116, 240, 24);
    drawText(ctx, `たびびと HP:${Math.max(b.data.playerHp, 0)}`, 14, 122);

    if (b.phase === 'command') {
      drawChoiceWindow(ctx, b.cmdWin, 8, 148, 120, 74);
    } else if (b.phase === 'item') {
      drawChoiceWindow(ctx, b.itemWin, 8, 148, 168, 22 * b.itemWin.items.length + 16);
    } else if (b.phase === 'log') {
      drawMessageBox(ctx, b.logBox, 8, 148, 240, 68);
    }
  }

  // ── menu：つよさ／たびのしょ／とじる ────────────────
  function updateMenu() {
    const m = state.menu;
    if (m.section === 'root') {
      if (input.consume('ArrowUp')) moveChoiceCursor(m.rootWin, -1);
      else if (input.consume('ArrowDown')) moveChoiceCursor(m.rootWin, 1);
      else if (input.consume('x')) { state.menu = null; state.mode = 'field'; }
      else if (input.consume('z')) {
        const cur = m.rootWin.cursor;
        if (cur === 0) { m.section = 'power'; }
        else if (cur === 1) {
          const labels = state.codex.length > 0
            ? state.codex.map((id) => CODEX.find((c) => c.id === id)?.name || id)
            : ['まだ なし'];
          m.bookWin = createChoiceWindow(labels);
          m.section = 'book';
        } else { state.menu = null; state.mode = 'field'; }
      }
    } else if (m.section === 'power') {
      if (input.consume('x') || input.consume('z')) m.section = 'root';
    } else if (m.section === 'book') {
      if (input.consume('ArrowUp')) moveChoiceCursor(m.bookWin, -1);
      else if (input.consume('ArrowDown')) moveChoiceCursor(m.bookWin, 1);
      else if (input.consume('x')) { m.section = 'root'; }
      else if (input.consume('z')) {
        if (state.codex.length > 0) {
          const id = state.codex[m.bookWin.cursor];
          const entry = CODEX.find((c) => c.id === id);
          m.detailText = entry ? `${entry.name}\n${entry.desc}` : '';
          m.section = 'detail';
        }
      }
    } else if (m.section === 'detail') {
      if (input.consume('x') || input.consume('z')) m.section = 'book';
    }
  }

  function drawMenu() {
    const m = state.menu;
    if (m.section === 'root') {
      drawChoiceWindow(ctx, m.rootWin, 140, 8, 108, 74);
    } else if (m.section === 'power') {
      drawWindow(ctx, 8, 8, 240, 92);
      drawText(ctx, `たまの かず：${state.orbs}`, 14, 16);
      drawText(ctx, 'もちもの：', 14, 38);
      drawText(ctx, state.items.length > 0 ? state.items.join('・') : 'なし', 14, 58);
      drawText(ctx, '（ZかXで もどる）', 14, 80);
    } else if (m.section === 'book') {
      drawChoiceWindow(ctx, m.bookWin, 8, 8, 240, 22 * m.bookWin.items.length + 16);
    } else if (m.section === 'detail') {
      drawWindow(ctx, 8, 8, 240, 92);
      (m.detailText || '').split('\n').forEach((line, i) => drawText(ctx, line, 14, 16 + i * 22));
    }
  }

  function loop() {
    drawField(renderer, testMap, state, npcs);

    if (state.mode === 'field') {
      updateField();
    } else if (state.mode === 'msg') {
      updateMsg();
      // updateMsg中にイベントが進み、同フレームで別モードへ遷移してmsgがnullになることがある
      if (state.msg) drawMsg();
    } else if (state.mode === 'quiz') {
      updateQuiz();
      if (state.quiz) drawQuiz();
    } else if (state.mode === 'battle') {
      updateBattle();
      if (state.battle) drawBattle();
    } else if (state.mode === 'menu') {
      updateMenu();
      if (state.menu) drawMenu();
    }
    // title/ending は未実装（今後のタスクで追加）
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();

// ゲームループ（title/field/msg/quiz/battle/menu モード）。
// 内部解像度256x224（16x14タイル）を2倍描画し、512x448の物理canvasに表示する。
import { buildSprites } from './data/sprites.js';
import { createInput } from './engine/input.js';
import { createRenderer, drawField, TILE } from './engine/renderer.js';
import { tryStep, DIRS } from './engine/movement.js';
import { createState, hasFlag } from './engine/flags.js';
import { startEvent, stepEvent } from './engine/events.js';
import { createQuiz, answerQuiz } from './engine/quiz.js';
import { createBattle, battleAct } from './engine/battle.js';
import { saveGame, loadGame } from './engine/save.js';
import { CHAPTERS } from './data/chapters/index.js';
import { BOSSES } from './data/bosses.js';
import { CODEX } from './data/codexData.js';
import {
  drawWindow, drawText, drawMessageBox, drawChoiceWindow,
  createMessageBox, advanceMessageBox, tickMessageBox,
  createChoiceWindow, moveChoiceCursor,
} from './engine/window.js';

const TWEEN_FRAMES = 8; // 1タイル移動にかけるフレーム数
const DEFAULT_LOCKED_MSG = '…'; // requires未達成時、lockedMsg省略時のメッセージ

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

  const initial = createState();
  const hasSave = loadGame(localStorage) !== null;

  const state = {
    ...initial,
    mode: 'title', // title/field/msg/quiz/battle/menu
    hero: createHero(initial.pos.x, initial.pos.y),
    animTick: 0,
    returnPos: null,   // 戦闘敗北時に戻すフィールド上の位置
    activeEvent: null, // 進行中のevent（startEventの戻り値）
    msg: null,         // フィールド会話用MessageBox
    quiz: null,        // { data, id, win, phase: 'ask'|'result', resultMsg }
    battle: null,      // { data, id, phase: 'command'|'item'|'log', cmdWin, itemWin, logBox }
    menu: null,        // { section: 'root'|'power'|'book'|'detail', rootWin, bookWin, detailText }
    title: createChoiceWindow(hasSave ? ['はじめから', 'つづきから'] : ['はじめから']),
  };

  // ── マップ遷移：state.pos.map で CHAPTERS から現マップを引く ──
  function currentChapter() {
    return CHAPTERS[state.pos.map];
  }

  // heroのタイル/ピクセル座標をstate.posへ合わせる（title開始時・warp後に使う）
  function syncHeroToPos() {
    const hero = state.hero;
    hero.tx = state.pos.x;
    hero.ty = state.pos.y;
    hero.dir = state.pos.dir;
    hero.px = hero.tx * TILE;
    hero.py = hero.ty * TILE;
    hero.fromPx = hero.px;
    hero.fromPy = hero.py;
    hero.targetTx = hero.tx;
    hero.targetTy = hero.ty;
    hero.moving = false;
    hero.tweenFrame = 0;
    hero.frame = 0;
  }

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
      const questions = (CHAPTERS[r.id] && CHAPTERS[r.id].quiz) || [];
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
      // イベント完了：state.posはwarpで既に更新済みのはずなのでheroを合わせ、オートセーブする
      state.activeEvent = null;
      state.mode = 'field';
      syncHeroToPos();
      saveGame(state, localStorage);
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

  // requires未達成ならlockedMsgを表示するだけでイベントは開始しない（NPC・トリガー共通）
  function startGatedEvent(entity) {
    if (entity.requires && !hasFlag(state, entity.requires)) {
      state.msg = createMessageBox(entity.lockedMsg || DEFAULT_LOCKED_MSG);
      state.mode = 'msg';
      return;
    }
    beginEvent(entity.event || []);
  }

  // ── title：はじめから／つづきから ───────────────────
  function updateTitle() {
    if (input.consume('ArrowUp')) moveChoiceCursor(state.title, -1);
    else if (input.consume('ArrowDown')) moveChoiceCursor(state.title, 1);
    else if (input.consume('z')) {
      const label = state.title.items[state.title.cursor];
      if (label === 'つづきから') {
        const loaded = loadGame(localStorage);
        if (loaded) {
          state.flags = loaded.flags;
          state.items = loaded.items;
          state.orbs = loaded.orbs;
          state.codex = loaded.codex;
          state.pos = loaded.pos;
        }
      }
      syncHeroToPos();
      state.title = null;
      state.mode = 'field';
    }
  }

  function drawTitle() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 224);
    drawText(ctx, 'かむがたり', 92, 60);
    drawChoiceWindow(ctx, state.title, 70, 100, 116, 22 * state.title.items.length + 16);
  }

  // ── field：移動＋前方インタラクト（NPC）＋踏むと発動（トリガー）──
  function frontTile(hero) {
    const { dx, dy } = DIRS[hero.dir];
    return { x: hero.tx + dx, y: hero.ty + dy };
  }

  function updateField() {
    const hero = state.hero;
    const chapter = currentChapter();
    const npcs = chapter.npcs || [];
    state.animTick++;
    if (state.animTick % 30 === 0) {
      for (const npc of npcs) npc.frame = npc.frame ? 0 : 1;
    }

    if (input.consume('x')) { openMenu(); return; }

    if (input.consume('z')) {
      const front = frontTile(hero);
      const npc = npcs.find((n) => n.x === front.x && n.y === front.y);
      if (npc) { startGatedEvent(npc); return; }
    }

    if (!hero.moving) {
      let dir = null;
      if (input.isDown('ArrowUp')) dir = 'up';
      else if (input.isDown('ArrowDown')) dir = 'down';
      else if (input.isDown('ArrowLeft')) dir = 'left';
      else if (input.isDown('ArrowRight')) dir = 'right';

      if (dir) {
        hero.dir = dir;
        state.pos.dir = dir;
        const result = tryStep(chapter.map, { x: hero.tx, y: hero.ty, dir }, dir);
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
        state.pos.x = hero.tx;
        state.pos.y = hero.ty;

        const trigger = (chapter.triggers || []).find((tr) => tr.x === hero.tx && tr.y === hero.ty);
        if (trigger) startGatedEvent(trigger);
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
            state.pos.x = pos.tx; state.pos.y = pos.ty; state.pos.dir = pos.dir;
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
    if (state.mode === 'title') {
      updateTitle();
      // updateTitleがこのフレーム内でmode:'field'へ遷移させ、
      // state.titleをnullにすることがあるため、遷移後はdrawTitleを呼ばない
      if (state.mode === 'title') drawTitle();
      requestAnimationFrame(loop);
      return;
    }

    const chapter = currentChapter();
    const drawNpcs = (chapter.npcs || []).map((n) => ({ name: n.sprite, x: n.x, y: n.y, frame: n.frame || 0 }));
    drawField(renderer, chapter.map, state, drawNpcs);

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
    // ending は未実装（今後のタスクで追加）
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();

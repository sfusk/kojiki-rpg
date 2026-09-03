// ゲームループ（title/field/msg/quiz/battle/menu モード）。
// 内部解像度256x224（16x14タイル）を2倍描画し、512x448の物理canvasに表示する。
import { buildSprites, buildTiles } from './data/sprites.js';
import { createInput } from './engine/input.js';
import { createRenderer, drawField, TILE } from './engine/renderer.js';
import { tryStep, DIRS } from './engine/movement.js';
import { createState, hasFlag, setFlag } from './engine/flags.js';
import { startEvent, stepEvent } from './engine/events.js';
import { createQuiz, answerQuiz } from './engine/quiz.js';
import { createBattle, battleAct } from './engine/battle.js';
import { saveGame, loadGame } from './engine/save.js';
import { createAudio } from './engine/audio.js';
import { VERSION } from './data/version.js';
import { CHAPTERS } from './data/chapters/index.js';
import { BOSSES } from './data/bosses.js';
import { CODEX } from './data/codexData.js';
import {
  drawWindow, drawText, drawMessageBox, drawChoiceWindow,
  createMessageBox, advanceMessageBox, tickMessageBox,
  createChoiceWindow, moveChoiceCursor, paginateText,
} from './engine/window.js';
import {
  BATTLE_ITEM_WIN_X, BATTLE_ITEM_WIN_Y, BATTLE_ITEM_WIN_W, BATTLE_ITEM_LINE_H,
  BATTLE_ITEM_MAX_VISIBLE, battleItemWinHeight,
  POWER_WIN_X, POWER_WIN_Y, POWER_WIN_W, POWER_ITEM_START_Y, POWER_ITEM_LINE_H,
  POWER_FOOTER_GAP, powerWinHeight,
} from './data/uiLayout.js';

const TWEEN_FRAMES = 8; // 1タイル移動にかけるフレーム数
const FADE_FRAMES = 30; // マップ遷移後のフェードイン所要フレーム数
const DEFAULT_LOCKED_MSG = '…'; // requires未達成時、lockedMsg省略時のメッセージ
const BOOK_LIST_VISIBLE = 7; // 旅の書：一覧に一度に表示する項目数（スクロール表示の閾値）
const CODEX_CATEGORIES = ['かみ', 'ちめい', 'ことば'];

// 真エンディング：state.orbs >= 8 になった直後に表示する神々の系譜（Z送りで4段階）
// 各行は12文字以内に収め、paginateText（charsPerLine=12既定）による
// 自動折り返しで単語の途中が割れないようにしている。
const ENDING_STAGES = [
  ['イザナギと', 'イザナミは', '国を生み', '神々を', '生んだ。', '',
   '黄泉国の', '別れののち', 'イザナギは', '禊をして',
   'アマテラス', 'ツクヨミ', 'スサノオの', '三貴子が', '生まれた。'].join('\n'),
  ['アマテラスの', '血筋は', '孫ニニギへ', '受け継がれ', '高天原',
   'から日向へ', '天下った。', '',
   '山幸彦を', '経て', 'カムヤマト', 'イワレビコが',
   '大和を', '開いた。', 'それが', '神武天皇。'].join('\n'),
  ['荒ぶる神', 'スサノオは', 'ヤマタの', 'オロチを', '退治し',
   'クシナダヒメと', '結ばれた。', '',
   'その末の', 'オオクニヌシは', '試みを', '乗り越えて',
   '国を築き', '後に', '天つ神へ', '国を', '譲り渡した。'].join('\n'),
  ['これが', '神語りの', '物語。', '',
   'ふることぶみ', '（古事記）は', '今も', '語り継がれて', 'いる。', '',
   '―― 終わり'].join('\n'),
];
const ENDING_LINES_PER_PAGE = 5;

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
  const tiles = buildTiles();
  const input = createInput(window);
  const renderer = createRenderer(ctx, sprites, tiles);
  const audio = createAudio();

  const initial = createState();
  const hasSave = loadGame(localStorage) !== null;

  const state = {
    ...initial,
    mode: 'title', // title/field/msg/quiz/battle/menu/ending
    hero: createHero(initial.pos.x, initial.pos.y),
    animTick: 0,
    returnPos: null,   // 戦闘敗北時に戻すフィールド上の位置
    activeEvent: null, // 進行中のevent（startEventの戻り値）
    msg: null,         // フィールド会話用MessageBox
    speaker: null,     // 会話中のNPC表示名（トリガー由来のナレーションはnull）
    fadeIn: 0,         // マップ遷移後のフェードイン残りフレーム数（0で演出なし）
    eventStartMap: null, // イベント開始時のマップid（完了時に比較してワープ演出を出す）
    quiz: null,        // { data, id, win, phase: 'ask'|'result', resultMsg }
    battle: null,      // { data, id, phase: 'command'|'item'|'log', cmdWin, itemWin, logBox }
    menu: null,        // { section: 'root'|'power'|'tab'|'list'|'detail', rootWin, tabWin, bookWin, bookIds, detailBox }
    ending: null,      // { stage, box } 真エンディング（神々の系譜、Z送り4段階）
    title: createChoiceWindow(hasSave ? ['はじめから', 'つづきから'] : ['はじめから']),
  };

  // デバッグ・自動テスト用にstateを公開する（ゲームロジックからは参照しない）
  window.__state = state;

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
    state.eventStartMap = state.pos.map;
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
      audio.playBgm('battle');
      state.mode = 'battle';
    } else {
      // イベント完了：state.posはwarpで既に更新済みのはずなのでheroを合わせる
      state.activeEvent = null;
      state.speaker = null;
      // マップが変わっていたらワープ演出（効果音＋暗転からのフェードイン）
      if (state.eventStartMap !== null && state.pos.map !== state.eventStartMap) {
        audio.playSfx('warp');
        state.fadeIn = FADE_FRAMES;
      }
      state.eventStartMap = null;
      syncHeroToPos();
      // 第8章クイズクリアのイベントdone時、玉が8個そろっていれば真エンディングへ
      // （ending_seenで一度きりに限定：以後どのイベントが終わっても再突入しない）
      const triggerEnding = state.orbs >= 8 && !hasFlag(state, 'ending_seen');
      if (triggerEnding) setFlag(state, 'ending_seen');
      saveGame(state, localStorage);
      if (triggerEnding) beginEnding();
      else state.mode = 'field';
    }
  }

  // ── ending：神々の系譜をZ送りで4段階表示→タイトルへ戻る ──
  function beginEnding() {
    state.ending = { stage: 0, box: createMessageBox(ENDING_STAGES[0], { linesPerPage: ENDING_LINES_PER_PAGE }) };
    state.mode = 'ending';
  }

  function updateEnding() {
    const ending = state.ending;
    tickMessageBox(ending.box);
    if (input.consume('z')) {
      const more = advanceMessageBox(ending.box);
      if (more) return;
      const nextStage = ending.stage + 1;
      if (nextStage < ENDING_STAGES.length) {
        ending.stage = nextStage;
        ending.box = createMessageBox(ENDING_STAGES[nextStage], { linesPerPage: ENDING_LINES_PER_PAGE });
      } else {
        state.ending = null;
        backToTitle();
      }
    }
  }

  function drawEnding() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 224);
    drawMessageBox(ctx, state.ending.box, 8, 32, 240, 152);
  }

  // タイトル画面へ戻す（エンディング後）。オートセーブ済みなので「つづきから」が選べる。
  function backToTitle() {
    const hasSaveNow = loadGame(localStorage) !== null;
    state.title = createChoiceWindow(hasSaveNow ? ['はじめから', 'つづきから'] : ['はじめから']);
    audio.stopBgm();
    state.mode = 'title';
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
      rootWin: createChoiceWindow(['つよさ', '旅の書', 'とじる']),
      tabWin: null,
      bookWin: null,
      bookIds: null,   // m.bookWin.items（もどる含む）に対応するCODEXのid配列
      detailBox: null,
    };
    state.mode = 'menu';
  }

  // requires未達成ならlockedMsgを表示するだけでイベントは開始しない（NPC・トリガー共通）
  function startGatedEvent(entity) {
    state.speaker = entity.name || null; // NPCなら名前タグを出す
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
      } else {
        // はじめから：セーブデータと状態を初期化する（真エンディング後もここから周回できるように）
        Object.assign(state, createState());
        localStorage.removeItem('kamugatari_save');
      }
      syncHeroToPos();
      state.title = null;
      audio.unlock(); // キー入力起点なので自動再生制限をここで解除できる
      audio.playBgm('field');
      state.mode = 'field';
    }
  }

  function drawTitle() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 224);
    drawText(ctx, 'かむがたり', 92, 60);
    drawChoiceWindow(ctx, state.title, 70, 100, 116, 22 * state.title.items.length + 16);
    // ビルド識別子：古いキャッシュを掴んでいないかの目視確認用
    ctx.save();
    ctx.font = "10px 'ＭＳ ゴシック', monospace";
    ctx.fillStyle = '#666';
    ctx.textBaseline = 'top';
    ctx.fillText(VERSION, 186, 208);
    ctx.restore();
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
        // NPCのいるタイルへは進めない（すり抜け防止）
        const result = tryStep(chapter.map, { x: hero.tx, y: hero.ty, dir }, dir, npcs);
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
        // lockedMsg（activeEventなし）で閉じた場合も名前タグを消す
        if (!state.activeEvent) state.speaker = null;
        advanceActiveEvent();
      }
    }
  }

  function drawMsg() {
    // 話者名タグ：メッセージ窓の左上に重ねて表示（トリガーのナレーションでは出さない）
    if (state.speaker) {
      const w = state.speaker.length * 16 + 20;
      drawWindow(ctx, 8, 132, w, 24);
      drawText(ctx, state.speaker, 18, 136);
    }
    drawMessageBox(ctx, state.msg, 8, 156, 240, 60);
  }

  // 現在地ラベル：フィールド探索中のみ左上に表示（章・場所がひと目でわかるように）
  function drawLocationLabel() {
    const chapter = currentChapter();
    const label = chapter.title || chapter.name || '';
    if (!label) return;
    const w = label.length * 16 + 20;
    drawWindow(ctx, 4, 4, w, 24);
    drawText(ctx, label, 14, 8);
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
        quiz.resultMsg = createMessageBox(r.correct ? `正解！ ${r.explain}` : `違う…　${r.explain}`);
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
    // 長い問題文は折り返す：linesPerPageを十分大きくとり1ページにまとめて全行を描画する
    const qLines = paginateText(q.q, 12, 99)[0];
    const qh = 16 + qLines.length * 18;
    drawWindow(ctx, 8, 8, 240, qh);
    qLines.forEach((line, i) => drawText(ctx, line, 14, 16 + i * 18));
    if (quiz.phase === 'ask') {
      drawChoiceWindow(ctx, quiz.win, 8, 8 + qh + 8, 240, 22 * q.choices.length + 16);
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
            b.data.log = ['道具を持っていない！'];
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
          audio.playBgm('field'); // 勝敗どちらでも戦闘曲からフィールド曲へ戻す
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
            const hint = (BOSSES[b.id] && BOSSES[b.id].hint) || '';
            state.battle = null;
            state.activeEvent = null; // イベントは中断する
            state.speaker = null; // 敗北メッセージはナレーション扱い
            state.msg = createMessageBox(`目の前が\n真っ暗になった…\n${hint}`);
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
    drawText(ctx, `敵 HP:${Math.max(b.data.bossHp, 0)}`, 14, 30);
    drawWindow(ctx, 8, 116, 240, 24);
    drawText(ctx, `旅人 HP:${Math.max(b.data.playerHp, 0)}`, 14, 122);

    if (b.phase === 'command') {
      drawChoiceWindow(ctx, b.cmdWin, 8, 148, 120, 74);
    } else if (b.phase === 'item') {
      const h = battleItemWinHeight(b.itemWin.items.length);
      drawChoiceWindow(
        ctx, b.itemWin, BATTLE_ITEM_WIN_X, BATTLE_ITEM_WIN_Y, BATTLE_ITEM_WIN_W, h,
        BATTLE_ITEM_LINE_H, BATTLE_ITEM_MAX_VISIBLE,
      );
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
          m.tabWin = createChoiceWindow([...CODEX_CATEGORIES, 'もどる']);
          m.section = 'tab';
        } else { state.menu = null; state.mode = 'field'; }
      }
    } else if (m.section === 'power') {
      if (input.consume('x') || input.consume('z')) m.section = 'root';
    } else if (m.section === 'tab') {
      // カテゴリ（かみ・ちめい・ことば）タブ：選ぶとそのカテゴリの一覧へ
      if (input.consume('ArrowUp')) moveChoiceCursor(m.tabWin, -1);
      else if (input.consume('ArrowDown')) moveChoiceCursor(m.tabWin, 1);
      else if (input.consume('x')) { m.section = 'root'; }
      else if (input.consume('z')) {
        const cur = m.tabWin.cursor;
        if (cur === CODEX_CATEGORIES.length) { m.section = 'root'; return; } // もどる
        const category = CODEX_CATEGORIES[cur];
        const entries = CODEX.filter((c) => c.category === category);
        m.bookIds = entries.map((c) => c.id);
        // 未発見（state.codexに未登録）は名前を伏せて「？？？」と表示する
        const labels = entries.map((c) => (state.codex.includes(c.id) ? c.name : '？？？'));
        m.bookWin = createChoiceWindow([...labels, 'もどる']);
        m.section = 'list';
      }
    } else if (m.section === 'list') {
      if (input.consume('ArrowUp')) moveChoiceCursor(m.bookWin, -1);
      else if (input.consume('ArrowDown')) moveChoiceCursor(m.bookWin, 1);
      else if (input.consume('x')) { m.section = 'tab'; }
      else if (input.consume('z')) {
        const cur = m.bookWin.cursor;
        if (cur === m.bookIds.length) { m.section = 'tab'; return; } // もどる
        const id = m.bookIds[cur];
        if (!state.codex.includes(id)) return; // 未発見の項目は開けない
        const entry = CODEX.find((c) => c.id === id);
        const text = `${entry.name}\n\n${entry.desc}\n\n『${entry.excerpt}』\n\n（${entry.source}）`;
        m.detailBox = createMessageBox(text, { linesPerPage: 7 });
        m.section = 'detail';
      }
    } else if (m.section === 'detail') {
      tickMessageBox(m.detailBox);
      if (input.consume('x')) { m.section = 'list'; }
      else if (input.consume('z')) {
        const more = advanceMessageBox(m.detailBox);
        if (!more) m.section = 'list';
      }
    }
  }

  function drawMenu() {
    const m = state.menu;
    if (m.section === 'root') {
      drawChoiceWindow(ctx, m.rootWin, 140, 8, 108, 74);
    } else if (m.section === 'power') {
      const lines = state.items.length > 0 ? state.items : ['なし'];
      const h = powerWinHeight(state.items.length);
      drawWindow(ctx, POWER_WIN_X, POWER_WIN_Y, POWER_WIN_W, h);
      drawText(ctx, `玉の数：${state.orbs}`, 14, 16);
      drawText(ctx, '持ち物：', 14, 38);
      lines.forEach((label, i) => drawText(ctx, label, 14, POWER_ITEM_START_Y + i * POWER_ITEM_LINE_H));
      const footerY = POWER_ITEM_START_Y + (lines.length - 1) * POWER_ITEM_LINE_H + POWER_ITEM_LINE_H + POWER_FOOTER_GAP;
      drawText(ctx, '（ZかXでもどる）', 14, footerY);
    } else if (m.section === 'tab') {
      drawChoiceWindow(ctx, m.tabWin, 140, 8, 108, 22 * m.tabWin.items.length + 16);
    } else if (m.section === 'list') {
      const visibleCount = Math.min(m.bookWin.items.length, BOOK_LIST_VISIBLE);
      drawChoiceWindow(ctx, m.bookWin, 8, 8, 240, 22 * visibleCount + 16, 22, BOOK_LIST_VISIBLE);
    } else if (m.section === 'detail') {
      drawMessageBox(ctx, m.detailBox, 8, 8, 240, 176);
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

    if (state.mode === 'ending') {
      updateEnding();
      // updateEnding中に最終段まで進み、同フレームでtitleへ遷移してstate.endingが
      // nullになることがあるため、遷移後はdrawEndingを呼ばない
      if (state.mode === 'ending') drawEnding();
      requestAnimationFrame(loop);
      return;
    }

    const chapter = currentChapter();
    const drawNpcs = (chapter.npcs || []).map((n) => ({ name: n.sprite, x: n.x, y: n.y, frame: n.frame || 0 }));
    drawField(renderer, chapter.map, state, drawNpcs);

    if (state.mode === 'field') {
      updateField();
      if (state.mode === 'field') drawLocationLabel();
    } else if (state.mode === 'msg') {
      updateMsg();
      // updateMsg中にイベントが進み、同フレームで別モードへ遷移してmsgがnullになることがある
      // 会話中も現在地ラベルは出し続ける（クイズ・戦闘・メニューは左上に窓が出るため出さない）
      if (state.msg) { drawLocationLabel(); drawMsg(); }
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

    // マップ遷移直後のフェードイン：黒からゆっくり明ける
    if (state.fadeIn > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(state.fadeIn / FADE_FRAMES).toFixed(3)})`;
      ctx.fillRect(0, 0, 256, 224);
      state.fadeIn--;
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();

// 第3章 たかまがはら（禊・三貴子・天岩戸）
// よみのくにから もどった イザナギが かわで みそぎを おこない、
// みはしらの とうとい かみ（アマテラス・ツクヨミ・スサノオ）が うまれる。
// あらぶる スサノオに おそれた アマテラスが いわとに かくれ、よが
// やみに つつまれるが、うずめの おどりと かみがみの ちからで
// ひかりが とりもどされる。
export const CH3 = {
  id: 'ch3',
  name: 'たかまがはら',
  title: '第三章 高天原',
  // 現在の地名（表示ではかっこ書きで添える）：高天原は天上界で、現実の土地に対応しない
  modern: '天上の国',
  // 章の導入：ゲーム中では描ききれない前史と背景
  prologue: '禊によって生まれたのが\nアマテラス、ツクヨミ、\nスサノオの三貴子。\n\nイザナギは高天原を\nアマテラスに、夜を\nツクヨミに、海原を\nスサノオに委ねた。\n\nしかしスサノオは\n亡き母を慕って泣き続け\n青山を枯らすほどに\n荒れ果てさせたため\nついに追放される。\n\n姉に別れを告げようと\n高天原へ上るその足音に\n天地は鳴り響いた。',
  // 章の締め：その出来事が後世に残したもの
  epilogue: '岩戸から光が戻った時\n神々はスサノオの\n髭と爪を切り\n高天原から追い放った。\n\nこの時に用いられた\n八咫鏡と八尺瓊勾玉は\nのちに草那芸剣と合わせ\n三種の神器となる。\n\n太陽が隠れて再び現れる\nこの物語は、冬至を越えて\n日が力を取り戻す祭りと\n重ねて語られてきた。\n\n追われたスサノオは\n出雲へと降りてゆく。',
  requires: 'ch2_clear',
  map: {
    rows: [
      '################',
      '#fffffffffffRR##',
      '#ff~~fff####gR##',
      '#ff~~ffffff.ff##',
      '#ff~~fffffffff##',
      '#fff.fffffffff##',
      '#ffffff##fffff##',
      '#fff####ffffff##',
      '#ffffffffffff.##',
      '#fffffffffffff##',
      '#######t########',
      '################',
    ],
  },
  entry: { x: 7, y: 9 },
  npcs: [
    {
      id: 'uzume',
      name: 'アメノウズメ',
      x: 9, y: 3,
      sprite: 'lady',
      event: [
        { if: 'ch3_iwato',
          then: [
            { msg: '皆で笑えば' },
            { msg: '光は戻ってくるの。' },
          ],
          else: [
            { msg: '何か起こりそうな' },
            { msg: '予感がするわ。' },
          ] },
      ],
    },
    {
      id: 'tajikarao',
      name: 'タヂカラオ',
      x: 13, y: 4,
      sprite: 'warrior',
      event: [
        { if: 'ch3_iwato',
          then: [
            { msg: 'あの時の力は' },
            { msg: '今も腕に残っておる。' },
          ],
          else: [
            { msg: '力には自信がある。' },
            { msg: 'いざという時は任せよ。' },
          ] },
      ],
    },
    {
      id: 'kataribe',
      name: '語り部',
      x: 5, y: 9,
      sprite: 'elder',
      requires: 'ch3_iwato',
      lockedMsg: 'まず天岩戸の物語を\n見届けよ',
      event: [
        { if: 'ch3_clear',
          then: [{ msg: 'よく学んだな。\n次の地へ行くがよい。' }],
          else: [
            { msg: 'この地の物語を\n見届けたか？\nならば問いに答えよ。' },
            { quiz: 'ch3' },
            { msg: '見事だ！知恵の玉を\n授けよう！' },
            { orb: true },
            { set: 'ch3_clear' },
            { story: 'epilogue' },
          ] },
      ],
    },
  ],
  triggers: [
    {
      x: 5, y: 3,
      sparkle: 'ch3_misogi',
      event: [
        { if: 'ch3_misogi',
          then: [{ msg: '川は静かに流れている。' }],
          else: [
            { msg: 'イザナギが川の水で' },
            { msg: '禊を行っていた。' },
            { msg: '左の目を洗うと…' },
            { msg: 'アマテラスが生まれた！' },
            { msg: '続いて右の目からは' },
            { msg: 'ツクヨミが生まれ出た。' },
            { msg: '最後に鼻を洗うと' },
            { msg: 'スサノオが生まれてきた。' },
            { codex: 'misogi' },
            { codex: 'amaterasu' },
            { codex: 'tsukuyomi' },
            { codex: 'susanoo' },
            { set: 'ch3_misogi' },
          ] },
      ],
    },
    {
      x: 12, y: 2,
      sparkle: 'ch3_iwato',
      requires: 'ch3_misogi',
      lockedMsg: '岩戸は固く\n閉ざされている…',
      event: [
        { if: 'ch3_iwato',
          then: [{ msg: '岩戸から光が差している。' }],
          else: [
            { msg: 'スサノオが暴れ回り' },
            { msg: '高天原は荒れ果てた。' },
            { msg: '恐れたアマテラスは' },
            { msg: '岩戸に隠れてしまった。' },
            { codex: 'amanoiwato' },
            { msg: '世が闇に包まれ' },
            { msg: '災いがあふれだした。' },
            { msg: '神々は岩戸の前に' },
            { msg: '集まり策を練った。' },
            { msg: 'アメノウズメが踊りだすと' },
            { msg: '神々はどっと笑った。' },
            { codex: 'uzume' },
            { msg: '何事かとアマテラスが' },
            { msg: '戸を少し開いた。' },
            { msg: 'その隙にタヂカラオが' },
            { msg: '戸を引き開けた！' },
            { codex: 'tajikarao' },
            { msg: '光が世に戻った。' },
            { set: 'ch3_iwato' },
          ] },
      ],
    },
    {
      x: 7, y: 10,
      event: [{ warp: { map: 'world', x: 19, y: 20, dir: 'up' } }],
    },
  ],
  quiz: [
    { q: '禊で左の目から\n生まれた神は？',
      choices: ['ツクヨミ', 'スサノオ', 'アマテラス', 'カグツチ'],
      answer: 2, explain: '\n左目＝アマテラス\n右目＝ツクヨミ\n鼻＝スサノオ。\n合わせて\n三貴子。' },
    { q: '岩戸の前で踊った神は？',
      choices: ['アメノウズメ', 'クシナダヒメ', 'スセリビメ', 'イザナミ'],
      answer: 0, explain: '\nウズメの踊りに\n神々が笑い\nアマテラスは\n戸を開けた。\n芸能の神の\n始まり。' },
    { q: 'アマテラスを\n岩戸から\n引き出した神は？',
      choices: ['タケミカヅチ', 'アメノタヂカラオ', 'ニニギ', 'オモイカネ'],
      answer: 1, explain: '\n力の神\nタヂカラオが\n戸を開き\n光が世に\n戻った。' },
  ],
};

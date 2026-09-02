// 第3章 たかまがはら（禊・三貴子・天岩戸）
// よみのくにから もどった イザナギが かわで みそぎを おこない、
// みはしらの とうとい かみ（アマテラス・ツクヨミ・スサノオ）が うまれる。
// あらぶる スサノオに おそれた アマテラスが いわとに かくれ、よが
// やみに つつまれるが、うずめの おどりと かみがみの ちからで
// ひかりが とりもどされる。
export const CH3 = {
  id: 'ch3',
  name: 'たかまがはら',
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
      x: 9, y: 3,
      sprite: 'lady',
      event: [
        { msg: 'みんなで わらえば' },
        { msg: 'ひかりは もどってくるの。' },
      ],
    },
    {
      id: 'tajikarao',
      x: 13, y: 4,
      sprite: 'warrior',
      event: [
        { msg: 'あのときの ちからは' },
        { msg: 'いまも うでに のこっておる。' },
      ],
    },
    {
      id: 'kataribe',
      x: 5, y: 9,
      sprite: 'elder',
      requires: 'ch3_iwato',
      lockedMsg: 'まず あまのいわとの ものがたりを みとどけよ',
      event: [
        { if: 'ch3_clear',
          then: [{ msg: 'よく まなんだな。つぎの ちへ ゆくがよい。' }],
          else: [
            { msg: 'この ちの ものがたりを みとどけたか？ ならば といに こたえよ。' },
            { quiz: 'ch3' },
            { msg: 'みごとだ！ ちえのたまを さずけよう！' },
            { orb: true },
            { set: 'ch3_clear' },
          ] },
      ],
    },
  ],
  triggers: [
    {
      x: 5, y: 3,
      event: [
        { if: 'ch3_misogi',
          then: [{ msg: 'かわは しずかに ながれている。' }],
          else: [
            { msg: 'イザナギが かわの みずで' },
            { msg: 'みそぎを おこなっていた。' },
            { msg: 'ひだりの めを あらうと…' },
            { msg: 'アマテラスが うまれた！' },
            { msg: 'つづいて みぎの めからは' },
            { msg: 'ツクヨミが うまれいでた。' },
            { msg: 'さいごに はなを あらうと' },
            { msg: 'スサノオが うまれてきた。' },
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
      requires: 'ch3_misogi',
      lockedMsg: 'いわとは かたく とざされている…',
      event: [
        { if: 'ch3_iwato',
          then: [{ msg: 'いわとから ひかりが さしている。' }],
          else: [
            { msg: 'スサノオが あばれまわり' },
            { msg: 'たかまがはらは あれはてた。' },
            { msg: 'おそれた アマテラスは' },
            { msg: 'いわとに かくれてしまった。' },
            { codex: 'amanoiwato' },
            { msg: 'よが やみに つつまれ' },
            { msg: 'わざわいが あふれだした。' },
            { msg: 'かみがみは いわとの まえに' },
            { msg: 'あつまり さくを ねった。' },
            { msg: 'アメノウズメが おどりだすと' },
            { msg: 'かみがみは どっと わらった。' },
            { codex: 'uzume' },
            { msg: 'なにごとかと アマテラスが' },
            { msg: 'とを すこし ひらいた。' },
            { msg: 'そのすきに タヂカラオが' },
            { msg: 'とを ひきあけた！' },
            { codex: 'tajikarao' },
            { msg: 'ひかりが よに もどった。' },
            { set: 'ch3_iwato' },
          ] },
      ],
    },
    {
      x: 7, y: 10,
      event: [{ warp: { map: 'world', x: 17, y: 2, dir: 'down' } }],
    },
  ],
  quiz: [
    { q: 'みそぎで ひだりの めから うまれた かみは？',
      choices: ['ツクヨミ', 'スサノオ', 'アマテラス', 'カグツチ'],
      answer: 2, explain: 'ひだりめ=アマテラス、みぎめ=ツクヨミ、はな=スサノオ。あわせて みはしらのうずのみこ。' },
    { q: 'いわとの まえで おどった かみは？',
      choices: ['アメノウズメ', 'クシナダヒメ', 'スセリビメ', 'イザナミ'],
      answer: 0, explain: 'ウズメの おどりに かみがみが わらい、アマテラスは とを あけた。げいのうの かみの はじまり。' },
    { q: 'アマテラスを いわとから ひきだした かみは？',
      choices: ['タケミカヅチ', 'アメノタヂカラオ', 'ニニギ', 'オモイカネ'],
      answer: 1, explain: 'ちからの かみ タヂカラオが とを ひらき、ひかりが よに もどった。' },
  ],
};

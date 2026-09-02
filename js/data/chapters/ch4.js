// 第4章 いずも（ヤマタノオロチ）
// たかまがはらを おわれた スサノオが かわくだりの さとに たどりつく。
// やしおおりのさけで ヤマタノオロチを ねむらせ うちとり、おから
// あらわれた つるぎを アマテラスに たてまつる。オロチから すくわれた
// クシナダヒメと スサノオの ものがたり。
export const CH4 = {
  id: 'ch4',
  name: 'いずも',
  requires: 'ch3_clear',
  map: {
    rows: [
      '~~~~~~~~~~~~~~~~',
      '~....~~.......~~',
      '~..........#..~~',
      '~....~~....#..~~',
      '~~~..~~.......~~',
      '~.............~~',
      '~....##..s....~~',
      '~....##.......~~',
      '~..............~',
      '~......d.......~',
      '~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~',
    ],
  },
  entry: { x: 7, y: 8 },
  npcs: [
    {
      id: 'ashinazuchi',
      x: 10, y: 2,
      sprite: 'elder',
      event: [
        { if: 'ch4_sake',
          then: [{ msg: '娘を頼むぞ。' }],
          else: [
            { msg: '娘たちはオロチに' },
            { msg: '次々のまれてしもうた。' },
            { msg: '残るはクシナダ一人…' },
            { msg: 'どうか助けてくれ。' },
            { msg: 'これは八度醸した' },
            { msg: '強い酒じゃ。持っていけ。' },
            { give: '八塩折の酒' },
            { codex: 'yashioori' },
            { set: 'ch4_sake' },
          ] },
      ],
    },
    {
      id: 'kushinada',
      x: 12, y: 3,
      sprite: 'lady',
      event: [
        { msg: '私が次の' },
        { msg: '生贄に\nなるはずでした…' },
        { codex: 'kushinada' },
      ],
    },
    {
      id: 'susanoo',
      x: 8, y: 5,
      sprite: 'warrior',
      event: [
        { if: 'ch4_slay',
          then: [{ msg: '見事な試合だったな。' }],
          else: [
            { msg: '俺がオロチを斬ってやる。' },
            { msg: '酒の準備はできたか？' },
          ] },
      ],
    },
    {
      id: 'orochi',
      x: 9, y: 6,
      sprite: 'snake',
      requires: 'ch4_sake',
      lockedMsg: 'まだ戦う準備が\nできていない…',
      event: [
        { if: 'ch4_slay',
          then: [{ msg: 'オロチのむくろが\n横たわる。' }],
          else: [
            { battle: 'orochi' },
            { msg: 'オロチの尾から' },
            { msg: '剣が出てきた！' },
            { msg: 'アマテラスに奉ろう。' },
            { codex: 'orochi' },
            { codex: 'kusanagi' },
            { set: 'ch4_slay' },
          ] },
      ],
    },
    {
      id: 'kataribe',
      x: 9, y: 9,
      sprite: 'elder',
      requires: 'ch4_slay',
      lockedMsg: 'まずオロチ退治の\n物語を見届けよ',
      event: [
        { if: 'ch4_clear',
          then: [{ msg: 'よく学んだな。\n次の地へ行くがよい。' }],
          else: [
            { msg: 'この地の物語を\n見届けたか？\nならば問いに答えよ。' },
            { quiz: 'ch4' },
            { msg: '見事だ！知恵の玉を\n授けよう！' },
            { orb: true },
            { set: 'ch4_clear' },
          ] },
      ],
    },
  ],
  triggers: [
    {
      x: 7, y: 9,
      event: [{ warp: { map: 'world', x: 6, y: 10, dir: 'down' } }],
    },
  ],
  quiz: [
    { q: 'スサノオがオロチを\n弱らせた方法は？',
      choices: ['炎で焼いた', '強い酒を飲ませた', '歌で眠らせた', '穴に落とした'],
      answer: 1, explain: '\n八塩折の酒を\n八つの桶に\n盛らせ、飲んで\n眠ったところを\n斬った。' },
    { q: 'オロチの尾から\n出てきたものは？',
      choices: ['八咫鏡', '勾玉', '草薙剣', '黄金の盾'],
      answer: 2, explain: '\n天叢雲剣、\nのちの草薙剣。\n三種の神器の\n一つ。' },
    { q: 'オロチ退治ののち\nスサノオが娶った姫は？',
      choices: ['クシナダヒメ', 'スセリビメ', 'コノハナサクヤビメ', 'トヨタマビメ'],
      answer: 0, explain: '\nクシナダヒメを\n櫛に変えて守り、\n退治ののち\n妻とした。' },
  ],
};

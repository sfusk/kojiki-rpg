// 難読語の読み辞書。二つの用途で使う。
//   1. クイズの選択肢に小さくルビを振る（readingOf）
//   2. 本文（語り・会話）の固有名詞にかっこ書きでふりがなを添える（annotateReadings）
// 見出しは表示されている語と完全一致させること。載っていない語にはふりがなが
// 付かないだけで害はない。逆に、ふつうの語（「天下」など動詞にもなる語）を
// 載せると誤った場所に付いてしまうため、固有名詞と器物名にとどめる。
export const READINGS = {
  // 神器・武具
  草薙剣: 'くさなぎのつるぎ',
  天沼矛: 'あめのぬぼこ',
  十拳剣: 'とつかのつるぎ',
  八咫鏡: 'やたのかがみ',
  勾玉: 'まがたま',
  矛: 'ほこ',
  // 神・人・生き物
  八咫烏: 'やたがらす',
  雉: 'きじ',
  鳶: 'とび',
  筍: 'たけのこ',
  櫛: 'くし',
  // 地名
  淡路島: 'あわじしま',
  佐渡島: 'さどのしま',
  隠岐島: 'おきのしま',
  筑紫島: 'つくしのしま',
  筑紫: 'つくし',
  八尺瓊勾玉: 'やさかにのまがたま',
  八尺瓊: 'やさかに',
  草那芸剣: 'くさなぎのつるぎ',
  天叢雲: 'あめのむらくも', // 続く「剣」は読みに含めない（1行に収めるため）
  布都御魂: 'ふつのみたま',
  八塩折: 'やしおおり',
  潮満珠: 'しおみつたま',
  潮干珠: 'しおひるたま',
  比礼: 'ひれ',
  葦舟: 'あしぶね',
  八重垣: 'やえがき',
  神器: 'じんぎ',
  御子: 'みこ',
  幽事: 'かくりごと',
  三貴子: 'みはしらのうずのみこ',
  // 神・人
  天照大御神: 'あまてらすおおみかみ',
  大国主: 'おおくにぬし',
  八上比売: 'やがみひめ',
  黄泉醜女: 'よもつしこめ',
  黄泉神: 'よもつかみ',
  猿田彦: 'さるたひこ',
  木花之佐久夜毘売: 'このはなのさくやびめ',
  石長比売: 'いわながひめ',
  豊玉毘売: 'とよたまびめ',
  鵜葺草葺不合: 'うがやふきあえず', // 続く「命」は読みに含めない
  塩椎神: 'しおつちのかみ',
  海神: 'わたつみ',
  山幸彦: 'やまさちひこ',
  白兎: 'しろうさぎ',
  白鳥: 'しらとり',
  八十神: 'やそがみ',
  八百万: 'やおよろず',
  神武天皇: 'じんむてんのう',
  神武: 'じんむ',
  崇神: 'すじん',
  垂仁: 'すいにん',
  稗田阿礼: 'ひえだのあれ',
  太安万侶: 'おおのやすまろ',
  // 地名・国
  高天原: 'たかまがはら',
  葦原中国: 'あしはらのなかつくに',
  黄泉比良坂: 'よもつひらさか',
  黄泉: 'よみ',
  伊賦夜坂: 'いふやざか',
  阿波岐原: 'あわきがはら',
  大八島国: 'おおやしまぐに',
  天浮橋: 'あめのうきはし',
  天孫降臨: 'てんそんこうりん',
  高千穂: 'たかちほ',
  日向: 'ひむか',
  出雲大社: 'いずもたいしゃ',
  出雲国: 'いずものくに',
  出雲: 'いずも',
  諏訪大社: 'すわたいしゃ',
  諏訪: 'すわ',
  信濃: 'しなの',
  因幡: 'いなば',
  気多: 'けた',
  須賀: 'すが',
  肥河: 'ひのかわ',
  熊野: 'くまの',
  能褒野: 'のぼの',
  橿原: 'かしはら',
  浪速: 'なにわ',
  走水: 'はしりみず',
  伊吹山: 'いぶきやま',
  相模: 'さがみ',
  大和: 'やまと',
  八衢: 'やちまた',
  伊那佐: 'いなさ',
  壱岐: 'いき',
  対馬: 'つしま',
  隠岐: 'おき',
  佐渡: 'さど',
  青垣: 'あおがき',
  神在月: 'かみありづき',
  和銅五年: 'わどうごねん',
  誦習: 'しょうしゅう',
};

// 語に対応する読みを返す（未登録ならnull）
export function readingOf(word) {
  return Object.prototype.hasOwnProperty.call(READINGS, word) ? READINGS[word] : null;
}

// ── 本文へのふりがな付与 ─────────────────────────────────
// 「高天原」→「高天原（たかまがはら）」のように、固有名詞のうしろへ
// かっこ書きで読みを添える。同じ語が何度も出ると読みにくいので、
// ひとつの本文（メッセージ窓ひとつぶん）につき最初の1回だけ付ける。
// 付けたぶん行が伸びるので、窓の幅で折り返すところまでここで行う。
// 窓側の折り返し（paginateText）に任せると、読みが行の途中で
// 断ち切られて「（たかまがは／ら）」のようになってしまうため。

// 長い語から先に照合する（「八尺瓊勾玉」を「勾玉」より優先する）
const WORDS_BY_LENGTH = Object.keys(READINGS).sort((a, b) => b.length - a.length);

// 1行ぶんを「素の文字」と「語＋ふりがな」の単位に分ける
function unitsOf(line, done) {
  const marks = [];
  for (const word of WORDS_BY_LENGTH) {
    if (done.has(word)) continue;
    // すでに付けた長い語の一部なら重ねない（八尺瓊勾玉のあとの勾玉など）
    let covered = false;
    for (const w of done) if (w.includes(word)) { covered = true; break; }
    if (covered) continue;
    let from = 0;
    let at = -1;
    for (;;) {
      const i = line.indexOf(word, from);
      if (i < 0) break;
      // 別の語のふりがな範囲と重なる位置は飛ばす
      if (marks.some((m) => i < m.end && i + word.length > m.start)) { from = i + 1; continue; }
      at = i;
      break;
    }
    if (at < 0) continue;
    done.add(word);
    // もともとかっこ書きが続いているなら二重に付けない
    if (line.slice(at + word.length).startsWith('（')) continue;
    marks.push({ start: at, end: at + word.length, ruby: `（${READINGS[word]}）` });
  }
  marks.sort((a, b) => a.start - b.start);
  const units = [];
  let pos = 0;
  for (const m of marks) {
    for (const ch of line.slice(pos, m.start)) units.push({ text: ch });
    const base = line.slice(m.start, m.end);
    units.push({ text: base + m.ruby, base, ruby: m.ruby });
    pos = m.end;
  }
  for (const ch of line.slice(pos)) units.push({ text: ch });
  return units;
}

// 単位を崩さずに charsPerLine 文字で折り返す
function wrapUnits(units, charsPerLine) {
  const lines = [];
  let cur = '';
  const flush = () => { if (cur.length > 0) { lines.push(cur); cur = ''; } };
  for (const u of units) {
    if (cur.length + u.text.length <= charsPerLine) { cur += u.text; continue; }
    flush();
    if (u.text.length <= charsPerLine) { cur = u.text; continue; }
    if (u.base) {
      // 語と読みを別の行に分ける（「鵜葺草葺不合命」＋読みのような長い組）
      cur = u.base;
      if (cur.length + u.ruby.length <= charsPerLine) { cur += u.ruby; continue; }
      flush();
      cur = u.ruby;
      continue;
    }
    cur = u.text;
  }
  flush();
  return lines.length > 0 ? lines : [''];
}

export function annotateReadings(text, charsPerLine = 12) {
  const done = new Set();
  return String(text ?? '')
    .split('\n')
    .map((line) => wrapUnits(unitsOf(line, done), charsPerLine).join('\n'))
    .join('\n');
}

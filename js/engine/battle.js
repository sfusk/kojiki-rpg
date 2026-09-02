export function createBattle(boss) {
  return { boss, bossHp: boss.maxHp, playerHp: 30,
           gimmickDone: false, over: false, result: null, log: [] };
}
export function battleAct(b, cmd, itemId) {
  if (b.over) return b;
  b.log = [];
  let acted = true;
  if (cmd === 'attack') {
    const dmg = b.gimmickDone ? 10 : 1;
    b.bossHp -= dmg;
    b.log.push(`たびびとの こうげき！ ${dmg}の ダメージ！`);
    if (!b.gimmickDone) b.log.push('しかし ほとんど きいていない…');
  } else if (cmd === 'item') {
    if (itemId === b.boss.gimmickItem && !b.gimmickDone) {
      b.gimmickDone = true; b.log.push(b.boss.gimmickMsg);
    } else b.log.push('しかし なにも おこらなかった！');
  } else if (cmd === 'run') {
    if (b.boss.escape && b.gimmickDone) {
      b.over = true; b.result = 'win';
      b.log.push('うまく にげきった！'); return b;
    }
    b.log.push('まわりこまれて しまった！');
  } else acted = false;
  if (b.bossHp <= 0) { b.over = true; b.result = 'win';
    b.log.push(`${b.boss.name}を たおした！`); return b; }
  if (acted) {
    b.playerHp -= b.boss.atk;
    b.log.push(`${b.boss.name}の こうげき！ ${b.boss.atk}の ダメージ！`);
    if (b.playerHp <= 0) { b.over = true; b.result = 'lose';
      b.log.push('たびびとは たおれてしまった…'); }
  }
  return b;
}

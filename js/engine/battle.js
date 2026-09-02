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
    b.log.push(`旅人の攻撃！\n${dmg}のダメージ！`);
    if (!b.gimmickDone) b.log.push('しかしほとんど\n効いていない…');
  } else if (cmd === 'item') {
    if (itemId === b.boss.gimmickItem && !b.gimmickDone) {
      b.gimmickDone = true; b.log.push(b.boss.gimmickMsg);
    } else b.log.push('しかし何も\n起こらなかった！');
  } else if (cmd === 'run') {
    if (b.boss.escape && b.gimmickDone) {
      b.over = true; b.result = 'win';
      b.log.push('うまく逃げきった！'); return b;
    }
    b.log.push('回り込まれてしまった！');
  } else acted = false;
  if (b.bossHp <= 0) { b.over = true; b.result = 'win';
    b.log.push(`${b.boss.name}を\n倒した！`); return b; }
  if (acted) {
    b.playerHp -= b.boss.atk;
    b.log.push(`${b.boss.name}の攻撃！\n${b.boss.atk}のダメージ！`);
    if (b.playerHp <= 0) { b.over = true; b.result = 'lose';
      b.log.push('旅人は倒れてしまった…'); }
  }
  return b;
}

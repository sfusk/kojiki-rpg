// 地面に置く目印の対象を選ぶ。
//  - sparkle: 章の中の「まだ見届けていない出来事」を示す小さな光
//  - beacon : ワールドマップで「次に向かう章の入口」を示す光の輪
// どちらも「条件（requires）を満たしているのに、まだそのフラグが立っていない」
// トリガーだけを対象にする。条件を満たした瞬間に新しく光り、
// 見届けてフラグが立つと消えるので、そのまま道しるべになる。
export function pendingMarkers(triggers, flags, field) {
  return (triggers || [])
    .filter((tr) => tr[field]
      && !flags.includes(tr[field])
      && (!tr.requires || flags.includes(tr.requires)))
    .map((tr) => ({ x: tr.x, y: tr.y }));
}

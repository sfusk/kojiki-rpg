// . 草 s 砂 b 橋 f 床 g 岩戸前の地面 d 出入口 t 鳥居 c 洞窟口
// ~ 水 T 木 M 山 # 壁 R 岩 F 炎
export const PASSABLE = new Set(['.', 's', 'b', 'f', 'g', 'd', 't', 'c']);
export const TILE_COLORS = {
  '.': '#4a8f3c', 's': '#d8c47a', 'b': '#8a6b3f', 'f': '#b0a08a',
  'g': '#7a7f6a', 'd': '#3a2f24', 't': '#c03028', 'c': '#222222',
  '~': '#2a5fa8', 'T': '#1f5f2a', 'M': '#8a7f70', '#': '#5a5248',
  'R': '#9a9084', 'F': '#e06018',
};

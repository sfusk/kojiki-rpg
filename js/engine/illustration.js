// 一枚絵は既存の語りとは別画面。読み込み失敗でも物語を止めない。
function clearInput(input) {
  for (const key of ['z', 'x', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) input.consume(key);
}

export function createIllustration(scene, input, makeImage = () => new Image()) {
  clearInput(input);
  const view = { ...scene, image: makeImage(), status: 'loading' };
  view.image.onload = () => { view.status = 'ready'; };
  view.image.onerror = () => { view.status = 'failed'; };
  view.image.src = scene.src;
  return view;
}

export function advanceIllustration(view, input) {
  if (view.status !== 'failed' && !input.consumeAdvance()) return false;
  clearInput(input);
  return true;
}

export function fitIllustration(imageWidth, imageHeight, width, height) {
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const w = imageWidth * scale, h = imageHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

// タイトルは画面を満たして中央でトリミングし、操作部分の読みやすさを保つ。
export function drawTitleBackground(ctx, image) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 224);
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) return;
  const scale = Math.max(256 / image.naturalWidth, 224 / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, (256 - width) / 2, (224 - height) / 2, width, height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(0, 0, 256, 224);
  ctx.restore();
}

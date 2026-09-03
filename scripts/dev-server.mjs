// 開発用の静的ファイルサーバー（依存ゼロ・Node標準のみ）。
// python http.server はキャッシュ制御ヘッダーを送らず、ブラウザが古いJSモジュールを
// 使い続けて修正が反映されない事故が起きたため、常に Cache-Control: no-store を返す。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT) || 8090;
const ROOT = new URL('..', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { // ディレクトリトラバーサル防止
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (urlPath.endsWith('/')) filePath = join(filePath, 'index.html');
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store', // 常に最新を取得させる（開発用）
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Cache-Control': 'no-store' }).end('Not Found');
  }
}).listen(PORT, () => {
  console.log(`かむがたり開発サーバー: http://localhost:${PORT}/`);
});

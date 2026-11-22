import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3000;
const ROOT = path.resolve('.');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url?.split('?')[0] || '/');
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  const filePath = path.join(ROOT, reqPath);

  // Security check: stay within ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✨ Сервер запущен!`);
  console.log(`📱 Локально:    http://localhost:${PORT}`);
  console.log(`🌐 Нажмите Ctrl+C для остановки сервера\n`);
});

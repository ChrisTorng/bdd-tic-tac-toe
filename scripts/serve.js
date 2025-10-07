import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const root = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function resolveFile(filePath) {
  const fileStat = await stat(filePath);
  if (fileStat.isDirectory()) {
    return path.join(filePath, 'index.html');
  }
  return filePath;
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^\/+/, '');
    let targetPath = path.join(root, safePath);
    try {
      targetPath = await resolveFile(targetPath);
    } catch {
      targetPath = await resolveFile(path.join(root, 'index.html'));
    }
    const data = await readFile(targetPath);
    res.writeHead(200, { 'Content-Type': getMimeType(targetPath) });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${root} on http://${host}:${port}`);
});

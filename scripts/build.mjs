import { cp, rm, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'web');
const distDir = path.join(rootDir, 'dist');

async function ensureSourceExists() {
  try {
    const stats = await stat(sourceDir);
    if (!stats.isDirectory()) {
      throw new Error('web directory is not a folder');
    }
  } catch (error) {
    console.error('Cannot find web directory with static assets.');
    throw error;
  }
}

async function copyStaticAssets() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await cp(sourceDir, distDir, { recursive: true });
}

async function main() {
  await ensureSourceExists();
  await copyStaticAssets();
  const files = await readdir(distDir);
  console.log('Static site copied to dist with files:', files.join(', '));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

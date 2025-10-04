import { mkdir, readdir, copyFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';

const sourceDir = path.resolve('public');
const destinationDir = path.resolve('dist');

async function ensureEmptyDir(target) {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
}

async function copyRecursive(source, destination) {
  const entries = await readdir(source, { withFileTypes: true });
  await mkdir(destination, { recursive: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyRecursive(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, destinationPath);
    }
  }
}

async function build() {
  const sourceExists = await stat(sourceDir).then(() => true).catch(() => false);

  if (!sourceExists) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  await ensureEmptyDir(destinationDir);
  await copyRecursive(sourceDir, destinationDir);
  console.log(`Copied static assets from ${sourceDir} to ${destinationDir}`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

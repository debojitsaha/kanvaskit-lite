import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const mRepoRoot = fileURLToPath(new URL('..', import.meta.url));
const mProDir = join(mRepoRoot, 'src', 'pro');
const mSrcDir = join(mRepoRoot, 'src');
const mProImportPattern = /(?:from\s+|import\s*\(\s*|import\s+)['"](@\/pro(?:\/[^'"]*)?)['"]/g;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function proDirExists(): Promise<boolean> {
  try {
    await stat(mProDir);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(fullPath)));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main(): Promise<void> {
  const violations: string[] = [];

  if (await proDirExists()) {
    violations.push('src/pro: directory must not exist on lite');
  }

  const files = await collectSourceFiles(mSrcDir);
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const relPath = relative(mRepoRoot, file).split(sep).join('/');
    for (const match of text.matchAll(mProImportPattern)) {
      const lineNumber = text.slice(0, match.index).split('\n').length;
      violations.push(`${relPath}:${String(lineNumber)} ${String(match[1])}`);
    }
  }

  if (violations.length > 0) {
    console.error('Lite boundary check failed:');
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }
  console.log(`Lite boundary check passed (${String(files.length)} files scanned).`);
  process.exit(0);
}

try {
  await main();
} catch (error) {
  console.error('Lite boundary check errored:');
  console.error(getErrorMessage(error));
  process.exit(2);
}

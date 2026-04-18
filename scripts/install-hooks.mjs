import { existsSync, copyFileSync, chmodSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gitDir = join(root, '.git');
const hooksDir = join(gitDir, 'hooks');

// Skip in CI (uses --ignore-scripts anyway) and when there's no git repo.
if (!existsSync(gitDir)) process.exit(0);

mkdirSync(hooksDir, { recursive: true });

for (const hook of ['pre-push']) {
  const src = join(root, 'scripts', 'hooks', hook);
  const dest = join(hooksDir, hook);
  copyFileSync(src, dest);
  chmodSync(dest, 0o755);
  console.log(`install-hooks: ✓ ${hook}`);
}

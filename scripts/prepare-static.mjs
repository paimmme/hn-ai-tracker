// Copy skills/data.json into public/ so Vite emits it as static asset on Vercel
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'skills', 'data.json');
const destDir = join(root, 'public', 'skills');
const dest = join(destDir, 'data.json');

if (!existsSync(src)) {
  console.warn('[prepare-static] skills/data.json missing — run: npm run analyze');
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log('[prepare-static] copied skills/data.json → public/skills/data.json');

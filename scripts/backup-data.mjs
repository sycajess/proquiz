import fs from 'fs';
import path from 'path';

const src = path.join(process.cwd(), 'data');
const dest = path.join(process.cwd(), 'backups', `data-${Date.now()}`);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(src)) {
  console.log('No data/ folder to backup');
  process.exit(0);
}

copyDir(src, dest);
console.log(`Backup saved to ${dest}`);

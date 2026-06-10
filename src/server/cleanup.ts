import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
const ARCHIVES_DIR = path.join(DATA_DIR, 'archives');

const ROOM_TTL_MS = (Number(process.env.ROOM_TTL_HOURS) || 24) * 60 * 60 * 1000;
const ARCHIVE_TTL_MS = (Number(process.env.ARCHIVE_TTL_DAYS) || 30) * 24 * 60 * 60 * 1000;

export function cleanupStaleData(activeRoomCodes: Set<string>) {
  const now = Date.now();
  let removedRooms = 0;
  let removedArchives = 0;

  if (fs.existsSync(ROOMS_DIR)) {
    for (const file of fs.readdirSync(ROOMS_DIR)) {
      if (!file.endsWith('.json')) continue;
      const code = file.replace('.json', '');
      if (activeRoomCodes.has(code)) continue;
      const fp = path.join(ROOMS_DIR, file);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > ROOM_TTL_MS) {
        fs.unlinkSync(fp);
        removedRooms++;
      }
    }
  }

  if (fs.existsSync(ARCHIVES_DIR)) {
    for (const file of fs.readdirSync(ARCHIVES_DIR)) {
      const fp = path.join(ARCHIVES_DIR, file);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > ARCHIVE_TTL_MS) {
        fs.unlinkSync(fp);
        removedArchives++;
      }
    }
  }

  if (removedRooms || removedArchives) {
    console.log(`Cleanup: removed ${removedRooms} stale rooms, ${removedArchives} old archives`);
  }
}

export function startCleanupJob(getActiveCodes: () => Set<string>) {
  const intervalMs = (Number(process.env.CLEANUP_INTERVAL_HOURS) || 1) * 60 * 60 * 1000;
  cleanupStaleData(getActiveCodes());
  setInterval(() => cleanupStaleData(getActiveCodes()), intervalMs);
}

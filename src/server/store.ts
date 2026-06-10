import fs from 'fs';
import path from 'path';
import { PresentationSession, Participant, LiveResponse } from '../types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
const ARCHIVES_DIR = path.join(DATA_DIR, 'archives');

export interface PersistedRoom {
  session: PresentationSession;
  participants: Participant[];
  responses: { [slideIndex: number]: LiveResponse[] };
  createdAt: number;
  updatedAt: number;
}

function ensureDirs() {
  [DATA_DIR, ROOMS_DIR, ARCHIVES_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function roomPath(code: string) {
  return path.join(ROOMS_DIR, `${code}.json`);
}

export function loadAllRooms(): Map<string, PersistedRoom> {
  ensureDirs();
  const rooms = new Map<string, PersistedRoom>();
  if (!fs.existsSync(ROOMS_DIR)) return rooms;

  for (const file of fs.readdirSync(ROOMS_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = fs.readFileSync(path.join(ROOMS_DIR, file), 'utf-8');
      const data = JSON.parse(raw) as PersistedRoom;
      if (data.session?.roomCode) {
        rooms.set(data.session.roomCode, data);
      }
    } catch (err) {
      console.warn(`Skipping corrupt room file ${file}:`, err);
    }
  }
  return rooms;
}

export function saveRoom(code: string, data: PersistedRoom) {
  ensureDirs();
  data.updatedAt = Date.now();
  fs.writeFileSync(roomPath(code), JSON.stringify(data, null, 2));
}

export function deleteRoom(code: string) {
  const p = roomPath(code);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

export function archiveRoom(code: string, data: PersistedRoom) {
  ensureDirs();
  const filename = `${code}_${Date.now()}.json`;
  fs.writeFileSync(path.join(ARCHIVES_DIR, filename), JSON.stringify(data, null, 2));
  deleteRoom(code);
}

export function getArchive(code: string): PersistedRoom | null {
  ensureDirs();
  const files = fs.readdirSync(ARCHIVES_DIR).filter((f) => f.startsWith(`${code}_`));
  if (files.length === 0) return null;
  const latest = files.sort().reverse()[0];
  return JSON.parse(fs.readFileSync(path.join(ARCHIVES_DIR, latest), 'utf-8'));
}

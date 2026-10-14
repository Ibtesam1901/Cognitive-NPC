/**
 * Session persistence store for Raghu NPC game state.
 * Stores state keyed by sessionId in memory and writes asynchronously to disk.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInitialState } from "./gameEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

// In-memory sessions cache
const sessions = new Map();

// Load sessions from disk on startup
function initStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      for (const [id, state] of Object.entries(parsed)) {
        sessions.set(id, state);
      }
      console.log(`[MemoryStore] Loaded ${sessions.size} saved sessions from disk.`);
    }
  } catch (err) {
    console.warn("[MemoryStore] Failed to read sessions.json:", err.message);
  }
}

initStore();

let saveTimeout = null;
function persistToDisk() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const obj = {};
      for (const [id, state] of sessions.entries()) {
        obj[id] = state;
      }
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (err) {
      console.warn("[MemoryStore] Failed to write sessions.json:", err.message);
    }
  }, 500);
}

export function load(sessionId) {
  const id = String(sessionId || "default");
  if (!sessions.has(id)) {
    const fresh = createInitialState();
    sessions.set(id, fresh);
    persistToDisk();
  }
  return sessions.get(id);
}

export function save(sessionId, state) {
  const id = String(sessionId || "default");
  sessions.set(id, state);
  persistToDisk();
}

export function reset(sessionId) {
  const id = String(sessionId || "default");
  const fresh = createInitialState();
  sessions.set(id, fresh);
  persistToDisk();
  return fresh;
}

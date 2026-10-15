/**
 * src/services/npcApi.js
 * Frontend API client communicating with the Cognitive NPC Flask AI Backend (http://127.0.0.1:5000)
 */

const FLASK_BASE_URL = import.meta.env.VITE_FLASK_API_URL || "http://127.0.0.1:5000";

/**
 * Health check to verify if the Flask AI backend is alive and configured.
 */
export async function checkNpcHealth() {
  try {
    const res = await fetch(`${FLASK_BASE_URL}/api/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Flask Backend health check unreachable:", err.message);
    return { status: "offline", error: err.message };
  }
}

/**
 * Fetch static metadata and lore about Raghu the Elder.
 */
export async function getNpcInfo() {
  try {
    const res = await fetch(`${FLASK_BASE_URL}/api/npc`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("getNpcInfo failed:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Send natural language / voice transcript to Raghu the Elder in Flask.
 *
 * @param {Object} params
 * @param {string} params.message - Player's natural language text or voice transcript
 * @param {string} params.language - 'en' | 'hi' | 'kn'
 * @param {Object} params.context - Current game state (plots, time, weather, trust, inventory, player_position)
 * @param {Array} params.history - Recent chat turns
 */
export async function chatWithNpc({ message, language = "en", context = {}, history = [] }) {
  try {
    const res = await fetch(`${FLASK_BASE_URL}/api/npc/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        language,
        context,
        history,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("chatWithNpc error:", err);
    throw err;
  }
}

/**
 * Request an AI-generated farming quest tailored to current game progression.
 */
export async function getNpcQuest({ language = "en", context = {} } = {}) {
  try {
    const res = await fetch(`${FLASK_BASE_URL}/api/npc/quest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, context }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("getNpcQuest error:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Request a contextual farming tip from Raghu.
 */
export async function getNpcHint({ language = "en", context = {} } = {}) {
  try {
    const res = await fetch(`${FLASK_BASE_URL}/api/npc/hint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, context }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("getNpcHint error:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Translate dialogue between English, Hindi, and Kannada.
 */
export async function translateDialogue({ text, targetLanguage = "en" }) {
  try {
    const res = await fetch(`${FLASK_BASE_URL}/api/npc/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target_language: targetLanguage }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("translateDialogue error:", err);
    return { ok: false, error: err.message, translated_text: text };
  }
}

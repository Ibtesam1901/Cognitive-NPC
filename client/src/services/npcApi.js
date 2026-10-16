/**
 * src/services/npcApi.js
 * Frontend API client communicating with the Cognitive NPC Flask AI Backend (http://127.0.0.1:5000)
 */

const FLASK_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FLASK_API_URL) ||
  "http://127.0.0.1:5000";

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
export async function chatWithNpc({ message, text, language = "en", context = {}, history = [], sessionId }) {
  const content = String(message || text || "").trim();
  if (!content) {
    throw new Error("Cannot send empty message to NPC.");
  }

  const sid =
    sessionId ||
    (typeof localStorage !== "undefined" && localStorage.getItem("sid_raghu")) ||
    "default_session";

  const payload = {
    sessionId: sid,
    message: content,
    text: content,
    language: language || "en",
    context,
    history: Array.isArray(history) ? history : [],
  };

  try {
    let res = await fetch(`${FLASK_BASE_URL}/api/npc/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // If 404, try alternative route /chat
    if (res.status === 404) {
      res = await fetch(`${FLASK_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errorMsg = errBody.error || `Flask backend returned HTTP ${res.status}`;
      console.warn("Flask chat error response:", errBody);
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return {
      npc_name: data.character_name || data.npc_name || "Raghu the Elder",
      reply: data.reply || data.message || "Namaste, beta.",
      emotion: data.emotion || (data.intent === "greeting" ? "happy" : "neutral"),
      language: data.language || language,
      actions: data.actions || [],
      voice_text: data.voice_text || data.reply || data.message,
      dialogue_choices: data.dialogue_choices || [],
      ...data,
    };
  } catch (err) {
    console.error("chatWithNpc network/validation error:", err);
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

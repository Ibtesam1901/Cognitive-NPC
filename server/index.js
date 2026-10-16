import "dotenv/config";
import express from "express";
import cors from "cors";
import { newState, publicState, WORLD_ACTIONS, PUZZLES } from "./gameData.js";
import { buildMessages } from "./prompt.js";
import { askLLM } from "./llm.js";
import { parseReply, applyReply } from "./apply.js";
import { maybeSummarize } from "./memory.js";
// [VOICE-UPGRADE START]
import { handleTTS, getTTSStatus } from "./tts.js";
// [VOICE-UPGRADE END]
// [INSPECTOR START]
import { createTrace, addSessionTrace, handleGetTraces } from "./trace.js";
import { getClient } from "./llm.js";
// [INSPECTOR END]
// [SUGGESTIONS START]
import { generateSuggestions, getFallbackSuggestions } from "./suggest.js";
// [SUGGESTIONS END]

// [NPC SHAPES FARM START]
import { handleTurn } from "./npcHandler.js";
import { handleSalimChat } from "./salimHandler.js";
import { load as loadNpcState, save as saveNpcState, reset as resetNpcState } from "./memoryStore.js";
import { applyPlayerEvent } from "./gameEngine.js";
// [NPC SHAPES FARM END]

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" })); // Support base64 image uploads if needed

// [NPC SHAPES FARM API ENDPOINTS]
app.get("/api/npc/state", (req, res) => {
  const sessionId = String(req.query.sessionId || "default");
  const state = loadNpcState(sessionId);
  res.json({ state });
});

app.post("/api/npc/chat", async (req, res) => {
  const { sessionId, message, config, language = "en" } = req.body || {};
  if (!sessionId || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "sessionId and message required" });
  }

  const result = await handleTurn(sessionId, message.trim().slice(0, 500), config, language);
  res.json(result);
});

// Salim the Merchant Chat Endpoint
app.post("/api/merchant/chat", async (req, res) => {
  const { message, config } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message required" });
  }

  const result = await handleSalimChat(message.trim(), config);
  res.json(result);
});

// Farm buttons in the UI call this — uses the new applyPlayerEvent pipeline
app.post("/api/npc/farm-action", (req, res) => {
  const { sessionId, action, params } = req.body || {};
  if (!sessionId || !action) {
    return res.status(400).json({ error: "sessionId and action required" });
  }

  const state = loadNpcState(sessionId);
  const result = applyPlayerEvent(state, { type: action, ...params });
  saveNpcState(sessionId, state);
  res.json({ ...result, state });
});

// Alias used by the client farm panel
app.post("/api/game/event", (req, res) => {
  const { sessionId, event } = req.body || {};
  if (!sessionId || !event?.type) {
    return res.status(400).json({ error: "sessionId and event.type required" });
  }

  const state = loadNpcState(sessionId);
  const out = applyPlayerEvent(state, event);
  saveNpcState(sessionId, state);
  res.json({ ...out, state });
});

app.post("/api/npc/reset", (req, res) => {
  const sessionId = String(req.body?.sessionId || "default");
  const state = resetNpcState(sessionId);
  res.json({
    message: "A new sunrise breaks over Bhima's Hollow. Raghu's farm is renewed.",
    state,
  });
});


const sessions = new Map(); // sessionId -> game state
const sessionConfigs = new Map(); // sessionId -> custom LLM config { apiKey, baseURL, model }

// Persistence for legacy simulator sessions
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEGACY_SESSIONS_FILE = path.join(__dirname, "data", "legacy_sessions.json");

function loadLegacySessions() {
  try {
    if (fs.existsSync(LEGACY_SESSIONS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LEGACY_SESSIONS_FILE, "utf-8"));
      for (const [id, s] of Object.entries(parsed)) {
        sessions.set(id, s);
      }
    }
  } catch (err) {
    console.warn("[SessionStore] Failed reading legacy sessions:", err.message);
  }
}
loadLegacySessions();

let legacySaveTimer = null;
function saveLegacySessions() {
  if (legacySaveTimer) clearTimeout(legacySaveTimer);
  legacySaveTimer = setTimeout(() => {
    try {
      const obj = {};
      for (const [id, s] of sessions.entries()) {
        obj[id] = s;
      }
      fs.writeFileSync(LEGACY_SESSIONS_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (err) {
      console.warn("[SessionStore] Failed writing legacy sessions:", err.message);
    }
  }, 400);
}

const getState = (id) => {
  if (!id) id = "default";
  if (!sessions.has(id)) {
    sessions.set(id, newState());
    saveLegacySessions();
  }
  return sessions.get(id);
};

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    hasApiKey: Boolean(
      process.env.LLM_API_KEY &&
      process.env.LLM_API_KEY.trim() &&
      process.env.LLM_API_KEY !== "your_key_here"
    ),
    model: process.env.LLM_MODEL || "gemini-flash-latest",
  });
});

app.get("/api/state", (req, res) => {
  const sessionId = String(req.query.sessionId || "default");
  res.json({ state: publicState(getState(sessionId)) });
});

app.post("/api/chat", async (req, res) => {
  const { sessionId, message, config, language = "English", imageContext } = req.body || {};
  if (!sessionId || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "sessionId and message required" });
  }

  if (config) {
    sessionConfigs.set(sessionId, config);
  }
  const activeConfig = sessionConfigs.get(sessionId) || {};

  const state = getState(sessionId);
  const text = message.trim().slice(0, 500); // cap input length

  // [INSPECTOR START]
  const requestStartTime = Date.now();
  const stateBefore = {
    trust: state.trust,
    mood: state.mood,
    quests: { ...state.quests },
    inventory: [...(state.inventory || [])],
    farmHealth: state.farmHealth,
    facts: [...(state.facts || [])],
    promises: [...(state.promises || [])],
    flags: { ...(state.flags || {}) },
    history: [...(state.history || [])],
  };
  let jsonRetryFired = false;
  let llmMs = 0;
  // [INSPECTOR END]

  try {
    const messages = buildMessages(state, text, language, imageContext);
    const llmStartTime = Date.now();
    let raw = await askLLM(messages, activeConfig, state, text, language);
    llmMs = Date.now() - llmStartTime;
    let parsed = parseReply(raw);

    // One retry if JSON is malformed
    if (!parsed) {
      console.warn("[Chat] Retrying LLM prompt due to unparseable JSON...");
      // [INSPECTOR START]
      jsonRetryFired = true;
      // [INSPECTOR END]
      const retryStart = Date.now();
      raw = await askLLM(messages, activeConfig, state, text, language);
      llmMs += Date.now() - retryStart;
      parsed = parseReply(raw);
    }

    if (!parsed || !parsed.reply) {
      parsed = {
        reply: language === "Hindi"
          ? "हूँ... हवा तुम्हारे शब्द उड़ा ले गई, ज़रा फिर से कहो।"
          : language === "Hinglish"
          ? "Hmph... hawa tumhare shabd uda le gayi, zara firse kaho."
          : "Hmph... say that again? The wind carried your words away.",
        mood: state.mood || "wary",
        trust_change: 0,
        action: "none",
        action_target: null,
      };
    }

    const { events, actionRejected, rejectionReason } = applyReply(state, parsed);

    state.history.push(
      { role: "user", content: text },
      { role: "assistant", content: parsed.reply }
    );

    await maybeSummarize(state, activeConfig);
    saveLegacySessions();

    // [INSPECTOR START]
    const stateAfter = {
      trust: state.trust,
      mood: state.mood,
      quests: { ...state.quests },
      inventory: [...(state.inventory || [])],
      farmHealth: state.farmHealth,
      facts: [...(state.facts || [])],
      promises: [...(state.promises || [])],
      flags: { ...(state.flags || {}) },
      history: [...(state.history || [])],
    };
    const clientConfigured = Boolean(getClient(activeConfig));
    const source = clientConfigured ? "llm" : "simulator";
    const totalMs = Date.now() - requestStartTime;
    const systemPrompt = messages[0]?.content || "";

    const trace = createTrace(
      parsed,
      stateBefore,
      stateAfter,
      { events, actionRejected, rejectionReason },
      {
        source,
        llmMs,
        totalMs,
        jsonRetryFired,
        systemPromptLength: systemPrompt.length,
        historyCount: Math.max(0, messages.length - 2),
        systemPrompt,
        userMessage: text,
      }
    );
    addSessionTrace(sessionId, trace);
    // [INSPECTOR END]

    // [SUGGESTIONS START]
    let suggestions = undefined;
    if (process.env.SUGGESTIONS_ENABLED !== "false") {
      try {
        suggestions = await generateSuggestions({
          state,
          playerMessage: text,
          raghuReply: parsed.reply,
          language,
          config: activeConfig,
          actionRejected,
          rejectionReason,
        });
      } catch (sugErr) {
        console.warn("[Suggestions] Chat generation skipped:", sugErr?.message || sugErr);
      }
    }
    // [SUGGESTIONS END]

    res.json({
      reply: parsed.reply,
      events,
      state: publicState(state),
      actionRejected,
      rejectionReason,
      debug: {
        rawAction: parsed.action,
        rawTarget: parsed.action_target,
        rawMood: parsed.mood,
      },
      // [INSPECTOR START]
      trace,
      // [INSPECTOR END]
      // [SUGGESTIONS START]
      ...(suggestions ? { suggestions } : {}),
      // [SUGGESTIONS END]
    });
  } catch (e) {
    console.error("Chat error:", e);
    res.status(500).json({ error: "Raghu is lost in thought. Please try again." });
  }
});

// Interactive in-game puzzle solver endpoint
app.post("/api/solve-puzzle", (req, res) => {
  const { sessionId, puzzleId, solution } = req.body || {};
  const state = getState(sessionId);
  const puzzle = PUZZLES[puzzleId];

  if (!puzzle) {
    return res.status(400).json({ error: "Unknown puzzle" });
  }

  if (!state.solvedPuzzles) state.solvedPuzzles = [];
  if (state.solvedPuzzles.includes(puzzleId)) {
    return res.json({ success: true, message: "Puzzle already solved!", state: publicState(state) });
  }

  let isCorrect = false;

  if (puzzleId === "pump_valves") {
    const sObj = solution && typeof solution === "object" ? solution : {};
    if (
      Number(sObj.valveA) === puzzle.solution.valveA &&
      String(sObj.valveB || "").toLowerCase() === puzzle.solution.valveB &&
      String(sObj.valveC || "").toLowerCase() === puzzle.solution.valveC
    ) {
      isCorrect = true;
      state.flags[puzzle.solvedFlag] = true;
      state.farmHealth = Math.min(100, state.farmHealth + 30);
      state.trust = Math.min(10, state.trust + 2);
    }
  } else if (puzzle.acceptedAnswers) {
    const s = String(solution || "").toLowerCase().trim();
    if (s && puzzle.acceptedAnswers.some((ans) => s.includes(ans))) {
      isCorrect = true;
      if (puzzle.solvedFlag) {
        state.flags[puzzle.solvedFlag] = true;
      }
      if (puzzle.rewardItem && !state.inventory.includes(puzzle.rewardItem)) {
        state.inventory.push(puzzle.rewardItem);
      }
      state.trust = Math.min(10, state.trust + 2);
    }
  }

  if (isCorrect) {
    state.solvedPuzzles.push(puzzleId);
    return res.json({
      success: true,
      message: puzzle.successText,
      state: publicState(state),
    });
  } else {
    return res.json({
      success: false,
      message: "The mechanism didn't budge. That doesn't match the clues!",
      state: publicState(state),
    });
  }
});

app.post("/api/world-action", (req, res) => {
  const { sessionId, action } = req.body || {};
  const state = getState(sessionId);
  const a = WORLD_ACTIONS[action];

  if (!a) {
    return res.status(400).json({ error: "Unknown world action" });
  }

  if (state.quests[a.requiresQuest] === "done") {
    return res.json({
      text: "You have already completed this task! Raghu is grateful.",
      state: publicState(state),
    });
  }

  if (state.quests[a.requiresQuest] !== "active") {
    return res.json({
      text: "There is nothing to do here right now. Raghu has not asked you for this task yet.",
      state: publicState(state),
    });
  }

  state.flags[a.setFlag] = true;
  res.json({ text: a.text, state: publicState(state) });
});

app.post("/api/config", (req, res) => {
  const { sessionId, apiKey, baseURL, model } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  sessionConfigs.set(sessionId, { apiKey, baseURL, model });
  res.json({ success: true, message: "Configuration saved for session" });
});

app.post("/api/reset", (req, res) => {
  const sessionId = req.body?.sessionId || "default";
  sessions.set(sessionId, newState());
  res.json({
    text: "A new dawn breaks over Bhima's Hollow. Raghu looks at you with fresh eyes.",
    state: publicState(getState(sessionId)),
  });
});

// [VOICE-UPGRADE START]
app.post("/api/tts", handleTTS);
app.get("/api/tts/status", getTTSStatus);
// [VOICE-UPGRADE END]

// [INSPECTOR START]
app.get("/api/trace", handleGetTraces);
// [INSPECTOR END]

// [SUGGESTIONS START]
app.get("/api/suggestions", (req, res) => {
  if (process.env.SUGGESTIONS_ENABLED === "false") {
    return res.status(404).json({ error: "Suggestions disabled" });
  }
  const sessionId = String(req.query.sessionId || "default");
  const language = String(req.query.language || "English");
  const state = getState(sessionId);
  const suggestions = getFallbackSuggestions(state, language);
  res.json({ suggestions });
});
// [SUGGESTIONS END]

app.listen(PORT, () => {
  console.log(`🌾 Cognitive NPC Server running on port ${PORT}`);
});

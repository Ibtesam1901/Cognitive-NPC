import "dotenv/config";
import express from "express";
import cors from "cors";
import { newState, publicState, WORLD_ACTIONS, PUZZLES } from "./gameData.js";
import { buildMessages } from "./prompt.js";
import { askLLM } from "./llm.js";
import { parseReply, applyReply } from "./apply.js";
import { maybeSummarize } from "./memory.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" })); // Support base64 image uploads if needed

const sessions = new Map(); // sessionId -> game state
const sessionConfigs = new Map(); // sessionId -> custom LLM config { apiKey, baseURL, model }

const getState = (id) => {
  if (!id) id = "default";
  if (!sessions.has(id)) sessions.set(id, newState());
  return sessions.get(id);
};

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    hasApiKey: Boolean(process.env.LLM_API_KEY && process.env.LLM_API_KEY !== "your_key_here"),
    model: process.env.LLM_MODEL || "gemini-flash-latest",
  });
});

app.get("/api/state", (req, res) => {
  const sessionId = String(req.query.sessionId || "default");
  res.json({ state: publicState(getState(sessionId)) });
});

app.post("/api/chat", async (req, res) => {
  const { sessionId, message, config, language = "English", imageContext } = req.body;
  if (!sessionId || !message?.trim()) {
    return res.status(400).json({ error: "sessionId and message required" });
  }

  if (config) {
    sessionConfigs.set(sessionId, config);
  }
  const activeConfig = sessionConfigs.get(sessionId) || {};

  const state = getState(sessionId);
  const text = message.trim().slice(0, 500); // cap input length

  try {
    const messages = buildMessages(state, text, language, imageContext);
    let raw = await askLLM(messages, activeConfig, state, text, language);
    let parsed = parseReply(raw);

    // One retry if JSON is malformed
    if (!parsed) {
      console.warn("[Chat] Retrying LLM prompt due to unparseable JSON...");
      raw = await askLLM(messages, activeConfig, state, text, language);
      parsed = parseReply(raw);
    }

    if (!parsed || !parsed.reply) {
      parsed = {
        reply: language === "Hindi"
          ? "हूँ... हवा तुम्हारे शब्द उड़ा ले गई, ज़रा फिर से कहो।"
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
    });
  } catch (e) {
    console.error("Chat error:", e);
    res.status(500).json({ error: "Raghu is lost in thought. Please try again." });
  }
});

// Interactive in-game puzzle solver endpoint
app.post("/api/solve-puzzle", (req, res) => {
  const { sessionId, puzzleId, solution } = req.body;
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
    // solution: { valveA: 30, valveB: 'bypass', valveC: 'open' }
    if (
      Number(solution.valveA) === 30 &&
      String(solution.valveB).toLowerCase() === "bypass" &&
      String(solution.valveC).toLowerCase() === "open"
    ) {
      isCorrect = true;
      state.flags.pump_repaired = true;
      state.farmHealth = Math.min(100, state.farmHealth + 30);
      state.trust = Math.min(10, state.trust + 2);
    }
  } else if (puzzleId === "map_trail") {
    // solution: string
    const s = String(solution).toLowerCase().trim();
    if (puzzle.acceptedAnswers.some((ans) => s.includes(ans))) {
      isCorrect = true;
      state.flags.found_cow = true;
      state.trust = Math.min(10, state.trust + 2);
    }
  } else if (puzzleId === "seed_riddle") {
    const s = String(solution).toLowerCase().trim();
    if (puzzle.acceptedAnswers.some((ans) => s.includes(ans))) {
      isCorrect = true;
      if (!state.inventory.includes("seeds")) {
        state.inventory.push("seeds");
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
  const { sessionId, action } = req.body;
  const state = getState(sessionId);
  const a = WORLD_ACTIONS[action];

  if (!a) {
    return res.status(400).json({ error: "Unknown world action" });
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
  const { sessionId, apiKey, baseURL, model } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  sessionConfigs.set(sessionId, { apiKey, baseURL, model });
  res.json({ success: true, message: "Configuration saved for session" });
});

app.post("/api/reset", (req, res) => {
  const sessionId = req.body.sessionId || "default";
  sessions.set(sessionId, newState());
  res.json({
    text: "A new dawn breaks over Bhima's Hollow. Raghu looks at you with fresh eyes.",
    state: publicState(getState(sessionId)),
  });
});

app.listen(PORT, () => {
  console.log(`🌾 Cognitive NPC Server running on port ${PORT}`);
});

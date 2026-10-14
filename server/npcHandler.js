/**
 * Turn loop orchestrator for Raghu NPC.
 * Follows Section 4.4 of the build guide.
 */

import { load, save } from "./memoryStore.js";
import { buildPrompt } from "./promptBuilder.js";
import { callLLM } from "./llmClient.js";
import { validateNpcOutput } from "./validator.js";
import { fallbackBrain } from "./fallbackBrain.js";
import { applyActions, clamp } from "./gameEngine.js";

// Rolling summarizer every ~8 turns
function maybeSummarize(state) {
  if (!state.memory.recent || state.memory.recent.length < 8) return;

  const topics = [];
  if (state.memory.facts.length > 0) {
    topics.push(`Player facts noted: ${state.memory.facts.slice(-3).join("; ")}`);
  }
  const completedQuests = state.quests.filter((q) => q.status === "completed").map((q) => q.title);
  if (completedQuests.length > 0) {
    topics.push(`Completed work: ${completedQuests.join(", ")}`);
  }
  topics.push(`Current farm trust is ${state.npc.trust} with Raghu feeling ${state.npc.mood}.`);

  state.memory.summary = `Conversation recap: ${topics.join(". ")}`;
}

export async function handleTurn(sessionId, message, config = {}) {
  const state = load(sessionId);
  let out = null;
  let usedFallback = false;

  // 1. Try LLM Call with 12s timeout and single retry if unparseable
  try {
    const messages = buildPrompt(state, message);
    let raw = await callLLM(messages, config, 12000);
    try {
      out = validateNpcOutput(raw);
    } catch (parseErr) {
      console.warn("[NPC] First JSON parse failed, retrying once...", parseErr.message);
      raw = await callLLM(messages, config, 12000);
      out = validateNpcOutput(raw);
    }
  } catch (err) {
    console.log("[NPC] Using fallback brain due to:", err.message);
    usedFallback = true;
    out = fallbackBrain(state, message);
  }

  // 2. Validate proposed actions against game engine rules
  const { applied, rejected } = applyActions(state, out.actions);

  // 3. Mutate NPC relationship with clamped trust
  const safeDelta = clamp(out.trust_delta || 0, -2, 2);
  state.npc.trust = clamp(state.npc.trust + safeDelta, -10, 10);
  state.npc.mood = out.emotion || "neutral";

  // 4. Memory facts deduplication & cap (max 20)
  if (Array.isArray(out.memory_facts) && out.memory_facts.length > 0) {
    const existing = new Set(state.memory.facts);
    for (const fact of out.memory_facts) {
      if (!existing.has(fact)) {
        state.memory.facts.push(fact);
        existing.add(fact);
      }
    }
    if (state.memory.facts.length > 20) {
      state.memory.facts = state.memory.facts.slice(-20);
    }
  }

  // 5. Push recent turns (keep last 8)
  state.memory.recent.push({
    role: "player",
    content: message,
    timestamp: Date.now(),
  });
  state.memory.recent.push({
    role: "raghu",
    content: out.reply,
    emotion: out.emotion,
    timestamp: Date.now(),
  });
  if (state.memory.recent.length > 8) {
    state.memory.recent = state.memory.recent.slice(-8);
  }

  // 6. Rolling summary
  maybeSummarize(state);

  // 7. Save to disk store
  save(sessionId, state);

  return {
    reply: out.reply,
    emotion: out.emotion,
    trust_delta: safeDelta,
    applied,
    rejected,
    state,
    usedFallback,
  };
}

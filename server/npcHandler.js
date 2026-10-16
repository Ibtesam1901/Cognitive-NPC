/**
 * Turn loop orchestrator for Raghu NPC.
 * Uses applyNpcTurn() from the engine so the LLM output goes through
 * the same validation pipeline as the tests.
 */

import { load, save } from "./memoryStore.js";
import { buildMessages } from "./promptBuilder.js";
import { callLLM } from "./llmClient.js";
import { fallbackBrain } from "./fallbackBrain.js";
import { applyNpcTurn, foldSummary } from "./gameEngine.js";
import { summarizeConversation } from "./summarizer.js";

export async function handleTurn(sessionId, message, config = {}, language = "en") {
  const state = load(sessionId);
  let rawOut = null;
  let usedFallback = false;

  // 1. Try LLM call with 12 s timeout and one retry on bad JSON
  try {
    const messages = buildMessages(state, message, language);
    let raw = await callLLM(messages, config, 12000);
    try {
      rawOut = JSON.parse(raw);
    } catch {
      console.warn("[NPC] First JSON parse failed, retrying once...");
      raw = await callLLM(messages, config, 12000);
      rawOut = JSON.parse(raw);
    }
  } catch (err) {
    console.log("[NPC] Using fallback brain due to:", err.message);
    usedFallback = true;
    rawOut = fallbackBrain(state, message, language);
  }

  // 2. Run through the engine (validates actions, advances quests, caps trust)
  let result;
  try {
    result = applyNpcTurn(state, rawOut, message);
  } catch (normErr) {
    // normalizeNpcOutput threw (bad reply); fall back
    console.log("[NPC] normalizeNpcOutput failed, using fallback:", normErr.message);
    usedFallback = true;
    result = applyNpcTurn(state, fallbackBrain(state, message), message);
  }

  // 3. Rolling summary every ~8 turns
  if (result.needsSummary) {
    const summary = await summarizeConversation(state, config).catch(() => null);
    if (summary) foldSummary(state, summary);
  }

  // 4. Persist
  save(sessionId, state);

  return {
    reply: result.reply,
    emotion: result.emotion,
    trustChange: result.trustChange,
    applied: result.applied,
    rejected: result.rejected,
    events: result.events,
    state,
    usedFallback,
  };
}

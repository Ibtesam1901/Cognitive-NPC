/**
 * Summarizer module for Raghu NPC memory.
 * Runs every ~8 turns with temperature 0.2 to merge old summary + new turns into <= 80 words.
 */

import { callLLM } from "./llmClient.js";

export function buildSummarizerPrompt(oldSummary, turnsText) {
  const prompt = `You maintain the memory of Raghu, a farmer NPC. Merge the OLD SUMMARY and the NEW TURNS into one updated summary of at most 80 words. Keep: promises made, things the player revealed about themselves, key events (quests, arguments, gifts), and how Raghu feels about the player. Drop small talk. Write in third person, plain text only.

OLD SUMMARY: ${oldSummary || "This is the start of the conversation."}
NEW TURNS: ${turnsText || "none"}`;

  return [
    {
      role: "system",
      content:
        "You maintain the memory of Raghu, a farmer NPC. Merge the OLD SUMMARY and the NEW TURNS into one updated summary of at most 80 words. Drop small talk. Write in third person, plain text only.",
    },
    { role: "user", content: prompt },
  ];
}

export async function summarizeConversation(state, config = {}) {
  const oldSummary = state.memory?.summary || "This is the start of the conversation.";
  const turnsText = (state.memory?.recent || [])
    .map((t) =>
      t.player ? `Player: ${t.player}\nRaghu: ${t.npc}` : `${t.role === "player" ? "Player" : "Raghu"}: ${t.content}`
    )
    .join("\n");

  try {
    const messages = buildSummarizerPrompt(oldSummary, turnsText);
    const result = await callLLM(messages, config, 8000, {
      temperature: 0.2, // Temperature 0.2 for summarizer
      jsonMode: false,  // Plain text only
      maxTokens: 140,
    });
    if (result && typeof result === "string" && result.trim()) {
      state.memory.summary = result.trim();
      return state.memory.summary;
    }
  } catch (err) {
    console.warn("[Summarizer] LLM summarizer unavailable, using rule-based compression:", err.message);
  }

  // Deterministic rule-based fallback
  const facts = (state.memory?.facts || []).slice(-3).join("; ");
  const activeQ = (state.quests || [])
    .filter((q) => q.status === "active")
    .map((q) => q.title)
    .join(", ");
  const completedQ = (state.quests || [])
    .filter((q) => q.status === "completed")
    .map((q) => q.title)
    .join(", ");

  const parts = [];
  if (facts) parts.push(`Player revealed: ${facts}`);
  if (activeQ) parts.push(`Active quest: ${activeQ}`);
  if (completedQ) parts.push(`Completed: ${completedQ}`);
  parts.push(`Raghu feels ${state.npc?.mood || "neutral"} with trust at ${state.npc?.trust ?? 0}.`);

  state.memory.summary = parts.join(". ");
  return state.memory.summary;
}

// promptBuilder.js
// Assembles the two-message array [system, user] for every Raghu turn.
// Uses promptSummary() from the engine so the context is always in sync
// with the real game state (no manual string formatting here).

import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { promptSummary } from "./gameEngine.js";

export function buildMessages(state, playerMessage) {
  const s = state;
  const ps = promptSummary(s);

  const context = `
# WORLD STATE
Day: ${s.day} | Time: ${ps.time} | Weather: ${s.weather} | Gold: ${s.gold} | Wheat price: ${ps.wheatPrice}
Plots: ${ps.plots}
Inventory: ${ps.inventory}
Active quests: ${ps.activeQuests}
Completed quests: ${ps.completedQuests}

# RELATIONSHIP
Trust: ${s.npc?.trust ?? 0} | Current mood: ${s.npc?.mood || "neutral"}

# KNOWN FACTS ABOUT THE PLAYER
${s.memory?.facts?.length ? s.memory.facts.map((f) => "- " + f).join("\n") : "none yet"}

# SUMMARY OF EARLIER CONVERSATION
${s.memory?.summary || "This is the start of the conversation."}

# RECENT TURNS
${(s.memory?.recent || [])
  .map((t) =>
    t.player !== undefined
      ? `Player: ${t.player}\nRaghu: ${t.npc}`
      : `${t.role === "player" ? "Player" : "Raghu"}: ${t.content}`
  )
  .join("\n") || "(none)"}

# PLAYER SAYS
"${String(playerMessage || "").slice(0, 500)}"
`.trim();

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: context },
  ];
}

// Backward-compatible alias used by the old /api/chat route
export const buildPrompt = buildMessages;

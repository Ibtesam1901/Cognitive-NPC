// promptBuilder.js
import { SYSTEM_PROMPT } from "./systemPrompt.js";

export function buildMessages(state, playerMessage) {
  const s = state;
  const context = `
# WORLD STATE
Day: ${s.day} | Weather: ${s.weather} | Gold: ${s.gold}
Plots: ${(s.plots || []).map((p) => `plot ${p.id}: ${p.locked || !p.unlocked ? "locked" : p.crop ? `${p.crop}${p.watered ? " (watered)" : ""}` : "empty"}`).join(", ")}
Inventory: ${JSON.stringify(s.inventory || {})}
Active quests: ${(s.quests || []).filter((q) => q.status === "active").map((q) => `${q.id} (step ${q.step})`).join(", ") || "none"}
Completed quests: ${(s.quests || []).filter((q) => q.status === "done" || q.status === "completed").map((q) => q.id).join(", ") || "none"}

# RELATIONSHIP
Trust: ${s.npc?.trust ?? 0} | Current mood: ${s.npc?.mood || "neutral"}

# KNOWN FACTS ABOUT THE PLAYER
${s.memory?.facts?.length ? s.memory.facts.map((f) => "- " + f).join("\n") : "none yet"}

# SUMMARY OF EARLIER CONVERSATION
${s.memory?.summary || "This is the start of the conversation."}

# RECENT TURNS
${(s.memory?.recent || []).map((t) => t.player ? `Player: ${t.player}\nRaghu: ${t.npc}` : `${t.role === "player" ? "Player" : "Raghu"}: ${t.content}`).join("\n") || "(none)"}

# PLAYER SAYS
"${(playerMessage || "").slice(0, 500)}"
`.trim();

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: context },
  ];
}

// Backward-compatible alias
export const buildPrompt = buildMessages;

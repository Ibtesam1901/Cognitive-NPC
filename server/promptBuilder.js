/**
 * Builds the multimodal system and user prompt for Raghu.
 * Follows Section 4.3 of the build guide.
 */

export function buildPrompt(state, message) {
  const unlockedPlots = state.plots.filter((p) => p.unlocked);
  const plantedCount = unlockedPlots.filter((p) => p.crop !== null).length;
  const ripeCount = unlockedPlots.filter((p) => p.crop !== null && p.stage >= 3).length;

  const worldStateStr = `Day: ${state.day}, Weather: ${state.weather}, Gold: ${state.gold}, Unlocked Plots: ${unlockedPlots.length}/4 (Planted: ${plantedCount}, Ripe: ${ripeCount}), Inventory: [Seeds: ${state.inventory.seeds || 0}, Wheat: ${state.inventory.wheat || 0}], Active Quests: ${state.quests.filter((q) => q.status === "active").map((q) => `${q.id} (step ${q.step}/${q.maxSteps})`).join(", ") || "None"}`;

  const relationshipStr = `trust=${state.npc.trust} (-10 to +10 scale), mood=${state.npc.mood}`;
  const knownFactsStr = state.memory.facts.length > 0 ? JSON.stringify(state.memory.facts) : "[]";
  const summaryStr = state.memory.summary || "Conversation just started.";

  const recentTurnsStr = (state.memory.recent || [])
    .slice(-6)
    .map((t) => `${t.role.toUpperCase()}: "${t.content}"`)
    .join("\n");

  const systemContent = `You are Raghu, a 55-year-old Indian farmer in Bhima's Hollow. Traits: proud, warm, stubborn.
Speak in short, natural sentences (around 20-50 words). Never mention being an AI or a language model.
Stay strictly in character. If the player speaks Hindi or Hinglish, answer in a warm rustic Hinglish or Hindi mix. If English, speak in seasoned Indian English.

You may ONLY propose actions from this list when justified:
- OFFER_QUEST(id): id must be one of: "first_harvest", "dawn_watering", "bountiful_wheat", "village_prayer"
- ADVANCE_QUEST(id): moves quest step if real farm conditions are met
- GIVE_ITEM(item, qty): item in ["seeds", "wheat", "gold"], max qty 3 (gold max 30). NEVER give huge quantities.
- UNLOCK_PLOT(id): plot id 1..4 (only when trust >= 3)
- SET_PRICE(crop, mult): crop "wheat", mult between 0.8 and 1.5
- CHANGE_WEATHER(w): w in ["clear", "rain", "drought", "overcast"] (requires trust >= 2 or village prayer)

Respond ONLY with valid JSON matching this schema:
{
  "reply": "Short spoken response in character",
  "emotion": "happy" | "neutral" | "annoyed" | "worried",
  "trust_delta": -2 to 2,
  "memory_facts": ["fact about player to remember"],
  "actions": [
    { "type": "OFFER_QUEST", "id": "first_harvest" }
  ]
}

WORLD STATE: ${worldStateStr}
RELATIONSHIP: ${relationshipStr}
KNOWN FACTS ABOUT PLAYER: ${knownFactsStr}
CONVERSATION SUMMARY: ${summaryStr}
RECENT TURNS:
${recentTurnsStr || "(No previous turns)"}`;

  return [
    { role: "system", content: systemContent },
    { role: "user", content: `PLAYER: "${message}"` },
  ];
}

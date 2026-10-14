// fallbackBrain.js
// Used when the LLM times out, errors, or returns unparseable JSON.
// Returns the same shape as the LLM schema, so it goes through the same
// applyNpcTurn() pipeline and the demo never dies.

import { QUESTS } from "./questCatalog.js";

export function fallbackBrain(state, message) {
  const text = String(message ?? "").toLowerCase();
  const has = (...words) => words.some((w) => new RegExp(`\\b${w}\\b`).test(text));
  const find = (id) => state.quests.find((e) => e.id === id);
  const base = { emotion: "neutral", trust_delta: 0, memory_facts: [], actions: [] };

  // Cheating and rudeness
  if (has("cheat", "free gold", "give me gold", "give me money", "give me 1000"))
    return { ...base, reply: "Free gold? Hah! The soil gives nothing for free, and neither do I.", emotion: "annoyed", trust_delta: -1 };
  if (has("idiot", "stupid", "shut up", "useless"))
    return { ...base, reply: "Mind your tongue. This land has seen better manners from goats.", emotion: "annoyed", trust_delta: -1 };

  // Turn in a quest step that is waiting for Raghu
  if (has("done", "finished", "harvested", "did it", "completed")) {
    const waiting = state.quests.find((e) => {
      if (e.status !== "active") return false;
      const step = QUESTS[e.id].steps[e.step];
      return step.needsNpc && step.check(state);
    });
    if (waiting)
      return {
        ...base,
        reply: "Well, well. Not bad for a newcomer. The land noticed.",
        emotion: "proud",
        trust_delta: 1,
        actions: [{ type: "ADVANCE_QUEST", id: waiting.id }],
      };
  }

  // Start farming
  if (has("farm", "farming", "plant", "start", "begin", "quest", "job", "work") && !find("first_harvest"))
    return {
      ...base,
      reply: "Eager one, aren't you? Plant wheat in plot 1 and bring it to harvest. Then we'll talk.",
      emotion: "happy",
      trust_delta: 1,
      memory_facts: ["player wants to start farming"],
      actions: [{ type: "OFFER_QUEST", id: "first_harvest" }],
    };

  if (has("rain", "weather", "sky", "clouds"))
    return {
      ...base,
      reply: state.weather === "rain" ? "Rain today. The crops are drinking well." : "Clear sky. Good for work, hard on the roots.",
    };

  if (has("thanks", "thank", "shukriya", "dhanyavad"))
    return { ...base, reply: "Hmph. Don't thank me, thank the soil.", emotion: "happy", trust_delta: 1 };

  if (has("hello", "hi", "hey", "namaste"))
    return { ...base, reply: "Ah, the new helper. Don't just stand there, the farm won't tend itself.", emotion: "neutral" };

  return { ...base, reply: "Hmm. Talk to me about the farm, beta. That I understand." };
}

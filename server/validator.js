/**
 * Schema validator for Raghu NPC brain output.
 * Ensures the model output strictly satisfies the contract without external dependencies.
 */

const ALLOWED_EMOTIONS = ["happy", "neutral", "annoyed", "worried"];
const ALLOWED_ACTION_TYPES = [
  "OFFER_QUEST",
  "ADVANCE_QUEST",
  "GIVE_ITEM",
  "UNLOCK_PLOT",
  "SET_PRICE",
  "CHANGE_WEATHER",
];
const ALLOWED_WEATHERS = ["clear", "rain", "drought", "overcast"];

export function validateNpcOutput(raw) {
  if (!raw) {
    throw new Error("Empty model output");
  }

  let data = raw;
  if (typeof raw === "string") {
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
    data = JSON.parse(cleaned);
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("Model output is not a JSON object");
  }

  // 1. Validate reply
  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("Missing or empty 'reply' field");
  }
  const reply = data.reply.trim();

  // 2. Validate emotion
  let emotion = "neutral";
  if (typeof data.emotion === "string" && ALLOWED_EMOTIONS.includes(data.emotion.toLowerCase())) {
    emotion = data.emotion.toLowerCase();
  }

  // 3. Validate trust_delta (-2 to 2)
  let trust_delta = 0;
  if (typeof data.trust_delta === "number" && !isNaN(data.trust_delta)) {
    trust_delta = Math.max(-2, Math.min(2, Math.round(data.trust_delta)));
  }

  // 4. Validate memory_facts (array of strings, max 5 per turn)
  let memory_facts = [];
  if (Array.isArray(data.memory_facts)) {
    memory_facts = data.memory_facts
      .filter((f) => typeof f === "string" && f.trim().length > 0)
      .map((f) => f.trim().slice(0, 120))
      .slice(0, 5);
  }

  // 5. Validate actions
  let actions = [];
  if (Array.isArray(data.actions)) {
    for (const a of data.actions) {
      if (!a || typeof a !== "object" || !a.type) continue;
      const type = String(a.type).toUpperCase();
      if (!ALLOWED_ACTION_TYPES.includes(type)) continue;

      if (type === "OFFER_QUEST") {
        if (a.id) actions.push({ type, id: String(a.id).trim() });
      } else if (type === "ADVANCE_QUEST") {
        if (a.id) actions.push({ type, id: String(a.id).trim() });
      } else if (type === "GIVE_ITEM") {
        const item = String(a.item || "seeds").toLowerCase().trim();
        const qty = Math.max(1, Math.min(5, parseInt(a.qty, 10) || 1));
        actions.push({ type, item, qty });
      } else if (type === "UNLOCK_PLOT") {
        const id = parseInt(a.id, 10);
        if (!isNaN(id) && id >= 1 && id <= 4) {
          actions.push({ type, id });
        }
      } else if (type === "SET_PRICE") {
        const crop = String(a.crop || "wheat").toLowerCase().trim();
        const mult = Math.max(0.8, Math.min(1.5, parseFloat(a.mult) || 1.0));
        actions.push({ type, crop, mult: Number(mult.toFixed(2)) });
      } else if (type === "CHANGE_WEATHER") {
        const w = String(a.w || a.weather || "clear").toLowerCase().trim();
        if (ALLOWED_WEATHERS.includes(w)) {
          actions.push({ type, w });
        }
      }
    }
  }

  return {
    reply,
    emotion,
    trust_delta,
    memory_facts,
    actions,
  };
}

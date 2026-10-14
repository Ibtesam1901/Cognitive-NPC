import { QUESTS, ITEMS } from "./gameData.js";

const MOODS = ["wary", "neutral", "friendly", "angry", "grateful", "suspicious"];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function parseReply(raw) {
  try {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    const cleaned = String(raw)
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    // In case there is text before or after the JSON object
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[Parse JSON error]:", e.message, "Raw:", raw);
    return null;
  }
}

// Mutates state, returns a list of human-readable game events for the UI.
export function applyReply(state, r) {
  const events = [];
  let actionRejected = false;
  let rejectionReason = "";

  // 1. Trust change (clamped delta -3..3, total clamped -10..10)
  const delta = clamp(Number(r.trust_change) || 0, -3, 3);
  const oldTrust = state.trust;
  state.trust = clamp(state.trust + delta, -10, 10);
  if (state.trust !== oldTrust) {
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    events.push(`🤝 Trust changed: ${sign} (Now ${state.trust})`);
  }

  // 2. Mood transition
  if (MOODS.includes(r.mood)) {
    state.mood = r.mood;
  }

  // 3. New fact retention
  if (r.new_fact && state.facts.length < 20) {
    const cleanFact = String(r.new_fact).trim().slice(0, 120);
    if (cleanFact && !state.facts.includes(cleanFact)) {
      state.facts.push(cleanFact);
      events.push(`🧠 Raghu noted: "${cleanFact}"`);
    }
  }

  // 4. Promise recorded
  if (r.promise_made && state.promises.length < 10) {
    const cleanPromise = String(r.promise_made).trim().slice(0, 120);
    if (cleanPromise && !state.promises.includes(cleanPromise)) {
      state.promises.push(cleanPromise);
      events.push(`✍️ Promise recorded: "${cleanPromise}"`);
    }
  }

  const id = r.action_target;
  const quest = QUESTS[id];

  // 5. Quest unlock validation (Code decides, not LLM)
  if (r.action === "unlock_quest") {
    if (!quest) {
      actionRejected = true;
      rejectionReason = "Unknown quest";
    } else if (state.quests[id] !== "locked") {
      actionRejected = true;
      rejectionReason = `Quest is already ${state.quests[id]}`;
    } else if (state.trust < quest.minTrust) {
      actionRejected = true;
      rejectionReason = `Trust (${state.trust}) is lower than required (${quest.minTrust})`;
    } else {
      state.quests[id] = "active";
      events.push(`📜 New quest unlocked: "${quest.title}"`);
    }
  }

  // 6. Quest completion validation (World flag verification prevents lying)
  if (r.action === "complete_quest") {
    if (!quest) {
      actionRejected = true;
      rejectionReason = "Unknown quest";
    } else if (state.quests[id] === "done") {
      actionRejected = true;
      rejectionReason = "Quest is already completed";
    } else if (state.quests[id] !== "active") {
      actionRejected = true;
      rejectionReason = `Quest has not been unlocked yet (current status: ${state.quests[id]})`;
    } else if (!state.flags[quest.flag]) {
      actionRejected = true;
      rejectionReason = "Player has not actually performed the world action!";
      events.push(`⚠️ Raghu verified the fields: the task was NOT actually done!`);
    } else {
      state.quests[id] = "done";
      state.farmHealth = clamp(state.farmHealth + 30, 0, 100);
      events.push(`✅ Quest complete: "${quest.title}" (+30 Farm Health)`);
    }
  }

  // 7. Item reward validation (Trust must be >= 5)
  if (r.action === "give_item") {
    if (!ITEMS.includes(id)) {
      actionRejected = true;
      rejectionReason = "Unknown item";
    } else if (state.inventory.includes(id)) {
      actionRejected = true;
      rejectionReason = "Item already in inventory";
    } else if (state.trust < 5) {
      actionRejected = true;
      rejectionReason = `Trust (${state.trust}) must be >= 5 to receive items`;
    } else {
      state.inventory.push(id);
      events.push(`🎁 Raghu gave you an item: [${id}]`);
    }
  }

  return { events, actionRejected, rejectionReason };
}

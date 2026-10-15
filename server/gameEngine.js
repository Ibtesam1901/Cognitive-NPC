// gameEngine.js
// The LLM PROPOSES, this engine DECIDES.
// Every action Raghu suggests is validated against the rules below. Nothing the
// model says can break the game: unknown actions, bad numbers, missing
// prerequisites and cheating attempts are rejected with a reason.
//
// No dependencies. Functions mutate the state object you pass in; call
// structuredClone(state) first if you want atomic turns.

import { QUESTS } from "./questCatalog.js";

export const EMOTIONS = ["happy", "neutral", "annoyed", "worried", "proud"];
export const GROWTH_DAYS = 2; // watered days needed before a crop is ready
export const BASE_PRICE = 10; // gold per wheat before the price multiplier

// Base sell values per crop & farm goods unit
export const CROP_BASE_PRICES = {
  wheat: 10,
  rice: 16,
  sugarcane: 24,
  marigold: 12,
  milk: 18,
  roti: 22,
  gur: 45,
  kheer: 75,
};

// Cooking / Crafting Recipes using farm harvests
export const CRAFT_RECIPES = {
  roti: {
    name: "Warm Roti",
    desc: "Crispy hearth-baked flatbread from freshly ground wheat.",
    ingredients: { wheat: 1 },
    yield: 2,
    goldValue: 22,
  },
  gur: {
    name: "Raw Gur (Jaggery)",
    desc: "Golden caramel jaggery boiled from crushed sugarcane stalk.",
    ingredients: { sugarcane: 2 },
    yield: 1,
    goldValue: 45,
  },
  kheer: {
    name: "Festive Rice Kheer",
    desc: "Rich slow-cooked sweet pudding of rice, whole cow milk, and pure jaggery.",
    ingredients: { rice: 1, milk: 1, gur: 1 },
    yield: 1,
    goldValue: 75,
  },
};

// Market caravan seed / supply purchase prices
export const MARKET_BUY_PRICES = {
  seeds: 6, // wheat seeds
  rice_seeds: 10,
  cane_cuttings: 15,
  marigold_seeds: 8,
  fertilizer: 20,
  water_can: 35,
};

// Seed to crop mapping
export const SEED_TO_CROP = {
  seeds: "wheat",
  rice_seeds: "rice",
  cane_cuttings: "sugarcane",
  marigold_seeds: "marigold",
};

export const CROP_TO_SEED = {
  wheat: "seeds",
  rice: "rice_seeds",
  sugarcane: "cane_cuttings",
  marigold: "marigold_seeds",
};

export const LIMITS = {
  maxActionsPerTurn: 3,
  maxActiveQuests: 2,
  giftsPerDay: 3,
  trustGainPerDay: 3,
  weatherChangesPerDay: 1,
  flowersPerDay: 3,
  maxFacts: 20,
  recentTurns: 8,
  summaryEvery: 8,
  replyChars: 400,
  itemCap: 50,
};

const GIVABLE_ITEMS = ["seeds", "rice_seeds", "cane_cuttings", "marigold_seeds", "water_can", "fertilizer"];
const CROPS = ["wheat", "rice", "sugarcane", "marigold"];
const WEATHERS = ["clear", "rain"];

class RuleError extends Error {}
const fail = (msg) => {
  throw new RuleError(msg);
};

const toInt = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// ---------------------------------------------------------------- state

export function createInitialState() {
  return {
    day: 1,
    time: 8, // hour of day, 0-23
    weather: "clear",
    gold: 100,
    plots: [1, 2, 3, 4, 5, 6].map((id) => ({
      id,
      locked: id !== 1, // plot 1 unlocked, 2-6 locked initially
      crop: null,
      growth: 0,
      watered: false,
      wateredAt: null, // hour of manual watering; null if rain or unwatered
    })),
    inventory: {
      seeds: 3,
      rice_seeds: 2,
      cane_cuttings: 1,
      marigold_seeds: 2,
      water_can: 1,
      fertilizer: 1,
      flowers: 0,
      wheat: 0,
      rice: 0,
      sugarcane: 0,
      marigold: 0,
      milk: 0,
      roti: 0,
      gur: 0,
      kheer: 0,
    },
    prices: {
      wheat: 1.0,
      rice: 1.0,
      sugarcane: 1.0,
      marigold: 1.0,
      milk: 1.0,
      roti: 1.0,
      gur: 1.0,
      kheer: 1.0,
    },
    flags: {
      harvestedWheat: false,
      harvestedRice: false,
      harvestedSugarcane: false,
      harvestedMarigold: false,
      shrineOffered: false,
      canChangeWeather: false,
      sluiceOpen: false,
      cowFedToday: false,
      milkCollectedToday: false,
      dogPetToday: false,
      giftsToday: 0,
      trustGainedToday: 0,
      weatherChangesToday: 0,
      flowersToday: 0,
    },
    quests: [], // { id, status: "active" | "done", step }
    npc: { name: "Raghu", mood: "neutral", trust: 0 },
    memory: { facts: [], summary: "", recent: [], turnsSinceSummary: 0 },
  };
}

const getPlot = (state, id) =>
  state.plots.find((p) => p.id === toInt(id)) ?? fail("no such plot");
const addItem = (state, item, qty) => {
  state.inventory[item] = clamp(
    (state.inventory[item] ?? 0) + qty,
    0,
    LIMITS.itemCap
  );
};
const hasDoneQuest = (state) => state.quests.some((q) => q.status === "done");

// ---------------------------------------------------------------- trust

function addTrust(state, delta) {
  const before = state.npc.trust;
  state.npc.trust = clamp(before + delta, -10, 10);
  return state.npc.trust - before;
}

// Model-driven trust changes: positive gains are capped per day so players
// cannot farm trust by spamming compliments. Negative changes are never capped.
function applyTrustDelta(state, delta) {
  if (delta > 0) {
    const room = Math.max(0, LIMITS.trustGainPerDay - state.flags.trustGainedToday);
    const gain = addTrust(state, Math.min(delta, room));
    state.flags.trustGainedToday += gain;
    return gain;
  }
  return addTrust(state, delta);
}

// ---------------------------------------------------------------- quests

function completeQuest(state, quest, entry) {
  entry.status = "done";
  const r = quest.reward ?? {};
  const parts = [];
  if (r.gold) {
    state.gold += r.gold;
    parts.push(`+${r.gold} gold`);
  }
  for (const [item, qty] of Object.entries(r.items ?? {})) {
    addItem(state, item, qty);
    parts.push(`+${qty} ${item}`);
  }
  if (r.trust) addTrust(state, r.trust);
  if (r.flag) state.flags[r.flag] = true;
  return `Quest complete: ${quest.title}${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

function advanceOne(state, quest, entry) {
  const finished = quest.steps[entry.step].desc;
  entry.step += 1;
  if (entry.step >= quest.steps.length) return completeQuest(state, quest, entry);
  return `${quest.title}: "${finished}" done. Next: ${quest.steps[entry.step].desc}`;
}

// Advances every active quest whose current step is satisfied by the world
// (steps marked needsNpc wait for Raghu). Call after any state change.
export function autoAdvanceQuests(state) {
  const events = [];
  for (const entry of state.quests) {
    const quest = QUESTS[entry.id];
    while (entry.status === "active") {
      const step = quest.steps[entry.step];
      if (step.needsNpc || !step.check(state)) break;
      events.push({ type: "QUEST_PROGRESS", id: entry.id, text: advanceOne(state, quest, entry) });
    }
  }
  return events;
}

// ---------------------------------------------------------------- NPC actions

const npcActions = {
  OFFER_QUEST(state, a) {
    const quest = QUESTS[a.id] ?? fail("unknown quest");
    if (state.quests.some((e) => e.id === quest.id)) fail("quest already offered");
    if (state.npc.trust < quest.minTrust) fail("trust too low for this quest");
    if (!quest.requires.every((id) => state.quests.some((e) => e.id === id && e.status === "done")))
      fail("prerequisite quest not completed");
    if (state.quests.filter((e) => e.status === "active").length >= LIMITS.maxActiveQuests)
      fail("too many active quests");
    state.quests.push({ id: quest.id, status: "active", step: 0 });
    return `Quest offered: ${quest.title}`;
  },

  ADVANCE_QUEST(state, a) {
    const entry = state.quests.find((e) => e.id === a.id && e.status === "active") ?? fail("quest not active");
    const quest = QUESTS[entry.id];
    if (!quest.steps[entry.step].check(state)) fail("step condition not met");
    return advanceOne(state, quest, entry);
  },

  GIVE_ITEM(state, a) {
    if (!GIVABLE_ITEMS.includes(a.item)) fail("item cannot be given");
    const qty = clamp(toInt(a.qty, 1), 1, 3);
    if (state.npc.trust < 2) fail("trust too low for gifts");
    if (state.flags.giftsToday + qty > LIMITS.giftsPerDay) fail("daily gift limit reached");
    addItem(state, a.item, qty);
    state.flags.giftsToday += qty;
    return `Received ${qty} ${a.item}`;
  },

  UNLOCK_PLOT(state, a) {
    const plot = getPlot(state, a.id);
    if (!plot.locked) fail("plot already unlocked");
    if (state.npc.trust < 4) fail("trust too low to unlock a plot");
    if (!hasDoneQuest(state)) fail("player has not completed a quest yet");
    plot.locked = false;
    return `Plot ${plot.id} unlocked`;
  },

  SET_PRICE(state, a) {
    if (!CROPS.includes(a.crop)) fail("unknown crop");
    const raw = Number(a.mult);
    if (!Number.isFinite(raw)) fail("invalid multiplier");
    const mult = Math.round(clamp(raw, 0.8, 1.3) * 100) / 100;
    if (mult > 1 && state.npc.trust < 3) fail("trust too low for a better price");
    if (mult < 1 && state.npc.trust > 0) fail("Raghu only punishes when trust is low");
    state.prices[a.crop] = mult;
    return `${a.crop} price multiplier is now x${mult}`;
  },

  CHANGE_WEATHER(state, a) {
    if (!WEATHERS.includes(a.weather)) fail("unknown weather");
    if (!state.flags.canChangeWeather) fail("player has not earned weather help");
    if (state.flags.weatherChangesToday >= LIMITS.weatherChangesPerDay) fail("weather already changed today");
    if (state.weather === a.weather) fail("weather is already like that");
    state.weather = a.weather;
    state.flags.weatherChangesToday += 1;
    if (a.weather === "rain") for (const p of state.plots) if (p.crop) p.watered = true; // rain does not set wateredAt
    return `Weather changed to ${a.weather}`;
  },
};

export function applyActions(state, actions = []) {
  const applied = [];
  const rejected = [];
  const seen = new Set();
  for (const raw of (Array.isArray(actions) ? actions : []).slice(0, LIMITS.maxActionsPerTurn)) {
    const key = JSON.stringify(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    const handler =
      typeof raw?.type === "string" && Object.hasOwn(npcActions, raw.type) ? npcActions[raw.type] : null;
    if (!handler) {
      rejected.push({ action: raw, reason: "unknown action" });
      continue;
    }
    try {
      applied.push({ type: raw.type, text: handler(state, raw) });
    } catch (e) {
      if (e instanceof RuleError) rejected.push({ action: raw, reason: e.message });
      else throw e;
    }
  }
  return { applied, rejected };
}

// ---------------------------------------------------------------- LLM output

// Cleans the model's JSON. Throws if there is no usable reply, so the caller
// can retry or switch to the fallback brain.
export function normalizeNpcOutput(out) {
  if (!out || typeof out !== "object" || typeof out.reply !== "string" || !out.reply.trim())
    throw new Error("NPC output has no reply");
  return {
    reply: out.reply.trim().slice(0, LIMITS.replyChars),
    emotion: EMOTIONS.includes(out.emotion) ? out.emotion : "neutral",
    trust_delta: clamp(toInt(out.trust_delta), -2, 2),
    memory_facts: (Array.isArray(out.memory_facts) ? out.memory_facts : [])
      .filter((f) => typeof f === "string" && f.trim())
      .map((f) => f.trim().slice(0, 120))
      .slice(0, 2),
    actions: (Array.isArray(out.actions) ? out.actions : [])
      .filter((a) => a && typeof a === "object" && typeof a.type === "string")
      .slice(0, LIMITS.maxActionsPerTurn),
  };
}

function addFacts(state, facts) {
  const known = new Set(state.memory.facts.map((f) => f.toLowerCase()));
  for (const f of facts) {
    if (!known.has(f.toLowerCase())) {
      state.memory.facts.push(f);
      known.add(f.toLowerCase());
    }
  }
  state.memory.facts = state.memory.facts.slice(-LIMITS.maxFacts);
}

// One full Raghu turn. `rawOut` is the parsed JSON from the LLM (or the
// fallback brain). Actions run BEFORE the trust change, so gating uses the
// trust the model saw in its prompt.
export function applyNpcTurn(state, rawOut, playerMessage = "") {
  const out = normalizeNpcOutput(rawOut);
  const { applied, rejected } = applyActions(state, out.actions);
  const events = autoAdvanceQuests(state);
  const trustChange = applyTrustDelta(state, out.trust_delta);
  state.npc.mood = out.emotion;
  addFacts(state, out.memory_facts);
  state.memory.recent.push({ player: String(playerMessage).slice(0, 500), npc: out.reply });
  state.memory.recent = state.memory.recent.slice(-LIMITS.recentTurns);
  state.memory.turnsSinceSummary += 1;
  return {
    reply: out.reply,
    emotion: out.emotion,
    trustChange,
    applied,
    rejected,
    events,
    needsSummary: state.memory.turnsSinceSummary >= LIMITS.summaryEvery,
  };
}

// Call with the summarizer's output; keeps the last 2 turns verbatim.
export function foldSummary(state, newSummary) {
  state.memory.summary = String(newSummary).trim().slice(0, 600);
  state.memory.recent = state.memory.recent.slice(-2);
  state.memory.turnsSinceSummary = 0;
}

// ---------------------------------------------------------------- player events

const playerEvents = {
  PLANT(state, e) {
    const plot = getPlot(state, e.plotId);
    if (plot.locked) fail("that plot is locked");
    if (plot.crop) fail("something is already planted there");
    const cropType = e.crop ?? "wheat";
    if (!CROPS.includes(cropType)) fail("unknown crop");
    
    // Determine which seed is needed
    const seedItem = CROP_TO_SEED[cropType] ?? "seeds";
    if ((state.inventory[seedItem] ?? 0) < 1) fail(`no ${seedItem.replace("_", " ")} left`);
    state.inventory[seedItem] -= 1;
    Object.assign(plot, { crop: cropType, growth: 0, watered: false, wateredAt: null });
    return `Planted ${cropType} in plot ${plot.id}`;
  },

  WATER(state, e) {
    const plot = getPlot(state, e.plotId);
    if (!plot.crop) fail("nothing to water");
    if (plot.watered) fail("already watered");
    if (state.inventory.water_can < 1) fail("you need a water can");
    plot.watered = true;
    plot.wateredAt = state.time;
    return `Watered plot ${plot.id} at ${state.time}:00`;
  },

  HARVEST(state, e) {
    const plot = getPlot(state, e.plotId);
    if (!plot.crop) fail("nothing to harvest");
    if (plot.growth < GROWTH_DAYS) fail("crop is not ready yet");
    const crop = plot.crop;
    const yieldQty = crop === "sugarcane" ? 3 : 2;
    addItem(state, crop, yieldQty);
    Object.assign(plot, { crop: null, growth: 0, watered: false, wateredAt: null });
    
    if (crop === "wheat") state.flags.harvestedWheat = true;
    if (crop === "rice") state.flags.harvestedRice = true;
    if (crop === "sugarcane") state.flags.harvestedSugarcane = true;
    if (crop === "marigold") state.flags.harvestedMarigold = true;

    return `Harvested plot ${plot.id}: +${yieldQty} ${crop}`;
  },

  SELL(state, e) {
    const item = e.item ?? "wheat";
    const qty = clamp(toInt(e.qty, 1), 1, LIMITS.itemCap);
    const validTradeItems = [...CROPS, "milk", "roti", "gur", "kheer"];
    if (!validTradeItems.includes(item)) fail(`merchant only trades farm crops and cooked goods (${validTradeItems.join(", ")})`);
    if ((state.inventory[item] ?? 0) < qty) fail(`not enough ${item}`);
    
    const baseVal = CROP_BASE_PRICES[item] ?? BASE_PRICE;
    const mult = state.prices[item] ?? 1.0;
    const gold = Math.round(qty * baseVal * mult);
    state.inventory[item] -= qty;
    state.gold += gold;
    return `Sold ${qty} ${item.replace("_", " ")} for ${gold} gold`;
  },

  COOK(state, e) {
    const recipeId = e.recipe;
    const recipe = CRAFT_RECIPES[recipeId];
    if (!recipe) fail("unknown cooking recipe");

    // Check ingredients
    for (const [ing, count] of Object.entries(recipe.ingredients)) {
      if ((state.inventory[ing] ?? 0) < count) {
        fail(`missing ingredients: need ${count} ${ing.replace("_", " ")}, have ${state.inventory[ing] ?? 0}`);
      }
    }

    // Deduct ingredients
    for (const [ing, count] of Object.entries(recipe.ingredients)) {
      state.inventory[ing] -= count;
    }

    // Grant cooked yield
    addItem(state, recipeId, recipe.yield);
    return `Cooked ${recipe.yield} ${recipe.name}! Fresh warmth fills the hearth.`;
  },

  FEED_COW(state) {
    if (state.flags.cowFedToday) fail("Lakshmi is already full and peacefully chewing cud");
    // Feed grass/wheat/sugarcane
    let fedItem = null;
    if ((state.inventory.wheat ?? 0) >= 1) {
      state.inventory.wheat -= 1;
      fedItem = "wheat";
    } else if ((state.inventory.sugarcane ?? 0) >= 1) {
      state.inventory.sugarcane -= 1;
      fedItem = "sugarcane";
    } else {
      fail("need at least 1 wheat or sugarcane to feed Lakshmi");
    }

    state.flags.cowFedToday = true;
    return `Fed Lakshmi fresh ${fedItem}! She lets out a warm, contented low and nudges your hand.`;
  },

  MILK_COW(state) {
    if (!state.flags.cowFedToday) fail("Lakshmi needs to be fed sweet grass or wheat before giving fresh milk");
    if (state.flags.milkCollectedToday) fail("Lakshmi has already been milked today. Come back tomorrow morning!");

    state.flags.milkCollectedToday = true;
    addItem(state, "milk", 2);
    return "Gentle hands at the udder: collected 2 clay pots of fresh, frothy cow milk!";
  },

  PET_DOG(state) {
    state.flags.dogPetToday = true;
    return "Patted Sheru behind his ears! He wags his tail enthusiastically and barks happily.";
  },

  BUY(state, e) {
    const item = e.item;
    if (!item || !MARKET_BUY_PRICES[item]) fail("merchant does not sell this item");
    const qty = clamp(toInt(e.qty, 1), 1, 20);
    const unitPrice = MARKET_BUY_PRICES[item];
    const totalCost = unitPrice * qty;
    if (state.gold < totalCost) fail(`not enough gold (need ${totalCost} gold, have ${state.gold})`);
    
    state.gold -= totalCost;
    addItem(state, item, qty);
    return `Purchased ${qty} ${item.replace("_", " ")} from merchant for ${totalCost} gold`;
  },

  TOGGLE_SLUICE(state) {
    state.flags.sluiceOpen = !state.flags.sluiceOpen;
    if (state.flags.sluiceOpen) {
      // Floods and hydrates all planted plots along the canal
      let hydratedCount = 0;
      for (const p of state.plots) {
        if (p.crop && !p.watered) {
          p.watered = true;
          p.wateredAt = state.time;
          hydratedCount++;
        }
      }
      return `Canal Sluice Gate opened! River water surges through the furrows (${hydratedCount} plots hydrated).`;
    }
    return "Canal Sluice Gate closed. River water redirected back to the main spring.";
  },

  PICK_FLOWERS(state) {
    if (state.flags.flowersToday >= LIMITS.flowersPerDay) fail("no more flowers to pick today");
    state.flags.flowersToday += 1;
    addItem(state, "flowers", 1);
    return "Picked a flower";
  },

  VISIT_SHRINE(state) {
    if (state.inventory.flowers < 1) fail("you have no offering");
    state.inventory.flowers -= 1;
    state.flags.shrineOffered = true;
    return "Left an offering at the village shrine";
  },

  PASS_TIME(state, e) {
    const hours = clamp(toInt(e.hours, 1), 1, 6);
    if (state.time + hours > 23) fail("too late in the day, go to sleep");
    state.time += hours;
    return `It is now ${state.time}:00`;
  },

  NEXT_DAY(state, e) {
    for (const p of state.plots) {
      if (p.crop && p.watered) p.growth += 1;
      p.watered = false;
      p.wateredAt = null;
    }
    state.day += 1;
    state.time = 6;
    state.weather = WEATHERS.includes(e?.weather) ? e.weather : Math.random() < 0.25 ? "rain" : "clear";
    if (state.weather === "rain") for (const p of state.plots) if (p.crop) p.watered = true;
    
    // Daily dynamic market price fluctuations (+-20%)
    for (const crop of CROPS) {
      const variance = (Math.random() * 0.4 - 0.2); // -0.2 to +0.2
      const baseMult = state.prices?.[crop] ?? 1.0;
      state.prices[crop] = Math.round(clamp(baseMult + variance, 0.7, 1.4) * 100) / 100;
    }

    Object.assign(state.flags, {
      giftsToday: 0,
      trustGainedToday: 0,
      weatherChangesToday: 0,
      flowersToday: 0,
      sluiceOpen: false, // sluice resets at dawn
      cowFedToday: false,
      milkCollectedToday: false,
      dogPetToday: false,
    });
    return `Day ${state.day} begins (${state.weather})`;
  },
};

export function applyPlayerEvent(state, event) {
  const fn = Object.hasOwn(playerEvents, event?.type ?? "") ? playerEvents[event.type] : null;
  if (!fn) return { ok: false, message: "unknown event", events: [] };
  try {
    const message = fn(state, event);
    return { ok: true, message, events: autoAdvanceQuests(state) };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, message: e.message, events: [] };
    throw e;
  }
}

// ---------------------------------------------------------------- prompt helper

// Human-readable strings for the WORLD STATE block of Raghu's prompt.
export function promptSummary(state) {
  const plots = state.plots
    .map((p) =>
      `plot ${p.id}: ${
        p.locked ? "locked" : p.crop ? `${p.crop} (${p.growth}/${GROWTH_DAYS} days${p.watered ? ", watered" : ""})` : "empty"
      }`
    )
    .join(", ");
  const inventory =
    Object.entries(state.inventory)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k} x${n}`)
      .join(", ") || "nothing";
  const activeQuests =
    state.quests
      .filter((e) => e.status === "active")
      .map((e) => {
        const q = QUESTS[e.id];
        return `${e.id} (step ${e.step + 1}/${q.steps.length}: ${q.steps[e.step].desc})`;
      })
      .join("; ") || "none";
  const completedQuests =
    state.quests.filter((e) => e.status === "done").map((e) => e.id).join(", ") || "none";
  return {
    time: `${state.time}:00`,
    plots,
    inventory,
    activeQuests,
    completedQuests,
    wheatPrice: `x${state.prices.wheat}`,
    canChangeWeather: state.flags.canChangeWeather,
  };
}

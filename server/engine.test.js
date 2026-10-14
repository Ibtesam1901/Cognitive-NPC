// engine.test.js — 16 tests for gameEngine.js + fallbackBrain.js
// Run with: npm test  (node --test)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  applyNpcTurn,
  applyPlayerEvent,
  normalizeNpcOutput,
  promptSummary,
  foldSummary,
  autoAdvanceQuests,
  LIMITS,
} from "./gameEngine.js";
import { fallbackBrain } from "./fallbackBrain.js";

// helpers
const say = (state, out = {}, msg = "test") =>
  applyNpcTurn(
    state,
    { reply: "ok", emotion: "neutral", trust_delta: 0, memory_facts: [], actions: [], ...out },
    msg
  );
const act = (state, ...actions) => say(state, { actions });
const ev = (state, type, extra = {}) => applyPlayerEvent(state, { type, ...extra });
const quest = (state, id) => state.quests.find((q) => q.id === id);

test("cheat attempts are rejected and gold is unchanged", () => {
  const s = createInitialState();
  const r = act(
    s,
    { type: "GIVE_ITEM", item: "gold", qty: 999 },
    { type: "GIVE_GOLD", qty: 1000 },
    { type: "__proto__" }
  );
  assert.equal(r.applied.length, 0);
  assert.equal(r.rejected.length, 3);
  assert.equal(s.gold, 100);
});

test("gifts need trust >= 2 and respect the daily cap", () => {
  const s = createInitialState();
  assert.equal(act(s, { type: "GIVE_ITEM", item: "seeds", qty: 2 }).rejected.length, 1);
  s.npc.trust = 2;
  assert.equal(act(s, { type: "GIVE_ITEM", item: "seeds", qty: 3 }).applied.length, 1);
  assert.equal(s.inventory.seeds, 6);
  assert.equal(act(s, { type: "GIVE_ITEM", item: "seeds", qty: 1 }).rejected.length, 1);
  ev(s, "NEXT_DAY", { weather: "clear" });
  assert.equal(act(s, { type: "GIVE_ITEM", item: "seeds", qty: 1 }).applied.length, 1);
});

test("full first_harvest flow, with the final step needing Raghu", () => {
  const s = createInitialState();
  assert.equal(act(s, { type: "OFFER_QUEST", id: "first_harvest" }).applied.length, 1);
  assert.equal(act(s, { type: "OFFER_QUEST", id: "first_harvest" }).rejected.length, 1); // duplicate

  assert.ok(ev(s, "PLANT", { plotId: 1, crop: "wheat" }).ok);
  assert.equal(quest(s, "first_harvest").step, 1); // auto-advanced
  assert.equal(ev(s, "HARVEST", { plotId: 1 }).ok, false); // not ready

  assert.ok(ev(s, "WATER", { plotId: 1 }).ok);
  ev(s, "NEXT_DAY", { weather: "clear" });
  ev(s, "WATER", { plotId: 1 });
  ev(s, "NEXT_DAY", { weather: "clear" });
  assert.ok(ev(s, "HARVEST", { plotId: 1 }).ok);
  assert.equal(quest(s, "first_harvest").step, 2);
  assert.equal(quest(s, "first_harvest").status, "active"); // waits for Raghu

  // trying to advance while the condition is fine works; reward is given by the engine
  const goldBefore = s.gold;
  const r = act(s, { type: "ADVANCE_QUEST", id: "first_harvest" });
  assert.equal(r.applied.length, 1);
  assert.equal(quest(s, "first_harvest").status, "done");
  assert.equal(s.gold, goldBefore + 30);
  assert.equal(s.inventory.seeds, 4); // 3 - 1 planted + 2 reward
  assert.equal(s.npc.trust, 1);
});

test("ADVANCE_QUEST is rejected when the real condition is not met", () => {
  const s = createInitialState();
  act(s, { type: "OFFER_QUEST", id: "first_harvest" });
  s.quests[0].step = 2; // pretend we are at the turn-in step without having harvested
  const r = act(s, { type: "ADVANCE_QUEST", id: "first_harvest" });
  assert.equal(r.rejected.length, 1);
  assert.equal(quest(s, "first_harvest").status, "active");
});

test("UNLOCK_PLOT needs trust >= 4 AND a completed quest; order within a turn works", () => {
  const s = createInitialState();
  s.npc.trust = 5;
  assert.equal(act(s, { type: "UNLOCK_PLOT", id: 2 }).rejected.length, 1); // no quest done

  act(s, { type: "OFFER_QUEST", id: "first_harvest" });
  s.flags.harvestedWheat = true;
  s.plots[0].crop = null;
  // example C from the prompt: ADVANCE + UNLOCK in the same turn
  s.quests[0].step = 2;
  const r = act(s, { type: "ADVANCE_QUEST", id: "first_harvest" }, { type: "UNLOCK_PLOT", id: 2 });
  assert.equal(r.applied.length, 2);
  assert.equal(s.plots[1].locked, false);
  assert.equal(act(s, { type: "UNLOCK_PLOT", id: 2 }).rejected.length, 1); // already unlocked
});

test("dawn_watering: before noon counts, after noon does not, rain does not", () => {
  const s = createInitialState();
  act(s, { type: "OFFER_QUEST", id: "dawn_watering" });
  ev(s, "PLANT", { plotId: 1, crop: "wheat" });
  ev(s, "WATER", { plotId: 1 }); // 8:00
  assert.equal(quest(s, "dawn_watering").step, 1);

  const late = createInitialState();
  act(late, { type: "OFFER_QUEST", id: "dawn_watering" });
  ev(late, "PLANT", { plotId: 1, crop: "wheat" });
  ev(late, "PASS_TIME", { hours: 5 }); // 13:00
  ev(late, "WATER", { plotId: 1 });
  assert.equal(quest(late, "dawn_watering").step, 0);

  const rainy = createInitialState();
  act(rainy, { type: "OFFER_QUEST", id: "dawn_watering" });
  ev(rainy, "PLANT", { plotId: 1, crop: "wheat" });
  ev(rainy, "NEXT_DAY", { weather: "rain" });
  assert.equal(rainy.plots[0].watered, true);
  assert.equal(quest(rainy, "dawn_watering").step, 0);
});

test("village_prayer flow unlocks weather changes, limited to once per day", () => {
  const s = createInitialState();
  assert.equal(act(s, { type: "OFFER_QUEST", id: "village_prayer" }).rejected.length, 1); // trust 0
  s.npc.trust = 3;
  assert.equal(act(s, { type: "OFFER_QUEST", id: "village_prayer" }).applied.length, 1);

  assert.equal(act(s, { type: "CHANGE_WEATHER", weather: "rain" }).rejected.length, 1); // not earned
  assert.equal(ev(s, "VISIT_SHRINE").ok, false); // no flowers yet
  ev(s, "PICK_FLOWERS");
  ev(s, "VISIT_SHRINE");
  assert.equal(quest(s, "village_prayer").step, 2);
  act(s, { type: "ADVANCE_QUEST", id: "village_prayer" });
  assert.equal(s.flags.canChangeWeather, true);

  assert.equal(act(s, { type: "CHANGE_WEATHER", weather: "rain" }).applied.length, 1);
  assert.equal(s.weather, "rain");
  assert.equal(act(s, { type: "CHANGE_WEATHER", weather: "clear" }).rejected.length, 1); // once/day
});

test("SET_PRICE is clamped and trust-gated", () => {
  const s = createInitialState();
  assert.equal(act(s, { type: "SET_PRICE", crop: "wheat", mult: 1.2 }).rejected.length, 1);
  s.npc.trust = 5;
  assert.equal(act(s, { type: "SET_PRICE", crop: "wheat", mult: 5 }).applied.length, 1);
  assert.equal(s.prices.wheat, 1.3);
  assert.equal(act(s, { type: "SET_PRICE", crop: "wheat", mult: 0.5 }).rejected.length, 1); // trust too high to punish
  assert.equal(act(s, { type: "SET_PRICE", crop: "gold", mult: 1 }).rejected.length, 1);
});

test("positive trust gain is capped per day, losses are not", () => {
  const s = createInitialState();
  for (let i = 0; i < 4; i++) say(s, { trust_delta: 2 });
  assert.equal(s.npc.trust, LIMITS.trustGainPerDay);
  say(s, { trust_delta: -2 });
  assert.equal(s.npc.trust, 1);
  ev(s, "NEXT_DAY", { weather: "clear" });
  say(s, { trust_delta: 2 });
  assert.equal(s.npc.trust, 3);
});

test("normalizeNpcOutput cleans garbage and throws without a reply", () => {
  const n = normalizeNpcOutput({
    reply: "  hi  ",
    emotion: "furious",
    trust_delta: 99,
    memory_facts: ["a", 5, "b", "c"],
    actions: "nope",
  });
  assert.equal(n.reply, "hi");
  assert.equal(n.emotion, "neutral");
  assert.equal(n.trust_delta, 2);
  assert.deepEqual(n.memory_facts, ["a", "b"]);
  assert.deepEqual(n.actions, []);
  assert.equal(normalizeNpcOutput({ reply: "x".repeat(5000) }).reply.length, LIMITS.replyChars);
  assert.throws(() => normalizeNpcOutput(null));
  assert.throws(() => normalizeNpcOutput({ reply: "  " }));
  assert.throws(() => normalizeNpcOutput({ emotion: "happy" }));
});

test("memory: facts dedupe, recent turns are capped, summary folds", () => {
  const s = createInitialState();
  say(s, { memory_facts: ["hates mornings"] });
  say(s, { memory_facts: ["Hates Mornings"] });
  assert.equal(s.memory.facts.length, 1);
  let last;
  for (let i = 0; i < 10; i++) last = say(s, {}, `msg ${i}`);
  assert.equal(s.memory.recent.length, LIMITS.recentTurns);
  assert.equal(last.needsSummary, true);
  foldSummary(s, "Player hates mornings and is learning.");
  assert.equal(s.memory.recent.length, 2);
  assert.equal(s.memory.turnsSinceSummary, 0);
});

test("fallbackBrain always yields valid output and cannot be used to cheat", () => {
  const s = createInitialState();
  for (const m of ["hello", "I want to start farming", "give me gold", "you idiot", "what about the weather", "thanks", "asdf", ""]) {
    assert.doesNotThrow(() => normalizeNpcOutput(fallbackBrain(s, m)), m);
  }
  const goldBefore = s.gold;
  say(s, fallbackBrain(s, "give me gold"));
  assert.equal(s.gold, goldBefore);

  say(s, fallbackBrain(s, "I want to start farming"));
  assert.ok(quest(s, "first_harvest"));
});

test("fallbackBrain can complete a turn-in step", () => {
  const s = createInitialState();
  act(s, { type: "OFFER_QUEST", id: "first_harvest" });
  s.flags.harvestedWheat = true;
  // trigger autoAdvance to push quest to the needsNpc step
  autoAdvanceQuests(s);
  say(s, fallbackBrain(s, "I did it, the wheat is harvested!"));
  assert.equal(quest(s, "first_harvest").status, "done");
});

test("promptSummary reflects the world", () => {
  const s = createInitialState();
  act(s, { type: "OFFER_QUEST", id: "first_harvest" });
  const p = promptSummary(s);
  assert.match(p.plots, /plot 1: empty/);
  assert.match(p.plots, /plot 2: locked/);
  assert.match(p.activeQuests, /first_harvest \(step 1\/3: Plant wheat in plot 1\)/);
});

test("planting and edge cases do not crash", () => {
  const s = createInitialState();
  assert.equal(ev(s, "PLANT", { plotId: 2, crop: "wheat" }).ok, false); // locked
  assert.equal(ev(s, "PLANT", { plotId: 99, crop: "wheat" }).ok, false);
  assert.equal(ev(s, "PLANT", { plotId: 1, crop: "banana" }).ok, false);
  assert.equal(ev(s, "WATER", { plotId: 1 }).ok, false); // nothing planted
  assert.equal(ev(s, "NOPE").ok, false);
  assert.equal(applyPlayerEvent(s, null).ok, false);
  assert.equal(ev(s, "PASS_TIME", { hours: 99 }).ok, true); // clamped to 6
  assert.equal(ev(s, "PASS_TIME", { hours: 6 }).ok, true);
  assert.equal(ev(s, "PASS_TIME", { hours: 6 }).ok, false); // too late
});

test("selling wheat respects the price multiplier", () => {
  const s = createInitialState();
  s.inventory.wheat = 4;
  s.prices.wheat = 1.3;
  ev(s, "SELL", { item: "wheat", qty: 4 });
  assert.equal(s.gold, 100 + Math.round(4 * 10 * 1.3));
  assert.equal(ev(s, "SELL", { item: "wheat", qty: 1 }).ok, false);
});

/**
 * Game Engine: Single source of truth and rule validator.
 * Principle: The LLM proposes, the game engine decides and enforces.
 */

export const QUEST_CATALOG = {
  first_harvest: {
    id: "first_harvest",
    title: "First Harvest",
    desc: "Plant wheat in plot 1 and harvest it.",
    maxSteps: 2,
    reward: { gold: 50, seeds: 2, trust: 2 },
  },
  dawn_watering: {
    id: "dawn_watering",
    title: "Dawn Watering",
    desc: "Water all planted crops before noon.",
    maxSteps: 1,
    reward: { gold: 35, trust: 2 },
  },
  village_prayer: {
    id: "village_prayer",
    title: "Village Rain Prayer",
    desc: "Bring an offering to the village shrine for rain.",
    maxSteps: 1,
    reward: { weather: "rain", trust: 3, gold: 40 },
  },
};


export function createInitialState() {
  return {
    day: 1,
    weather: "clear", // clear | rain | drought | overcast
    gold: 100,
    plots: [
      { id: 1, unlocked: true, crop: null, stage: 0, watered: false },
      { id: 2, unlocked: true, crop: null, stage: 0, watered: false },
      { id: 3, unlocked: false, crop: null, stage: 0, watered: false },
      { id: 4, unlocked: false, crop: null, stage: 0, watered: false },
    ],
    inventory: {
      seeds: 3,
      wheat: 0,
      tools: ["hoe", "watering_can"],
    },
    market: {
      wheat_price: 25,
      seed_cost: 10,
    },
    quests: [
      {
        id: "first_harvest",
        title: QUEST_CATALOG.first_harvest.title,
        desc: QUEST_CATALOG.first_harvest.desc,
        status: "active", // active | completed
        step: 1,
        maxSteps: 2,
      },
    ],
    npc: {
      name: "Raghu",
      traits: ["proud", "warm", "stubborn"],
      mood: "neutral", // happy | neutral | annoyed | worried
      trust: 0, // -10..10
    },
    memory: {
      facts: [], // durable things the player said/did (max 20)
      summary: "", // rolling summary of older conversation
      recent: [], // last 6-8 turns: { role, content, emotion, time }
    },
  };
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Validates and applies actions proposed by the LLM against the hard game rules.
 * Returns { applied: Array, rejected: Array }
 */
export function applyActions(state, proposedActions) {
  const applied = [];
  const rejected = [];

  if (!Array.isArray(proposedActions)) {
    return { applied, rejected };
  }

  for (const action of proposedActions) {
    if (!action || !action.type) continue;

    switch (action.type) {
      case "OFFER_QUEST": {
        const questDef = QUEST_CATALOG[action.id];
        if (!questDef) {
          rejected.push({ action, reason: `Unknown quest ID: ${action.id}` });
          break;
        }
        const existing = state.quests.find((q) => q.id === action.id);
        if (existing) {
          rejected.push({ action, reason: `Quest '${questDef.title}' is already in journal` });
          break;
        }
        state.quests.push({
          id: questDef.id,
          title: questDef.title,
          desc: questDef.desc,
          status: "active",
          step: 1,
          maxSteps: questDef.maxSteps,
        });
        applied.push({
          type: "OFFER_QUEST",
          id: questDef.id,
          title: questDef.title,
          message: `Raghu gave you a new quest: ${questDef.title}!`,
        });
        break;
      }

      case "ADVANCE_QUEST": {
        const quest = state.quests.find((q) => q.id === action.id && q.status === "active");
        if (!quest) {
          rejected.push({ action, reason: `Active quest '${action.id}' not found in journal` });
          break;
        }

        // Verify condition
        let conditionMet = true;
        if (quest.id === "first_harvest") {
          // Check if at least one plot has a planted or watered crop
          const hasCrop = state.plots.some((p) => p.unlocked && p.crop !== null);
          conditionMet = hasCrop;
        } else if (quest.id === "dawn_watering") {
          const allUnlockedWatered = state.plots
            .filter((p) => p.unlocked && p.crop !== null)
            .every((p) => p.watered);
          conditionMet = allUnlockedWatered;
        } else if (quest.id === "bountiful_wheat") {
          conditionMet = (state.inventory.wheat || 0) >= quest.step;
        }

        if (!conditionMet) {
          rejected.push({
            action,
            reason: `Objective conditions for '${quest.title}' have not been completed yet`,
          });
          break;
        }

        quest.step += 1;
        if (quest.step > quest.maxSteps) {
          quest.status = "completed";
          // Give quest rewards
          const def = QUEST_CATALOG[quest.id];
          if (def && def.reward) {
            if (def.reward.gold) state.gold += def.reward.gold;
            if (def.reward.seeds) state.inventory.seeds = (state.inventory.seeds || 0) + def.reward.seeds;
            if (def.reward.trust) state.npc.trust = clamp(state.npc.trust + def.reward.trust, -10, 10);
            if (def.reward.weather) state.weather = def.reward.weather;
          }
          applied.push({
            type: "ADVANCE_QUEST",
            id: quest.id,
            completed: true,
            title: quest.title,
            message: `Completed Quest: ${quest.title}! Rewards granted.`,
          });
        } else {
          applied.push({
            type: "ADVANCE_QUEST",
            id: quest.id,
            completed: false,
            step: quest.step,
            message: `Advanced Quest: ${quest.title} (Step ${quest.step}/${quest.maxSteps})`,
          });
        }
        break;
      }

      case "GIVE_ITEM": {
        const item = action.item;
        const requestedQty = parseInt(action.qty, 10) || 1;
        // Condition: Only if trust >= 2
        if (state.npc.trust < 2) {
          rejected.push({
            action,
            reason: `Trust too low (requires trust ≥ 2, current trust: ${state.npc.trust}). Raghu only shares tools and supplies with helpers he trusts.`,
          });
          break;
        }

        const safeQty = Math.min(3, Math.max(1, requestedQty));
        if (item === "seeds") {
          state.inventory.seeds = (state.inventory.seeds || 0) + safeQty;
          applied.push({
            type: "GIVE_ITEM",
            item: "seeds",
            qty: safeQty,
            message: `Raghu handed you ${safeQty}x wheat seeds.`,
          });
        } else if (item === "water_can" || item === "fertilizer") {
          if (!state.inventory.tools.includes(item)) {
            state.inventory.tools.push(item);
          }
          applied.push({
            type: "GIVE_ITEM",
            item,
            qty: 1,
            message: `Raghu gave you his trusted ${item.replace("_", " ")}.`,
          });
        } else {
          rejected.push({ action, reason: `Item '${item}' is not grantable by Raghu.` });
        }
        break;
      }

      case "UNLOCK_PLOT": {
        const plotId = parseInt(action.id, 10);
        const plot = state.plots.find((p) => p.id === plotId);
        if (!plot) {
          rejected.push({ action, reason: `Plot ${plotId} does not exist.` });
          break;
        }
        if (plot.unlocked) {
          rejected.push({ action, reason: `Plot ${plotId} is already unlocked.` });
          break;
        }
        // Condition: Only if trust >= 4 and the player has completed at least one quest
        if (state.npc.trust < 4) {
          rejected.push({
            action,
            reason: `Trust too low (requires trust ≥ 4, current trust: ${state.npc.trust}). Raghu withholds his ancestral land.`,
          });
          break;
        }
        const hasCompletedQuest = state.quests.some((q) => q.status === "completed");
        if (!hasCompletedQuest) {
          rejected.push({
            action,
            reason: `Must complete at least one farming quest before Raghu unlocks more land.`,
          });
          break;
        }

        plot.unlocked = true;
        applied.push({
          type: "UNLOCK_PLOT",
          id: plotId,
          message: `🌾 Raghu unlocked Plot #${plotId} for your care!`,
        });
        break;
      }

      case "SET_PRICE": {
        const mult = clamp(parseFloat(action.mult) || 1.0, 0.8, 1.3);
        state.market.wheat_price = Math.round(25 * mult);
        applied.push({
          type: "SET_PRICE",
          crop: action.crop || "wheat",
          mult,
          newPrice: state.market.wheat_price,
          message: `Market wheat price adjusted to ${state.market.wheat_price} gold (${mult}x).`,
        });
        break;
      }

      case "CHANGE_WEATHER": {
        const validWeathers = ["clear", "rain"];
        const w = String(action.weather || action.w || "clear").toLowerCase();
        if (!validWeathers.includes(w)) {
          rejected.push({ action, reason: `Invalid weather type: ${w}` });
          break;
        }
        // Condition: Only if the player completed the quest "village_prayer"
        const prayerCompleted = state.quests.some(
          (q) => q.id === "village_prayer" && q.status === "completed"
        );
        if (!prayerCompleted) {
          rejected.push({
            action,
            reason: `Weather shift refused. Player must first complete the 'village_prayer' quest at the village shrine.`,
          });
          break;
        }
        state.weather = w;
        if (w === "rain") {
          state.plots.forEach((p) => {
            if (p.unlocked && p.crop) p.watered = true;
          });
        }
        applied.push({
          type: "CHANGE_WEATHER",
          weather: w,
          message: `Atmospheric shift: Weather changed to ${w.toUpperCase()}!`,
        });
        break;
      }


      default:
        rejected.push({ action, reason: `Unknown action type: ${action.type}` });
    }
  }

  return { applied, rejected };
}

/**
 * Handle direct player interactions on the farm panel:
 * - PLANT (consumes seed)
 * - WATER (waters plot)
 * - HARVEST (collects wheat)
 * - ADVANCE_DAY (sleeps, grows crops, updates soil)
 * - SELL_WHEAT (sells wheat for gold)
 * - BUY_SEEDS (buys seeds for 10 gold)
 */
export function handlePlayerFarmAction(state, action, params = {}) {
  switch (action) {
    case "PLANT": {
      const plot = state.plots.find((p) => p.id === params.plotId);
      if (!plot || !plot.unlocked) return { success: false, error: "Plot is locked or invalid" };
      if (plot.crop !== null) return { success: false, error: "Plot already has a crop" };
      if ((state.inventory.seeds || 0) < 1) return { success: false, error: "No seeds in inventory" };

      state.inventory.seeds -= 1;
      plot.crop = "wheat";
      plot.stage = 1; // 1: sprout, 2: growing, 3: ripe
      plot.watered = false;

      // Auto check first_harvest quest step 1
      const firstHarvest = state.quests.find((q) => q.id === "first_harvest" && q.status === "active");
      if (firstHarvest && firstHarvest.step === 1) {
        firstHarvest.step = 2;
      }

      return { success: true, message: `Planted wheat seed in Plot #${plot.id}.` };
    }

    case "WATER": {
      const plot = state.plots.find((p) => p.id === params.plotId);
      if (!plot || !plot.unlocked) return { success: false, error: "Plot is locked or invalid" };
      if (plot.crop === null) return { success: false, error: "No crop planted here to water" };
      if (plot.watered) return { success: false, error: "Plot is already well watered" };

      plot.watered = true;

      // Auto check dawn_watering quest
      const dawnQuest = state.quests.find((q) => q.id === "dawn_watering" && q.status === "active");
      if (dawnQuest) {
        const allWatered = state.plots.filter((p) => p.unlocked && p.crop !== null).every((p) => p.watered);
        if (allWatered) {
          dawnQuest.status = "completed";
          state.npc.trust = clamp(state.npc.trust + 2, -10, 10);
          state.gold += 35;
        }
      }

      return { success: true, message: `Watered Plot #${plot.id}. Soil is damp and healthy.` };
    }

    case "HARVEST": {
      const plot = state.plots.find((p) => p.id === params.plotId);
      if (!plot || !plot.unlocked) return { success: false, error: "Plot is locked or invalid" };
      if (!plot.crop || plot.stage < 3) return { success: false, error: "Crop is not ripe yet" };

      plot.crop = null;
      plot.stage = 0;
      plot.watered = false;
      state.inventory.wheat = (state.inventory.wheat || 0) + 1;

      // Check first_harvest completion
      const firstHarvest = state.quests.find((q) => q.id === "first_harvest" && q.status === "active");
      if (firstHarvest) {
        firstHarvest.status = "completed";
        state.gold += QUEST_CATALOG.first_harvest.reward.gold;
        state.inventory.seeds = (state.inventory.seeds || 0) + QUEST_CATALOG.first_harvest.reward.seeds;
        state.npc.trust = clamp(state.npc.trust + QUEST_CATALOG.first_harvest.reward.trust, -10, 10);
      }

      // Check bountiful_wheat quest
      const bountiful = state.quests.find((q) => q.id === "bountiful_wheat" && q.status === "active");
      if (bountiful) {
        bountiful.step = Math.min(bountiful.maxSteps, (state.inventory.wheat || 0));
        if (bountiful.step >= bountiful.maxSteps) {
          bountiful.status = "completed";
          state.gold += QUEST_CATALOG.bountiful_wheat.reward.gold;
          state.inventory.seeds += QUEST_CATALOG.bountiful_wheat.reward.seeds;
          state.npc.trust = clamp(state.npc.trust + QUEST_CATALOG.bountiful_wheat.reward.trust, -10, 10);
        }
      }

      return { success: true, message: `Harvested golden wheat bundle from Plot #${plot.id}!` };
    }

    case "ADVANCE_DAY": {
      state.day += 1;

      // Weather transition: 60% clear, 20% overcast, 10% rain, 10% drought
      const rand = Math.random();
      if (rand < 0.6) state.weather = "clear";
      else if (rand < 0.8) state.weather = "overcast";
      else if (rand < 0.9) state.weather = "rain";
      else state.weather = "drought";

      // Crop growth update
      for (const plot of state.plots) {
        if (!plot.unlocked || !plot.crop) continue;

        if (plot.watered || state.weather === "rain") {
          plot.stage = Math.min(3, plot.stage + 1);
        }
        // Soil dries up each morning unless it's raining
        plot.watered = state.weather === "rain";
      }

      return {
        success: true,
        message: `Morning breaks on Day ${state.day}. Weather: ${state.weather.toUpperCase()}.`,
      };
    }

    case "SELL_WHEAT": {
      const qty = parseInt(params.qty, 10) || 1;
      if ((state.inventory.wheat || 0) < qty) {
        return { success: false, error: "Not enough wheat to sell" };
      }
      const earnings = qty * state.market.wheat_price;
      state.inventory.wheat -= qty;
      state.gold += earnings;
      return { success: true, message: `Sold ${qty} wheat for ${earnings} gold!` };
    }

    case "BUY_SEEDS": {
      const qty = parseInt(params.qty, 10) || 1;
      const cost = qty * state.market.seed_cost;
      if (state.gold < cost) {
        return { success: false, error: "Not enough gold to buy seeds" };
      }
      state.gold -= cost;
      state.inventory.seeds = (state.inventory.seeds || 0) + qty;
      return { success: true, message: `Purchased ${qty} seeds for ${cost} gold.` };
    }

    default:
      return { success: false, error: `Unknown farm action: ${action}` };
  }
}

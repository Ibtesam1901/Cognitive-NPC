/**
 * gameState.js
 * Central persistent game state manager for Bhima's Hollow.
 * Restores and synchronizes game state from localStorage with fail-safes.
 */

const STORAGE_KEY = "bhima_hollow_game_save_v3";

export const INITIAL_GAME_STATE = {
  day: 1,
  time: 8,
  weather: "clear", // 'clear' | 'rain' | 'drought' | 'overcast'
  gold: 100,
  inventory: {
    seeds: 3,
    rice_seeds: 2,
    cane_cuttings: 1,
    marigold_seeds: 2,
    wheat: 0,
    rice: 0,
    sugarcane: 0,
    marigold: 0,
    water_can: 1,
    fertilizer: 1,
    flowers: 0,
  },
  prices: {
    wheat: 1.0,
    rice: 1.0,
    sugarcane: 1.0,
    marigold: 1.0,
  },
  plots: [
    { id: 1, locked: false, crop: null, growth: 0, watered: false },
    { id: 2, locked: true, crop: null, growth: 0, watered: false },
    { id: 3, locked: true, crop: null, growth: 0, watered: false },
    { id: 4, locked: true, crop: null, growth: 0, watered: false },
    { id: 5, locked: true, crop: null, growth: 0, watered: false },
    { id: 6, locked: true, crop: null, growth: 0, watered: false },
  ],
  quests: [
    {
      id: "first_harvest",
      title: "First Harvest",
      desc: "Plant wheat seeds in Plot #1, nurture them with water, and talk to Raghu when ripe.",
      currentStep: 0,
      steps: [
        "Plant wheat in Plot #1",
        "Water the crop",
        "Harvest golden wheat",
        "Speak with Raghu",
      ],
      completed: false,
    },
    {
      id: "dawn_watering",
      title: "Dawn Watering",
      desc: "Rise early and water your crops by hand before noon.",
      currentStep: 0,
      steps: ["Water crops before 12:00", "Report to Raghu"],
      completed: false,
    },
    {
      id: "village_prayer",
      title: "Village Prayer",
      desc: "Gather wildflowers and place an offering at the village shrine (needs Trust >= 3).",
      currentStep: 0,
      steps: ["Earn Raghu's trust (3+)", "Pick wildflowers", "Leave offering at shrine", "Tell Raghu"],
      completed: false,
    },
  ],
  npc: {
    trust: 0, // -10 to 10
    mood: "neutral", // 'happy' | 'neutral' | 'annoyed' | 'worried' | 'proud'
  },
  memory: {
    facts: ["Player arrived in Bhima's Hollow during the drought."],
    summary: "A newcomer has stepped forward to help restore Bhima's Hollow under Raghu's guidance.",
  },
  flags: {
    banyan_story_unlocked: false,
    found_collectibles: [], // IDs of found hidden collectibles (max 5)
    secret_area_found: false,
    last_well_draw_time: 0,
    daily_trust_gained: 0,
  },
  prices: {
    wheat: 1.0,
  },
};

/**
 * Load game state from localStorage or fallback to default
 */
export function loadGameState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_GAME_STATE;
    const parsed = JSON.parse(raw);
    
    // Ensure all 6 plots are present
    const mergedPlots = INITIAL_GAME_STATE.plots.map((initP) => {
      const savedP = (parsed.plots || []).find((p) => p.id === initP.id);
      return savedP ? { ...initP, ...savedP } : initP;
    });

    return {
      ...INITIAL_GAME_STATE,
      ...parsed,
      plots: mergedPlots,
      inventory: { ...INITIAL_GAME_STATE.inventory, ...(parsed.inventory || {}) },
      prices: { ...INITIAL_GAME_STATE.prices, ...(parsed.prices || {}) },
      npc: { ...INITIAL_GAME_STATE.npc, ...(parsed.npc || {}) },
      flags: { ...INITIAL_GAME_STATE.flags, ...(parsed.flags || {}) },
      memory: { ...INITIAL_GAME_STATE.memory, ...(parsed.memory || {}) },
    };
  } catch (err) {
    console.warn("Failed to load saved game state, starting fresh:", err);
    return INITIAL_GAME_STATE;
  }
}

/**
 * Save game state to localStorage
 */
export function saveGameState(state) {
  try {
    if (!state) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to save game state to localStorage:", err);
  }
}

/**
 * Reset game save
 */
export function clearGameSave() {
  localStorage.removeItem(STORAGE_KEY);
}

export const NPC = {
  name: "Raghu",
  persona: `You are Raghu, a 62-year-old farmer in a small Indian village. You are gruff, proud and worried because your farm is failing. You distrust strangers at first and warm up very slowly. You speak in short, earthy sentences. At trust 3 or higher you may occasionally say "beta" or "arre".`,
};

export const QUESTS = {
  find_cow: {
    title: "Find Lakshmi the cow",
    minTrust: 2,
    flag: "found_cow",
    hint: "She wandered off toward the north field near the dry canal.",
  },
  fix_pump: {
    title: "Repair the irrigation pump",
    minTrust: 4,
    flag: "pump_repaired",
    hint: "The old diesel pump valve is jammed shut. Crops won't survive without water.",
  },
};

export const ITEMS = ["seeds", "old_map"];

// Things the player does in the WORLD (buttons in the UI), not by talking.
export const WORLD_ACTIONS = {
  search_north_field: {
    requiresQuest: "find_cow",
    setFlag: "found_cow",
    text: "You search the dusty north field and find Lakshmi grazing safely by the dried stream.",
  },
  repair_pump: {
    requiresQuest: "fix_pump",
    setFlag: "pump_repaired",
    text: "You tighten the valve and clear the sediment. The pump sputters back to life, churning cool water into the trenches!",
  },
};

export const newState = () => ({
  trust: 0,
  mood: "wary",
  quests: { find_cow: "locked", fix_pump: "locked" }, // locked | active | done
  flags: {},
  inventory: [],
  facts: [],
  promises: [],
  farmHealth: 20,
  summary: "",
  history: [],
  lastEvent: null,
});

export const publicState = (s) => ({
  trust: s.trust,
  mood: s.mood,
  quests: Object.entries(QUESTS).map(([id, q]) => ({
    id,
    title: q.title,
    status: s.quests[id],
    minTrust: q.minTrust,
    hint: q.hint,
    flagCompleted: !!s.flags[q.flag],
  })),
  inventory: s.inventory,
  facts: s.facts,
  promises: s.promises,
  farmHealth: s.farmHealth,
  summary: s.summary,
  turnCount: Math.floor(s.history.length / 2),
});

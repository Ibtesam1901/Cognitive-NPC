export const NPC = {
  name: "Raghu",
  persona: `You are Raghu, a 62-year-old farmer in a small Indian village called Bhima's Hollow. You are gruff, proud and worried because your farm is failing under drought. You distrust strangers at first and warm up very slowly. You speak in short, earthy sentences. At trust 3 or higher you may occasionally say "beta" or "arre". You are familiar with every stone, well, and rusted bolt on this land.`,
};

export const QUESTS = {
  find_cow: {
    title: "Find Lakshmi the cow",
    minTrust: 2,
    flag: "found_cow",
    hint: "Follow the hoofprint trail on the valley map past the Dead Banyan tree.",
  },
  fix_pump: {
    title: "Repair the irrigation pump",
    minTrust: 4,
    flag: "pump_repaired",
    hint: "Calibrate the 3 rusty valves on the antique pump blueprint to restore water pressure.",
  },
};

export const ITEMS = ["seeds", "old_map"];

export const PUZZLES = {
  pump_valves: {
    id: "pump_valves",
    title: "Irrigation Pump Valve Calibration",
    clue: "Valve A (Intake) needs 30 PSI, Valve B must be set to 'Bypass', and Valve C (Outlet) must be 'Open' to the reservoir.",
    solution: { valveA: 30, valveB: "bypass", valveC: "open" },
    solvedFlag: "pump_repaired",
    successText: "The mechanical valve clicks into place! Diesel ignites with a cough, and cool water surges into the dry irrigation trenches!",
  },
  map_trail: {
    id: "map_trail",
    title: "Bhima's Hollow Trail Deduction",
    clue: "The map riddle says: 'Canal is dry, the land thirsts; a banyan lives, though it die first. Follow the hoofprints where shadows fall...'",
    acceptedAnswers: ["dead banyan tree", "banyan tree", "banyan", "ancient dry well", "well of old secrets", "well"],
    solvedFlag: "found_cow",
    successText: "You trace the hoofprints past the Dead Banyan Tree and find Lakshmi resting in the cool shade of the old stone well!",
  },
  seed_riddle: {
    id: "seed_riddle",
    title: "Raghu's Ancestral Seed Riddle",
    riddleEn: "I sleep buried in dark soil, I drink only tears from the sky, and I offer golden bounty without asking for silver. What am I?",
    riddleHi: "मिट्टी में सोता हूँ, आसमान के आँसू पीता हूँ, और बिना चाँदी माँगे सोने की फसल देता हूँ। बताओ मैं कौन हूँ?",
    acceptedAnswers: ["wheat", "seed", "seeds", "grain", "crop", "gehun", "beej", "गेहूं", "बीज", "फसल"],
    rewardItem: "seeds",
    successText: "Raghu smiles with teary eyes. 'You know the soul of the soil, beta.' He hands you the pouch of heirloom seeds.",
  },
};

// Things the player does in the WORLD
export const WORLD_ACTIONS = {
  search_north_field: {
    requiresQuest: "find_cow",
    setFlag: "found_cow",
    text: "You search the dusty north field and find Lakshmi grazing safely by the dried stream near the Dead Banyan.",
  },
  repair_pump: {
    requiresQuest: "fix_pump",
    setFlag: "pump_repaired",
    text: "You clear the clogged sediment valve and tighten the crankshaft. The pump sputters back to life!",
  },
};

export const newState = () => ({
  trust: 0,
  mood: "wary",
  quests: { find_cow: "locked", fix_pump: "locked" }, // locked | active | done
  flags: {},
  inventory: ["old_map"], // Start with the old map so player can immediately inspect it!
  facts: [],
  promises: [],
  farmHealth: 20,
  summary: "",
  history: [],
  solvedPuzzles: [],
});

export const publicState = (s) => ({
  trust: s?.trust ?? 0,
  mood: s?.mood || "wary",
  quests: Object.entries(QUESTS).map(([id, q]) => ({
    id,
    title: q.title,
    status: s?.quests?.[id] || "locked",
    minTrust: q.minTrust,
    hint: q.hint,
    flagCompleted: !!s?.flags?.[q.flag],
  })),
  inventory: s?.inventory || [],
  facts: s?.facts || [],
  promises: s?.promises || [],
  farmHealth: s?.farmHealth ?? 20,
  summary: s?.summary || "",
  turnCount: Math.floor((s?.history?.length || 0) / 2),
  solvedPuzzles: s?.solvedPuzzles || [],
  flags: s?.flags || {},
});

// questCatalog.js
// Single source of truth for quests. The QUEST CATALOG section of Raghu's
// system prompt must mirror these ids, so update both together.
//
// Step fields:
//   desc     - text shown in the journal and in the prompt
//   check    - (state) => boolean, the REAL condition. The engine runs this,
//              never the LLM.
//   needsNpc - if true, the step only advances when Raghu emits ADVANCE_QUEST
//              (the player must "turn in" the step by talking to him). This is
//              what makes conversation drive progression.
//
// Reward fields: gold, items {name: qty}, trust (+N), flag (state.flags key set true)

export const QUESTS = {
  first_harvest: {
    id: "first_harvest",
    title: "First Harvest",
    summary: "Plant wheat in plot 1, harvest it, and report back to Raghu.",
    minTrust: -10,
    requires: [],
    steps: [
      {
        desc: "Plant wheat in plot 1",
        check: (s) =>
          s.plots.find((p) => p.id === 1)?.crop === "wheat" ||
          s.flags.harvestedWheat,
      },
      { desc: "Harvest the wheat", check: (s) => s.flags.harvestedWheat },
      {
        desc: "Tell Raghu about your harvest",
        needsNpc: true,
        check: (s) => s.flags.harvestedWheat,
      },
    ],
    reward: { gold: 30, items: { seeds: 2 }, trust: 1 },
  },

  dawn_watering: {
    id: "dawn_watering",
    title: "Dawn Watering",
    summary:
      "Water every planted crop by hand before noon. Rain does not count.",
    minTrust: 0,
    requires: [],
    steps: [
      {
        desc: "Water every planted crop by hand before noon",
        check: (s) => {
          const planted = s.plots.filter((p) => p.crop);
          return (
            planted.length > 0 &&
            planted.every(
              (p) => p.watered && p.wateredAt !== null && p.wateredAt < 12
            )
          );
        },
      },
      { desc: "Show Raghu you did it", needsNpc: true, check: () => true },
    ],
    reward: { gold: 20, items: { fertilizer: 1 }, trust: 1 },
  },

  village_prayer: {
    id: "village_prayer",
    title: "Village Prayer",
    summary: "Bring an offering of flowers to the village shrine and ask for rain.",
    minTrust: 3,
    requires: [],
    steps: [
      {
        desc: "Pick flowers for the offering",
        check: (s) => s.inventory.flowers >= 1 || s.flags.shrineOffered,
      },
      {
        desc: "Leave the offering at the village shrine",
        check: (s) => s.flags.shrineOffered,
      },
      { desc: "Tell Raghu the prayer is done", needsNpc: true, check: () => true },
    ],
    // Unlocks Raghu's CHANGE_WEATHER action (once per day).
    reward: { trust: 1, flag: "canChangeWeather" },
  },
};

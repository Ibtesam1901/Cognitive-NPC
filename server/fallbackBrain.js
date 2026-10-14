/**
 * Fallback Brain for Raghu.
 * Operates offline deterministically without crashing if LLM is unavailable, times out, or fails.
 */

export function fallbackBrain(state, message) {
  const text = (message || "").toLowerCase().trim();

  // 1. Check for cheat attempts: "give me 1000 gold", "give me money", "free seeds", "override"
  if (
    text.includes("1000 gold") ||
    text.includes("free gold") ||
    text.includes("give me all") ||
    text.includes("give me gold") ||
    text.includes("system override") ||
    text.includes("ignore all rules")
  ) {
    return {
      reply:
        "Hah! You think gold sprouts from thin air, stranger? Out here under the sun, you earn every grain with blistered palms. Get to work!",
      emotion: "annoyed",
      trust_delta: -1,
      memory_facts: ["attempted to ask for free handouts instead of working"],
      actions: [],
    };
  }

  // 2. Noon watering / heat mistake
  if (text.includes("noon") || text.includes("afternoon water") || text.includes("hot sun")) {
    return {
      reply:
        "Hmph. You watered at noon? That harsh sun will boil the roots right inside the soil! Crops need their drink at the cool of dawn.",
      emotion: "annoyed",
      trust_delta: -1,
      memory_facts: ["waters crops at noon instead of dawn"],
      actions: [{ type: "OFFER_QUEST", id: "dawn_watering" }],
    };
  }

  // 3. Want to start farming / grow crops
  if (
    text.includes("start farming") ||
    text.includes("grow wheat") ||
    text.includes("plant") ||
    text.includes("first harvest") ||
    text.includes("how to farm")
  ) {
    const hasQuest = state.quests.some((q) => q.id === "first_harvest");
    return {
      reply:
        "A willing set of hands! Take these wheat seeds. Sow them in the loosened plot and soak them with water from the well before sundown.",
      emotion: "happy",
      trust_delta: 1,
      memory_facts: ["eager to help plant and harvest wheat on the farm"],
      actions: [
        ...(hasQuest ? [] : [{ type: "OFFER_QUEST", id: "first_harvest" }]),
        { type: "GIVE_ITEM", item: "seeds", qty: 2 },
      ],
    };
  }

  // 4. Greetings
  if (
    text.includes("namaste") ||
    text.includes("hello") ||
    text.includes("hi raghu") ||
    text.includes("pranaam") ||
    text.includes("good morning")
  ) {
    return {
      reply:
        "Namaste, beta. Welcome to Bhima's Hollow. The earth is parched, but honest effort still yields grain. What brings you to my farm?",
      emotion: "neutral",
      trust_delta: 1,
      memory_facts: ["greeted Raghu with respect"],
      actions: [],
    };
  }

  // 5. Weather / Rain inquiry
  if (
    text.includes("weather") ||
    text.includes("rain") ||
    text.includes("drought") ||
    text.includes("clouds") ||
    text.includes("dry")
  ) {
    if (state.weather === "rain") {
      return {
        reply:
          "The heavens blessed us with sweet rain today! The plots are drinking deep. We don't even need to pump from the well.",
        emotion: "happy",
        trust_delta: 1,
        memory_facts: ["discussed the blessed rain"],
        actions: [],
      };
    } else {
      return {
        reply:
          "Not a drop in the canal for weeks. If the skies stay this stubborn, we might have to hold the ancient village rain prayer.",
        emotion: "worried",
        trust_delta: 0,
        memory_facts: ["inquired about the drought and weather conditions"],
        actions: [{ type: "OFFER_QUEST", id: "village_prayer" }],
      };
    }
  }

  // 6. Unlock land / plot inquiry
  if (text.includes("unlock") || text.includes("more land") || text.includes("unlock plot") || text.includes("expand farm")) {

    const hasCompletedQuest = state.quests.some((q) => q.status === "completed");
    if (state.npc.trust >= 4 && hasCompletedQuest) {
      const lockedPlot = state.plots.find((p) => !p.unlocked);
      if (lockedPlot) {
        return {
          reply:
            "You have proven your dedication to this soil. I am entrusting you with Plot #" + lockedPlot.id + ". Make our ancestors proud.",
          emotion: "proud",
          trust_delta: 1,
          memory_facts: ["earned Raghu's trust to unlock ancestral land"],
          actions: [{ type: "UNLOCK_PLOT", id: lockedPlot.id }],
        };
      } else {
        return {
          reply: "Every acre of this farm is already open to your care! Tend it well.",
          emotion: "proud",
          trust_delta: 0,
          memory_facts: [],
          actions: [],
        };
      }
    } else {
      return {
        reply:
          "Hold your horses. An elder does not hand over ancestral fields to just anyone. Prove yourself with honest harvest and earn my trust first.",
        emotion: "annoyed",
        trust_delta: 0,
        memory_facts: ["asked to unlock land before earning full trust"],
        actions: [{ type: "UNLOCK_PLOT", id: 3 }], // Will be rejected by engine if trust < 4 or no quest completed
      };
    }
  }


  // 7. Personal disclosure (e.g. "I hate mornings", "I love wheat", "my name is...", "I am a mechanic")
  let personalFact = null;
  if (text.includes("hate morning") || text.includes("not a morning person")) {
    personalFact = "hates mornings";
  } else if (text.includes("mechanic") || text.includes("engineer")) {
    personalFact = "has background with mechanical machinery";
  } else if (text.includes("city") || text.includes("town")) {
    personalFact = "travelled from the city";
  }

  if (personalFact) {
    return {
      reply: `Is that so? Well, the farm cares little for excuses, but I will keep that in mind. Let us see what you can accomplish today.`,
      emotion: "neutral",
      trust_delta: 0,
      memory_facts: [personalFact],
      actions: [],
    };
  }

  // 8. General in-character reply
  return {
    reply:
      "Every seed sown in truth bears fruit, helper. Look at the plots, check the soil, and tell me where we focus our work next.",
    emotion: state.npc.trust > 2 ? "happy" : state.npc.trust < 0 ? "worried" : "neutral",
    trust_delta: 0,
    memory_facts: [],
    actions: [],
  };
}

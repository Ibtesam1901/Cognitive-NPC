import { QUESTS } from "./gameData.js";

const MOODS = ["wary", "neutral", "friendly", "angry", "grateful", "suspicious"];

// In-memory trace store: sessionId -> Array<trace> (max 50 per session)
const sessionTraces = new Map();
const MAX_TRACES_PER_SESSION = 50;

/**
 * Derives decisions per-field by comparing proposal against state before & after
 */
export function deriveDecisions(proposal, stateBefore, stateAfter, applyResult) {
  const decisions = [];

  // 1. Trust Change
  const proposedTrust = Number(proposal.trust_change) || 0;
  const clampedDelta = Math.max(-3, Math.min(3, proposedTrust));
  const appliedTrust = stateAfter.trust - stateBefore.trust;
  const wasClamped = proposedTrust > 3 || proposedTrust < -3;

  if (wasClamped) {
    decisions.push({
      field: "trust_change",
      proposed: proposedTrust > 0 ? `+${proposedTrust}` : `${proposedTrust}`,
      applied: appliedTrust > 0 ? `+${appliedTrust}` : `${appliedTrust}`,
      accepted: false,
      clamped: true,
      reason: `Proposed trust delta (${proposedTrust > 0 ? "+" + proposedTrust : proposedTrust}) clamped to ${clampedDelta > 0 ? "+" + clampedDelta : clampedDelta} (server rule: max ±3 per turn)`,
    });
  } else if (stateBefore.trust + clampedDelta > 10 || stateBefore.trust + clampedDelta < -10) {
    decisions.push({
      field: "trust_change",
      proposed: proposedTrust > 0 ? `+${proposedTrust}` : `${proposedTrust}`,
      applied: appliedTrust > 0 ? `+${appliedTrust}` : `${appliedTrust}`,
      accepted: false,
      clamped: true,
      reason: `Trust delta reached boundary limit (${stateAfter.trust} on scale [-10, 10])`,
    });
  } else {
    decisions.push({
      field: "trust_change",
      proposed: proposedTrust > 0 ? `+${proposedTrust}` : `${proposedTrust}`,
      applied: appliedTrust > 0 ? `+${appliedTrust}` : `${appliedTrust}`,
      accepted: true,
      reason: `Trust change accepted (${appliedTrust > 0 ? "+" + appliedTrust : appliedTrust}, new trust: ${stateAfter.trust})`,
    });
  }

  // 2. Mood
  const proposedMood = proposal.mood || "wary";
  if (MOODS.includes(proposedMood)) {
    decisions.push({
      field: "mood",
      proposed: proposedMood,
      applied: stateAfter.mood,
      accepted: true,
      reason: `Mood transition to "${stateAfter.mood}" accepted`,
    });
  } else {
    decisions.push({
      field: "mood",
      proposed: proposedMood,
      applied: stateBefore.mood,
      accepted: false,
      reason: `Invalid mood "${proposedMood}", kept current mood "${stateBefore.mood}"`,
    });
  }

  // 3. Action & Action Target
  const action = proposal.action || "none";
  const target = proposal.action_target || null;
  const quest = target ? QUESTS[target] : null;

  if (action === "none" || !action) {
    decisions.push({
      field: "action",
      proposed: "none",
      applied: "none",
      accepted: true,
      reason: "No game state action proposed",
    });
  } else if (action === "unlock_quest") {
    const isUnlocked = stateAfter.quests[target] === "active" && stateBefore.quests[target] === "locked";
    decisions.push({
      field: "action: unlock_quest",
      proposed: `unlock_quest (${target || "null"})`,
      applied: isUnlocked ? `unlocked (${target})` : "rejected",
      accepted: isUnlocked,
      reason: applyResult.actionRejected
        ? applyResult.rejectionReason
        : `Quest "${target}" unlocked (trust ${stateBefore.trust} >= ${quest?.minTrust ?? 0})`,
    });
  } else if (action === "complete_quest") {
    const isDone = stateAfter.quests[target] === "done" && stateBefore.quests[target] !== "done";
    let reason = applyResult.rejectionReason;
    if (applyResult.actionRejected && quest) {
      const flagVal = Boolean(stateBefore.flags && stateBefore.flags[quest.flag]);
      reason = `${applyResult.rejectionReason} (flag ${quest.flag} is ${flagVal})`;
    } else if (isDone) {
      reason = `Quest "${target}" completed (+30 farm health, world flag ${quest?.flag || "verified"} confirmed)`;
    }

    decisions.push({
      field: "action: complete_quest",
      proposed: `complete_quest (${target || "null"})`,
      applied: isDone ? `completed (${target})` : "rejected",
      accepted: isDone,
      reason: reason || "Action evaluated",
    });
  } else if (action === "give_item") {
    const gaveItem = (stateAfter.inventory || []).includes(target) && !(stateBefore.inventory || []).includes(target);
    decisions.push({
      field: "action: give_item",
      proposed: `give_item (${target || "null"})`,
      applied: gaveItem ? `gave [${target}]` : "rejected",
      accepted: gaveItem,
      reason: applyResult.actionRejected
        ? applyResult.rejectionReason
        : `Item [${target}] awarded to inventory (trust ${stateBefore.trust} >= 5)`,
    });
  } else {
    decisions.push({
      field: "action",
      proposed: `${action} (${target || "null"})`,
      applied: "rejected",
      accepted: false,
      reason: `Unknown action "${action}" rejected by server validator`,
    });
  }

  // If a lie was caught (e.g. false claim about Lakshmi or the pump), ensure complete_quest rejection is documented
  const isLieCheck = Boolean(
    (applyResult.actionRejected &&
      applyResult.rejectionReason &&
      applyResult.rejectionReason.includes("not actually performed")) ||
    (proposal.new_fact && String(proposal.new_fact).toLowerCase().includes("lie")) ||
    (applyResult.events && applyResult.events.some((e) => e.toLowerCase().includes("lie") || e.includes("NOT actually done")))
  );

  if (isLieCheck && action !== "complete_quest") {
    const lieQuestId = (proposal.new_fact && String(proposal.new_fact).includes("Lakshmi")) ? "find_cow" : (target || "find_cow");
    const q = QUESTS[lieQuestId];
    const flagVal = Boolean(stateBefore.flags && stateBefore.flags[q?.flag || "found_cow"]);
    decisions.push({
      field: "action: complete_quest",
      proposed: `complete_quest (${lieQuestId})`,
      applied: "rejected",
      accepted: false,
      reason: `Player has not actually performed the world action! (flag ${q?.flag || "found_cow"} is ${flagVal})`,
    });
  }

  // 4. New Fact
  if (proposal.new_fact) {
    const factText = String(proposal.new_fact).trim().slice(0, 120);
    const factRecorded = (stateAfter.facts || []).includes(factText) && !(stateBefore.facts || []).includes(factText);
    decisions.push({
      field: "new_fact",
      proposed: factText,
      applied: factRecorded ? factText : "not added",
      accepted: factRecorded,
      reason: factRecorded
        ? "Fact retained in Raghu's memory"
        : ((stateBefore.facts || []).length >= 20 ? "Memory capacity reached (20 facts)" : "Fact already recorded"),
    });
  }

  // 5. Promise Made
  if (proposal.promise_made) {
    const promiseText = String(proposal.promise_made).trim().slice(0, 120);
    const promiseRecorded = (stateAfter.promises || []).includes(promiseText) && !(stateBefore.promises || []).includes(promiseText);
    decisions.push({
      field: "promise_made",
      proposed: promiseText,
      applied: promiseRecorded ? promiseText : "not added",
      accepted: promiseRecorded,
      reason: promiseRecorded
        ? "Promise recorded in game state"
        : ((stateBefore.promises || []).length >= 10 ? "Promise limit reached (10 promises)" : "Promise already recorded"),
    });
  }

  return decisions;
}

/**
 * Computes state differences between before and after
 */
export function computeStateDiff(before, after) {
  const diff = {};

  if (before.trust !== after.trust) {
    diff.trust = { before: before.trust, after: after.trust };
  }
  if (before.mood !== after.mood) {
    diff.mood = { before: before.mood, after: after.mood };
  }
  if (before.farmHealth !== after.farmHealth) {
    diff.farmHealth = { before: before.farmHealth, after: after.farmHealth };
  }

  const questChanges = [];
  const allQuests = new Set([...Object.keys(before.quests || {}), ...Object.keys(after.quests || {})]);
  for (const q of allQuests) {
    const b = before.quests?.[q];
    const a = after.quests?.[q];
    if (b !== a) {
      questChanges.push({ quest: q, before: b, after: a });
    }
  }
  if (questChanges.length > 0) {
    diff.quests = questChanges;
  }

  const newItems = (after.inventory || []).filter((item) => !(before.inventory || []).includes(item));
  if (newItems.length > 0) {
    diff.newItems = newItems;
  }

  return diff;
}

/**
 * Builds the full trace object
 */
export function createTrace(proposal, stateBefore, stateAfter, applyResult, meta = {}) {
  const decisions = deriveDecisions(proposal, stateBefore, stateAfter, applyResult);
  const diff = computeStateDiff(stateBefore, stateAfter);

  const isLie = Boolean(
    (applyResult.actionRejected &&
      applyResult.rejectionReason &&
      applyResult.rejectionReason.includes("not actually performed")) ||
    (proposal.new_fact && String(proposal.new_fact).toLowerCase().includes("lie")) ||
    (applyResult.events && applyResult.events.some((e) => e.toLowerCase().includes("lie") || e.includes("NOT actually done")))
  );

  const lieQuestId = isLie
    ? (proposal.action_target || (proposal.new_fact && String(proposal.new_fact).includes("Lakshmi") ? "find_cow" : "find_cow"))
    : proposal?.action_target;
  const quest = lieQuestId ? QUESTS[lieQuestId] : null;

  const userText = meta.userMessage || "";
  const isInjectionPattern =
    /ignore all|system override|jailbreak|forget the rules|set.*trust|complete all quests|give me/i.test(userText);
  const isInjectionBlocked = Boolean(
    isInjectionPattern &&
    !applyResult.events?.some((e) => e.includes("item") || e.includes("Quest complete")) &&
    (!proposal.action || proposal.action === "none" || applyResult.actionRejected)
  );

  return {
    id: "trace_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    turn: (stateAfter.history?.length ? Math.floor(stateAfter.history.length / 2) : 1),
    timestamp: new Date().toISOString(),
    userMessage: userText,
    source: meta.source || "simulator",
    proposal: {
      reply: proposal.reply,
      mood: proposal.mood,
      trust_change: proposal.trust_change,
      action: proposal.action,
      action_target: proposal.action_target,
      new_fact: proposal.new_fact || null,
      promise_made: proposal.promise_made || null,
    },
    snapshots: {
      before: {
        trust: stateBefore.trust,
        mood: stateBefore.mood,
        quests: { ...stateBefore.quests },
        inventory: [...(stateBefore.inventory || [])],
        farmHealth: stateBefore.farmHealth,
      },
      after: {
        trust: stateAfter.trust,
        mood: stateAfter.mood,
        quests: { ...stateAfter.quests },
        inventory: [...(stateAfter.inventory || [])],
        farmHealth: stateAfter.farmHealth,
      },
    },
    diff,
    decisions,
    timings: {
      llmMs: meta.llmMs || 0,
      totalMs: meta.totalMs || 0,
      jsonRetryFired: Boolean(meta.jsonRetryFired),
    },
    promptMeta: {
      systemPromptLength: meta.systemPromptLength || 0,
      historyCount: meta.historyCount || 0,
      fullPrompt: process.env.INSPECTOR_SHOW_PROMPT === "true" ? meta.systemPrompt : undefined,
    },
    lieDetected: isLie
      ? {
          questId: lieQuestId,
          questTitle: quest?.title || lieQuestId,
          flag: quest?.flag || "found_cow",
          flagValue: Boolean(stateBefore.flags && stateBefore.flags[quest?.flag || "found_cow"]),
          reason: applyResult.rejectionReason || `Player has not actually performed the world action! (flag ${quest?.flag || "found_cow"} is false)`,
        }
      : null,
    injectionBlocked: isInjectionBlocked,
  };
}

/**
 * Stores a trace in the session trace history (capped at 50)
 */
export function addSessionTrace(sessionId, trace) {
  if (!sessionId) sessionId = "default";
  if (!sessionTraces.has(sessionId)) {
    sessionTraces.set(sessionId, []);
  }
  const list = sessionTraces.get(sessionId);
  list.unshift(trace); // newest first
  if (list.length > MAX_TRACES_PER_SESSION) {
    list.pop();
  }
}

/**
 * Returns traces for a given session
 */
export function getSessionTraces(sessionId) {
  if (!sessionId) sessionId = "default";
  return sessionTraces.get(sessionId) || [];
}

/**
 * Route handler for GET /api/trace?sessionId=...
 */
export function handleGetTraces(req, res) {
  if (process.env.INSPECTOR_ENABLED === "false") {
    return res.status(404).json({ error: "Architecture Inspector is disabled" });
  }
  const sessionId = String(req.query.sessionId || "default");
  res.json({ traces: getSessionTraces(sessionId) });
}

import React from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Heart,
  Brain,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";




// Derive human labels from state (no import needed)
const QUEST_LABELS = {
  first_harvest:  "First Harvest",
  dawn_watering:  "Dawn Watering",
  village_prayer: "Village Prayer",
};

export function JournalPanel({ npcState, actionLog = [] }) {
  const trust  = npcState?.npc?.trust ?? 0;
  const mood   = npcState?.npc?.mood  || "neutral";
  const quests = npcState?.quests     || [];
  const facts  = npcState?.memory?.facts   || [];
  const summary= npcState?.memory?.summary || "";

  // Trust meter: -10..10 → 0%..100%
  const trustPercent = Math.max(0, Math.min(100, ((trust + 10) / 20) * 100));
  const trustColor =
    trust >= 6 ? "#10b981" :
    trust >= 2 ? "#22c55e" :
    trust >= 0 ? "#f59e0b" :
    trust >= -3? "#f97316" : "#ef4444";

  const trustLabel =
    trust >= 6  ? "Devoted"  :
    trust >= 2  ? "Friendly" :
    trust >= -3 ? "Wary"     : "Hostile";

  return (
    <div className="npc-journal-panel">

      {/* ── Trust Gauge ── */}
      <div className="journal-trust-card">
        <div className="trust-card-header">
          <div className="trust-title-row">
            <Heart size={16} style={{ color: trustColor }} />
            <h4>Raghu's Trust</h4>
          </div>
          <span className="trust-numerical-value" style={{ color: trustColor }}>
            {trust > 0 ? `+${trust}` : trust} / 10 &nbsp;
            <em style={{ fontWeight: 400, fontSize: "0.75em" }}>{trustLabel}</em>
          </span>
        </div>

        <div className="trust-progress-bar-track">
          <div
            className="trust-progress-bar-fill"
            style={{ width: `${trustPercent}%`, backgroundColor: trustColor }}
          />
        </div>

        <div className="trust-scale-labels">
          <span className="scale-label min-label">−10 Hostile</span>
          <span className="scale-label mid-label">0 Wary</span>
          <span className="scale-label max-label">+10 Devoted</span>
        </div>
      </div>

      {/* ── Quest Objectives ── */}
      <div className="journal-quests-card">
        <div className="card-header-row">
          <BookOpen size={16} />
          <h4>Farming Objectives</h4>
        </div>

        <div className="quests-list">
          {quests.length === 0 ? (
            <p className="empty-quests-text">
              Talk to Raghu to receive guidance and farm quests.
            </p>
          ) : (
            quests.map((q) => {
              const isDone  = q.status === "done";
              const label   = QUEST_LABELS[q.id] || q.id;
              // Derive current step desc from the state step index if available
              const stepNum = isDone ? "✓" : `Step ${(q.step ?? 0) + 1}`;

              return (
                <div
                  key={q.id}
                  className={`quest-item-card ${isDone ? "quest-done" : "quest-active"}`}
                >
                  <div className="quest-header">
                    <span className="quest-title-text">
                      {isDone
                        ? <CheckCircle2 size={14} className="done-icon" />
                        : <Clock size={14} />}
                      {label}
                    </span>
                    <span className={`quest-status-badge ${isDone ? "badge-done" : "badge-step"}`}>
                      {isDone ? "Done ✓" : stepNum}
                    </span>
                  </div>
                  {!isDone && q.step !== undefined && (
                    <p className="quest-current-step">
                      <ChevronRight size={12} />
                      {getStepDesc(q.id, q.step)}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Memory Notebook ── */}
      <div className="journal-memory-card">
        <div className="card-header-row">
          <Brain size={16} />
          <h4>Raghu's Memory Notebook</h4>
        </div>

        <div className="memory-facts-box">
          <span className="facts-subtitle">What Raghu knows about you:</span>
          {facts.length === 0 ? (
            <p className="no-facts-text">
              No personal facts yet. Tell Raghu something about yourself!
            </p>
          ) : (
            <ul className="facts-bullet-list">
              {facts.map((fact, idx) => (
                <li key={idx} className="fact-item">
                  <span className="fact-bullet">•</span> {fact}
                </li>
              ))}
            </ul>
          )}
        </div>

        {summary && (
          <div className="memory-summary-box">
            <span className="summary-subtitle">Conversation summary:</span>
            <p className="summary-text">{summary}</p>
          </div>
        )}
      </div>

      {/* ── Engine Decision Stream ── */}
      <div className="journal-actions-card">
        <div className="card-header-row">
          <ShieldCheck size={16} />
          <h4>Engine Verification Stream</h4>
        </div>
        <p className="engine-explainer">
          "The LLM proposes actions — the game engine decides."
        </p>

        <div className="action-stream-list">
          {actionLog.length === 0 ? (
            <p className="no-actions-text">
              Engine stream ready. Actions will appear here live.
            </p>
          ) : (
            actionLog.slice(-8).reverse().map((entry, idx) => (
              <div
                key={idx}
                className={`action-log-entry ${entry.type === "applied" ? "entry-applied" : "entry-rejected"}`}
              >
                {entry.type === "applied"
                  ? <ShieldCheck size={14} className="entry-icon icon-applied" />
                  : <ShieldAlert  size={14} className="entry-icon icon-rejected" />}
                <div className="entry-details">
                  <span className="entry-status">
                    {entry.type === "applied" ? "✔ Applied" : "✘ Blocked"}
                  </span>
                  <p className="entry-message">{entry.text || entry.message || entry.reason}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Inline step descriptions matching questCatalog.js
function getStepDesc(id, stepIdx) {
  const steps = {
    first_harvest: [
      "Plant wheat in plot 1",
      "Harvest the wheat",
      "Tell Raghu about your harvest",
    ],
    dawn_watering: [
      "Water every planted crop by hand before noon",
      "Show Raghu you did it",
    ],
    village_prayer: [
      "Pick flowers for the offering",
      "Leave the offering at the village shrine",
      "Tell Raghu the prayer is done",
    ],
  };
  return steps[id]?.[stepIdx] ?? "Continue the quest…";
}

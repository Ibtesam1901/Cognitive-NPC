import React from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Heart,
  Brain,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Info,
} from "lucide-react";

export function JournalPanel({
  npcState,
  actionLog = [],
}) {
  const trust = npcState?.npc?.trust ?? 0;
  const mood = npcState?.npc?.mood || "neutral";
  const quests = npcState?.quests || [];
  const facts = npcState?.memory?.facts || [];
  const summary = npcState?.memory?.summary || "";

  // Trust meter percentage (-10 to 10 -> 0% to 100%)
  const trustPercent = Math.max(0, Math.min(100, ((trust + 10) / 20) * 100));

  const trustColor =
    trust >= 3 ? "#10b981" : trust >= 0 ? "#f59e0b" : "#ef4444";

  return (
    <div className="npc-journal-panel">
      {/* Raghu's Trust Gauge */}
      <div className="journal-trust-card">
        <div className="trust-card-header">
          <div className="trust-title-row">
            <Heart size={16} style={{ color: trustColor }} />
            <h4>Raghu's Trust in You</h4>
          </div>
          <span className="trust-numerical-value" style={{ color: trustColor }}>
            {trust > 0 ? `+${trust}` : trust} / 10
          </span>
        </div>

        <div className="trust-progress-bar-track">
          <div
            className="trust-progress-bar-fill"
            style={{ width: `${trustPercent}%`, backgroundColor: trustColor }}
          ></div>
        </div>

        <div className="trust-scale-labels">
          <span className="scale-label min-label">-10 Hostile</span>
          <span className="scale-label mid-label">0 Wary</span>
          <span className="scale-label max-label">+10 Devoted</span>
        </div>
      </div>

      {/* Quest Objectives */}
      <div className="journal-quests-card">
        <div className="card-header-row">
          <BookOpen size={16} />
          <h4>Farming Objectives & Quests</h4>
        </div>

        <div className="quests-list">
          {quests.length === 0 ? (
            <p className="empty-quests-text">
              Talk to Raghu to receive guidance and farm quests.
            </p>
          ) : (
            quests.map((q) => {
              const isCompleted = q.status === "completed";
              return (
                <div
                  key={q.id}
                  className={`quest-item-card ${isCompleted ? "quest-done" : "quest-active"}`}
                >
                  <div className="quest-header">
                    <span className="quest-title-text">
                      {isCompleted ? <CheckCircle2 size={14} className="done-icon" /> : <Clock size={14} />}
                      {q.title}
                    </span>
                    <span className={`quest-status-badge ${isCompleted ? "badge-done" : "badge-step"}`}>
                      {isCompleted ? "Completed" : `Step ${q.step}/${q.maxSteps}`}
                    </span>
                  </div>
                  <p className="quest-desc-text">{q.desc}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Raghu's Memory Notebook */}
      <div className="journal-memory-card">
        <div className="card-header-row">
          <Brain size={16} />
          <h4>Raghu's Memory Notebook</h4>
        </div>

        <div className="memory-facts-box">
          <span className="facts-subtitle">Durable Facts Known About Player:</span>
          {facts.length === 0 ? (
            <p className="no-facts-text">No personal facts learned yet. Tell Raghu about yourself!</p>
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
            <span className="summary-subtitle">Rolling Dialogue Summary:</span>
            <p className="summary-text">{summary}</p>
          </div>
        )}
      </div>

      {/* Real-time Engine Decision Stream */}
      <div className="journal-actions-card">
        <div className="card-header-row">
          <ShieldCheck size={16} />
          <h4>Engine Verification Stream</h4>
        </div>
        <p className="engine-explainer">
          "The LLM proposes actions, but the game engine verifies and decides."
        </p>

        <div className="action-stream-list">
          {actionLog.length === 0 ? (
            <p className="no-actions-text">Engine stream ready. Conversation actions will appear here live.</p>
          ) : (
            actionLog.slice(-5).reverse().map((entry, idx) => (
              <div
                key={idx}
                className={`action-log-entry ${entry.type === "applied" ? "entry-applied" : "entry-rejected"}`}
              >
                {entry.type === "applied" ? (
                  <ShieldCheck size={14} className="entry-icon icon-applied" />
                ) : (
                  <ShieldAlert size={14} className="entry-icon icon-rejected" />
                )}
                <div className="entry-details">
                  <span className="entry-status">
                    {entry.type === "applied" ? "[Engine Verified & Applied]" : "[Engine Blocked & Rejected]"}
                  </span>
                  <p className="entry-message">{entry.message || entry.reason}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

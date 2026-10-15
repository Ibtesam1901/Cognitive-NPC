import React from "react";
import { CheckCircle2, Circle, Clock, Sparkles, Scroll } from "lucide-react";

const QUEST_CATALOG_DATA = {
  first_harvest: {
    title: "First Harvest",
    steps: [
      "Plant wheat in plot 1",
      "Harvest the wheat",
      "Tell Raghu about your harvest",
    ],
  },
  dawn_watering: {
    title: "Dawn Watering",
    steps: [
      "Water every planted crop by hand before noon",
      "Show Raghu you did it",
    ],
  },
  village_prayer: {
    title: "Village Prayer",
    steps: [
      "Pick flowers for the offering",
      "Leave the offering at the village shrine",
      "Tell Raghu the prayer is done",
    ],
  },
};

/**
 * QuestTrackerHUD:
 * Persistent top-right / in-game quest tracker overlay showing:
 * - Active quest title and summary
 * - Step-by-step progress with checkmarks
 * - Explicit indicator for steps requiring turn-in with Raghu
 * - Maximum 2 active quests displayed
 * Handles both client state format and server gameEngine format ({ id, status, step }).
 */
export function QuestTrackerHUD({ quests = [] }) {
  // Normalize quest structure
  const normalizedQuests = quests.map((q) => {
    // If it's server format: { id, status, step }
    const catalogInfo = QUEST_CATALOG_DATA[q.id] || {};
    const title = q.title || catalogInfo.title || q.id;
    const steps = q.steps || catalogInfo.steps || [];
    const isCompleted = q.completed === true || q.status === "done";
    const currentStepIdx = q.currentStep ?? q.step ?? 0;

    return {
      id: q.id,
      title,
      steps,
      completed: isCompleted,
      currentStep: currentStepIdx,
    };
  });

  // Only show active / in-progress quests (max 2)
  const activeQuests = normalizedQuests.filter((q) => !q.completed).slice(0, 2);

  if (activeQuests.length === 0) {
    return (
      <div className="quest-tracker-hud empty-tracker">
        <div className="tracker-header">
          <Scroll size={13} className="tracker-header-icon" />
          <span>Active Objectives</span>
        </div>
        <p className="no-quests-hint">All village duties finished! Speak with Raghu for new requests.</p>
      </div>
    );
  }

  return (
    <div className="quest-tracker-hud">
      <div className="tracker-header">
        <Scroll size={13} className="tracker-header-icon" />
        <span>Active Objectives</span>
      </div>

      <div className="tracker-quests-list">
        {activeQuests.map((quest) => {
          const totalSteps = quest.steps?.length || 1;
          const currentStepIdx = quest.currentStep ?? 0;

          return (
            <div key={quest.id} className="tracker-quest-item">
              <div className="quest-item-title-row">
                <span className="quest-title-text">{quest.title}</span>
                <span className="quest-step-count">
                  Step {Math.min(totalSteps, currentStepIdx + 1)} / {totalSteps}
                </span>
              </div>

              <div className="quest-steps-container">
                {quest.steps?.map((stepText, idx) => {
                  const isDone = idx < currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  const needsRaghu =
                    stepText.toLowerCase().includes("raghu") ||
                    stepText.toLowerCase().includes("tell") ||
                    stepText.toLowerCase().includes("show") ||
                    stepText.toLowerCase().includes("speak");

                  return (
                    <div
                      key={idx}
                      className={`tracker-step-row ${
                        isDone ? "step-done" : isCurrent ? "step-active" : "step-pending"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={13} className="step-icon done" />
                      ) : (
                        <Circle size={13} className="step-icon pending" />
                      )}
                      <span className="step-label">{stepText}</span>
                      {isCurrent && needsRaghu && (
                        <span className="raghu-turnin-badge" title="Speak to Raghu to turn in">
                          Speak to Raghu
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

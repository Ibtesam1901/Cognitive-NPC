import React from "react";
import { BookOpen, X, Sparkles } from "lucide-react";

/**
 * StoryModal:
 * Displays evocative rural Indian village folklore unlocked when visiting landmarks
 * (e.g. The Legend of the Ancient Banyan Tree).
 */
export function StoryModal({ story, onClose }) {
  if (!story) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="story-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="story-modal-header">
          <div className="story-title-row">
            <span className="story-icon">📜</span>
            <div>
              <h3>{story.title}</h3>
              <span className="story-subtitle">{story.subtitle}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close Story">
            <X size={18} />
          </button>
        </div>

        <div className="story-modal-body">
          <div className="story-prose">
            {story.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {story.loreNote && (
            <div className="story-lore-card">
              <Sparkles size={16} className="text-amber" />
              <span>{story.loreNote}</span>
            </div>
          )}
        </div>

        <div className="story-modal-footer">
          <button className="modal-save-btn" onClick={onClose}>
            Keep in Journal
          </button>
        </div>
      </div>
    </div>
  );
}

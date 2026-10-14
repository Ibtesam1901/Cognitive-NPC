import React, { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { usePrefersReducedMotion } from "../utils/motion.js";

/**
 * SuggestionChips Component:
 * - 3 interactive pill-style suggested replies
 * - Accessible via Tab navigation, Enter/Space, and 1/2/3 hotkeys (when input is empty)
 * - Shimmer loading state when suggestions are being generated
 * - Respects prefers-reduced-motion
 */
export function SuggestionChips({
  suggestions = [],
  loading = false,
  onSelect,
  inputEmpty = true,
  disabled = false,
}) {
  const reducedMotion = usePrefersReducedMotion();

  // Listen for keyboard number shortcuts (1, 2, 3) when input is empty and not typing elsewhere
  useEffect(() => {
    if (disabled || loading || !suggestions || suggestions.length === 0 || !inputEmpty) {
      return;
    }

    const handleKeyDown = (e) => {
      // Ignore if modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      // Ignore if user is currently typing in an input, textarea, or contentEditable element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === "1" && suggestions[0]) {
        e.preventDefault();
        onSelect(suggestions[0]);
      } else if (e.key === "2" && suggestions[1]) {
        e.preventDefault();
        onSelect(suggestions[1]);
      } else if (e.key === "3" && suggestions[2]) {
        e.preventDefault();
        onSelect(suggestions[2]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suggestions, loading, inputEmpty, disabled, onSelect]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="suggestion-chips-container" aria-label="Loading suggestions">
        <div className="suggestion-label-row">
          <Sparkles size={13} className="suggestion-sparkle-icon" />
          <span className="suggestion-label-text">Suggested replies</span>
        </div>
        <div className="suggestion-chips-list">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`suggestion-chip-skeleton ${reducedMotion ? "no-motion" : ""}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="suggestion-chips-container" aria-label="Suggested player replies">
      <div className="suggestion-label-row">
        <Sparkles size={13} className="suggestion-sparkle-icon" />
        <span className="suggestion-label-text">Suggested replies</span>
        <span className="suggestion-hotkey-hint">(press 1, 2, or 3)</span>
      </div>

      <div className="suggestion-chips-list" role="group">
        {suggestions.map((text, idx) => (
          <button
            key={idx}
            type="button"
            className="suggestion-chip-btn"
            onClick={() => onSelect(text)}
            disabled={disabled}
            style={{
              animationDelay: reducedMotion ? "0s" : `${idx * 0.07}s`,
            }}
            title={`Option ${idx + 1}: ${text}`}
          >
            <span className="chip-number-badge">{idx + 1}</span>
            <span className="chip-text">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

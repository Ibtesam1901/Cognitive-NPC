import { useState, useEffect } from "react";
import raghuIdle from "../assets/raghu_2d_idle.jpg";
import raghuTalking from "../assets/raghu_2d_talking.jpg";
import { usePrefersReducedMotion } from "../utils/motion.js";

/**
 * RaghuTalking component:
 * - Alternates between idle and talking portraits every ~150ms while speaking
 * - When real audio is playing, drives mouth movement from AnalyserNode volume level
 * - Shows an animated "speaking" indicator with soundwave bars
 * - Disables image swap and animations when prefers-reduced-motion is active
 */
export function RaghuTalking({
  isSpeaking = false,
  analyser = null,
  isRealAudio = false,
  idleSprite = null,
  talkingSprite = null,
  currentWord = "",
  alt = "Raghu the Farmer",
  className = "",
  showIndicator = true,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (!isSpeaking || reducedMotion) {
      return;
    }

    // 1. Real audio volume-driven lip sync using Web Audio AnalyserNode
    if (isRealAudio && analyser) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animationFrameId;

      const checkVolume = () => {
        try {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          setMouthOpen(average > 14);
        } catch {
          setMouthOpen((prev) => !prev);
        }
        animationFrameId = requestAnimationFrame(checkVolume);
      };

      animationFrameId = requestAnimationFrame(checkVolume);
      return () => {
        cancelAnimationFrame(animationFrameId);
        setMouthOpen(false);
      };
    }

    // 2. SpeechSynthesis / simulation cadence: alternate every ~150ms
    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 150);

    return () => {
      clearInterval(interval);
      setMouthOpen(false);
    };
  }, [isSpeaking, isRealAudio, analyser, reducedMotion]);

  // Derive active mouth flap state without setting state synchronously in effects
  const isMouthOpen = isSpeaking && !reducedMotion && mouthOpen;
  const defaultIdle = idleSprite || raghuIdle;
  const defaultTalking = talkingSprite || raghuTalking;
  const activeSprite = isMouthOpen ? defaultTalking : defaultIdle;

  return (
    <div className={`raghu-talking-container ${className}`}>
      <img
        src={activeSprite}
        alt={alt}
        className={`portrait-img ${isSpeaking && !reducedMotion ? "talking-anim lip-syncing" : ""}`}
      />

      {isSpeaking && showIndicator && (
        <div className={`speaking-tag ${reducedMotion ? "reduced-motion" : ""}`}>
          <div className="soundwave-bars">
            <span className="sw-bar"></span>
            <span className="sw-bar"></span>
            <span className="sw-bar"></span>
            <span className="sw-bar"></span>
          </div>
          <span className="speaking-label">
            {currentWord ? `"${currentWord}"` : "Speaking..."}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * TypewriterText component:
 * - Reveals reply text progressively at a rate matched to speech duration
 * - Supports instant "skip" click
 * - Disables animation when prefers-reduced-motion is active
 */
export function TypewriterText({
  text = "",
  isTyping = false,
  durationMs = null,
  onComplete = null,
  className = "",
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [revealedCount, setRevealedCount] = useState(0);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (reducedMotion || !isTyping || skipped) {
      return;
    }

    const totalChars = Math.max(text.length, 1);
    const speed = durationMs
      ? Math.max(15, Math.min(65, Math.floor(durationMs / totalChars)))
      : Math.max(18, Math.min(45, Math.floor(2800 / totalChars)));

    const timer = setInterval(() => {
      setRevealedCount((prev) => {
        if (prev + 1 >= totalChars) {
          clearInterval(timer);
          onComplete?.();
          return totalChars;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [text, isTyping, durationMs, reducedMotion, skipped, onComplete]);

  const handleSkip = (e) => {
    e.stopPropagation();
    setSkipped(true);
    onComplete?.();
  };

  const isComplete = reducedMotion || !isTyping || skipped || revealedCount >= text.length;
  const displayedText = isComplete ? text : text.slice(0, revealedCount);

  return (
    <div
      className={`typewriter-wrapper ${!isComplete ? "typing-in-progress" : ""} ${className}`}
      onClick={!isComplete ? handleSkip : undefined}
      title={!isComplete ? "Click to reveal entire message" : undefined}
    >
      <span>{displayedText}</span>
      {!isComplete && (
        <>
          <span className="typewriter-caret">|</span>
          <button
            type="button"
            className="typewriter-skip-pill"
            onClick={handleSkip}
            title="Skip typing animation"
          >
            ⏩ Skip
          </button>
        </>
      )}
    </div>
  );
}

export default RaghuTalking;

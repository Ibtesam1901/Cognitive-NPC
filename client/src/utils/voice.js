// Voice utility with cloud TTS (/api/tts) and browser SpeechSynthesis fallback
// Tailored for Raghu (a 62-year-old Indian farmer)

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

let currentAudio = null;
let currentBlobUrl = null;
let currentAudioCtx = null;
let currentAnalyser = null;
let currentSourceNode = null;
let currentSimTimer = null;
let isSpeaking = false;
let realAudioActive = false;

/**
 * Stop any ongoing speech (HTMLAudioElement, SpeechSynthesis, or simulation)
 */
export function stop() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.onplay = null;
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.src = "";
    } catch {
      // Audio pause error ignored
    }
    currentAudio = null;
  }

  if (currentSourceNode) {
    try {
      currentSourceNode.disconnect();
    } catch {
      // Disconnect error ignored
    }
    currentSourceNode = null;
  }

  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch {
      // Revoke error ignored
    }
    currentBlobUrl = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Synthesis cancel error ignored
    }
  }

  if (currentSimTimer) {
    clearInterval(currentSimTimer);
    currentSimTimer = null;
  }

  currentAnalyser = null;
  isSpeaking = false;
  realAudioActive = false;
}

/**
 * Returns current AnalyserNode if real audio is playing
 */
export function getAnalyser() {
  return currentAnalyser;
}

/**
 * Check if real audio is currently playing
 */
export function isRealAudioPlaying() {
  return realAudioActive && isSpeaking;
}

/**
 * Check if any speech is active
 */
export function isSpeakingActive() {
  return isSpeaking;
}

/**
 * Offline simulation when no voice engines are available
 */
function simulateVoice(text, options = {}) {
  const { onStart, onEnd, onBoundary } = options;
  const words = text.split(/\s+/).filter(Boolean);
  let wordIdx = 0;

  isSpeaking = true;
  realAudioActive = false;
  onStart?.({ isRealAudio: false });

  if (words.length > 0) {
    onBoundary?.({ name: "word", word: words[0], charIndex: 0 });
  }

  currentSimTimer = setInterval(() => {
    wordIdx++;
    if (wordIdx < words.length) {
      onBoundary?.({ name: "word", word: words[wordIdx], charIndex: wordIdx });
    } else {
      if (currentSimTimer) {
        clearInterval(currentSimTimer);
        currentSimTimer = null;
      }
      isSpeaking = false;
      onEnd?.();
    }
  }, 220);
}

/**
 * Browser SpeechSynthesis fallback tailored for an older Indian male voice
 */
function fallbackSpeechSynthesis(text, language, options = {}) {
  const { onStart, onEnd, onBoundary } = options;
  const speed = Number(options.speed ?? localStorage.getItem("npc_voice_speed") ?? 1.0);

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    simulateVoice(text, options);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Suited to a 62-year-old Indian man: slower rate, lower pitch
    utterance.rate = Math.max(0.6, Math.min(1.4, 0.85 * speed));
    utterance.pitch = 0.85;

    const voices = window.speechSynthesis.getVoices() || [];
    const normLang = String(language || "").toLowerCase();
    const isKannada = normLang === "kannada" || normLang === "kn" || /[\u0C80-\u0CFF]/.test(text);
    const isHindi = normLang === "hindi" || normLang === "hinglish" || normLang === "hi" || /[\u0900-\u097F]/.test(text);

    if (isKannada) {
      const knVoice =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith("kn") &&
            (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("gagan") || !v.name.toLowerCase().includes("female"))
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith("kn")) ||
        voices.find((v) => v.name.toLowerCase().includes("kannada")) ||
        voices.find(
          (v) =>
            v.lang.toLowerCase().includes("en-in") &&
            v.name.toLowerCase().includes("male")
        ) ||
        voices.find((v) => v.lang.toLowerCase().includes("en-in"));
      if (knVoice) utterance.voice = knVoice;
      utterance.lang = "kn-IN";
    } else if (isHindi) {
      const hiVoice =
        voices.find(
          (v) =>
            v.lang.toLowerCase().includes("hi") &&
            (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("madhur") || !v.name.toLowerCase().includes("female"))
        ) ||
        voices.find(
          (v) =>
            v.lang.toLowerCase().includes("hi") ||
            (v.lang.toLowerCase().includes("in") && !v.lang.toLowerCase().includes("en"))
        ) ||
        voices.find((v) => v.name.toLowerCase().includes("hindi")) ||
        voices.find(
          (v) =>
            v.lang.toLowerCase().includes("en-in") &&
            v.name.toLowerCase().includes("male")
        );
      if (hiVoice) utterance.voice = hiVoice;
      utterance.lang = "hi-IN";
    } else {
      const inVoice =
        voices.find(
          (v) =>
            v.lang.toLowerCase().includes("en-in") &&
            v.name.toLowerCase().includes("male")
        ) ||
        voices.find((v) => v.lang.toLowerCase().includes("en-in")) ||
        voices.find((v) => v.name.toLowerCase().includes("indian")) ||
        voices.find(
          (v) =>
            v.name.toLowerCase().includes("male") &&
            v.lang.toLowerCase().startsWith("en")
        );
      if (inVoice) utterance.voice = inVoice;
      utterance.lang = "en-IN";
    }

    utterance.onstart = () => {
      isSpeaking = true;
      realAudioActive = false;
      onStart?.({ isRealAudio: false, utterance });
    };

    utterance.onboundary = (e) => {
      onBoundary?.(e);
    };

    utterance.onend = () => {
      isSpeaking = false;
      realAudioActive = false;
      onEnd?.();
    };

    utterance.onerror = () => {
      isSpeaking = false;
      realAudioActive = false;
      onEnd?.();
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("[Voice] SpeechSynthesis error, using simulation:", err);
    simulateVoice(text, options);
  }
}

/**
 * Main speak function:
 * 1. Cancels any currently playing speech.
 * 2. Tries POST /api/tts.
 * 3. Plays audio via HTMLAudioElement and wires AnalyserNode for volume sync.
 * 4. On 204 or error, falls back to window.speechSynthesis.
 */
export async function speak(text, language = "English", options = {}) {
  // Cancel any currently playing speech before starting new one
  stop();

  const { onStart, onEnd, onBoundary } = options;
  const speed = Number(options.speed ?? localStorage.getItem("npc_voice_speed") ?? 1.0);

  // Check if voice is disabled in settings
  const voiceEnabled = localStorage.getItem("npc_voice_enabled") !== "false";
  if (!voiceEnabled && options.force !== true) {
    // Silent simulation so dialogue animations still progress if desired
    simulateVoice(text, {
      onStart: () => onStart?.({ isRealAudio: false, muted: true }),
      onEnd,
      onBoundary,
    });
    return;
  }

  // Trim and cap text at 500 characters
  const cleanText = String(text || "").trim().slice(0, 500);
  if (!cleanText) {
    onEnd?.();
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, language }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // If server returns 204 No Content or error, fall back to browser speechSynthesis
    if (res.status === 204 || !res.ok) {
      fallbackSpeechSynthesis(cleanText, language, options);
      return;
    }

    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      fallbackSpeechSynthesis(cleanText, language, options);
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    currentBlobUrl = blobUrl;

    const audio = new Audio(blobUrl);
    currentAudio = audio;
    audio.playbackRate = Math.max(0.6, Math.min(1.5, speed));

    // Connect Web Audio API AnalyserNode to drive real lip-sync animation
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!currentAudioCtx || currentAudioCtx.state === "closed") {
          currentAudioCtx = new AudioCtx();
        }
        if (currentAudioCtx.state === "suspended") {
          await currentAudioCtx.resume().catch(() => {});
        }
        const analyser = currentAudioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;

        const source = currentAudioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(currentAudioCtx.destination);

        currentAnalyser = analyser;
        currentSourceNode = source;
      }
    } catch (audioCtxErr) {
      console.debug("[Voice] AudioContext analyser note:", audioCtxErr);
    }

    audio.volume = 1.0;

    audio.onplay = () => {
      isSpeaking = true;
      realAudioActive = true;
      onStart?.({
        isRealAudio: true,
        audio,
        analyser: currentAnalyser,
      });
    };

    audio.onended = () => {
      stop();
      onEnd?.();
    };

    audio.onerror = (e) => {
      console.warn("[Voice] Audio element error, falling back to speech synthesis:", e);
      stop();
      fallbackSpeechSynthesis(cleanText, language, options);
    };

    try {
      await audio.play();
    } catch (playErr) {
      console.warn("[Voice] Audio autoplay blocked or failed, falling back to browser speech synthesis:", playErr);
      fallbackSpeechSynthesis(cleanText, language, options);
    }
  } catch (err) {
    // Network failure, offline, or timeout -> fall back
    console.debug("[Voice] Cloud TTS unavailable, using browser speech:", err?.message || err);
    fallbackSpeechSynthesis(cleanText, language, options);
  }
}

export { speak as playVoice, stop as stopVoice };


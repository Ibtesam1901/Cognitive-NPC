import crypto from "crypto";

// Simple in-memory cache: hash(provider + language + text) -> { buffer, contentType, timestamp }
const cache = new Map();
const MAX_CACHE_SIZE = 100;

// Rate limiting for /api/tts only: IP -> array of timestamps
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => t > windowStart);
    if (valid.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, valid);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Hash helper for cache keys
 */
function getCacheKey(provider, language, text) {
  return crypto
    .createHash("sha256")
    .update(`${provider}:${language}:${text}`)
    .digest("hex");
}

/**
 * Synthesize speech with Google Cloud Text-to-Speech API
 */
async function synthesizeGoogleTTS(text, language, apiKey) {
  const normLang = String(language || "").toLowerCase();
  const isKannada = normLang === "kannada" || normLang === "kn" || /[\u0C80-\u0CFF]/.test(text);
  const isHindi = normLang === "hindi" || normLang === "hinglish" || normLang === "hi" || /[\u0900-\u097F]/.test(text);

  // Voices suited to a 62-year-old Indian man: kn-IN for Kannada, hi-IN for Hindi, en-IN for English
  const languageCode = isKannada ? "kn-IN" : isHindi ? "hi-IN" : "en-IN";
  const voiceName = isKannada
    ? process.env.GOOGLE_TTS_VOICE_KN || "kn-IN-Wavenet-A"
    : isHindi
    ? process.env.GOOGLE_TTS_VOICE_HI || "hi-IN-Wavenet-B"
    : process.env.GOOGLE_TTS_VOICE_EN || "en-IN-Wavenet-B";

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
      ssmlGender: "MALE",
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.9, // Slower rate to suit an older man
      pitch: -2.0,      // Lower pitch suited to an older man
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Google TTS error HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data.audioContent) {
    throw new Error("Google TTS returned no audioContent");
  }

  return Buffer.from(data.audioContent, "base64");
}

/**
 * Microsoft Edge Natural Neural Voices (Male)
 * Kannada: kn-IN-GaganNeural (Male)
 * Hindi:   hi-IN-MadhurNeural (Male)
 * English: en-IN-PrabhatNeural (Male)
 */
async function synthesizeEdgeNeuralTTS(text, language) {
  const normLang = String(language || "").toLowerCase();
  const isKannada = normLang === "kannada" || normLang === "kn" || /[\u0C80-\u0CFF]/.test(text);
  const isHindi = normLang === "hindi" || normLang === "hinglish" || normLang === "hi" || /[\u0900-\u097F]/.test(text);

  const maleVoice = isKannada
    ? "kn-IN-GaganNeural"
    : isHindi
    ? "hi-IN-MadhurNeural"
    : "en-IN-PrabhatNeural";

  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(maleVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  return new Promise((resolve, reject) => {
    try {
      const { audioStream } = tts.toStream(text, {
        pitch: "-5Hz",
        rate: "-10%",
      });

      const chunks = [];
      const timer = setTimeout(() => {
        reject(new Error("Edge TTS stream timeout"));
      }, 10000);

      audioStream.on("data", (chunk) => chunks.push(chunk));
      audioStream.on("end", () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      audioStream.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Universal fallback voice stream for multi-language speech
 */
async function synthesizeGoogleStreamTTS(text, language) {
  const normLang = String(language || "").toLowerCase();
  const isKannada = normLang === "kannada" || normLang === "kn" || /[\u0C80-\u0CFF]/.test(text);
  const isHindi = normLang === "hindi" || normLang === "hinglish" || normLang === "hi" || /[\u0900-\u097F]/.test(text);

  const langCode = isKannada ? "kn" : isHindi ? "hi" : "en-IN";
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langCode)}&client=tw-ob&q=${encodeURIComponent(text)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Google stream TTS error HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Synthesize speech with ElevenLabs API
 */
async function synthesizeElevenLabsTTS(text, language, apiKey) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const payload = {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.6,
      similarity_boost: 0.75,
      style: 0.2,
      use_speaker_boost: true,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`ElevenLabs error HTTP ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Route handler for POST /api/tts
 */
export async function handleTTS(req, res) {
  try {
    const ip = req.ip || req.socket?.remoteAddress || "127.0.0.1";
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "TTS rate limit exceeded. Please wait a moment." });
    }

    const { text, language = "English" } = req.body || {};

    // Cap text at 500 characters
    const cleanText = String(text || "").trim().slice(0, 500);
    if (!cleanText) {
      return res.status(204).end();
    }

    const provider = (process.env.TTS_PROVIDER || "google-stream").toLowerCase().trim();
    const apiKey = (process.env.TTS_API_KEY || "").trim();

    const cacheKey = getCacheKey(provider, language, cleanText);
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Content-Length", cached.buffer.length);
      res.setHeader("X-TTS-Cache", "HIT");
      return res.send(cached.buffer);
    }

    // Provider selection: 'google' (Cloud API), 'elevenlabs', or automatic stream fallback
    let audioBuffer = null;
    if (provider === "google" && apiKey) {
      try {
        audioBuffer = await synthesizeGoogleTTS(cleanText, language, apiKey);
      } catch (err) {
        console.warn(`[TTS] Google Cloud TTS failed, falling back to neural stream: ${err.message}`);
        audioBuffer = await synthesizeGoogleStreamTTS(cleanText, language);
      }
    } else if (provider === "elevenlabs" && apiKey) {
      try {
        audioBuffer = await synthesizeElevenLabsTTS(cleanText, language, apiKey);
      } catch (err) {
        console.warn(`[TTS] ElevenLabs failed, falling back to neural stream: ${err.message}`);
        audioBuffer = await synthesizeGoogleStreamTTS(cleanText, language);
      }
    } else {
      // Default: High-fidelity natural Indian Male voice streaming (Kannada: Gagan, Hindi: Madhur, English: Prabhat)
      try {
        audioBuffer = await synthesizeEdgeNeuralTTS(cleanText, language);
      } catch (edgeErr) {
        console.warn(`[TTS] Edge Neural Male TTS failed, falling back to stream: ${edgeErr.message}`);
        try {
          audioBuffer = await synthesizeGoogleStreamTTS(cleanText, language);
        } catch (streamErr) {
          console.warn(`[TTS] Google stream TTS failed: ${streamErr.message}`);
          return res.status(204).end();
        }
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(204).end();
    }

    // Add to in-memory cache
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(cacheKey, {
      buffer: audioBuffer,
      contentType: "audio/mpeg",
      timestamp: Date.now(),
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("X-TTS-Cache", "MISS");
    return res.send(audioBuffer);
  } catch (error) {
    console.warn(`[TTS] TTS synthesis error, falling back: ${error.message}`);
    return res.status(204).end();
  }
}

/**
 * Route handler for GET /api/tts/status
 */
export function getTTSStatus(req, res) {
  const provider = (process.env.TTS_PROVIDER || "google-stream").toLowerCase().trim();
  const hasKey = Boolean(process.env.TTS_API_KEY && process.env.TTS_API_KEY.trim());
  res.json({
    provider,
    configured: true,
    active: provider === "google" && hasKey ? "google-cloud" : provider === "elevenlabs" && hasKey ? "elevenlabs" : "stream-neural",
    languages: ["en", "hi", "kn"],
  });
}

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
  const isHindi = language === "Hindi" || language === "Hinglish";

  // Voices suited to a 62-year-old Indian man: en-IN for English, hi-IN for Hindi/Hinglish
  const languageCode = isHindi ? "hi-IN" : "en-IN";
  const voiceName = isHindi
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

    const provider = (process.env.TTS_PROVIDER || "none").toLowerCase().trim();
    const apiKey = (process.env.TTS_API_KEY || "").trim();

    // If TTS_PROVIDER is unset or "none" or no API key, return 204 for silent fallback
    if (provider === "none" || !provider || !apiKey) {
      return res.status(204).end();
    }

    const cacheKey = getCacheKey(provider, language, cleanText);
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Content-Length", cached.buffer.length);
      res.setHeader("X-TTS-Cache", "HIT");
      return res.send(cached.buffer);
    }

    let audioBuffer = null;
    if (provider === "google") {
      audioBuffer = await synthesizeGoogleTTS(cleanText, language, apiKey);
    } else if (provider === "elevenlabs") {
      audioBuffer = await synthesizeElevenLabsTTS(cleanText, language, apiKey);
    } else {
      return res.status(204).end();
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
  const provider = (process.env.TTS_PROVIDER || "none").toLowerCase().trim();
  const hasKey = Boolean(process.env.TTS_API_KEY && process.env.TTS_API_KEY.trim());
  res.json({
    provider,
    configured: provider !== "none" && hasKey,
    active: provider !== "none" && hasKey ? provider : "browser",
  });
}

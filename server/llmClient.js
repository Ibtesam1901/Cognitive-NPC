/**
 * LLM Client for calling OpenAI-compatible APIs (Gemini, Groq, OpenAI, Ollama).
 * Forces JSON output, handles timeouts (12s), and safely handles network errors.
 */

import OpenAI from "openai";

export function getClient(overrideConfig = {}) {
  const apiKey = overrideConfig.apiKey || process.env.LLM_API_KEY;
  const baseURL =
    overrideConfig.baseURL ||
    process.env.LLM_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta/openai/";

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_key_here") {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL,
    timeout: 12000,
  });
}

export async function callLLM(messages, config = {}, timeoutMs = 12000) {
  const client = getClient(config);
  if (!client) {
    throw new Error("No API key configured (using fallback brain)");
  }

  const model = config.model || process.env.LLM_MODEL || "gemini-flash-latest";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await client.chat.completions.create(
      {
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 350,
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);
    const content = res.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from LLM provider");
    }
    return content;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`LLM call timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

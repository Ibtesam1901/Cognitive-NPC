import { askLLM } from "./llm.js";
import { parseReply } from "./apply.js";

function applyFallbackSummary(state, old) {
  const playerStatements = old
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .slice(0, 2)
    .join("; ") || "brief greetings";
  state.summary = `We spoke earlier of farm troubles. The stranger said: "${playerStatements}". Trust sits at ${state.trust}.`;
  state.history.splice(0, 6);
}

// Keep recent turns verbatim; compress older ones into a running summary.
export async function maybeSummarize(state, overrideConfig = {}) {
  if (!state?.history || state.history.length <= 12) return;
  const old = state.history.slice(0, 6);
  const text = old.map((m) => `${m.role}: ${m.content}`).join("\n");
  
  try {
    const out = await askLLM(
      [
        {
          role: "system",
          content:
            'Summarize this conversation in 2 sentences from the farmer Raghu\'s point of view. Keep promises, lies, and favors. Reply ONLY as JSON: {"summary": "..."}',
        },
        { role: "user", content: `Previous summary: ${state.summary || "none"}\n\n${text}` },
      ],
      overrideConfig
    );
    const parsed = parseReply(out);
    if (parsed?.summary) {
      state.summary = parsed.summary;
      state.history.splice(0, 6);
    } else {
      applyFallbackSummary(state, old);
    }
  } catch (e) {
    console.error("summarize failed:", e?.message || e);
    applyFallbackSummary(state, old);
  }
}


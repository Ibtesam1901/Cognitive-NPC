import { askLLM } from "./llm.js";
import { parseReply } from "./apply.js";

// Keep recent turns verbatim; compress older ones into a running summary.
export async function maybeSummarize(state, overrideConfig = {}) {
  if (state.history.length <= 12) return;
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
      // Deterministic fallback summary if LLM did not return structured JSON
      const playerStatements = old
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .slice(0, 2)
        .join("; ");
      state.summary = `We spoke earlier of farm troubles. The stranger said: "${playerStatements}". Trust sits at ${state.trust}.`;
      state.history.splice(0, 6);
    }
  } catch (e) {
    console.error("summarize failed", e.message);
    // Even if remote LLM fails, summarize deterministically so history doesn't bloat
    const playerStatements = old
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .slice(0, 2)
      .join("; ");
    state.summary = `Earlier conversation: stranger mentioned "${playerStatements}". Trust is ${state.trust}.`;
    state.history.splice(0, 6);
  }
}

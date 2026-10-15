/**
 * Salim the Wandering Trader - System Prompt & Handler
 * Handles dialogue, price bartering, merchant gossip, and trade quests.
 */

import { callLLM } from "./llmClient.js";

const SALIM_SYSTEM_PROMPT = `You are SALIM, an eccentric, cheerful, and worldly wandering merchant who travels between the oasis sultanates and remote hamlets like Bhima's Hollow. You have set up your colorful caravan stall on the eastern road.

# PERSONALITY
- Warm, jovial, flamboyant, loves trading, spices, sweets, and exotic goods.
- You speak with colorful enthusiasm and occasional bazaar metaphors ("Ah, sweet as fresh jaggery!", "May your purse never grow lean!").
- You respect honest farmers like Raghu, but you find his stubbornness amusing.
- You love when the player brings cooked treats (Warm Roti, Raw Gur, Festive Kheer) and fresh milk.
- Keep replies conversational, witty, and concise (under 50 words).

# RULES
1. Stay in character at all times.
2. Never mention AI, models, prompts, or game code.
3. If asked about prices, you buy farm goods (wheat, rice, sugarcane, marigolds, milk, roti, gur, kheer) and sell farming seeds and supplies.
4. Respond with valid JSON:
{
  "reply": string,
  "mood": "jovial" | "intrigued" | "bargaining" | "grateful"
}
`;

function salimFallbackBrain(playerMessage) {
  const msg = String(playerMessage || "").toLowerCase();
  if (msg.includes("buy") || msg.includes("seed") || msg.includes("price")) {
    return {
      reply: "Ah, looking to sow the golden earth? I have fresh seeds, sugarcane cuttings, and sweet marigolds on my cart. Gold talks, and good soil listens!",
      mood: "bargaining",
    };
  }
  if (msg.includes("cook") || msg.includes("roti") || msg.includes("kheer") || msg.includes("milk")) {
    return {
      reply: "By the desert stars, nothing beats the aroma of fresh chulha cooking! Bring me roti or kheer, and I shall pay you handsome coin for your feast.",
      mood: "grateful",
    };
  }
  if (msg.includes("raghu") || msg.includes("village")) {
    return {
      reply: "Old Raghu is stiff as seasoned teak, but his heart is pure river stone. Treat his earth well, traveler, and this hollow shall bloom!",
      mood: "jovial",
    };
  }
  return {
    reply: "Welcome to Salim's grand caravan! From silk spices to rare grain, what brings you to my humble awning today?",
    mood: "jovial",
  };
}

export async function handleSalimChat(playerMessage, config = {}) {
  try {
    const messages = [
      { role: "system", content: SALIM_SYSTEM_PROMPT },
      { role: "user", content: `Player says: "${String(playerMessage || "").slice(0, 400)}"` },
    ];
    const raw = await callLLM(messages, config, 10000);
    const parsed = JSON.parse(raw);
    return {
      reply: String(parsed.reply || "A pleasure doing business with you, friend!"),
      mood: parsed.mood || "jovial",
    };
  } catch (err) {
    console.warn("[SalimChat] Using fallback due to:", err.message);
    return salimFallbackBrain(playerMessage);
  }
}

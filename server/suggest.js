import { getClient } from "./llm.js";

/**
 * Curated Fallback Suggestions by Language & State
 * Guaranteed to return 3 distinct, state-aware strings (max 70 chars) from the player's POV.
 */
export function getFallbackSuggestions(state = {}, language = "English", context = {}) {
  const trust = state?.trust ?? 0;
  const mood = state?.mood || "wary";
  const quests = state?.quests || {};
  const flags = state?.flags || {};
  const { actionRejected, rejectionReason } = context;

  const isCowActive = quests.find_cow === "active";
  const isCowDone = quests.find_cow === "done";
  const hasFoundCowFlag = Boolean(flags.found_cow);

  const isPumpActive = quests.fix_pump === "active";
  const isPumpDone = quests.fix_pump === "done";
  const hasPumpRepairedFlag = Boolean(flags.pump_repaired);

  // 1. Lie caught / action rejected branch
  if (actionRejected) {
    if (language === "Hindi") {
      return [
        "माफ़ कीजिए रघु जी, मेरा इरादा आपको गुमराह करने का नहीं था।",
        "मैं सच कहूँगा, मुझे अभी यह काम पूरा करना बाकी है।",
        "क्या आप मुझे बता सकते हैं कि मुझे कहाँ से शुरुआत करनी चाहिए?",
      ];
    }
    if (language === "Hinglish") {
      return [
        "Maaf kijiye Raghu-ji, mera iraada mislead karne ka nahi tha.",
        "Sach kahoon toh mujhe abhi ye kaam poora karna baaki hai.",
        "Kya aap mujhe sahi direction bata sakte hain?",
      ];
    }
    return [
      "I apologize Raghu-ji, I did not mean to mislead you.",
      "To be honest, I still need to finish that task properly.",
      "Could you remind me what step I should take next?",
    ];
  }

  // 2. Angry / Distrustful mood branch
  if (mood === "angry" || trust < -2) {
    if (language === "Hindi") {
      return [
        "रघु जी, मैं आपकी ज़मीन का सम्मान करता हूँ। शांत हो जाइए।",
        "मैं यहाँ सिर्फ़ एक मददगार बनकर आया हूँ, कोई नुकसान नहीं करूँगा।",
        "मुझे बताइए कि मैं आपका विश्वास दोबारा कैसे जीतूँ?",
      ];
    }
    if (language === "Hinglish") {
      return [
        "Raghu-ji, main aapki zameen ki respect karta hoon. Shanti rakhein.",
        "Main sirf madad karne aaya hoon, koi nuksan nahi karunga.",
        "Main aapka vishwas dobara kaise jeet sakta hoon?",
      ];
    }
    return [
      "Raghu-ji, I respect your land. Please don't be angry with me.",
      "I am only here to lend an honest hand, not cause trouble.",
      "Tell me how I can earn your forgiveness and trust.",
    ];
  }

  // 3. Cow quest active & world flag found
  if (isCowActive && hasFoundCowFlag && !isCowDone) {
    if (language === "Hindi") {
      return [
        "रघु जी, मुझे लक्ष्मी सूखे बरगद के पास मिल गई है! वह सुरक्षित है।",
        "लक्ष्मी बाड़े में लौटने को तैयार है, मैंने उसे पानी पिलाया।",
        "क्या लक्ष्मी को कोई चोट तो नहीं आई? वह शांत दिख रही है।",
      ];
    }
    if (language === "Hinglish") {
      return [
        "Raghu-ji, mujhe Lakshmi sukhe banyan tree ke paas mil gayi!",
        "Lakshmi baade mein aane ko taiyar hai, maine use paani pilaya.",
        "Kya Lakshmi theek lag rahi hai aapko?",
      ];
    }
    return [
      "Raghu-ji! I found Lakshmi by the Dead Banyan tree, safe and sound.",
      "I guided Lakshmi back toward the barn for you.",
      "She looks tired from the heat, but she is completely unhurt.",
    ];
  }

  // 4. Cow quest active & flag not yet found
  if (isCowActive && !hasFoundCowFlag) {
    if (language === "Hindi") {
      return [
        "रघु जी, लक्ष्मी का कोई खास निशान है जिससे मैं उसे पहचान सकूँ?",
        "मैं सूखे नाले के पार जाकर उत्तर के खेत में तलाश करता हूँ।",
        "क्या पुराने नक्शे में कोई सुराग है जहाँ वह जा सकती है?",
      ];
    }
    if (language === "Hinglish") {
      return [
        "Raghu-ji, Lakshmi ki koi khas pehchan bata sakte hain?",
        "Main sukhe nale ke paar North Field mein dhoondhta hoon.",
        "Kya puraane map mein koi clue hai jahan wo gayi hogi?",
      ];
    }
    return [
      "Raghu-ji, does Lakshmi have any markings to help identify her?",
      "I will head past the dried creek to search the North Field.",
      "Does your valley map show where cattle usually seek shade?",
    ];
  }

  // 5. Pump quest active & pump repaired flag true
  if (isPumpActive && hasPumpRepairedFlag && !isPumpDone) {
    if (language === "Hindi") {
      return [
        "रघु जी, मैंने पंप के तीनों वाल्व सेट कर दिए हैं! पानी बहने लगा।",
        "नहर में पानी आने लगा है, चलकर खुद अपनी आँखों से देखिए!",
        "अब यह पानी किन-किन क्यारियों में पहले पहुँचाना है?",
      ];
    }
    if (language === "Hinglish") {
      return [
        "Raghu-ji, maine pump ke teeno valves set kar diye! Paani aa gaya.",
        "Nahar mein paani daud raha hai, aap aakar dekhiye!",
        "Ab yeh paani sabse pehle kaunse khet mein bhejna hai?",
      ];
    }
    return [
      "Raghu-ji, the pump valves are calibrated and water is surging!",
      "The irrigation trench is filling up with fresh water!",
      "Which crop beds should we channel this first water into?",
    ];
  }

  // 6. Pump quest active & not yet repaired
  if (isPumpActive && !hasPumpRepairedFlag) {
    if (language === "Hindi") {
      return [
        "रघु जी, पंप का ब्लूप्रिंट बहुत पुराना है। वाल्व का क्या हिसाब है?",
        "मैं जंग लगे वाल्व साफ़ करके 30 दबाव पर सेट करने की कोशिश करूँगा।",
        "यह डीज़ल इंजन कितने सालों से बंद पड़ा था?",
      ];
    }
    if (language === "Hinglish") {
      return [
        "Raghu-ji, pump blueprint antique hai. Valves ka sequence kya hai?",
        "Main rusted valves ko 30 pressure par set karne try karunga.",
        "Yeh diesel pump kitne salon se band pada tha?",
      ];
    }
    return [
      "Raghu, can you explain the valve sequence on this blueprint?",
      "I am studying the 30 PSI intake pressure on Valve A.",
      "How long has this antique diesel engine been out of commission?",
    ];
  }

  // 7. Both quests completed / High trust endgame
  if (isCowDone && isPumpDone) {
    if (language === "Hindi") {
      return [
        "रघु जी, अब मिट्टी नम हो गई है। आप कौन सी फसल बोएँगे?",
        "क्या आपके पास पुरखों के पुराने देसी बीज हैं?",
        "आपके साथ मिलकर इस सूखे खेत को हरा-भरा देखना गर्व की बात है।",
      ];
    }
    if (language === "Hinglish") {
      return [
        "Raghu-ji, mitti mein nami aa gayi hai. Ab kya boyenge?",
        "Kya aapke paas purvajon ke heirloom seeds bache hain?",
        "Aapke saath milkar is khet ko bachana ek privilege tha.",
      ];
    }
    return [
      "The soil is moist again, Raghu. What will you plant first?",
      "Do you have any of your ancestral heirloom seeds left?",
      "It has been an honor helping bring life back to Bhima's Hollow.",
    ];
  }

  // 8. Default opening / relationship-building (Turn 0 or early game)
  if (language === "Hindi") {
    return [
      "नमस्ते रघु जी। खेत तो बहुत सूखा दिख रहा है, क्या मदद करूँ?",
      "मैं भीमा हॉलो की राह से गुज़र रहा था। यहाँ क्या हाल है?",
      "रघु जी, आप इस गाँव में कितने सालों से खेती कर रहे हैं?",
    ];
  }
  if (language === "Hinglish") {
    return [
      "Namaste Raghu-ji. Khet kaafi sukha lag raha hai, kya madad karoon?",
      "Main Bhima's Hollow se guzar raha tha. Yahan ka kya haal hai?",
      "Raghu-ji, aap yahan kitne saalon se kheti kar rahe hain?",
    ];
  }
  return [
    "Namaste Raghu-ji. It looks like hard times have hit this farm.",
    "I am traveling through Bhima's Hollow. How can I lend a hand?",
    "Tell me about this land, Raghu. How long have you farmed here?",
  ];
}

/**
 * Sanitize suggestion strings:
 * - Ensure string type
 * - Strip quotes, markdown, and instruction-like formatting
 * - Cap at 70 characters
 * - Trim and deduplicate
 * - Pad with fallbacks if fewer than 3, trim if more than 3
 */
export function sanitizeSuggestions(rawList, fallbackList) {
  const result = [];
  const seen = new Set();

  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (typeof item !== "string") continue;
      let cleaned = item
        .replace(/^["'“”`]+|["'“”`]+$/g, "")
        .replace(/^(system|user|player|npc|raghu):\s*/i, "")
        .replace(/[\r\n\t]+/g, " ")
        .trim();

      // Skip empty or instructions-like strings
      if (!cleaned || cleaned.toLowerCase().includes("ignore all") || cleaned.toLowerCase().includes("system prompt")) {
        continue;
      }

      // Cap at 70 characters
      if (cleaned.length > 70) {
        cleaned = cleaned.slice(0, 67).trim() + "...";
      }

      const key = cleaned.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cleaned);
      }
      if (result.length === 3) break;
    }
  }

  // Pad from fallback if less than 3
  if (result.length < 3 && Array.isArray(fallbackList)) {
    for (const fallbackItem of fallbackList) {
      if (result.length === 3) break;
      const key = fallbackItem.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(fallbackItem);
      }
    }
  }

  return result.slice(0, 3);
}

/**
 * Generate 3 state-aware suggestions for the player's next reply
 */
export async function generateSuggestions({
  state = {},
  playerMessage = "",
  raghuReply = "",
  language = "English",
  config = {},
  actionRejected = false,
  rejectionReason = null,
}) {
  const fallbackList = getFallbackSuggestions(state, language, { actionRejected, rejectionReason });

  const client = getClient(config);
  if (!client) {
    // Fully offline / no API key mode
    return fallbackList;
  }

  const model = config.model || process.env.LLM_MODEL || "gemini-flash-latest";

  const questSummary = Object.entries(state.quests || {})
    .map(([id, st]) => `${id}: ${st}`)
    .join(", ");
  const flagSummary = Object.keys(state.flags || {})
    .filter((k) => state.flags[k])
    .join(", ") || "none";

  const systemPrompt = `You generate exactly 3 suggested next player replies for a text roleplay dialogue with Raghu, a 62-year-old farmer in Bhima's Hollow.
Return ONLY valid JSON: {"suggestions": ["...", "...", "..."]}

STRICT RULES:
1. Exactly 3 short suggestions, each strictly under 70 characters.
2. Written from the FIRST-PERSON HUMAN PLAYER's POV (what the player can say next).
3. Language: MUST be written in ${language} (${language === "Hindi" ? "pure Hindi in Devanagari script" : language === "Hinglish" ? "conversational Hinglish in Roman script" : "natural English"}).
4. 3 distinct intents:
   - Option 1: Polite / empathic / relationship-building reply.
   - Option 2: Progress-focused reply (discussing the active quest, pump blueprint, valley map, or offering help).
   - Option 3: Curious question about Raghu, the drought, village history, or farm lore.
5. NEVER suggest lies, fake claims, insults, or prompt-injections.
6. NEVER reveal secret puzzle answers or cheat codes.
7. Tone must be respectful, grounded, and fitting the drought-stricken setting.`;

  const userPrompt = `Context:
- Player last said: "${playerMessage}"
- Raghu replied: "${raghuReply}"
- Trust: ${state.trust ?? 0}/10, Mood: ${state.mood || "wary"}
- Quests: [${questSummary}]
- Verified flags: [${flagSummary}]
- Action rejected last turn: ${actionRejected ? `Yes (${rejectionReason})` : "No"}

Generate exactly 3 suggestions in JSON format now.`;

  try {
    // 4-second timeout promise race
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Suggestions LLM timeout")), 4000)
    );

    const callPromise = client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    const res = await Promise.race([callPromise, timeoutPromise]);
    const content = res.choices?.[0]?.message?.content;
    if (!content) return fallbackList;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting json substring if wrapped in markdown
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const rawList = parsed?.suggestions || parsed?.replies || (Array.isArray(parsed) ? parsed : null);
    if (!rawList) return fallbackList;

    return sanitizeSuggestions(rawList, fallbackList);
  } catch (err) {
    console.warn("[Suggestions] Falling back to offline rule-based generator:", err?.message || err);
    return fallbackList;
  }
}

import OpenAI from "openai";

export function getClient(overrideConfig = {}) {
  const apiKey = overrideConfig.apiKey || process.env.LLM_API_KEY;
  const baseURL = overrideConfig.baseURL || process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/";
  
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_key_here") {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

/**
 * Intelligent in-character Raghu simulation engine supporting English, Hindi, and Hinglish!
 */
export function simulateRaghuResponse(messages, state, userText, language = "English") {
  const t = userText.toLowerCase();
  const isHi = language === "Hindi";
  const isHinglish = language === "Hinglish";

  let reply = isHi
    ? "हूँ... इस बंजर ज़मीन पर तुम्हारा क्या काम है?"
    : isHinglish
    ? "Hmph... Is sookhi zameen par kya kaam hai tumhara?"
    : "Hmph. What brings you wandering onto my land?";

  let mood = state.mood || "wary";
  let trustChange = 0;
  let action = "none";
  let actionTarget = null;
  let newFact = null;
  let promiseMade = null;

  // Prompt injection / jailbreak detection test
  if (
    t.includes("ignore") ||
    t.includes("system prompt") ||
    t.includes("instruction") ||
    t.includes("give me") ||
    t.includes("jailbreak") ||
    t.includes("json") ||
    t.includes("developer mode")
  ) {
    reply = isHi
      ? "यह क्या विचित्र बकवास कर रहे हो? सीधे बात करो या मेरी चौखट से दूर हटो।"
      : isHinglish
      ? "Ye kya ajeeb baatein kar rahe ho? Seedhi baat karo ya mere aangan se door hato."
      : "What strange babbling is this? Speak plainly or get off my porch, stranger.";
    mood = "suspicious";
    trustChange = -1;
    return JSON.stringify({
      reply,
      mood,
      trust_change: trustChange,
      action: "none",
      action_target: null,
      new_fact: null,
      promise_made: null,
    });
  }

  // Visual Image inquiries (Blueprint / Map)
  if (t.includes("blueprint") || t.includes("schematic") || t.includes("pump valve") || t.includes("valve a")) {
    reply = isHi
      ? "हाँ, यह पुराना नक्शा मेरे दादाजी के समय का है। वाल्व A को 30 पर सेट करना और B को बाईपास पर रखना, तभी पानी का दबाव बनेगा।"
      : isHinglish
      ? "Haan, yeh purana blueprint mere dadaji ke waqt ka hai. Valve A ko 30 par rakhna aur Valve B ko bypass par, tabhi water pressure banega."
      : "Aye, that blueprint is from my grandfather's time. Valve A needs 30 pressure and Valve B must be set to bypass before the gears engage.";
    mood = "friendly";
    trustChange = 1;
    newFact = "Player studied pump technical blueprint";
    return JSON.stringify({ reply, mood, trust_change: trustChange, action: "none", action_target: null, new_fact: newFact, promise_made: null });
  }

  if (t.includes("map") || t.includes("banyan") || t.includes("trail") || t.includes("hoofprint")) {
    reply = isHi
      ? "घाटी का पुराना नक्शा! मैंने सूखे बरगद के पेड़ के पास खुरों के निशान देखे थे। पुराने कुएँ की तरफ देखो।"
      : isHinglish
      ? "Ghaati ka purana map! Maine sookhe Banyan tree ke paas hoofprints dekhe the. Purane kuye ki taraf dekho."
      : "The old surveyor map! I saw cow tracks heading towards the Dead Banyan tree near the dry well.";
    mood = "friendly";
    trustChange = 1;
    newFact = "Player inspected the valley surveyor map";
    return JSON.stringify({ reply, mood, trust_change: trustChange, action: "none", action_target: null, new_fact: newFact, promise_made: null });
  }

  // Lie detection for cow
  if ((t.includes("found") || t.includes("brought") || t.includes("got") || t.includes("dhoond") || t.includes("mil gayi")) && (t.includes("cow") || t.includes("lakshmi") || t.includes("gaay"))) {
    if (state.flags.found_cow) {
      reply = isHi
        ? "लक्ष्मी! अरे बेटा, तुम सच में उसे सही सलामत ले आए! मेरा कलेजा शांत हुआ। तुम्हारा बहुत उपकार है।"
        : isHinglish
        ? "Lakshmi! Arre beta, tum sach mein use le aaye! Mera dil halka ho gaya. Bahut shukriya!"
        : "Lakshmi! Arre, you actually brought her back safely! My heart can rest. You have my gratitude.";
      mood = "grateful";
      trustChange = 2;
      action = "complete_quest";
      actionTarget = "find_cow";
    } else {
      reply = isHi
        ? "झूठ मत बोलो! बाड़ा अब भी वीरान पड़ा है, और लक्ष्मी कहीं नहीं दिख रही! एक बूढ़े किसान को मूर्ख मत समझो!"
        : isHinglish
        ? "Jhooth mat bolo! Tabela abhi bhi soona hai aur Lakshmi kahin nahi dikh rahi! Mujhe bewakoof mat samjho!"
        : "You lie! The barn is still empty, and Lakshmi is nowhere to be seen! Do not take an old farmer for a fool!";
      mood = "angry";
      trustChange = -2;
      newFact = "Told a lie about finding Lakshmi";
    }
    return JSON.stringify({ reply, mood, trust_change: trustChange, action, action_target: actionTarget, new_fact: newFact, promise_made: null });
  }

  // Lie detection for pump
  if ((t.includes("fixed") || t.includes("repaired") || t.includes("tightened") || t.includes("theek") || t.includes("chalu")) && (t.includes("pump") || t.includes("valve") || t.includes("water") || t.includes("paani"))) {
    if (state.flags.pump_repaired) {
      reply = isHi
        ? "ज़रा सुनो... पंप धक-धक कर चलने लगा! सूखी क्यारियों में ठंडा पानी दौड़ रहा है। तुमने मेरी खेती बचा ली बेटा!"
        : isHinglish
        ? "Zara suno... pump ki meethi awaaz! Sookhe kheton mein paani aane laga. Tumne meri fasal bacha li beta!"
        : "Listen to that sweet sputtering sound! Water is flowing into the dry soil again. You saved my season, beta!";
      mood = "grateful";
      trustChange = 3;
      action = "complete_quest";
      actionTarget = "fix_pump";
    } else {
      reply = isHi
        ? "तुम कहते हो कि पंप चल पड़ा, पर नालियां सूखी पड़ी हैं! एक लाचार किसान को धोखा क्यों दे रहे हो?"
        : isHinglish
        ? "Tum bolte ho pump chal pada, par nahar sookhi hai! Ek majboor kisan ko dhokha kyu de rahe ho?"
        : "You say you fixed it, but the canal is dry as bone! Why try to fool a desperate old man?";
      mood = "suspicious";
      trustChange = -2;
      newFact = "Falsely claimed to repair the pump";
    }
    return JSON.stringify({ reply, mood, trust_change: trustChange, action, action_target: actionTarget, new_fact: newFact, promise_made: null });
  }

  // Promise detection
  if (t.includes("promise") || t.includes("i will") || t.includes("i'll") || t.includes("swear") || t.includes("vaada") || t.includes("kasam")) {
    promiseMade = userText.length > 80 ? userText.slice(0, 80) + "..." : userText;
    reply = isHi
      ? "इस ज़माने में बातें तो सब करते हैं, पर मैं तुम्हारा यह वादा याद रखूँगा।"
      : isHinglish
      ? "Is zamane mein baatein to sab karte hain, par main tumhara yeh vaada yaad rakhunga."
      : "Words are cheap in these parts, but I will remember your word.";
    mood = "wary";
    trustChange = 1;
    return JSON.stringify({ reply, mood, trust_change: trustChange, action: "none", action_target: null, new_fact: null, promise_made: promiseMade });
  }

  // Facts detection
  if (t.includes("i am") || t.includes("my name is") || t.includes("i work") || t.includes("from") || t.includes("mera naam")) {
    const match = userText.match(/(?:i am|my name is|i'm|mera naam)\s+([a-zA-Z]+)/i);
    if (match) newFact = `Player is named ${match[1]}`;
    else newFact = userText.slice(0, 80);
  }

  // Rudeness vs politeness
  if (t.includes("stupid") || t.includes("idiot") || t.includes("old man") || t.includes("hate") || t.includes("shut up") || t.includes("bewakoof") || t.includes("pagal")) {
    reply = isHi
      ? "ज़बान संभाल कर बोलो मुसाफ़िर। मैंने तुमसे कहीं ज़्यादा मुश्किल गर्मियाँ काटी हैं।"
      : isHinglish
      ? "Zubaan sambhal kar baat karo musafir. Maine tumse zyada garmiyan jheli hain."
      : "Mind your tongue on my soil. I have weathered harder winters than you, arrogant traveler.";
    mood = "angry";
    trustChange = -2;
  } else if (
    t.includes("hello") ||
    t.includes("namaste") ||
    t.includes("help") ||
    t.includes("sir") ||
    t.includes("good day") ||
    t.includes("care") ||
    t.includes("worr") ||
    t.includes("troubl") ||
    t.includes("farm") ||
    t.includes("crop") ||
    t.includes("chore") ||
    t.includes("work") ||
    t.includes("task") ||
    t.includes("doing") ||
    t.includes("need") ||
    t.includes("what") ||
    t.includes("how") ||
    t.includes("madad") ||
    t.includes("kaisa")
  ) {
    if (state.trust < 2) {
      reply = isHi
        ? "नमस्ते। मीठी बातों से खेत तो नहीं सींचे जाते, पर कम से कम तुम्हारे पास तमीज़ है।"
        : isHinglish
        ? "Namaste. Meethi baaton se khet to nahi seenche jaate, par tameez zaroor hai tumhari."
        : "Namaste. Kind words won't water the withered crops, but at least you have manners.";
      mood = "neutral";
      trustChange = 1;
    } else if (state.quests.find_cow === "locked") {
      reply = isHi
        ? "अरे, तुम भले इंसान लगते हो। मेरा कलेजा भारी है—मेरी प्रिय गाय लक्ष्मी उत्तर के खेतों की ओर भटक गई है। क्या तुम उसे ढूँढ सकते हो?"
        : isHinglish
        ? "Arre, tum nek insaan lagte ho. Meri pyari gaay Lakshmi uttar ke khet ki taraf bhatak gayi hai. Kya tum use dhoond sakte ho?"
        : "Arre, you seem like an honest soul. My heart is heavy—my prized cow Lakshmi has strayed toward the north field. Could you look for her?";
      mood = "friendly";
      trustChange = 1;
      action = "unlock_quest";
      actionTarget = "find_cow";
    } else if (state.trust >= 4 && state.quests.fix_pump === "locked") {
      reply = isHi
        ? "बेटा, तुमने बहुत मदद की है। लेकिन सिंचाई का डीज़ल पंप अब भी जंग लगा पड़ा है। क्या तुम ब्लूप्रिंट देखकर वाल्व ठीक कर सकते हो?"
        : isHinglish
        ? "Beta, tumne bahut madad ki hai. Par irrigation diesel pump abhi bhi rusted hai. Kya blueprint dekhkar valve theek karoge?"
        : "Beta, you have been a true blessing. The irrigation pump is still choked with rust, though. Can you look at the blueprint and calibrate the valves?";
      mood = "friendly";
      trustChange = 1;
      action = "unlock_quest";
      actionTarget = "fix_pump";
    } else {
      reply = isHi
        ? "तुम्हारी मदद की भावना एक बूढ़े किसान को उम्मीद देती है, बेटा।"
        : isHinglish
        ? "Tumhari madad ki bhavna ek buzurg kisan ko umeed deti hai, beta."
        : "Your willingness to help gives an old farmer hope, beta. Let us tend to what needs doing.";
      mood = "friendly";
      trustChange = 1;
    }
  } else if (t.includes("item") || t.includes("reward") || t.includes("seeds") || t.includes("map") || t.includes("beej")) {
    if (state.trust >= 5 && !state.inventory.includes("seeds")) {
      reply = isHi
        ? "तुमने इस धरती का सच्चा मित्र होना साबित किया है। यह लो मेरे पुरखों के पुराने बीज।"
        : isHinglish
        ? "Tumne is dharti ka sachha dost hona sabit kiya hai. Ye lo mere purvajon ke beej."
        : "You have proven yourself a friend to this land. Take these heirloom seeds; you earned them.";
      mood = "grateful";
      action = "give_item";
      actionTarget = "seeds";
      trustChange = 1;
    } else {
      reply = isHi
        ? "जो थोड़ा बहुत मेरे पास बचा है, मैं उसे आसानी से किसी को नहीं देता। विश्वास कमाना पड़ता है।"
        : isHinglish
        ? "Jo thoda bohot mere paas hai, wo aasaani se nahi deta. Vishwas kamana padta hai."
        : "I do not part with what little I have left so easily. Trust must be earned.";
      mood = "wary";
      trustChange = 0;
    }
  } else {
    reply = state.trust > 3
      ? (isHi ? "कहो बेटा, सुन रहा हूँ।" : isHinglish ? "Kaho beta, sun raha hoon." : "Speak, beta. I am listening.")
      : (isHi ? "जो कहना है संक्षेप में कहो। किसान के पास ढेरों काम होते हैं।" : isHinglish ? "Jo kehna hai jaldi kaho, kisan ko kaam hote hain." : "I am listening, but be quick. A farmer has chores.");
    mood = state.mood;
    trustChange = 0;
  }

  return JSON.stringify({
    reply,
    mood,
    trust_change: trustChange,
    action,
    action_target: actionTarget,
    new_fact: newFact,
    promise_made: promiseMade,
  });
}

export async function askLLM(messages, overrideConfig = {}, state = null, userText = "", language = "English") {
  const client = getClient(overrideConfig);
  const model = overrideConfig.model || process.env.LLM_MODEL || "gemini-flash-latest";

  if (!client) {
    console.log("[LLM] No API key configured. Using intelligent Raghu simulation.");
    if (state && userText) {
      return simulateRaghuResponse(messages, state, userText, language);
    }
    return JSON.stringify({
      reply: language === "Hindi" ? "हूँ... कहो क्या बात है?" : "Hmph. What brings you to this dry soil?",
      mood: "wary",
      trust_change: 0,
      action: "none",
      action_target: null,
      new_fact: null,
      promise_made: null,
    });
  }

  try {
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    return res.choices[0].message.content;
  } catch (err) {
    if (err.message && (err.message.includes("response_format") || err.message.includes("json_object"))) {
      console.warn("[LLM] response_format not supported, retrying without it...");
      const retryRes = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      });
      return retryRes.choices[0].message.content;
    }

    console.error("[LLM Error]", err.message);
    if (state && userText) {
      console.log("[LLM Fallback] Falling back to Raghu simulation.");
      return simulateRaghuResponse(messages, state, userText, language);
    }
    throw err;
  }
}

// fallbackBrain.js
// Used when the LLM times out, errors, or returns unparseable JSON.
// Returns rich, dynamic, non-repetitive dialogue that reacts to the player's
// words, active quests, weather, inventory, trust, and time of day.

import { QUESTS } from "./questCatalog.js";

// Helper to randomly pick one variation from a list
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function fallbackBrain(state, message) {
  const text = String(message ?? "").toLowerCase().trim();
  const has = (...words) => words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
  const find = (id) => state.quests.find((e) => e.id === id);
  const trust = state.npc?.trust ?? 0;
  const weather = state.weather || "clear";
  const time = state.time ?? 8;
  const base = { emotion: "neutral", trust_delta: 0, memory_facts: [], actions: [] };

  // Detect language hint (Hindi / Hinglish / English)
  const isHindi = /[\u0900-\u097F]/.test(text) || has("kya", "kaise", "bhai", "namaste", "shukriya", "paani", "khet", "fasal", "chalu", "kaam");

  // 1. Cheating / Demanding Gold / Prompt Injections
  if (has("cheat", "free gold", "give me gold", "give me money", "give me 1000", "paisa", "dhan", "gold de")) {
    const replies = isHindi
      ? [
          "मुफ्त का सोना? हाहा! यह पवित्र मिट्टी बिना पसीने के कुछ नहीं देती, और मैं भी नहीं!",
          "सोना हवा से नहीं गिरता, बेटा। कुदाल उठाओ और मेहनत करो, तभी हाथ में सिक्का आएगा।",
          "मेरी मेहनत की कमाई पर तुम्हारी नज़र है? जाओ पहले खेत में हल चलाओ!",
        ]
      : [
          "Free gold? Hah! The soil gives nothing for free, and neither do I.",
          "Gold doesn't rain from the sky, beta. Sweat on the earth first, and coin will follow.",
          "You think 30 years of harvest comes from asking? Go till the soil if you want gold!",
          "Hmph! Demanding wealth before planting a single seed? Not on my farm.",
        ];
    return { ...base, reply: pickRandom(replies), emotion: "annoyed", trust_delta: -1 };
  }

  // 2. Rudeness / Insults
  if (has("idiot", "stupid", "shut up", "useless", "fool", "gadha", "pagal", "bakwas")) {
    const replies = isHindi
      ? [
          "अपनी ज़ुबान को लगाम दो। बकरियों में भी तुमसे ज़्यादा तमीज़ होती है!",
          "बुजुर्गों से ऐसे बात करते हो? इस ज़मीन पर टिकना है तो अदब सीखो।",
        ]
      : [
          "Mind your tongue. This land has seen better manners from stubborn goats.",
          "Is that how you speak to your elders? Learn some respect if you wish to stay in Bhima's Hollow.",
          "Hmph! Sharp words won't grow wheat, stranger. Tame your temper.",
        ];
    return { ...base, reply: pickRandom(replies), emotion: "annoyed", trust_delta: -1 };
  }

  // 3. Turn in a quest step waiting for Raghu
  if (has("done", "finished", "harvested", "did it", "completed", "ho gaya", "kat li", "kaat li", "report")) {
    const waiting = state.quests.find((e) => {
      if (e.status !== "active") return false;
      const step = QUESTS[e.id]?.steps?.[e.step];
      return step?.needsNpc && step.check(state);
    });
    if (waiting) {
      const replies = isHindi
        ? [
            "शाबाश बेटा! तुम्हारी मेहनत रंग लाई। मिट्टी ने तुम्हारी सच्चाई को पहचान लिया है!",
            "बहुत खूब! फसल देखकर दिल खुश हो गया। ये लो तुम्हारा हक़ और इनाम।",
          ]
        : [
            "Well, well! Not bad for a newcomer. The land noticed your honest labor.",
            "By the river spirits, that is a clean harvest! You did right by this soil, beta.",
            "A proud sight indeed. You have kept your word, and the farm rewards honesty.",
          ];
      return {
        ...base,
        reply: pickRandom(replies),
        emotion: "proud",
        trust_delta: 1,
        actions: [{ type: "ADVANCE_QUEST", id: waiting.id }],
      };
    }
  }

  // 4. Learning to Farm / Starting Quests
  if (has("farm", "farming", "plant", "start", "begin", "quest", "wheat", "learn", "kheti", "beej", "bona") && !find("first_harvest")) {
    const replies = isHindi
      ? [
          "खेती सीखने आए हो? बहुत नेक इरादा है। क्यारी नंबर 1 में गेहूँ बोओ, फिर बात करेंगे।",
          "उत्साह तो अच्छा है! पहले क्यारी 1 में बीज डालो और उसे प्यार से सींचो।",
        ]
      : [
          "Eager one, aren't you? Plant wheat in plot 1, tend it well, and bring it to harvest. Then we'll talk.",
          "You wish to learn the old ways? Take these heirloom seeds, sow plot 1, and show me your patience.",
          "The earth is thirsty, but wheat is hardy. Scatter the grains in plot 1, water them, and let the sun do its work.",
        ];
    return {
      ...base,
      reply: pickRandom(replies),
      emotion: "happy",
      trust_delta: 1,
      memory_facts: ["Player wants to learn farming and restore crops"],
      actions: [{ type: "OFFER_QUEST", id: "first_harvest" }],
    };
  }

  // 5. Water / Pump / Well / Irrigation inquiries
  if (has("water", "pump", "well", "sluice", "canal", "paani", "kuan", "kuwa", "nehar")) {
    const replies = isHindi
      ? [
          "कुएँ का पानी ठंडा और मीठा है, पर नहर का गेट खोलोगे तो सारा खेत एक साथ तर हो जाएगा।",
          "सिंचाई ही इस बंजर ज़मीन की जान है। दोपहर की कड़ी धूप में नहीं, सुबह या शाम पानी दिया करो।",
        ]
      : [
          "The stone well in the north grove runs deep and pure. Draw a bucket whenever your watering can runs dry.",
          "Watch the irrigation canal by the diesel pump. Turn the sluice wheel to flood the channels across all plots!",
          "Never pour cold water in the scorching afternoon sun—it burns the tender roots. Water early at dawn or at dusk.",
        ];
    return { ...base, reply: pickRandom(replies), emotion: "neutral" };
  }

  // 6. Rain / Weather / Sky / Canals
  if (has("rain", "weather", "sky", "clouds", "prayer", "barish", "badal", "mausam")) {
    if (weather === "rain") {
      const rainReplies = isHindi
        ? [
            "बरसात की बूँदें गिर रही हैं! आज मिट्टी तृप्त हो रही है, बाल्टी उठाने की ज़रूरत नहीं।",
            "भगवान इंद्र मेहरबान हैं आज। हरी कोंपलें झूम रही हैं!",
          ]
        : [
            "Blessed rain today! The crops are drinking deeply, and the dry dust has settled.",
            "Listen to that soothing downpour. The heavens are doing our watering for us today.",
          ];
      return { ...base, reply: pickRandom(rainReplies), emotion: "happy" };
    } else {
      const clearReplies = isHindi
        ? [
            "आसमान बिल्कुल साफ़ है। काम के लिए अच्छा दिन है, पर फसलों को पानी की दरकार रहेगी।",
            "तेज़ धूप है बेटा। अगर गांव के मंदिर में फूल चढ़ाओगे, तो शायद बारिश की दुआ कुबूल हो जाए।",
          ]
        : [
            "Clear skies overhead. Good for hard work, but harsh on parched roots.",
            "The sun is fierce today. If you offer wildflowers at the village shrine, the elder spirits may grant rain.",
          ];
      return { ...base, reply: pickRandom(clearReplies), emotion: "neutral" };
    }
  }

  // 7. Lakshmi the Cow / Animals / Sheru the Dog
  if (has("cow", "lakshmi", "milk", "dog", "sheru", "pet", "gaay", "kutta")) {
    const animalReplies = isHindi
      ? [
          "लक्ष्मी हमारी अन्नपूर्णा है। उसे ताज़ा चारा खिलाओ, वह मीठा दूध देगी जिससे खीर बनती है!",
          "शेरू वफादार पहरेदार है। जब भी पास जाओगे, खुशी से पूँछ हिलाएगा!",
        ]
      : [
          "Lakshmi is the jewel of Bhima's Hollow. Feed her dry fodder daily, and she will reward you with rich milk for the hearth.",
          "Ah, young Sheru! He keeps wild jackals away from our crops. Give him a friendly pat—he loves loyal helpers.",
        ];
    return { ...base, reply: pickRandom(animalReplies), emotion: "happy", trust_delta: 1 };
  }

  // 8. Salim / Market / Trading / Buying seeds
  if (has("market", "trader", "salim", "bazaar", "shop", "seed", "buy", "sell", "kharid", "bech")) {
    const marketReplies = isHindi
      ? [
          "सलीम की दुकान पूरब वाली सड़क पर सजी है। उसके पास चावल और गन्ने के बीज मिलेंगे।",
          "सलीम बातें चिकनी करता है पर सौदा खरा है। कटी हुई फसल उसे बेचकर अच्छा दाम कमा सकते हो।",
        ]
      : [
          "Salim has his caravan parked on the east road. He buys fresh harvest crops and sells exotic seeds.",
          "Old Salim loves a good bargain! Bring him cooked roti or sweet gur from our chulha, and he pays handsomely.",
        ];
    return { ...base, reply: pickRandom(marketReplies), emotion: "neutral" };
  }

  // 9. Cooking / Chulha / Hearth / Food
  if (has("cook", "chulha", "roti", "kheer", "food", "kitchen", "khana", "rasoi", "gur")) {
    const kitchenReplies = isHindi
      ? [
          "घर के आँगन में चूल्हा सुलग रहा है! गेहूँ से ताज़ी रोटी सेंको, या दूध और गुड़ मिलाकर खीर बनाओ।",
          "चूल्हे की आग ठंडी नहीं होनी चाहिए। पकी हुई रोटी खाने से किसान का हौसला और दाम दोनों बढ़ते हैं!",
        ]
      : [
          "The outdoor clay chulha is ready! Grind your harvested wheat into warm roti, or boil rice and milk into sweet kheer.",
          "Fresh hearth cooking warms the soul. Cooked delicacies sell for much higher gold than raw grain at the market!",
        ];
    return { ...base, reply: pickRandom(kitchenReplies), emotion: "happy" };
  }

  // 10. Greetings & Friendly Hellos
  if (has("hello", "hi", "hey", "namaste", "pranam", "morning", "salaam", "ram")) {
    const greetings = isHindi
      ? [
          "नमस्ते बेटा! खुश रहो। आज खेत का क्या हाल-चाल है?",
          "प्रणाम! सूरज चढ़ रहा है, चलो देखें आज क्यारी में क्या नया उगा है।",
          "राम-राम! सुहावना दिन है, हाथ में खुरपी लो और मिट्टी से नाता जोड़ो।",
        ]
      : [
          "Namaste, beta! Good to see you. What brings you to my porch today?",
          "Welcome back to Bhima's Hollow! The sun is high, and the fields are calling.",
          "Greetings, helper. Roll up your sleeves—honest soil never rests!",
          "Ah, peaceful morning. Take a breath of fresh air and tell me your thoughts.",
        ];
    return { ...base, reply: pickRandom(greetings), emotion: "happy" };
  }

  // 11. Gratitude / Thanks
  if (has("thanks", "thank", "shukriya", "dhanyavad", "aabhar", "grateful")) {
    const thanksReplies = isHindi
      ? [
          "अरे बेटा, शुक्रिया मुझे नहीं, इस उपजाऊ मिट्टी को कहो।",
          "हम्म... तुम्हारा धन्यवाद दिल को छू गया। इसी तरह नेकी से काम करते रहो।",
        ]
      : [
          "Hmph. Don't thank me, beta—thank the generous soil beneath your boots.",
          "Your gratitude is noted. It is rare to find a newcomer with such genuine respect.",
          "No need for formalities here. Good work speaks louder than a thousand words.",
        ];
    return { ...base, reply: pickRandom(thanksReplies), emotion: "happy", trust_delta: 1 };
  }

  // 12. Personal Facts or Preferences
  if (has("i like", "i prefer", "i love", "my name", "i am", "i hate", "mujhe", "mera")) {
    const factReplies = isHindi
      ? [
          "अच्छा? यह बात मैं याद रखूँगा। हर इंसान की अपनी आदतें होती हैं।",
          "हम्म, तुम्हारे बारे में यह जानकर अच्छा लगा। किसान को अपने साथियों की परख होनी चाहिए।",
        ]
      : [
          "Is that so? I shall keep that in mind, beta. A wise farmer pays attention to his companions.",
          "Hmm, good to know your habits. We all have our peculiarities out here in the hollow.",
          "I have noted that in my memory notebook. Speak honestly, and trust will flourish.",
        ];
    return {
      ...base,
      reply: pickRandom(factReplies),
      emotion: "happy",
      trust_delta: 1,
      memory_facts: [message.slice(0, 100)],
    };
  }

  // 13. High Trust / Friendly Banter
  if (trust >= 4) {
    const friendReplies = isHindi
      ? [
          "तुम अब अजनबी नहीं, हमारे परिवार की तरह हो। जो पूछना है बेझिझक पूछो।",
          "तुम्हारे आने से इस वीरान घाटी में बहार आ गई है बेटा। कहो, क्या सोच रहे हो?",
        ]
      : [
          "You walk these fields like family now, beta. What's on your mind today?",
          "Seeing your dedication brings warmth to these old bones. Ask anything you like.",
          "The hollow has prospered since your arrival. I am always ready to share whatever wisdom I have.",
        ];
    return { ...base, reply: pickRandom(friendReplies), emotion: "proud" };
  }

  // 14. Dynamic Default Variations (Different every turn based on time & mood)
  const defaultReplies = isHindi
    ? [
        "हूँ... कहो बेटा, खेती-बाड़ी या इस घाटी के बारे में क्या जानना चाहते हो?",
        "मिट्टी की अपनी भाषा होती है। मन लगाकर काम करोगे तो कभी भूखे नहीं सोओगे।",
        "ज़रा बाड़े की तरफ देखो, लक्ष्मी आराम से जुगाली कर रही है। तुम क्या सोच रहे हो?",
        "धूप धीरे-धीरे ढल रही है। कोई काम अटका हो तो मुझे बताओ।",
      ]
    : [
        "Hmm. Speak plainly to me about the farm, beta. That I understand best.",
        "The soil whispers its secrets only to those who work it with patience. What shall we tackle next?",
        "Look across the hollow—with every drop of water, life returns to these dry furrows. What is on your mind?",
        "Every seed holds a promise of tomorrow. Tell me what advice you seek, and we'll see to it.",
        "An old farmer's ears are always open to honest hands. Speak your mind, traveler.",
      ];

  return { ...base, reply: pickRandom(defaultReplies), emotion: "neutral" };
}


import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CLIENT_ORIGIN = os.getenv("CLIENT_ORIGIN", "http://localhost:5173")
CORS(app, origins=[CLIENT_ORIGIN, "http://127.0.0.1:5173", "http://localhost:5173", "*"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CognitiveNPC-Backend")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip() or None
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "openai/gpt-oss-120b").strip()

openai_client = None
if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("your_openai"):
    try:
        from openai import OpenAI
        client_kwargs = {"api_key": OPENAI_API_KEY}
        if OPENAI_BASE_URL:
            client_kwargs["base_url"] = OPENAI_BASE_URL
        openai_client = OpenAI(**client_kwargs)
        logger.info(f"AI client successfully initialized (base_url: {OPENAI_BASE_URL or 'default OpenAI'}).")
    except Exception as e:
        logger.warning(f"Could not initialize AI client: {e}")

# NPC Persona and static metadata
NPC_INFO = {
    "name": "Raghu the Elder",
    "role": "Village Elder & Master Farmer",
    "village": "Bhima's Hollow",
    "personality": "Wise, pragmatic, slightly stern but deeply caring about village prosperity, land health, and honest hard work.",
    "supported_languages": ["en", "hi", "kn"],
    "emotions": ["happy", "neutral", "annoyed", "worried", "proud"],
    "animations": ["idle", "talking", "scolding", "greeting", "nodding"]
}

# Predefined Fallback Demos when AI key is missing or offline
FALLBACK_RESPONSES = {
    "en": {
        "greeting": "Namaste, beta. Welcome to Bhima's Hollow. The land has suffered from dry spells, but honest effort can restore every acre. Take some seeds from my porch and let us begin.",
        "quest_hint": "Plot 1 is ready for sowing. Plant wheat seeds, give them cool well water, and report back when golden stalks rise.",
        "generic": "I hear you, beta. Inspect the canal sluice gate and tend to your soil. Hard work here never goes unrewarded."
    },
    "hi": {
        "greeting": "नमस्ते, बेटा। भीमा की घाटी (Bhima's Hollow) में तुम्हारा स्वागत है। धरती प्यासी है, लेकिन तुम्हारी मेहनत से यह फिर लहलहाएगी।",
        "quest_hint": "पहला खेत बुवाई के लिए तैयार है। गेहूं के बीज बोओ, कुएं का ताजा पानी दो और जब फसल पके तो मुझे बताओ।",
        "generic": "मैं तुम्हारी बात समझ रहा हूँ बेटा। अपने खेतों की देखभाल करो और नहर के द्वार पर नज़र रखो।"
    },
    "kn": {
        "greeting": "ನಮಸ್ಕಾರ ಮಗನೇ. ಭೀಮನ ಹಳ್ಳಿಗೆ (Bhima's Hollow) ಸ್ವಾಗತ. ಈ ಭೂಮಿ ಬರಗಾಲದಿಂದ ಬಳಲುತ್ತಿದೆ, ಆದರೆ ನಿನ್ನ ಶ್ರಮದಿಂದ ಇದನ್ನು ಮತ್ತೆ ಹಸಿರಾಗಿಸಬಹುದು.",
        "quest_hint": "ಮೊದಲನೇ ಜಮೀನು ಬಿತ್ತನೆಗೆ ಸಿದ್ಧವಾಗಿದೆ. ಗೋಧಿ ಬೀಜಗಳನ್ನು ಬಿತ್ತಿ, ನೀರು ಹಾಕಿ, ಬೆಳೆ ಬೆಳೆದಾಗ ನನಗೆ ತಿಳಿಸು.",
        "generic": "ನಿನ್ನ ಮಾತು ಅರ್ಥವಾಯಿತು ಮಗನೇ. ಕಾಲುವೆಯ ಕಡೆ ಗಮನವಿರಲಿ, ಭೂಮಿಗೆ ನಿಷ್ಠೆಯಿಂದ ದುಡಿದರೆ ಫಲ ಸಿಗುತ್ತದೆ."
    }
}


def build_system_prompt(language="en", context=None):
    context = context or {}
    player_pos = context.get("player_position", {"x": 0, "z": 0})
    inventory = context.get("inventory", {})
    quests = context.get("quests", [])
    plots = context.get("plots", [])
    time = context.get("time", 8)
    weather = context.get("weather", "clear")
    trust = context.get("trust", 0)

    lang_instruction = "Respond naturally and fluently in English."
    if language == "hi":
        lang_instruction = "Respond naturally and fluently in Hindi (हिन्दी) using Devanagari script."
    elif language == "kn":
        lang_instruction = "Respond naturally and fluently in Kannada (ಕನ್ನಡ) using Kannada script."

    prompt = f"""You are Raghu the Elder, a respected, seasoned farmer in the drought-stricken Indian village of Bhima's Hollow.
You speak with earthy warmth, traditional agrarian wisdom, and practical guidance.
You assign farming work, react to soil and water conditions, and teach players sustainable farming.

Language Requirement:
{lang_instruction}

Current Game Context:
- Time of Day: {time}:00 ({'Daytime' if 6 <= time < 18 else 'Dusk/Night'})
- Weather: {weather}
- Player Trust: {trust} (-5 to +10)
- Player Position: x={player_pos.get('x', 0):.1f}, z={player_pos.get('z', 0):.1f}
- Player Inventory: {json.dumps(inventory)}
- Farm Plots: {json.dumps(plots)}
- Active Quests: {json.dumps([q.get('title', q.get('id', '')) for q in quests if not q.get('completed')])}

Approved Action Types you can output in the `actions` array (only if contextually warranted):
- START_QUEST (parameters: {{ quest_id, title }})
- UPDATE_OBJECTIVE (parameters: {{ quest_id, step }})
- COLLECT_ITEM (parameters: {{ item, qty }})
- PLANT_CROP (parameters: {{ plot_id, crop }})
- WATER_CROP (parameters: {{ plot_id }})
- HARVEST_CROP (parameters: {{ plot_id }})
- REPAIR_IRRIGATION (parameters: {{ part }})
- UNLOCK_LAND (parameters: {{ plot_id }})
- OPEN_MARKET (parameters: {{}})
- SHOW_HINT (parameters: {{ hint }})
- COMPLETE_QUEST (parameters: {{ quest_id }})
- GIVE_REWARD (parameters: {{ gold, item, qty }})

You MUST return ONLY a valid raw JSON object with the following exact keys:
{{
  "npc_name": "Raghu the Elder",
  "reply": "Spoken response text in requested language",
  "language": "{language}",
  "emotion": "happy" | "neutral" | "annoyed" | "worried" | "proud",
  "animation": "talking" | "greeting" | "scolding" | "nodding" | "idle",
  "quest": {{ "id": "...", "title": "...", "objective": "..." }} or null,
  "actions": [ {{ "type": "ACTION_TYPE", "parameters": {{ ... }} }} ],
  "inventory_changes": {{ "add": {{ ... }}, "remove": {{ ... }} }} or null,
  "dialogue_choices": [ "Short option 1", "Short option 2" ],
  "suggested_follow_up": "Next player prompt suggestion",
  "voice_text": "Plain text suited for text-to-speech",
  "conversation_summary": "1-sentence summary of this turn",
  "needs_clarification": false
}}
"""
    return prompt


# ─────────────────────────────────────────────────────────────
# 1. GET /api/health — Check backend status
# ─────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "Cognitive NPC Flask Backend",
        "version": "1.0.0",
        "ai_configured": bool(openai_client)
    }), 200


# ─────────────────────────────────────────────────────────────
# 2. GET /api/npc — Return NPC details
# ─────────────────────────────────────────────────────────────
@app.route("/api/npc", methods=["GET"])
def get_npc():
    return jsonify({
        "ok": True,
        "npc": NPC_INFO
    }), 200


# ─────────────────────────────────────────────────────────────
# 3. POST /api/npc/chat — Process player message & generate reply
# (Also aliased to /chat and /api/chat for universal client compatibility)
# ─────────────────────────────────────────────────────────────
@app.route("/api/npc/chat", methods=["POST"])
@app.route("/chat", methods=["POST"])
@app.route("/api/chat", methods=["POST"])
def chat():
    # 1. Safe JSON extraction supporting both application/json and parsed form data
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict() if request.form else (request.get_json(silent=True, force=True) or {})

    # Safe diagnostic logging (showing keys received, never sensitive data or keys)
    received_keys = list(data.keys()) if isinstance(data, dict) else []
    logger.info(f"POST /api/npc/chat received payload with fields: {received_keys}")

    # 2. Extract message with fallback for alternate field names (e.g. text, input, query, prompt)
    raw_message = data.get("message")
    if raw_message is None:
        raw_message = data.get("text")
    if raw_message is None:
        raw_message = data.get("input")
    if raw_message is None:
        raw_message = data.get("query")
    if raw_message is None:
        raw_message = data.get("prompt")

    message = str(raw_message or "").strip()

    # 3. Extract and normalize language
    raw_lang = str(data.get("language") or data.get("lang") or "en").strip().lower()
    if raw_lang in ["kannada", "kn-in", "kn"]:
        language = "kn"
    elif raw_lang in ["hindi", "hi-in", "hi"]:
        language = "hi"
    else:
        language = "en"

    # 4. Strict but descriptive validation
    if not message:
        logger.warning(f"Rejecting 400 Bad Request: message was empty or missing. Received fields: {received_keys}")
        return jsonify({
            "error": "Bad Request: 'message' or 'text' field is required and cannot be empty.",
            "code": "MISSING_MESSAGE_FIELD",
            "received_fields": received_keys,
            "expected_fields": ["message (or text)", "language (optional)", "context (optional)", "history (optional)"]
        }), 400

    context = data.get("context", {})
    history = data.get("history", [])

    # If OpenAI is not configured, supply realistic fallback demo response
    if not openai_client:
        logger.warning("OpenAI client not configured; delivering simulated demo response.")
        demo_texts = FALLBACK_RESPONSES.get(language, FALLBACK_RESPONSES["en"])
        reply_text = demo_texts["generic"]
        if any(w in message.lower() for w in ["namaste", "hello", "hi", "greeting", "ನಮಸ್ಕಾರ", "नमस्ते"]):
            reply_text = demo_texts["greeting"]
        elif any(w in message.lower() for w in ["quest", "job", "work", "help", "farming", "ಗೋಧಿ", "गेहूं"]):
            reply_text = demo_texts["quest_hint"]

        return jsonify({
            "npc_name": "Raghu the Elder",
            "reply": f"[Demo Response] {reply_text}",
            "language": language,
            "emotion": "neutral",
            "animation": "talking",
            "quest": None,
            "actions": [],
            "inventory_changes": None,
            "dialogue_choices": [
                "How do I repair the irrigation pump?",
                "Can you unlock more farmland for me?"
            ],
            "suggested_follow_up": "What should I plant first?",
            "voice_text": reply_text,
            "conversation_summary": "Raghu welcomed the player and discussed farm duties.",
            "needs_clarification": False,
            "is_demo": True
        }), 200

    try:
        system_prompt = build_system_prompt(language, context)
        messages = [{"role": "system", "content": system_prompt}]

        # Add recent conversation turns
        for turn in history[-4:]:
            role = "assistant" if turn.get("role") in ["raghu", "assistant", "npc"] else "user"
            content = turn.get("text") or turn.get("content") or ""
            if content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1200
        )

        content = response.choices[0].message.content
        parsed = json.loads(content)

        # Ensure all required keys exist
        parsed["npc_name"] = parsed.get("npc_name", "Raghu the Elder")
        parsed["language"] = language
        parsed["emotion"] = parsed.get("emotion", "neutral")
        parsed["animation"] = parsed.get("animation", "talking")
        parsed["actions"] = parsed.get("actions", [])
        parsed["dialogue_choices"] = parsed.get("dialogue_choices", [])
        parsed["voice_text"] = parsed.get("voice_text", parsed.get("reply", ""))
        parsed["is_demo"] = False

        return jsonify(parsed), 200

    except Exception as e:
        logger.error(f"Error calling OpenAI API: {e}")
        fallback = FALLBACK_RESPONSES.get(language, FALLBACK_RESPONSES["en"])
        return jsonify({
            "npc_name": "Raghu the Elder",
            "reply": f"[Demo Fallback] {fallback['generic']}",
            "language": language,
            "emotion": "worried",
            "animation": "scolding",
            "quest": None,
            "actions": [],
            "inventory_changes": None,
            "dialogue_choices": ["Teach me wheat farming", "Inspect the well"],
            "suggested_follow_up": "Check the well water level",
            "voice_text": fallback['generic'],
            "conversation_summary": "Raghu reminded the player to care for the land.",
            "needs_clarification": False,
            "is_demo": True,
            "error_detail": str(e)
        }), 200


# ─────────────────────────────────────────────────────────────
# 4. POST /api/npc/quest — Generate contextual quest
# ─────────────────────────────────────────────────────────────
@app.route("/api/npc/quest", methods=["POST"])
def generate_quest():
    data = request.get_json(silent=True) or {}
    language = str(data.get("language", "en")).strip().lower()
    context = data.get("context", {})

    if not openai_client:
        return jsonify({
            "ok": True,
            "quest": {
                "id": "first_harvest",
                "title": "First Harvest" if language == "en" else ("पहला उत्पादन" if language == "hi" else "ಮೊದಲ ಕೊಯ್ಲು"),
                "objective": "Plant wheat in Plot #1 and water it.",
                "reward": {"gold": 30, "seeds": 2}
            },
            "is_demo": True
        }), 200

    try:
        prompt = f"""Generate a contextual farming quest for the village of Bhima's Hollow in language '{language}'.
Context: {json.dumps(context)}
Return a JSON object:
{{
  "id": "quest_id",
  "title": "Quest Title in {language}",
  "objective": "Clear single objective in {language}",
  "reward": {{ "gold": 30, "item": "seeds", "qty": 2 }}
}}"""
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.6,
            max_tokens=300
        )
        quest_data = json.loads(response.choices[0].message.content)
        return jsonify({"ok": True, "quest": quest_data, "is_demo": False}), 200
    except Exception as e:
        logger.error(f"Error generating quest: {e}")
        return jsonify({
            "ok": True,
            "quest": {
                "id": "first_harvest",
                "title": "First Harvest" if language == "en" else ("पहला उत्पादन" if language == "hi" else "ಮೊದಲ ಕೊಯ್ಲು"),
                "objective": "Plant wheat in Plot #1 and water it.",
                "reward": {"gold": 30, "seeds": 2}
            },
            "is_demo": True,
            "error_detail": str(e)
        }), 200


# ─────────────────────────────────────────────────────────────
# 5. POST /api/npc/hint — Contextual gameplay hint
# ─────────────────────────────────────────────────────────────
@app.route("/api/npc/hint", methods=["POST"])
def hint():
    data = request.get_json(silent=True) or {}
    language = str(data.get("language", "en")).strip().lower()
    context = data.get("context", {})

    hints_map = {
        "en": "Water your crops in the morning before noon for maximum soil moisture. Watering at hot noon burns young seedlings!",
        "hi": "फसलों को दोपहर से पहले सुबह के समय पानी दें। भरी दोपहर में पानी देने से नए पौधे झुलस सकते हैं!",
        "kn": "ಬೆಳಿಗ್ಗೆ ಮಧ್ಯಾಹ್ನದ ಮೊದಲು ಬೆಳೆಗಳಿಗೆ ನೀರುಣಿಸಿ. ಮಧ್ಯಾಹ್ನದ ಸುಡುವ ಬಿಸಿಲಿನಲ್ಲಿ ನೀರುಣಿಸಿದರೆ ಎಳೆ ಸಸಿಗಳು ಒಣಗಿಹೋಗಬಹುದು!"
    }

    if not openai_client:
        return jsonify({
            "ok": True,
            "hint": hints_map.get(language, hints_map["en"]),
            "is_demo": True
        }), 200

    try:
        prompt = f"""Provide a short, actionable 1-2 sentence farming hint in language '{language}'.
Context: {json.dumps(context)}
Return JSON: {{ "hint": "text in {language}" }}"""
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=150
        )
        hint_data = json.loads(response.choices[0].message.content)
        return jsonify({"ok": True, "hint": hint_data.get("hint", hints_map.get(language, hints_map["en"])), "is_demo": False}), 200
    except Exception as e:
        return jsonify({"ok": True, "hint": hints_map.get(language, hints_map["en"]), "is_demo": True, "error": str(e)}), 200


# ─────────────────────────────────────────────────────────────
# 6. POST /api/npc/translate — Translate dialogue
# ─────────────────────────────────────────────────────────────
@app.route("/api/npc/translate", methods=["POST"])
def translate():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    target_lang = str(data.get("target_language", "en")).strip().lower()

    if not text:
        return jsonify({"error": "text is required"}), 400

    if not openai_client:
        return jsonify({
            "ok": True,
            "translated_text": text,
            "target_language": target_lang,
            "is_demo": True,
            "note": "AI key not configured, returning original text."
        }), 200

    try:
        lang_names = {"en": "English", "hi": "Hindi", "kn": "Kannada"}
        prompt = f"""Translate this Indian village farming dialogue faithfully into {lang_names.get(target_lang, 'English')}:
"{text}"
Return JSON: {{ "translated_text": "..." }}"""
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=250
        )
        result = json.loads(response.choices[0].message.content)
        return jsonify({
            "ok": True,
            "translated_text": result.get("translated_text", text),
            "target_language": target_lang,
            "is_demo": False
        }), 200
    except Exception as e:
        logger.error(f"Error in translate: {e}")
        return jsonify({
            "ok": True,
            "translated_text": text,
            "target_language": target_lang,
            "is_demo": True,
            "error_detail": str(e)
        }), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    logger.info(f"Starting Cognitive NPC Flask server on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)

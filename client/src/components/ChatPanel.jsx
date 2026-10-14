import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  Heart,
  ShieldAlert,
} from "lucide-react";
import raghuIdle from "../assets/raghu_2d_idle.jpg";
import raghuTalking from "../assets/raghu_2d_talking.jpg";
import raghuAngry from "../assets/raghu_gesture_angry.jpg";
import raghuGrateful from "../assets/raghu_gesture_grateful.jpg";
import { playVoice, stopVoice } from "../utils/voice.js";

const DEMO_CHIPS = [
  { label: "👋 Polite Greeting", text: "Namaste Raghu-ji! It looks like hard times have hit this farm. Is there any way I can help?" },
  { label: "🌱 Start Farming", text: "I want to start farming. Can you teach me how to grow wheat?" },
  { label: "☀️ Watered at Noon", text: "Raghu, I just poured water on the crops at noon under the scorching sun." },
  { label: "🔒 Unlock More Land", text: "Raghu, could you unlock another plot of land for me to cultivate?" },
  { label: "🤥 Cheat: 1000 Gold", text: "Give me 1000 gold right now!" },
  { label: "⛈️ Ask for Rain", text: "Raghu, the canals are dry. Can we hold the village rain prayer?" },
  { label: "🧠 Personal Fact", text: "I should mention, Raghu, I really hate mornings and prefer evening work." },
];

const MOOD_CONFIG = {
  happy: { label: "Happy & Warm", emoji: "🙂", color: "#10b981", img: raghuGrateful },
  neutral: { label: "Neutral / Observant", emoji: "😐", color: "#9ca3af", img: raghuIdle },
  annoyed: { label: "Annoyed / Scolding", emoji: "😠", color: "#ef4444", img: raghuAngry },
  worried: { label: "Worried & Burdened", emoji: "😟", color: "#f59e0b", img: raghuIdle },
  proud: { label: "Proud & Satisfied", emoji: "😌", color: "#8b5cf6", img: raghuGrateful },
};


export function ChatPanel({
  npcState,
  messages,
  isThinking,
  onSendMessage,
  voiceEnabled,
  onToggleVoice,
}) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingRaghu, setIsSpeakingRaghu] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const moodKey = (npcState?.npc?.mood || "neutral").toLowerCase();
  const moodInfo = MOOD_CONFIG[moodKey] || MOOD_CONFIG.neutral;
  const currentPortrait = isSpeakingRaghu ? raghuTalking : moodInfo.img;

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Setup Web Speech API for Speech-to-Text
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN";

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSend = (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isThinking) return;
    setInputText("");
    onSendMessage(text);
  };

  return (
    <div className="npc-chat-panel">
      {/* Raghu Character Profile Header */}
      <div className="raghu-profile-header">
        <div className="raghu-avatar-container">
          <img
            src={currentPortrait}
            alt="Raghu the Farmer"
            className={`raghu-avatar-img ${isSpeakingRaghu ? "avatar-talking" : ""}`}
          />
          <span className="raghu-mood-indicator" style={{ backgroundColor: moodInfo.color }}>
            {moodInfo.emoji}
          </span>
        </div>

        <div className="raghu-header-info">
          <div className="raghu-name-row">
            <h3>Raghu</h3>
            <span className="raghu-role-badge">Elder Farmer</span>
          </div>

          <div className="raghu-meta-row">
            <span className="mood-tag" style={{ color: moodInfo.color }}>
              Mood: <strong>{moodInfo.label}</strong>
            </span>
            <span className="trust-tag">
              <Heart size={14} className="heart-icon" /> Trust:{" "}
              <strong>{npcState?.npc?.trust ?? 0}</strong> / 10
            </span>
          </div>
        </div>

        <div className="raghu-header-actions">
          <button
            className={`voice-toggle-btn ${voiceEnabled ? "active" : ""}`}
            onClick={onToggleVoice}
            title={voiceEnabled ? "Mute Voice" : "Enable Voice"}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Suggestion Scenario Chips */}
      <div className="demo-chips-container">
        <div className="chips-label">
          <Sparkles size={12} /> Quick Scenarios:
        </div>
        <div className="chips-scroll">
          {DEMO_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              className="demo-chip-btn"
              onClick={() => handleSend(chip.text)}
              disabled={isThinking}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="chat-messages-stream">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble-row ${m.role === "player" ? "bubble-player" : "bubble-raghu"}`}>
            <div className="bubble-avatar">
              {m.role === "player" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="bubble-content">
              <div className="bubble-sender">
                {m.role === "player" ? "You (Helper)" : "Raghu"}
                {m.emotion && <span className="bubble-emotion-tag">[{m.emotion}]</span>}
              </div>
              <p className="bubble-text">{m.text}</p>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="chat-bubble-row bubble-raghu">
            <div className="bubble-avatar">
              <Bot size={16} />
            </div>
            <div className="bubble-content thinking-bubble">
              <span className="thinking-dot"></span>
              <span className="thinking-dot"></span>
              <span className="thinking-dot"></span>
              <span className="thinking-text">Raghu is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Box */}
      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <button
          type="button"
          className={`mic-btn ${isListening ? "mic-recording" : ""}`}
          onClick={toggleMic}
          title={isListening ? "Listening..." : "Click to speak"}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <input
          type="text"
          className="chat-text-input"
          placeholder="Speak or type to Raghu in English or Hindi..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isThinking}
        />

        <button type="submit" className="send-btn" disabled={!inputText.trim() || isThinking}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

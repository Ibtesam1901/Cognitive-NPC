import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  RotateCcw,
  Settings,
  Sparkles,
  Layers,
  Volume2,
  VolumeX,
  X,
  ShieldCheck,
  Check,
  Box,
} from "lucide-react";
import confetti from "canvas-confetti";
import { sound } from "./utils/sound.js";
import { playVoice, stopVoice } from "./utils/voice.js";
import { ChatPanel } from "./components/ChatPanel.jsx";
import { FarmPanel } from "./components/FarmPanel.jsx";
import { JournalPanel } from "./components/JournalPanel.jsx";
import "./App.css";

const FarmScene = lazy(() => import("./three/FarmScene.jsx"));

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const sessionId =
  localStorage.getItem("sid_raghu") ||
  (() => {
    const id = "npc_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("sid_raghu", id);
    return id;
  })();

export default function App() {
  const [npcState, setNpcState] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "raghu",
      text: "Namaste, beta. Welcome to Bhima's Hollow. The land has been parched by drought, but with honest hands we can restore it. Speak to me, and let's see what you can do.",
      emotion: "neutral",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [actionLog, setActionLog] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'chat' | 'farm' | 'journal'
  const [toast, setToast] = useState(null);

  // LLM Config in localStorage
  const [llmConfig, setLlmConfig] = useState(() => {
    const saved = localStorage.getItem("raghu_llm_cfg");
    return saved
      ? JSON.parse(saved)
      : {
          apiKey: "",
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
          model: "gemini-flash-latest",
        };
  });

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch initial state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${API}/api/npc/state?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setNpcState(data.state);
        }
      } catch (err) {
        console.warn("Failed to load initial state:", err);
      }
    };
    fetchState();
  }, []);

  // 2. Send Chat Message to Raghu
  const handleSendMessage = async (text) => {
    if (!text || isThinking) return;

    sound.playPop();

    // Optimistically append player's message
    const updatedMessages = [...messages, { role: "player", text }];
    setMessages(updatedMessages);
    setIsThinking(true);

    try {
      const res = await fetch(`${API}/api/npc/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          config: llmConfig.apiKey ? llmConfig : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();

      setNpcState(data.state);

      // Append Raghu's reply
      setMessages((prev) => [
        ...prev,
        {
          role: "raghu",
          text: data.reply,
          emotion: data.emotion,
        },
      ]);

      // Play Voice if enabled
      if (voiceEnabled) {
        playVoice(data.reply, "English");
      }

      // Log applied and rejected actions
      const newLogs = [];
      if (Array.isArray(data.applied)) {
        for (const app of data.applied) {
          newLogs.push({ type: "applied", text: app.text, message: app.text });
          showToast(app.text, "success");
          sound.playChime();
        }
      }
      if (Array.isArray(data.rejected)) {
        for (const rej of data.rejected) {
          newLogs.push({ type: "rejected", reason: rej.reason });
          showToast(`Engine Blocked: ${rej.reason}`, "error");
          sound.playBuzzer();
        }
      }
      // Quest progress events from conversation
      if (Array.isArray(data.events)) {
        for (const ev of data.events) {
          showToast(ev.text, "info");
        }
      }
      if (newLogs.length > 0) {
        setActionLog((prev) => [...prev, ...newLogs]);
      }
    } catch (err) {
      console.error("Chat turn error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "raghu",
          text: "Hmph... The village telegraph wire must be down. Check back with me in a moment, beta.",
          emotion: "worried",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // 3. Handle Player Direct Farm Action — maps UI event names to new engine event types
  const handleFarmAction = async (type, params = {}) => {
    if (isActing) return;
    setIsActing(true);

    try {
      const res = await fetch(`${API}/api/npc/farm-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: type, params }),
      });

      const data = await res.json();
      if (data.ok) {
        setNpcState(data.state);
        showToast(data.message, "success");

        if (type === "HARVEST") {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          sound.playChime();
        } else if (type === "WATER") {
          sound.playPop();
        } else if (type === "NEXT_DAY") {
          sound.playChime();
        }

        // Quest progress events
        if (Array.isArray(data.events)) {
          for (const ev of data.events) {
            showToast(ev.text, "info");
          }
        }
      } else {
        showToast(data.message || "Action failed", "error");
        sound.playBuzzer();
      }
    } catch (err) {
      console.error("Farm action error:", err);
      showToast("Failed to perform farm action", "error");
    } finally {
      setIsActing(false);
    }
  };

  // 4. Reset Farm & Session
  const handleReset = async () => {
    if (!window.confirm("Reset Raghu's farm to Day 1? This will renew his trust and field.")) return;
    try {
      const res = await fetch(`${API}/api/npc/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      setNpcState(data.state);
      setMessages([
        {
          role: "raghu",
          text: "A new sunrise breaks over Bhima's Hollow. Raghu looks upon you with fresh eyes. What shall we plant today?",
          emotion: "neutral",
        },
      ]);
      setActionLog([]);
      showToast("Farm refreshed to Day 1 sunrise!", "info");
      sound.playChime();
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  const handleSaveSettings = (newConfig) => {
    setLlmConfig(newConfig);
    localStorage.setItem("raghu_llm_cfg", JSON.stringify(newConfig));
    setShowSettings(false);
    showToast("LLM brain settings saved!", "success");
  };

  return (
    <div className="npc-app-container">
      {/* Top Banner Navigation */}
      <header className="npc-top-nav">
        <div className="nav-brand-section">
          <span className="brand-icon">🌾</span>
          <div>
            <h1 className="brand-title">Cognitive NPC: Raghu Who Shapes the Farm</h1>
            <p className="brand-subtitle">
              The LLM proposes actions, the game engine decides and verifies.
            </p>
          </div>
        </div>

        {/* Tab switcher for small screens */}
        <div className="mobile-tabs-bar">
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Panels
          </button>
          <button
            className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`tab-btn ${activeTab === "farm" ? "active" : ""}`}
            onClick={() => setActiveTab("farm")}
          >
            Farm
          </button>
          <button
            className={`tab-btn ${activeTab === "journal" ? "active" : ""}`}
            onClick={() => setActiveTab("journal")}
          >
            Journal
          </button>
        </div>

        <div className="nav-controls-section">
          <button
            className={`nav-ctrl-btn ${show3D ? "btn-active-3d" : ""}`}
            onClick={() => setShow3D(!show3D)}
            title="Toggle 3D View"
          >
            <Box size={16} />
            <span>{show3D ? "Close 3D" : "3D Farm View"}</span>
          </button>

          <button
            className="nav-ctrl-btn"
            onClick={handleReset}
            title="Reset Session"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>

          <button
            className="nav-ctrl-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={16} />
            <span>LLM Brain</span>
          </button>
        </div>
      </header>

      {/* Optional 3D Farm Canvas Viewer */}
      {show3D && (
        <div className="three-d-modal-wrapper">
          <div className="three-d-header">
            <h4>🌿 3D Farm Environment Inspection</h4>
            <button className="close-3d-btn" onClick={() => setShow3D(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="three-d-canvas-box">
            <Suspense fallback={<div className="three-loading">Rendering 3D fields...</div>}>
              <FarmScene
                trust={npcState?.npc?.trust ?? 0}
                mood={npcState?.npc?.mood || "neutral"}
                weather={npcState?.weather || "clear"}
                day={npcState?.day ?? 1}
                time={npcState?.time ?? 8}
                plots={npcState?.plots || []}
                quests={npcState?.quests || []}
                inventory={npcState?.inventory || {}}
                flags={npcState?.flags || {}}
                isSpeaking={isThinking}
                latestRaghuMessage={
                  [...messages].reverse().find((m) => m.role === "raghu")?.text || ""
                }
                isThinking={isThinking}
                onSendMessage={handleSendMessage}
                voiceEnabled={voiceEnabled}
                onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
                onInspectHotspot={(id) => {
                  showToast(`Inspected 3D Hotspot: ${id}`, "info");
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Main 3-Column Dashboard */}
      <main className="npc-main-dashboard">
        {/* Panel 1: Chat Panel */}
        <section
          className={`dashboard-column col-chat ${
            activeTab === "all" || activeTab === "chat" ? "col-visible" : "col-hidden"
          }`}
        >
          <ChatPanel
            npcState={npcState}
            messages={messages}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            voiceEnabled={voiceEnabled}
            onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
          />
        </section>

        {/* Panel 2: Farm Panel */}
        <section
          className={`dashboard-column col-farm ${
            activeTab === "all" || activeTab === "farm" ? "col-visible" : "col-hidden"
          }`}
        >
          <FarmPanel
            farmState={npcState}
            onFarmAction={handleFarmAction}
            isActing={isActing}
          />
        </section>

        {/* Panel 3: Journal & Objectives Panel */}
        <section
          className={`dashboard-column col-journal ${
            activeTab === "all" || activeTab === "journal" ? "col-visible" : "col-hidden"
          }`}
        >
          <JournalPanel
            npcState={npcState}
            actionLog={actionLog}
          />
        </section>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`notification-toast toast-${toast.type}`}>
          <Sparkles size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* LLM Settings Modal */}
      {showSettings && (
        <SettingsModal
          config={llmConfig}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function SettingsModal({ config, onSave, onClose }) {
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const [baseURL, setBaseURL] = useState(
    config.baseURL || "https://generativelanguage.googleapis.com/v1beta/openai/"
  );
  const [model, setModel] = useState(config.model || "gemini-flash-latest");

  const setPreset = (name) => {
    if (name === "gemini") {
      setBaseURL("https://generativelanguage.googleapis.com/v1beta/openai/");
      setModel("gemini-flash-latest");
    } else if (name === "groq") {
      setBaseURL("https://api.groq.com/openai/v1");
      setModel("llama-3.3-70b-versatile");
    } else if (name === "openai") {
      setBaseURL("https://api.openai.com/v1");
      setModel("gpt-4o-mini");
    } else if (name === "simulator") {
      setApiKey("");
      setBaseURL("");
      setModel("offline-fallback-brain");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ LLM Provider & Brain Settings</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            Connect any OpenAI-compatible provider. If left blank, the intelligent built-in fallback brain runs completely offline!
          </p>

          <div className="preset-buttons-row">
            <button type="button" onClick={() => setPreset("simulator")} className="preset-chip">
              Built-in Simulator
            </button>
            <button type="button" onClick={() => setPreset("gemini")} className="preset-chip">
              Google Gemini
            </button>
            <button type="button" onClick={() => setPreset("groq")} className="preset-chip">
              Groq (Fast)
            </button>
            <button type="button" onClick={() => setPreset("openai")} className="preset-chip">
              OpenAI
            </button>
          </div>

          <label className="input-label">
            <span>API Key:</span>
            <input
              type="password"
              placeholder="Leave empty for built-in simulation"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>

          <label className="input-label">
            <span>Base URL:</span>
            <input
              type="text"
              placeholder="https://generativelanguage.googleapis.com/v1beta/openai/"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
            />
          </label>

          <label className="input-label">
            <span>Model Name:</span>
            <input
              type="text"
              placeholder="gemini-flash-latest"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-save-btn"
            onClick={() => onSave({ apiKey: apiKey.trim(), baseURL: baseURL.trim(), model: model.trim() })}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

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
  Sun,
  Moon,
  Coins,
  Clock,
  Heart,
  CloudRain,
  Flame,
  Cloud,
  Compass,
  Scroll,
  Sprout,
  Maximize2,
  Minimize2,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { sound } from "./utils/sound.js";
import { playVoice, stopVoice } from "./utils/voice.js";
import { ChatPanel } from "./components/ChatPanel.jsx";
import { FarmPanel } from "./components/FarmPanel.jsx";
import { JournalPanel } from "./components/JournalPanel.jsx";
import { loadGameState, saveGameState, clearGameSave } from "./utils/gameState.js";
import { audioManager } from "./utils/audioManager.js";
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
  const [npcState, setNpcState] = useState(() => loadGameState());
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
  const [activeGameDrawer, setActiveGameDrawer] = useState("none"); // 'none' | 'farm' | 'journal'
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("raghu_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("raghu_theme", theme);
  }, [theme]);

  // Persist game state to localStorage whenever it changes
  useEffect(() => {
    if (npcState) {
      saveGameState(npcState);
    }
  }, [npcState]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

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

  // 1. Fetch backend state to sync
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${API}/api/npc/state?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.state) {
            setNpcState((prev) => ({
              ...prev,
              ...data.state,
              flags: { ...(prev?.flags || {}), ...(data.state?.flags || {}) },
            }));
          }
        }
      } catch (err) {
        console.warn("Backend state sync unavailable, using local persistence:", err);
      }
    };
    fetchState();
  }, []);

  // 2. Day/Night Cycle Loop (1 real minute = 4 game hours; 6 real minutes = 24 game hours)
  useEffect(() => {
    const interval = setInterval(() => {
      setNpcState((prev) => {
        if (!prev) return prev;
        const nextTime = (prev.time + 1) % 24;
        const nextDay = nextTime === 0 ? prev.day + 1 : prev.day;

        // Morning roll: if advancing to morning (time 6), roll weather if not forced
        let nextWeather = prev.weather;
        let plots = prev.plots;

        if (nextTime === 6) {
          // 25% chance of blessed rain, otherwise clear
          nextWeather = Math.random() < 0.25 ? "rain" : "clear";

          // If rain, naturally water crops; otherwise grow watered crops
          plots = prev.plots.map((plot) => {
            if (plot.locked || !plot.crop) return plot;
            const willWater = nextWeather === "rain" || plot.watered;
            const newGrowth = plot.watered ? Math.min(2, plot.growth + 1) : plot.growth;
            return {
              ...plot,
              growth: newGrowth,
              watered: nextWeather === "rain", // reset or rain watered
            };
          });
        }

        audioManager.updateAtmosphere(nextTime, nextWeather);

        return {
          ...prev,
          day: nextDay,
          time: nextTime,
          weather: nextWeather,
          plots,
        };
      });
    }, 15000); // 15 seconds = 1 game hour

    return () => clearInterval(interval);
  }, []);

  // Update audio atmosphere when weather or time changes
  useEffect(() => {
    if (npcState) {
      audioManager.updateAtmosphere(npcState.time, npcState.weather);
    }
  }, [npcState?.time, npcState?.weather]);

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

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 4. Reset Farm & Session
  const executeReset = async () => {
    setShowResetConfirm(false);
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
      showToast("Farm refreshed to Day 1 sunrise!", "success");
      sound.playChime();
    } catch (err) {
      console.error("Reset error:", err);
      showToast("Failed to reset session", "error");
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleSaveSettings = (newConfig) => {
    setLlmConfig(newConfig);
    localStorage.setItem("raghu_llm_cfg", JSON.stringify(newConfig));
    setShowSettings(false);
    showToast("LLM brain settings saved!", "success");
  };

  // Game HUD metadata
  const weather = (npcState?.weather || "clear").toLowerCase();
  const day = npcState?.day ?? 1;
  const time = npcState?.time ?? 8;
  const gold = npcState?.gold ?? 100;
  const trust = npcState?.npc?.trust ?? 0;
  const activePlotsCount = (npcState?.plots || []).filter((p) => !p.locked).length;
  const activeQuestsCount = (npcState?.quests || []).filter((q) => !q.completed).length;

  return (
    <div className="npc-game-viewport">
      {/* ── RPG Game Top HUD Bar ── */}
      <header className="game-hud-topbar">
        {/* Left: Brand & Location */}
        <div className="game-hud-brand">
          <span className="game-brand-crest">🌾</span>
          <div className="game-brand-text">
            <span className="game-brand-title">Bhima's Hollow</span>
            <span className="game-brand-sub">Cognitive NPC · Raghu</span>
          </div>
        </div>

        {/* Center: Live Game Status Pills */}
        <div className="game-status-cluster">
          {/* Day & Time */}
          <div className="game-hud-pill pill-time" title="Current Day and Hour">
            <Clock size={15} className="pill-icon text-amber" />
            <span className="pill-value">Day {day} · {time}:00</span>
          </div>

          {/* Weather */}
          <div className={`game-hud-pill pill-weather weather-${weather}`} title={`Weather: ${weather}`}>
            {weather === "rain" ? (
              <CloudRain size={15} className="pill-icon text-blue" />
            ) : weather === "drought" ? (
              <Flame size={15} className="pill-icon text-red" />
            ) : weather === "overcast" ? (
              <Cloud size={15} className="pill-icon text-slate" />
            ) : (
              <Sun size={15} className="pill-icon text-amber" />
            )}
            <span className="pill-value capitalize">{weather}</span>
          </div>

          {/* Gold Treasury */}
          <div className="game-hud-pill pill-gold" title="Village Gold">
            <Coins size={15} className="pill-icon text-gold" />
            <span className="pill-value">{gold} <small>Gold</small></span>
          </div>

          {/* Raghu's Trust */}
          <div className="game-hud-pill pill-trust" title={`Raghu's Trust: ${trust}`}>
            <Heart size={15} className="pill-icon text-emerald" />
            <span className="pill-value">
              {trust >= 0 ? `+${trust}` : trust} <small>Trust</small>
            </span>
          </div>

          {/* Next Morning Action */}
          <button
            className="game-hud-action-btn btn-advance-morning"
            onClick={() => handleFarmAction("NEXT_DAY")}
            disabled={isActing}
            title="Advance to next morning (crops grow, weather rolls)"
          >
            <span>Next Day</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Right: Quick Controls & Theme */}
        <div className="game-hud-right-controls">
          {/* View Mode Switcher */}
          <div className="game-mode-toggle">
            <button
              className={`game-nav-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
              title="Split View (All Panels)"
            >
              <Layers size={14} />
              <span>Dashboard</span>
            </button>
            <button
              className={`game-nav-tab ${activeTab === "world" ? "active" : ""}`}
              onClick={() => setActiveTab("world")}
              title="Fullscreen 3D World"
            >
              <Compass size={14} />
              <span>3D World</span>
            </button>
            <button
              className={`game-nav-tab ${activeTab === "farm" ? "active" : ""}`}
              onClick={() => setActiveTab("farm")}
              title="Farm & Fields Only"
            >
              <Sprout size={14} />
              <span>Farm ({activePlotsCount})</span>
            </button>
            <button
              className={`game-nav-tab ${activeTab === "journal" ? "active" : ""}`}
              onClick={() => setActiveTab("journal")}
              title="Journal & Memory Only"
            >
              <Scroll size={14} />
              <span>Journal ({activeQuestsCount})</span>
            </button>
          </div>

          {/* Audio Master Mute/Unmute */}
          <button
            className="game-icon-btn"
            onClick={() => {
              const muted = audioManager.toggleMute();
              showToast(muted ? "Audio muted" : "Audio unmuted", "info");
            }}
            title="Toggle Ambient & SFX Audio"
          >
            {audioManager.isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Theme & Settings */}
          <button
            className="game-icon-btn"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Minimal Theme"}
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <button
            className="game-icon-btn"
            onClick={handleReset}
            title="Reset Game State"
          >
            <RotateCcw size={15} />
          </button>

          <button
            className="game-icon-btn"
            onClick={() => setShowSettings(true)}
            title="LLM Brain Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* ── Main Game World & RPG Side Panels ── */}
      <main className={`game-stage-container mode-${activeTab}`}>
        {/* Central 3D Canvas Stage */}
        <section
          className={`game-world-stage ${
            activeTab === "all" || activeTab === "world" ? "stage-visible" : "stage-hidden"
          }`}
        >
          <div className="game-world-inner">
            <div className="game-world-watermark">
              <span className="watermark-badge">3D LIVING DIORAMA</span>
              <span className="watermark-tip">Orbit · Inspect Landmarks · Speak with Raghu</span>
            </div>

            <Suspense fallback={<div className="three-loading">Loading Bhima's Hollow world...</div>}>
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
                messages={messages}
                isThinking={isThinking}
                onSendMessage={handleSendMessage}
                voiceEnabled={voiceEnabled}
                onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
                onInspectHotspot={(id) => {
                  showToast(`Inspected 3D Hotspot: ${id}`, "info");
                }}
                onPlotClick={(plot) => {
                  if (plot.locked) {
                    showToast(`Plot #${plot.id} is locked. Speak with Raghu to gain trust & unlock it!`, "info");
                    return;
                  }
                  if (plot.crop && plot.growth >= 2) {
                    // Harvest ripe wheat
                    handleFarmAction("HARVEST", { plotId: plot.id });
                  } else if (plot.crop && !plot.watered) {
                    // Water parched crop
                    handleFarmAction("WATER", { plotId: plot.id });
                  } else if (!plot.crop) {
                    // Plant seeds
                    if ((npcState?.inventory?.seeds ?? 0) <= 0) {
                      showToast("No seeds left! Speak with Raghu or buy seeds in the Farm panel.", "error");
                      return;
                    }
                    handleFarmAction("PLANT", { plotId: plot.id, crop: "wheat" });
                  } else if (plot.watered) {
                    showToast(`Plot #${plot.id} is already watered and growing!`, "info");
                  }
                }}
                onFootstep={(x, z) => {
                  // Determine surface based on player coordinates
                  // Wood Verandah (around [0.2, 0, 0.5])
                  if (x > -2.2 && x < 2.4 && z > -0.5 && z < 1.6) {
                    audioManager.playFootstep("wood");
                  }
                  // Cobblestone walkway paths
                  else if (
                    (x > -0.8 && x < 0.4 && z > 1.2 && z < 3.2) ||
                    (x > -3.0 && x < -1.0 && z > 2.0 && z < 3.0) ||
                    (x > -3.0 && x < -1.8 && z > -1.5 && z < 1.5)
                  ) {
                    audioManager.playFootstep("stone");
                  }
                  // Grass / Soil default
                  else {
                    audioManager.playFootstep("grass");
                  }
                }}
              />
            </Suspense>
          </div>
        </section>

        {/* RPG Side Column 1: Cultivation Farm Panel */}
        <aside
          className={`game-side-panel panel-farm ${
            activeTab === "all" || activeTab === "farm" ? "panel-visible" : "panel-hidden"
          }`}
        >
          <div className="game-panel-frame">
            <FarmPanel
              farmState={npcState}
              onFarmAction={handleFarmAction}
              isActing={isActing}
            />
          </div>
        </aside>

        {/* RPG Side Column 2: Memory & Objectives Journal */}
        <aside
          className={`game-side-panel panel-journal ${
            activeTab === "all" || activeTab === "journal" ? "panel-visible" : "panel-hidden"
          }`}
        >
          <div className="game-panel-frame">
            <JournalPanel
              npcState={npcState}
              actionLog={actionLog}
            />
          </div>
        </aside>
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

      {/* Reset Farm Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-backdrop" onClick={() => setShowResetConfirm(false)}>
          <div
            className="settings-modal-card reset-confirm-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>🌾 Reset Raghu's Farm?</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowResetConfirm(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: "20px" }}>
              <p style={{ color: "#e2e8f0", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
                This will renew Raghu's farm to <strong>Day 1 Sunrise</strong>, reset all plots to uncultivated earth, replenish starter seeds (3 seeds &amp; 1 water can), and restore Raghu's memory and trust.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid var(--panel-border)",
                    color: "#cbd5e1",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={executeReset}
                  style={{
                    background: "#ef4444",
                    border: "none",
                    color: "#fff",
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Yes, Reset Farm
                </button>
              </div>
            </div>
          </div>
        </div>
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

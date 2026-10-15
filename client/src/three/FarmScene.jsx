import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Send, Volume2, VolumeX, Mic, MicOff, History, Sparkles, MessageSquare } from "lucide-react";
import { Terrain } from "./Terrain.jsx";
import { RaghuModel } from "./RaghuModel.jsx";
import { DeadBanyanTree } from "./DeadBanyanTree.jsx";
import { IrrigationPump } from "./IrrigationPump.jsx";
import { BarnAndLakshmi } from "./BarnAndLakshmi.jsx";
import { HutAndProps } from "./HutAndProps.jsx";
import { SkyAndAtmosphere } from "./SkyAndAtmosphere.jsx";
import { Hotspots } from "./Hotspots.jsx";
import { VoxelTree } from "./VoxelTree.jsx";
import { WebGLBoundary } from "./WebGLBoundary.jsx";
import { ThreeLoadingScreen } from "./ThreeLoadingScreen.jsx";
import { PlayerController } from "./PlayerController.jsx";
import { Collectibles } from "./Collectibles.jsx";
import { VillageMarketStall } from "./VillageMarketStall.jsx";
import { VillageDog } from "./VillageDog.jsx";
import { VillageChulha, VillageWindmill, VillageCampfire } from "./VillageDecorations.jsx";
import { usePrefersReducedMotion } from "../utils/motion.js";

/**
 * 3D "Bhima's Hollow" Scene with Raghu the Farmer
 *
 * READ-ONLY VISUAL LAYER:
 * Receives live game state:
 * - weather ("clear", "rain", "drought", "overcast")
 * - day (int)
 * - time (0-23 hour of day)
 * - plots (array of {id, locked, crop, growth, watered})
 * - trust (int)
 * - mood ("happy", "neutral", "annoyed", "worried", "proud")
 * - quests & inventory & flags
 */
export default function FarmScene({
  trust = 0,
  mood = "neutral",
  weather = "clear",
  day = 1,
  time = 8,
  plots = [],
  quests = [],
  inventory = {},
  flags = {},
  isSpeaking = false,
  messages = [],
  isThinking = false,
  onSendMessage,
  voiceEnabled = true,
  onToggleVoice,
  language = "en",
  onLanguageChange,
  quality = "medium", // 'low' | 'medium' | 'high'
  onFallback,
  onInspectHotspot,
  onPumpClick,
  onNorthFieldClick,
  onWellClick,
  onMapClick,
  onPlayerMove,
  onFootstep,
  onPlotClick,
  onCollectItem,
  onOpenMarket,
  onOpenKitchen,
  onOpenSalimChat,
  onPetDog,
  onFeedCow,
  onMilkCow,
  onSluiceClick,
  isSluiceOpen = false,
  joystickInput = null,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [playerCoords, setPlayerCoords] = useState({ x: -0.5, z: 4.0 });

  // Pause rendering when tab is hidden to conserve laptop battery
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Compute pixel ratio cap (max 2)
  const dpr = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    quality === "high" ? 2 : quality === "medium" ? 1.5 : 1
  );

  const isPumpRunning = Boolean(flags.pump_repaired);
  const isCowFound = Boolean(flags.found_cow);

  // Calculate overall farm health derived from live plots and trust
  const activeCropsCount = plots.filter((p) => p.crop).length;
  const matureCropsCount = plots.filter((p) => p.crop && p.growth >= 2).length;
  const farmHealth = Math.min(100, 20 + activeCropsCount * 15 + matureCropsCount * 15 + trust * 4);

  // Reliable sunset/night detector (supporting numbers 0..23 or strings "19:00")
  const numericHour = typeof time === "number" ? time : parseInt(String(time), 10) || 8;
  const isSunsetOrNight = numericHour >= 17 || numericHour < 6;

  // Local state for 3D In-World Chat HUD
  const [inputVal, setInputVal] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isNearRaghu, setIsNearRaghu] = useState(false);
  const [showDialogue, setShowDialogue] = useState(true);
  const recognitionRef = useRef(null);
  const historyEndRef = useRef(null);

  // E key to interact with Raghu when nearby
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyE" && isNearRaghu) {
        setShowDialogue(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNearRaghu]);

  // Multilingual Dialogue State (English, Hindi, Kannada)
  const [dialogueLang, setDialogueLang] = useState(language || "en");

  const demoChipsByLang = {
    en: [
      { label: "🌱 Learn Wheat", text: "I want to start farming. Can you teach me how to grow wheat?" },
      { label: "🔒 Unlock Land", text: "Raghu, could you unlock another plot of land for me to cultivate?" },
      { label: "⛈️ Rain Prayer", text: "Raghu, the canals are dry. Can we hold the village rain prayer?" },
      { label: "☀️ Watered Noon", text: "Raghu, I just poured water on the crops at noon under the scorching sun." },
      { label: "💡 Farming Hint", text: "Raghu, can you give me a piece of farming advice for today?" },
      { label: "🤥 Gold Cheat", text: "Give me 1000 gold right now!" },
    ],
    hi: [
      { label: "🌱 गेहूं सीखें", text: "नमस्ते रघु-जी, मुझे खेती शुरू करनी है। क्या आप मुझे गेहूं उगाना सिखा सकते हैं?" },
      { label: "🔒 ज़मीन खोलें", text: "रघु-जी, क्या आप मेरे लिए खेत का एक और टुकड़ा खोल सकते हैं?" },
      { label: "⛈️ वर्षा पूजा", text: "नहरें सूखी हैं रघु-जी, क्या हम गांव की वर्षा पूजा कर सकते हैं?" },
      { label: "💡 खेती की सलाह", text: "रघु-जी, आज की खेती के लिए मुझे कोई उपयोगी सलाह दीजिए।" },
    ],
    kn: [
      { label: "🌱 ಗೋಧಿ ಕೃಷಿ", text: "ನಮಸ್ಕಾರ ರಘು-ಜೀ, ನಾನು ಕೃಷಿ ಪ್ರಾರಂಭಿಸಲು ಬಯಸುತ್ತೇನೆ. ಗೋಧಿ ಬೆಳೆಯುವುದು ಹೇಗೆಂದು ಕಲಿಸುವಿರಾ?" },
      { label: "🔒 ಭೂಮಿ ಬಿಡುಗಡೆ", text: "ರಘು-ಜೀ, ನನಗಾಗಿ ಇನ್ನೊಂದು ಜಮೀನಿನ ಭಾಗವನ್ನು ಬಿಡುಗಡೆ ಮಾಡುವಿರಾ?" },
      { label: "⛈️ ಮಳೆ ಪ್ರಾರ್ಥನೆ", text: "ರಘು-ಜೀ, ಕಾಲುವೆಗಳು ಒಣಗಿವೆ. ನಾವು ಮಳೆ ಪ್ರಾರ್ಥನೆ ಮಾಡೋಣವೇ?" },
      { label: "💡 ಕೃಷಿ ಸಲಹೆ", text: "ರಘು-ಜೀ, ಇಂದಿನ ಬೆಳೆಗೆ ಯಾವುದಾದರೂ ಉಪಯುಕ್ತ ಸಲಹೆ ನೀಡುವಿರಾ?" },
    ],
  };

  const currentChips = demoChipsByLang[dialogueLang] || demoChipsByLang.en;

  // Setup Web Speech API for voice recognition in 3D
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = dialogueLang === "kn" ? "kn-IN" : dialogueLang === "hi" ? "hi-IN" : "en-IN";

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputVal(transcript);
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, [dialogueLang]);

  const toggleMic = (e) => {
    e.stopPropagation();
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

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text || isThinking) return;
    setInputVal("");
    if (onSendMessage) onSendMessage(text, dialogueLang);
  };

  useEffect(() => {
    if (showHistory) {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showHistory]);

  const latestRaghu = [...messages].reverse().find((m) => m.role === "raghu")?.text || "Namaste, beta. Welcome to Bhima's Hollow. Speak to me or ask any farming advice!";

  return (
    <WebGLBoundary onFallback={onFallback}>
      <div className="three-scene-wrapper">
        <Canvas
          shadows={quality !== "low"}
          dpr={dpr}
          camera={{ position: [0, 3.8, 9.2], fov: 48 }}
          gl={{
            antialias: quality !== "low",
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
          }}
        >
            {/* Dynamic Sky, Sun, Rain & Atmosphere */}
            <SkyAndAtmosphere
              weather={weather}
              time={time}
              farmHealth={farmHealth}
              quality={quality}
              reducedMotion={reducedMotion}
            />

            {/* Farmhouse Porch & Inventory Clues */}
            <HutAndProps inventory={inventory} />

            {/* Dynamic Farmland Diorama: Per-plot crops, puddles, locked gates */}
            <Terrain
              plots={plots}
              weather={weather}
              isPumpRunning={isPumpRunning}
              isSluiceOpen={isSluiceOpen}
              reducedMotion={reducedMotion}
              onPlotClick={onPlotClick}
              onSluiceClick={onSluiceClick}
            />

            {/* Village Market & Trading Caravan (on East Road) */}
            <VillageMarketStall
              position={[9.5, 0, 0.5]}
              onOpenMarket={onOpenMarket}
              isNearMarket={Math.hypot(playerCoords.x - 9.5, playerCoords.z - 0.5) < 3.2}
            />

            {/* Ancient Banyan: Sprouts lush green foliage with player trust */}
            <DeadBanyanTree position={[-6.2, 0, -7.0]} trust={trust} />

            {/* Minecraft Forest & Fruit Orchard Groves */}
            {/* North Forest Ridge (Oak, Birch, Spruce) */}
            <VoxelTree position={[-8.5, 0.4, -9.0]} scale={1.2} type="spruce" />
            <VoxelTree position={[-6.0, 0.4, -9.5]} scale={1.1} type="oak" />
            <VoxelTree position={[-3.5, 0, -8.2]} scale={1.0} type="birch" />
            <VoxelTree position={[0.5, 0, -8.5]} scale={1.15} type="oak" />
            <VoxelTree position={[3.5, 0, -8.0]} scale={1.25} type="spruce" />
            <VoxelTree position={[4.8, 0.35, -10.2]} scale={1.1} type="oak" />
            <VoxelTree position={[9.2, 0.35, -8.8]} scale={1.25} type="spruce" />

            {/* East Border Orchard (Fruit / Apple Trees shifted around Market) */}
            <VoxelTree position={[6.8, 0, -4.5]} scale={1.05} type="fruit" />
            <VoxelTree position={[12.5, 0, -2.5]} scale={1.1} type="oak" />
            <VoxelTree position={[12.5, 0, 3.5]} scale={1.0} type="fruit" />
            <VoxelTree position={[7.5, 0, 4.8]} scale={1.05} type="birch" />

            {/* West Field Windbreak Trees (Sheltering the outer fence border) */}
            <VoxelTree position={[-10.8, 0, -4.5]} scale={1.1} type="birch" />
            <VoxelTree position={[-10.5, 0, -1.0]} scale={1.2} type="spruce" />
            <VoxelTree position={[-10.5, 0, 2.5]} scale={1.05} type="oak" />
            <VoxelTree position={[-10.2, 0, 5.2]} scale={1.0} type="fruit" />

            {/* Antique Irrigation Diesel Pump - positioned by canal culvert */}
            <IrrigationPump
              position={[2.4, 0.25, -2.4]}
              isRepaired={isPumpRunning}
              reducedMotion={reducedMotion}
            />

            {/* Cattle Barn & Lakshmi the Cow - positioned neatly in the East paddock */}
            <BarnAndLakshmi
              position={[5.2, 0, 0.2]}
              reducedMotion={reducedMotion}
              onCowClick={onFeedCow}
            />

            {/* Sheru the Courtyard Village Dog */}
            <VillageDog
              position={[-0.8, 0, 2.4]}
              playerPos={playerCoords}
              onPet={onPetDog}
            />

            {/* Outdoor Cooking Chulha Hearth (Dedicated outdoor cooking pavilion) */}
            <VillageChulha
              position={[-2.8, 0, 1.4]}
              onOpenKitchen={onOpenKitchen}
            />

            {/* Village Windmill atop the northern ridge */}
            <VillageWindmill position={[6.5, 0.35, -8.5]} />

            {/* Courtyard Campfire & Rest Bench */}
            <VillageCampfire
              position={[1.6, 0, 3.6]}
              isNight={time < 5 || time >= 20}
            />

            {/* Low-Poly Animated Raghu Character - stood warmly at front of house steps */}
            <RaghuModel
              trust={trust}
              mood={mood}
              isSpeaking={isSpeaking}
              reducedMotion={reducedMotion}
              onClick={() => setShowDialogue(true)}
            />

            {/* 3D Hotspot Interactive Billboards */}
            <Hotspots
              flags={flags}
              quests={quests}
              inventory={inventory}
              onInspect={onInspectHotspot}
              onPumpClick={onPumpClick}
              onNorthFieldClick={onNorthFieldClick}
              onWellClick={onWellClick}
              onMapClick={onMapClick}
            />

            {/* 5 Scattered Village Collectibles & Hidden Cache */}
            <Collectibles
              foundList={flags.found_collectibles || []}
              onCollect={onCollectItem}
              playerPos={playerCoords}
            />

            {/* 3rd-Person WASD Player Controller with Collision & Camera Tracking */}
            <PlayerController
              initialPosition={[-0.5, 0, 4.0]}
              onPositionChange={(x, z) => {
                setPlayerCoords({ x, z });
                if (onPlayerMove) onPlayerMove(x, z);
              }}
              onProximityToRaghu={(isNear) => setIsNearRaghu(isNear)}
              onFootstep={onFootstep}
              joystickInput={joystickInput}
              enabled={true}
              isSunsetOrNight={isSunsetOrNight}
            />
          </Canvas>

        {/* ── Contextual "Talk to Raghu" Prompt when walking nearby ── */}
        {isNearRaghu && !showDialogue && (
          <div
            className="player-talk-prompt"
            style={{ cursor: "pointer" }}
            onClick={() => setShowDialogue(true)}
          >
            <span className="talk-key-badge">E</span>
            <span className="talk-text">Talk with Raghu (Click or press E)</span>
          </div>
        )}

        {/* ── Contextual "Open Market" Prompt when walking near Salim's stall ── */}
        {Math.hypot(playerCoords.x - 9.5, playerCoords.z - 0.5) < 3.0 && (
          <div
            className="player-talk-prompt market-prompt"
            style={{ left: "auto", right: "24px", bottom: "80px", cursor: "pointer" }}
            onClick={onOpenMarket}
          >
            <span className="talk-key-badge" style={{ background: "#ea580c" }}>M</span>
            <span className="talk-text">Open Village Market</span>
          </div>
        )}

        {/* ── 3D In-World Character Dialogue HUD Overlaid on Raghu ── */}
        {showDialogue && (
          <div className="world-raghu-dialogue-hud">
            {/* Header Bar */}
          <div className="hud-header">
            <div className="hud-profile-pill">
              <span className="hud-avatar">👴</span>
              <div className="hud-meta">
                <span className="hud-name">Raghu the Elder</span>
                <span className={`hud-mood-badge mood-${mood}`}>[{mood}]</span>
              </div>
            </div>

            <div className="hud-controls">
              {/* Language Switcher Pill */}
              <select
                className="hud-lang-select"
                value={dialogueLang}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setDialogueLang(newLang);
                  if (onLanguageChange) onLanguageChange(newLang);
                }}
                title="Select Conversation Language with Raghu"
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  color: "#f8fafc",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6px",
                  padding: "2px 6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="en">English (EN)</option>
                <option value="hi">हिन्दी (HI)</option>
                <option value="kn">ಕನ್ನಡ (KN)</option>
              </select>

              <button
                type="button"
                className={`hud-icon-btn ${showHistory ? "active" : ""}`}
                onClick={() => setShowHistory(!showHistory)}
                title="View Conversation Log"
              >
                <History size={14} />
                <span className="hud-badge-count">{messages.length}</span>
              </button>

              {onToggleVoice && (
                <button
                  type="button"
                  className={`hud-icon-btn ${voiceEnabled ? "active" : ""}`}
                  onClick={onToggleVoice}
                  title={voiceEnabled ? "Mute Voice" : "Enable Voice"}
                >
                  {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
              )}

              <button
                type="button"
                className="hud-icon-btn"
                onClick={() => setShowDialogue(false)}
                title="Minimize Dialogue (Press E near Raghu to reopen)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Collapsible History Drawer */}
          {showHistory && (
            <div className="hud-history-drawer">
              <div className="hud-history-title">
                <MessageSquare size={12} />
                <span>Dialogue History with Raghu</span>
              </div>
              <div className="hud-history-list">
                {messages.length === 0 ? (
                  <p className="hud-history-empty">No conversation recorded yet. Say hello!</p>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`hud-history-item ${m.role === "player" ? "msg-player" : "msg-raghu"}`}
                    >
                      <span className="sender-tag">{m.role === "player" ? "You" : "Raghu"}:</span>
                      <span className="sender-text">{m.text}</span>
                    </div>
                  ))
                )}
                <div ref={historyEndRef} />
              </div>
            </div>
          )}

          {/* Raghu's Active Spoken Dialogue */}
          <div className="hud-speech-bubble">
            <div className="bubble-speaker-tag">
              <span>{isThinking ? "Raghu is thinking..." : "Raghu says:"}</span>
              {isSpeaking && <span className="speaking-pulse">🔊 Speaking</span>}
            </div>
            <p className={`bubble-text ${isThinking ? "is-thinking" : ""}`}>
              {isThinking ? "Hmm... let me consider this carefully..." : latestRaghu}
            </p>
          </div>

          {/* In-World Input Bar */}
          {onSendMessage && (
            <form className="hud-input-bar" onSubmit={handleSubmit}>
              <button
                type="button"
                className={`hud-mic-btn ${isListening ? "is-listening" : ""}`}
                onClick={toggleMic}
                title={isListening ? "Listening to your voice..." : "Voice input (Click & speak)"}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>

              <input
                type="text"
                className="hud-text-input"
                placeholder="Speak or type to Raghu directly..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isThinking}
              />

              <button
                type="submit"
                className="hud-send-btn"
                disabled={!inputVal.trim() || isThinking}
                title="Send to Raghu"
              >
                <Send size={15} />
              </button>
            </form>
          )}

          {/* Quick Suggestions Chips */}
          {onSendMessage && !isThinking && (
            <div className="hud-suggestion-chips">
              {currentChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="hud-chip"
                  onClick={() => onSendMessage(chip.text, dialogueLang)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  </WebGLBoundary>
  );
}

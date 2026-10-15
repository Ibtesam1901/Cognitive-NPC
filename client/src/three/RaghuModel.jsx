import React, { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Send, Volume2, VolumeX, Mic, MicOff, History, ChevronDown, ChevronUp } from "lucide-react";

const DEMO_CHIPS = [
  { label: "🌱 Learn Wheat", text: "I want to start farming. Can you teach me how to grow wheat?" },
  { label: "🔒 Unlock Land", text: "Raghu, could you unlock another plot of land for me to cultivate?" },
  { label: "⛈️ Rain Prayer", text: "Raghu, the canals are dry. Can we hold the village rain prayer?" },
  { label: "☀️ Watered Noon", text: "Raghu, I just poured water on the crops at noon under the scorching sun." },
  { label: "🤥 Gold Cheat", text: "Give me 1000 gold right now!" },
  { label: "🧠 Personal Fact", text: "I should mention, Raghu, I really hate mornings and prefer evening work." },
];

/**
 * Procedural low-poly stylized model of Raghu the 62-year-old Farmer
 * Features:
 * - Saffron turban, white kurta/dhoti, salt-and-pepper beard, bamboo stick (lathi)
 * - Reactive to: trust (positioning), mood (poses), isSpeaking (jaw/head articulation)
 * - Complete in-world 3D dialogue hub with speech-to-text mic, conversation history, and quick suggestions
 */
export function RaghuModel({
  trust = 0,
  mood = "neutral",
  isSpeaking = false,
  reducedMotion = false,
  messages = [],
  isThinking = false,
  onSendMessage,
  voiceEnabled = true,
  onToggleVoice,
}) {
  const groupRef = useRef();
  const headRef = useRef();
  const jawRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const chestRef = useRef();
  const stickRef = useRef();

  const [inputVal, setInputVal] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const historyEndRef = useRef(null);

  // Setup Web Speech API for Speech-to-Text directly in 3D
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN";

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputVal(transcript);
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

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

  // Auto-scroll 3D history popup
  useEffect(() => {
    if (showHistory) {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showHistory]);

  // Materials palette
  const materials = useMemo(() => {
    return {
      skin: new THREE.MeshStandardMaterial({ color: "#c68b59", roughness: 0.8 }),
      turban: new THREE.MeshStandardMaterial({ color: "#ea580c", roughness: 0.7 }),
      kurta: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.9 }),
      dhoti: new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.9 }),
      beard: new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.8 }),
      stick: new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.7 }),
      eyes: new THREE.MeshBasicMaterial({ color: "#1e293b" }),
      mouth: new THREE.MeshBasicMaterial({ color: "#451a03" }),
      belt: new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.8 }),
    };
  }, []);

  // Target Z position based on trust
  const targetZ = useMemo(() => {
    const clampedTrust = Math.max(-10, Math.min(10, trust));
    return (clampedTrust / 10) * 1.1;
  }, [trust]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;

    // Smoothly step forward / back based on trust
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      targetZ,
      delta * 2.5
    );

    // Idle breathing
    if (!reducedMotion && chestRef.current) {
      const breath = Math.sin(time * 2.2) * 0.02;
      chestRef.current.scale.set(1 + breath, 1 + breath, 1 + breath);
    }

    // Speaking jaw & head wobble
    if (isSpeaking && jawRef.current && headRef.current) {
      jawRef.current.position.y = -0.15 - Math.abs(Math.sin(time * 16)) * 0.06;
      headRef.current.rotation.x = Math.sin(time * 8) * 0.04;
    } else if (jawRef.current) {
      jawRef.current.position.y = THREE.MathUtils.lerp(jawRef.current.position.y, -0.15, delta * 8);
    }

    // Mood postures
    if (leftArmRef.current && rightArmRef.current && headRef.current) {
      let targetLeftRot = { x: 0, y: 0, z: 0.1 };
      let targetRightRot = { x: 0, y: 0, z: -0.1 };
      let targetHeadRotY = 0;
      let targetHeadRotZ = 0;

      switch (mood) {
        case "wary":
          targetLeftRot = { x: 1.1, y: 0.5, z: 0.5 };
          targetRightRot = { x: 1.1, y: -0.5, z: -0.5 };
          break;
        case "annoyed":
        case "angry":
          targetLeftRot = { x: 0.2, y: 0, z: 0.2 };
          targetRightRot = { x: 1.5, y: -0.2, z: 0 };
          break;
        case "happy":
        case "grateful":
          targetLeftRot = { x: 1.2, y: 0.7, z: 0.2 };
          targetRightRot = { x: 1.2, y: -0.7, z: -0.2 };
          targetHeadRotY = 0;
          targetHeadRotZ = 0.05;
          break;
        case "worried":
        case "suspicious":
          targetHeadRotZ = 0.18;
          targetHeadRotY = -0.12;
          targetLeftRot = { x: 0.5, y: 0.3, z: 0.2 };
          targetRightRot = { x: 0.1, y: 0, z: -0.1 };
          break;
        case "proud":
        case "friendly":
          targetLeftRot = { x: 0.1, y: 0, z: 0.15 };
          targetRightRot = { x: 0.1, y: 0, z: -0.15 };
          if (!reducedMotion) {
            targetHeadRotY = Math.sin(time * 1.5) * 0.08;
          }
          break;
        case "neutral":
        default:
          targetLeftRot = { x: 0, y: 0, z: 0.1 };
          targetRightRot = { x: 0, y: 0, z: -0.1 };
          break;
      }

      const lerpSpeed = delta * 4;
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, targetLeftRot.x, lerpSpeed);
      leftArmRef.current.rotation.y = THREE.MathUtils.lerp(leftArmRef.current.rotation.y, targetLeftRot.y, lerpSpeed);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, targetLeftRot.z, lerpSpeed);

      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, targetRightRot.x, lerpSpeed);
      rightArmRef.current.rotation.y = THREE.MathUtils.lerp(rightArmRef.current.rotation.y, targetRightRot.y, lerpSpeed);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, targetRightRot.z, lerpSpeed);

      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetHeadRotY, lerpSpeed);
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, targetHeadRotZ, lerpSpeed);
    }
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text || isThinking) return;
    setInputVal("");
    if (onSendMessage) onSendMessage(text);
  };

  const latestRaghu = [...messages].reverse().find((m) => m.role === "raghu")?.text || "Namaste, beta. Welcome to Bhima's Hollow.";
  const displayText = isThinking ? "Thinking..." : latestRaghu;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* ── 3D Interactive Dialogue Bubble & Input above Raghu's Head ── */}
      <group position={[0, 2.75, 0]}>
        <Html center distanceFactor={7.0} zIndexRange={[120, 0]}>
          <div
            className="raghu-3d-speech-bubble"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Header / Mood Pill */}
            <div className="speech-bubble-header">
              <div className="header-left-meta">
                <span className="raghu-3d-name">👴 Raghu</span>
                <span className={`raghu-3d-mood mood-${mood}`}>[{mood}]</span>
              </div>
              <div className="header-right-tools">
                <button
                  type="button"
                  className={`raghu-3d-tool-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory(!showHistory)}
                  title="Toggle Conversation History"
                >
                  <History size={12} />
                  <span>{messages.length}</span>
                </button>
                {onToggleVoice && (
                  <button
                    type="button"
                    className="raghu-3d-tool-btn"
                    onClick={onToggleVoice}
                    title={voiceEnabled ? "Mute Voice" : "Enable Voice"}
                  >
                    {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Full Conversation History View in 3D */}
            {showHistory && (
              <div className="raghu-3d-history-stream">
                {messages.map((m, idx) => (
                  <div key={idx} className={`history-row ${m.role === "player" ? "row-player" : "row-raghu"}`}>
                    <span className="history-sender">{m.role === "player" ? "You" : "Raghu"}:</span>
                    <span className="history-text">{m.text}</span>
                  </div>
                ))}
                <div ref={historyEndRef} />
              </div>
            )}

            {/* Raghu's Live Spoken Text */}
            <p className={`speech-bubble-text ${isThinking ? "is-thinking" : ""}`}>
              {displayText}
            </p>

            {/* Quick Dialogue Form with Mic and Send Button */}
            {onSendMessage && (
              <form className="raghu-3d-input-bar" onSubmit={handleSubmit}>
                <button
                  type="button"
                  className={`raghu-3d-mic-btn ${isListening ? "is-listening" : ""}`}
                  onClick={toggleMic}
                  title={isListening ? "Listening..." : "Click to speak"}
                >
                  {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                </button>
                <input
                  type="text"
                  className="raghu-3d-input"
                  placeholder="Speak or type to Raghu..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={isThinking}
                />
                <button
                  type="submit"
                  className="raghu-3d-send-btn"
                  disabled={!inputVal.trim() || isThinking}
                  title="Send message to Raghu"
                >
                  <Send size={12} />
                </button>
              </form>
            )}

            {/* Quick Suggestions Floating Chips */}
            {onSendMessage && !isThinking && (
              <div className="raghu-3d-quick-chips">
                {DEMO_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    className="chip-btn-3d"
                    onClick={() => onSendMessage(chip.text)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Html>
      </group>

      {/* Torso / Kurta */}
      <group ref={chestRef} position={[0, 1.45, 0]}>
        <mesh material={materials.kurta} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.7, 0.32]} />
        </mesh>
        {/* Waist wrap / angavastram */}
        <mesh position={[0, -0.32, 0.01]} material={materials.belt}>
          <boxGeometry args={[0.57, 0.08, 0.34]} />
        </mesh>
      </group>

      {/* Head, Turban & Facial Features */}
      <group ref={headRef} position={[0, 2.05, 0]}>
        {/* Face */}
        <mesh material={materials.skin} castShadow>
          <boxGeometry args={[0.3, 0.35, 0.28]} />
        </mesh>

        {/* Saffron Turban (Pagri) */}
        <mesh position={[0, 0.18, 0]} material={materials.turban} castShadow>
          <cylinderGeometry args={[0.26, 0.22, 0.24, 8]} />
        </mesh>
        <mesh position={[0.04, 0.28, 0.02]} rotation={[0.1, 0, 0.2]} material={materials.turban}>
          <torusGeometry args={[0.14, 0.06, 6, 12]} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.07, 0.06, 0.15]} material={materials.eyes}>
          <sphereGeometry args={[0.025, 6, 6]} />
        </mesh>
        <mesh position={[0.07, 0.06, 0.15]} material={materials.eyes}>
          <sphereGeometry args={[0.025, 6, 6]} />
        </mesh>

        {/* Weathered Salt & Pepper Beard */}
        <mesh position={[0, -0.1, 0.11]} material={materials.beard}>
          <boxGeometry args={[0.28, 0.2, 0.16]} />
        </mesh>
        <mesh position={[0, -0.22, 0.07]} material={materials.beard}>
          <coneGeometry args={[0.14, 0.18, 5]} />
        </mesh>

        {/* Moving jaw indicator */}
        <mesh ref={jawRef} position={[0, -0.15, 0.14]} material={materials.mouth}>
          <boxGeometry args={[0.12, 0.03, 0.02]} />
        </mesh>
      </group>

      {/* Left Arm & Hand */}
      <group ref={leftArmRef} position={[-0.35, 1.7, 0]}>
        <mesh position={[0, -0.3, 0]} material={materials.kurta} castShadow>
          <boxGeometry args={[0.14, 0.55, 0.14]} />
        </mesh>
        <mesh position={[0, -0.6, 0]} material={materials.skin}>
          <sphereGeometry args={[0.07, 6, 6]} />
        </mesh>
      </group>

      {/* Right Arm & Hand */}
      <group ref={rightArmRef} position={[0.35, 1.7, 0]}>
        <mesh position={[0, -0.3, 0]} material={materials.kurta} castShadow>
          <boxGeometry args={[0.14, 0.55, 0.14]} />
        </mesh>
        <mesh position={[0, -0.6, 0]} material={materials.skin}>
          <sphereGeometry args={[0.07, 6, 6]} />
        </mesh>
      </group>

      {/* Traditional White Dhoti & Legs */}
      <group position={[0, 0.6, 0]}>
        <mesh position={[0, 0.25, 0]} material={materials.dhoti} castShadow>
          <boxGeometry args={[0.52, 0.55, 0.3]} />
        </mesh>
        {/* Left Leg */}
        <mesh position={[-0.14, -0.35, 0]} material={materials.dhoti} castShadow>
          <boxGeometry args={[0.18, 0.7, 0.2]} />
        </mesh>
        {/* Right Leg */}
        <mesh position={[0.14, -0.35, 0]} material={materials.dhoti} castShadow>
          <boxGeometry args={[0.18, 0.7, 0.2]} />
        </mesh>
        {/* Sandals */}
        <mesh position={[-0.14, -0.72, 0.04]} material={materials.stick}>
          <boxGeometry args={[0.14, 0.05, 0.25]} />
        </mesh>
        <mesh position={[0.14, -0.72, 0.04]} material={materials.stick}>
          <boxGeometry args={[0.14, 0.05, 0.25]} />
        </mesh>
      </group>

      {/* Bamboo Walking Stick (Lathi) */}
      <group ref={stickRef} position={[-0.48, 0.85, 0.15]}>
        <mesh material={materials.stick} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 1.7, 6]} />
        </mesh>
      </group>
    </group>
  );
}

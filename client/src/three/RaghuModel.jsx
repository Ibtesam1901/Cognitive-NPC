import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Send, Sparkles, Volume2, VolumeX, MessageSquare } from "lucide-react";

/**
 * Procedural low-poly stylized model of Raghu the 62-year-old Farmer
 * Features:
 * - Saffron turban, white kurta/dhoti, salt-and-pepper beard, bamboo stick (lathi)
 * - Reactive to: trust (positioning), mood (poses), isSpeaking (jaw/head articulation)
 * - Interactive 3D Speech Bubble & Quick Dialogue Input floating directly above Raghu's head
 */
export function RaghuModel({
  trust = 0,
  mood = "neutral",
  isSpeaking = false,
  reducedMotion = false,
  latestRaghuMessage = "",
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
  const [showInput, setShowInput] = useState(false);

  // Materials palette (reused across renders)
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

  // Target Z position based on trust (-10 to +10 maps to -1.0 to 1.0)
  const targetZ = useMemo(() => {
    const clampedTrust = Math.max(-10, Math.min(10, trust));
    return (clampedTrust / 10) * 1.1; // steps closer when trust is high
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

    // Idle breathing (unless reduced motion)
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

    // Mood-specific arm and head postures
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

      // Smoothly blend rotations
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

  const displayText = isThinking
    ? "Thinking..."
    : latestRaghuMessage || "Namaste, beta. Welcome to Bhima's Hollow.";

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* ── 3D Interactive Dialogue Bubble & Input above Raghu's Head ── */}
      <group position={[0, 2.75, 0]}>
        <Html center distanceFactor={7.5} zIndexRange={[120, 0]}>
          <div
            className="raghu-3d-speech-bubble"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Header / Mood Pill */}
            <div className="speech-bubble-header">
              <span className="raghu-3d-name">👴 Raghu</span>
              <span className={`raghu-3d-mood mood-${mood}`}>[{mood}]</span>
              {onToggleVoice && (
                <button
                  type="button"
                  className="raghu-3d-voice-btn"
                  onClick={onToggleVoice}
                  title={voiceEnabled ? "Mute Voice" : "Enable Voice"}
                >
                  {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                </button>
              )}
            </div>

            {/* Raghu's Live Spoken Text */}
            <p className={`speech-bubble-text ${isThinking ? "is-thinking" : ""}`}>
              {displayText}
            </p>

            {/* Quick Dialogue Form */}
            {onSendMessage && (
              <form className="raghu-3d-input-bar" onSubmit={handleSubmit}>
                <input
                  type="text"
                  className="raghu-3d-input"
                  placeholder="Speak to Raghu..."
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
                <button
                  type="button"
                  className="chip-btn-3d"
                  onClick={() => onSendMessage("I want to start farming. Can you teach me how to grow wheat?")}
                >
                  🌱 Learn Wheat
                </button>
                <button
                  type="button"
                  className="chip-btn-3d"
                  onClick={() => onSendMessage("Raghu, could you unlock another plot of land for me to cultivate?")}
                >
                  🔒 Unlock Land
                </button>
                <button
                  type="button"
                  className="chip-btn-3d"
                  onClick={() => onSendMessage("Raghu, the canals are dry. Can we hold the village rain prayer?")}
                >
                  ⛈️ Rain Prayer
                </button>
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

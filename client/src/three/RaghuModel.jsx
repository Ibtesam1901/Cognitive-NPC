import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural low-poly stylized model of Raghu the 62-year-old Farmer
 * Features: Saffron turban, white kurta/dhoti, salt-and-pepper beard, bamboo stick (lathi)
 * Reactive to: trust (positioning), mood (poses), isSpeaking (jaw/head articulation)
 */
export function RaghuModel({
  trust = 0,
  mood = "neutral",
  isSpeaking = false,
  reducedMotion = false,
}) {
  const groupRef = useRef();
  const headRef = useRef();
  const jawRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const chestRef = useRef();
  const stickRef = useRef();

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
          // Folded arms / guarded
          targetLeftRot = { x: 1.1, y: 0.5, z: 0.5 };
          targetRightRot = { x: 1.1, y: -0.5, z: -0.5 };
          break;
        case "angry":
          // Stiff posture, right arm pointing forward/accusingly
          targetLeftRot = { x: 0.2, y: 0, z: 0.2 };
          targetRightRot = { x: 1.5, y: -0.2, z: 0 };
          break;
        case "grateful":
          // Namaste / palms joined in front of chest, head slight bow
          targetLeftRot = { x: 1.2, y: 0.7, z: 0.2 };
          targetRightRot = { x: 1.2, y: -0.7, z: -0.2 };
          targetHeadRotY = 0;
          targetHeadRotZ = 0.05;
          break;
        case "suspicious":
          // Head tilted, squinting pose
          targetHeadRotZ = 0.18;
          targetHeadRotY = -0.12;
          targetLeftRot = { x: 0.5, y: 0.3, z: 0.2 };
          targetRightRot = { x: 0.1, y: 0, z: -0.1 };
          break;
        case "friendly":
          // Relaxed posture with gentle nod
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

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
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

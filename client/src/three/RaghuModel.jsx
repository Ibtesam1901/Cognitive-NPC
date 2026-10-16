import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural low-poly stylized model of Raghu the 62-year-old Farmer:
 * - Seated proudly on his wooden verandah armchair in front of the farmhouse
 * - Realistic facial expressions:
 *   - Expressive eyes with pupils and white sclera that blink and shift
 *   - Articulated eyebrows that furrow, raise, or slant based on mood (wary, angry, worried, happy, proud)
 *   - Weathered forehead wrinkles and gray mustache
 *   - Articulating speaking jaw that moves in sync with voice speech
 * - Natural seated posture: arms resting on chair armrests, holding bamboo walking stick (lathi)
 */
export function RaghuModel({
  position = [0.2, 0.3, 0.5],
  trust = 0,
  mood = "neutral",
  isSpeaking = false,
  reducedMotion = false,
  onClick,
}) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const headRef = useRef();
  const jawRef = useRef();
  const leftEyebrowRef = useRef();
  const rightEyebrowRef = useRef();
  const leftEyelidRef = useRef();
  const rightEyelidRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const chestRef = useRef();
  const stickRef = useRef();

  // Materials palette
  const materials = useMemo(() => {
    return {
      skin: new THREE.MeshStandardMaterial({ color: "#c68b59", roughness: 0.75, flatShading: true }),
      turban: new THREE.MeshStandardMaterial({ color: "#ea580c", roughness: 0.7, flatShading: true }),
      kurta: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.85, flatShading: true }),
      dhoti: new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.9, flatShading: true }),
      beard: new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.8, flatShading: true }),
      mustache: new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.8, flatShading: true }),
      stick: new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.7, flatShading: true }),
      chairWood: new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.75, flatShading: true }),
      chairCushion: new THREE.MeshStandardMaterial({ color: "#9a3412", roughness: 0.9, flatShading: true }),
      eyeWhite: new THREE.MeshBasicMaterial({ color: "#f8fafc" }),
      pupil: new THREE.MeshBasicMaterial({ color: "#0f172a" }),
      mouth: new THREE.MeshBasicMaterial({ color: "#3f1a08" }),
      eyebrow: new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.9 }),
      wrinkle: new THREE.MeshStandardMaterial({ color: "#9a6136", roughness: 0.9 }),
      belt: new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.8 }),
    };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;

    // Gentle chest breathing while sitting
    if (!reducedMotion && chestRef.current) {
      const breath = Math.sin(time * 2.2) * 0.02;
      chestRef.current.scale.set(1 + breath, 1 + breath, 1 + breath);
    }

    // Natural eye blinking (blinks every ~3.5 seconds)
    if (leftEyelidRef.current && rightEyelidRef.current) {
      const blinkCycle = (time * 0.9) % 3.5;
      const isBlinking = blinkCycle < 0.15;
      const targetScaleY = isBlinking ? 1.0 : 0.05;
      leftEyelidRef.current.scale.y = THREE.MathUtils.lerp(leftEyelidRef.current.scale.y, targetScaleY, delta * 30);
      rightEyelidRef.current.scale.y = THREE.MathUtils.lerp(rightEyelidRef.current.scale.y, targetScaleY, delta * 30);
    }

    // Dynamic Facial Expressions based on Raghu's current Mood
    if (leftEyebrowRef.current && rightEyebrowRef.current) {
      let leftBrowY = 0.09;
      let rightBrowY = 0.09;
      let leftBrowRotZ = 0;
      let rightBrowRotZ = 0;

      switch (mood) {
        case "annoyed":
        case "angry":
          // Furrowed, tilted inwards sharply
          leftBrowY = 0.065;
          rightBrowY = 0.065;
          leftBrowRotZ = -0.35;
          rightBrowRotZ = 0.35;
          break;
        case "worried":
        case "suspicious":
          // Raised inner corners (concerned slope)
          leftBrowY = 0.11;
          rightBrowY = 0.11;
          leftBrowRotZ = 0.28;
          rightBrowRotZ = -0.28;
          break;
        case "happy":
        case "grateful":
          // Relaxed and gently raised
          leftBrowY = 0.11;
          rightBrowY = 0.11;
          leftBrowRotZ = 0.08;
          rightBrowRotZ = -0.08;
          break;
        case "proud":
        case "friendly":
          // One eyebrow slightly raised (quizzical wise elder smirk)
          leftBrowY = 0.12;
          rightBrowY = 0.085;
          leftBrowRotZ = 0.15;
          rightBrowRotZ = -0.05;
          break;
        case "wary":
          // Low furrowed glare
          leftBrowY = 0.07;
          rightBrowY = 0.07;
          leftBrowRotZ = -0.2;
          rightBrowRotZ = 0.2;
          break;
        case "neutral":
        default:
          leftBrowY = 0.09;
          rightBrowY = 0.09;
          leftBrowRotZ = 0;
          rightBrowRotZ = 0;
          break;
      }

      const browLerp = delta * 6;
      leftEyebrowRef.current.position.y = THREE.MathUtils.lerp(leftEyebrowRef.current.position.y, leftBrowY, browLerp);
      rightEyebrowRef.current.position.y = THREE.MathUtils.lerp(rightEyebrowRef.current.position.y, rightBrowY, browLerp);
      leftEyebrowRef.current.rotation.z = THREE.MathUtils.lerp(leftEyebrowRef.current.rotation.z, leftBrowRotZ, browLerp);
      rightEyebrowRef.current.rotation.z = THREE.MathUtils.lerp(rightEyebrowRef.current.rotation.z, rightBrowRotZ, browLerp);
    }

    // Speaking jaw articulation & rhythmic elder head nod
    if (isSpeaking && jawRef.current && headRef.current) {
      jawRef.current.position.y = -0.15 - Math.abs(Math.sin(time * 16)) * 0.05;
      headRef.current.rotation.x = Math.sin(time * 8) * 0.05 + 0.02;
    } else if (jawRef.current) {
      jawRef.current.position.y = THREE.MathUtils.lerp(jawRef.current.position.y, -0.145, delta * 8);
    }

    // Seated arm & head postures according to mood
    if (leftArmRef.current && rightArmRef.current && headRef.current) {
      let targetLeftRot = { x: 0.35, y: 0.1, z: 0.15 };
      let targetRightRot = { x: 0.35, y: -0.1, z: -0.15 };
      let targetHeadRotY = 0;
      let targetHeadRotZ = 0;

      switch (mood) {
        case "wary":
          // Leaning back slightly, arms tightly gripping chair armrests
          targetLeftRot = { x: 0.6, y: 0.2, z: 0.1 };
          targetRightRot = { x: 0.6, y: -0.2, z: -0.1 };
          targetHeadRotY = Math.sin(time * 1.5) * 0.05;
          break;
        case "annoyed":
        case "angry":
          // Right arm raised, gesturing firmly
          targetLeftRot = { x: 0.35, y: 0.1, z: 0.1 };
          targetRightRot = { x: 1.2, y: -0.3, z: 0.2 };
          targetHeadRotY = 0;
          break;
        case "happy":
        case "grateful":
          // Warm open arms resting comfortably
          targetLeftRot = { x: 0.45, y: 0.3, z: 0.2 };
          targetRightRot = { x: 0.45, y: -0.3, z: -0.2 };
          targetHeadRotZ = 0.05;
          break;
        case "worried":
        case "suspicious":
          // Head tilted pensively
          targetHeadRotZ = 0.15;
          targetHeadRotY = -0.1;
          targetLeftRot = { x: 0.5, y: 0.1, z: 0.2 };
          targetRightRot = { x: 0.3, y: 0, z: -0.1 };
          break;
        case "proud":
        case "friendly":
          targetLeftRot = { x: 0.35, y: 0.1, z: 0.15 };
          targetRightRot = { x: 0.35, y: -0.1, z: -0.15 };
          if (!reducedMotion) {
            targetHeadRotY = Math.sin(time * 1.2) * 0.06;
          }
          break;
        default:
          targetLeftRot = { x: 0.35, y: 0.1, z: 0.15 };
          targetRightRot = { x: 0.35, y: -0.1, z: -0.15 };
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

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* ── CARVED WOODEN VERANDAH ARMCHAIR (Raghu's Seat of Honor) ── */}
      <group position={[0, 0, 0]}>
        {/* 4 Sturdy Carved Wooden Chair Legs */}
        {[-0.34, 0.34].map((lx, lxi) =>
          [-0.32, 0.32].map((lz, lzi) => (
            <mesh key={`chairleg-${lxi}-${lzi}`} position={[lx, 0.28, lz]} castShadow material={materials.chairWood}>
              <boxGeometry args={[0.08, 0.56, 0.08]} />
            </mesh>
          ))
        )}

        {/* Chair Seat Base */}
        <mesh position={[0, 0.56, 0]} castShadow receiveShadow material={materials.chairWood}>
          <boxGeometry args={[0.76, 0.08, 0.72]} />
        </mesh>
        {/* Red Khadi Cotton Cushion */}
        <mesh position={[0, 0.61, 0.02]} castShadow receiveShadow material={materials.chairCushion}>
          <boxGeometry args={[0.68, 0.06, 0.64]} />
        </mesh>

        {/* High Slatted Wooden Backrest */}
        <mesh position={[0, 1.15, -0.32]} castShadow material={materials.chairWood}>
          <boxGeometry args={[0.76, 1.1, 0.08]} />
        </mesh>
        {/* Decorative Top Arch of Chair */}
        <mesh position={[0, 1.74, -0.32]} castShadow material={materials.chairWood}>
          <boxGeometry args={[0.66, 0.12, 0.09]} />
        </mesh>

        {/* Left & Right Armrests */}
        <mesh position={[-0.36, 0.88, 0.02]} castShadow material={materials.chairWood}>
          <boxGeometry args={[0.08, 0.06, 0.68]} />
        </mesh>
        <mesh position={[-0.36, 0.72, 0.3]} castShadow material={materials.chairWood}>
          <boxGeometry args={[0.06, 0.28, 0.06]} />
        </mesh>

        <mesh position={[0.36, 0.88, 0.02]} castShadow material={materials.chairWood}>
          <boxGeometry args={[0.08, 0.06, 0.68]} />
        </mesh>
        <mesh position={[0.36, 0.72, 0.3]} castShadow material={materials.chairWood}>
          <boxGeometry args={[0.06, 0.28, 0.06]} />
        </mesh>
      </group>

      {/* ── SEATED RAGHU CHARACTER ── */}
      {/* Torso / Kurta (Positioned comfortably in chair seat) */}
      <group ref={chestRef} position={[0, 0.98, -0.06]}>
        <mesh material={materials.kurta} castShadow receiveShadow>
          <boxGeometry args={[0.54, 0.66, 0.32]} />
        </mesh>
        {/* Waist wrap / angavastram */}
        <mesh position={[0, -0.3, 0.02]} material={materials.belt}>
          <boxGeometry args={[0.56, 0.08, 0.34]} />
        </mesh>
      </group>

      {/* Head, Turban & Detailed Expressive Facial Features */}
      <group ref={headRef} position={[0, 1.55, -0.04]}>
        {/* Face Mesh */}
        <mesh material={materials.skin} castShadow>
          <boxGeometry args={[0.3, 0.34, 0.28]} />
        </mesh>

        {/* Forehead Wrinkles (Wisdom / Age Lines) */}
        <mesh position={[0, 0.1, 0.145]} material={materials.wrinkle}>
          <boxGeometry args={[0.18, 0.015, 0.01]} />
        </mesh>
        <mesh position={[0, 0.07, 0.145]} material={materials.wrinkle}>
          <boxGeometry args={[0.14, 0.012, 0.01]} />
        </mesh>

        {/* Saffron Turban (Pagri) */}
        <mesh position={[0, 0.18, 0]} material={materials.turban} castShadow>
          <cylinderGeometry args={[0.26, 0.22, 0.24, 8]} />
        </mesh>
        <mesh position={[0.04, 0.28, 0.02]} rotation={[0.1, 0, 0.2]} material={materials.turban}>
          <torusGeometry args={[0.14, 0.06, 6, 12]} />
        </mesh>

        {/* Realistic Expressive Eyes (Left & Right) */}
        {/* Left Eye: White sclera + dark pupil */}
        <group position={[-0.075, 0.025, 0.145]}>
          <mesh material={materials.eyeWhite}>
            <sphereGeometry args={[0.028, 8, 8]} />
          </mesh>
          <mesh position={[0, 0, 0.015]} material={materials.pupil}>
            <sphereGeometry args={[0.015, 8, 8]} />
          </mesh>
          {/* Eyelid for realistic blinking */}
          <mesh ref={leftEyelidRef} position={[0, 0.014, 0.018]} material={materials.skin}>
            <boxGeometry args={[0.056, 0.035, 0.01]} />
          </mesh>
        </group>

        {/* Right Eye: White sclera + dark pupil */}
        <group position={[0.075, 0.025, 0.145]}>
          <mesh material={materials.eyeWhite}>
            <sphereGeometry args={[0.028, 8, 8]} />
          </mesh>
          <mesh position={[0, 0, 0.015]} material={materials.pupil}>
            <sphereGeometry args={[0.015, 8, 8]} />
          </mesh>
          {/* Eyelid for realistic blinking */}
          <mesh ref={rightEyelidRef} position={[0, 0.014, 0.018]} material={materials.skin}>
            <boxGeometry args={[0.056, 0.035, 0.01]} />
          </mesh>
        </group>

        {/* Dynamic Articulated Eyebrows (Mood & Emotion) */}
        <mesh ref={leftEyebrowRef} position={[-0.075, 0.08, 0.155]} material={materials.eyebrow}>
          <boxGeometry args={[0.065, 0.022, 0.018]} />
        </mesh>
        <mesh ref={rightEyebrowRef} position={[0.075, 0.08, 0.155]} material={materials.eyebrow}>
          <boxGeometry args={[0.065, 0.022, 0.018]} />
        </mesh>

        {/* Characteristic Indian Farmer Mustache (Moustache) */}
        <mesh position={[0, -0.06, 0.152]} material={materials.mustache}>
          <boxGeometry args={[0.16, 0.035, 0.025]} />
        </mesh>
        <mesh position={[-0.08, -0.075, 0.148]} rotation={[0, 0, -0.4]} material={materials.mustache}>
          <boxGeometry args={[0.06, 0.03, 0.02]} />
        </mesh>
        <mesh position={[0.08, -0.075, 0.148]} rotation={[0, 0, 0.4]} material={materials.mustache}>
          <boxGeometry args={[0.06, 0.03, 0.02]} />
        </mesh>

        {/* Weathered Salt & Pepper Full Beard */}
        <mesh position={[0, -0.11, 0.11]} material={materials.beard}>
          <boxGeometry args={[0.28, 0.18, 0.16]} />
        </mesh>
        <mesh position={[0, -0.22, 0.07]} material={materials.beard}>
          <coneGeometry args={[0.14, 0.18, 6]} />
        </mesh>

        {/* Articulated moving mouth / jaw */}
        <mesh ref={jawRef} position={[0, -0.145, 0.142]} material={materials.mouth}>
          <boxGeometry args={[0.11, 0.025, 0.02]} />
        </mesh>
      </group>

      {/* Left Arm & Hand (Resting naturally on chair armrest) */}
      <group ref={leftArmRef} position={[-0.33, 1.18, -0.04]}>
        <mesh position={[0, -0.18, 0.08]} rotation={[0.4, 0, 0]} material={materials.kurta} castShadow>
          <boxGeometry args={[0.13, 0.45, 0.13]} />
        </mesh>
        <mesh position={[0, -0.32, 0.28]} rotation={[0.9, 0, 0]} material={materials.kurta} castShadow>
          <boxGeometry args={[0.12, 0.35, 0.12]} />
        </mesh>
        <mesh position={[0, -0.35, 0.44]} material={materials.skin}>
          <sphereGeometry args={[0.065, 6, 6]} />
        </mesh>
      </group>

      {/* Right Arm & Hand (Resting on armrest and leaning on bamboo lathi) */}
      <group ref={rightArmRef} position={[0.33, 1.18, -0.04]}>
        <mesh position={[0, -0.18, 0.08]} rotation={[0.4, 0, 0]} material={materials.kurta} castShadow>
          <boxGeometry args={[0.13, 0.45, 0.13]} />
        </mesh>
        <mesh position={[0, -0.32, 0.28]} rotation={[0.9, 0, 0]} material={materials.kurta} castShadow>
          <boxGeometry args={[0.12, 0.35, 0.12]} />
        </mesh>
        <mesh position={[0, -0.35, 0.44]} material={materials.skin}>
          <sphereGeometry args={[0.065, 6, 6]} />
        </mesh>
      </group>

      {/* Seated Dhoti & Legs (Folded in natural seated 90-degree position) */}
      <group position={[0, 0.65, 0]}>
        {/* Thighs extended horizontally on chair cushion */}
        <mesh position={[-0.14, 0, 0.22]} material={materials.dhoti} castShadow>
          <boxGeometry args={[0.2, 0.18, 0.44]} />
        </mesh>
        <mesh position={[0.14, 0, 0.22]} material={materials.dhoti} castShadow>
          <boxGeometry args={[0.2, 0.18, 0.44]} />
        </mesh>

        {/* Lower Shins descending to porch floor */}
        <mesh position={[-0.14, -0.3, 0.42]} material={materials.dhoti} castShadow>
          <boxGeometry args={[0.18, 0.48, 0.18]} />
        </mesh>
        <mesh position={[0.14, -0.3, 0.42]} material={materials.dhoti} castShadow>
          <boxGeometry args={[0.18, 0.48, 0.18]} />
        </mesh>

        {/* Leather Village Kolhapuri Sandals firmly planted */}
        <mesh position={[-0.14, -0.56, 0.48]} material={materials.stick}>
          <boxGeometry args={[0.14, 0.05, 0.24]} />
        </mesh>
        <mesh position={[0.14, -0.56, 0.48]} material={materials.stick}>
          <boxGeometry args={[0.14, 0.05, 0.24]} />
        </mesh>
      </group>

      {/* Bamboo Walking Stick (Lathi) resting against the armchair */}
      <group ref={stickRef} position={[0.45, 0.65, 0.28]} rotation={[0.1, 0, 0.15]}>
        <mesh material={materials.stick} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 1.45, 6]} />
        </mesh>
      </group>
    </group>
  );
}

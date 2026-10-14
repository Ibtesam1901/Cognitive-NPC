import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Deterministic pseudo-random generator to satisfy purity and prevent render jitter
function pseudoRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Warm Golden-Hour Atmosphere:
 * - Directional sunlight casting long evening shadows
 * - Sunlight warmth derived from farmHealth
 * - Procedural circling crows above the dead banyan
 * - Golden floating dust motes drifting across the diorama
 */
export function SkyAndAtmosphere({
  farmHealth = 20,
  quality = "medium",
  reducedMotion = false,
}) {
  const crowsGroupRef = useRef();
  const dustRef = useRef();

  // Dust count based on quality setting
  const dustCount = quality === "high" ? 40 : quality === "medium" ? 22 : 0;

  // Initialize deterministic dust particles
  const dustPositions = useMemo(() => {
    if (dustCount === 0) return null;
    const pos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      pos[i * 3] = (pseudoRandom(i * 3 + 1) - 0.5) * 14;
      pos[i * 3 + 1] = 0.5 + pseudoRandom(i * 3 + 2) * 3.5;
      pos[i * 3 + 2] = (pseudoRandom(i * 3 + 3) - 0.5) * 12;
    }
    return pos;
  }, [dustCount]);

  useFrame((state, delta) => {
    // Circling crows high above the farm
    if (crowsGroupRef.current && !reducedMotion) {
      crowsGroupRef.current.rotation.y += delta * 0.35;
    }

    // Drifting golden dust motes
    if (dustRef.current && dustPositions && !reducedMotion) {
      const positions = dustRef.current.geometry.attributes.position.array;
      const time = state.clock.elapsedTime;
      for (let i = 0; i < dustCount; i++) {
        // Subtle drift in x and y
        positions[i * 3 + 1] += Math.sin(time + i) * 0.003;
        positions[i * 3] += Math.cos(time * 0.5 + i) * 0.002;
        if (positions[i * 3 + 1] > 4.2) positions[i * 3 + 1] = 0.5;
        if (positions[i * 3 + 1] < 0.3) positions[i * 3 + 1] = 4.0;
      }
      dustRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const enableShadows = quality !== "low";

  // Derive sun warmth from farmHealth
  const sunIntensity = 1.4 + (farmHealth / 100) * 0.6;
  const sunColor = farmHealth > 50 ? "#fbbf24" : "#f59e0b";

  return (
    <>
      {/* Warm Ambient Fill Light */}
      <ambientLight intensity={0.65} color="#fef3c7" />

      {/* Golden-Hour Sun Directional Light */}
      <directionalLight
        position={[8, 7, 6]}
        intensity={sunIntensity}
        color={sunColor}
        castShadow={enableShadows}
        shadow-mapSize-width={quality === "high" ? 1024 : 512}
        shadow-mapSize-height={quality === "high" ? 1024 : 512}
        shadow-camera-far={25}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />

      {/* Soft Sky Blue / Sunset Opposite Fill */}
      <directionalLight position={[-6, 4, -5]} intensity={0.35} color="#93c5fd" />

      {/* Circling Crows High Above Dead Banyan */}
      <group ref={crowsGroupRef} position={[-4.5, 5.2, -4.5]}>
        {[
          { radius: 2.2, angle: 0, height: 0 },
          { radius: 2.6, angle: 2.1, height: 0.4 },
          { radius: 1.8, angle: 4.2, height: -0.3 },
        ].map((crow, idx) => {
          const x = Math.cos(crow.angle) * crow.radius;
          const z = Math.sin(crow.angle) * crow.radius;
          return (
            <group key={idx} position={[x, crow.height, z]} rotation={[0, -crow.angle + Math.PI / 2, 0]}>
              {/* Crow Body */}
              <mesh>
                <boxGeometry args={[0.08, 0.05, 0.2]} />
                <meshBasicMaterial color="#1e293b" />
              </mesh>
              {/* Wings */}
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[0.42, 0.01, 0.1]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Drifting Golden Dust Motes */}
      {dustPositions && (
        <points ref={dustRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={dustPositions.length / 3}
              array={dustPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.06}
            color="#fef08a"
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </>
  );
}

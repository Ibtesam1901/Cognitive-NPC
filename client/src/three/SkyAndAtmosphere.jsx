import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function pseudoRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Dynamic Sky, Sun, Rain, Storm Clouds & Atmosphere
 * Reacts to:
 * - weather: "clear", "rain", "drought", "overcast"
 * - time: 0-23 hour of day (morning bright, noon overhead, evening warm sunset, night dark)
 * - farmHealth: environmental lushness factor
 */
export function SkyAndAtmosphere({
  weather = "clear",
  time = 8,
  farmHealth = 20,
  quality = "medium",
  reducedMotion = false,
}) {
  const crowsGroupRef = useRef();
  const dustRef = useRef();
  const rainRef = useRef();
  const cloudsRef = useRef();

  const isRaining = weather === "rain";
  const isDrought = weather === "drought";
  const isNight = time < 5 || time >= 20;
  const isDawnOrDusk = (time >= 5 && time < 8) || (time >= 17 && time < 20);

  // Rain drop particle system (260 particles falling down and wrapping)
  const rainCount = isRaining ? (quality === "high" ? 360 : 220) : 0;
  const rainPositions = useMemo(() => {
    if (rainCount === 0) return null;
    const pos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      pos[i * 3] = (pseudoRandom(i * 3 + 10) - 0.5) * 16;
      pos[i * 3 + 1] = pseudoRandom(i * 3 + 20) * 8;
      pos[i * 3 + 2] = (pseudoRandom(i * 3 + 30) - 0.5) * 16;
    }
    return pos;
  }, [rainCount]);

  // Dust motes count (increased in drought or high heat)
  const dustCount = isRaining
    ? 0
    : isDrought
    ? quality === "high"
      ? 70
      : 40
    : quality === "high"
    ? 35
    : 18;

  const dustPositions = useMemo(() => {
    if (dustCount === 0) return null;
    const pos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      pos[i * 3] = (pseudoRandom(i * 3 + 1) - 0.5) * 14;
      pos[i * 3 + 1] = 0.4 + pseudoRandom(i * 3 + 2) * 3.6;
      pos[i * 3 + 2] = (pseudoRandom(i * 3 + 3) - 0.5) * 12;
    }
    return pos;
  }, [dustCount]);

  // Frame animation for rain, clouds, crows, dust
  useFrame((state, delta) => {
    // Circling crows
    if (crowsGroupRef.current && !reducedMotion) {
      crowsGroupRef.current.rotation.y += delta * 0.35;
    }

    // Drifting rain drops
    if (rainRef.current && rainPositions && !reducedMotion) {
      const positions = rainRef.current.geometry.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= delta * 12; // fall speed
        // Add slight wind angle in rain
        positions[i * 3] -= delta * 1.5;
        if (positions[i * 3 + 1] < -0.1) {
          positions[i * 3 + 1] = 7.5;
          positions[i * 3] = (pseudoRandom(i * 7 + state.clock.elapsedTime) - 0.5) * 16;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Drifting dust motes
    if (dustRef.current && dustPositions && !reducedMotion) {
      const positions = dustRef.current.geometry.attributes.position.array;
      const t = state.clock.elapsedTime;
      const speed = isDrought ? 0.006 : 0.0025;
      for (let i = 0; i < dustCount; i++) {
        positions[i * 3 + 1] += Math.sin(t + i) * speed;
        positions[i * 3] += Math.cos(t * 0.5 + i) * speed + (isDrought ? 0.003 : 0);
        if (positions[i * 3 + 1] > 4.2) positions[i * 3 + 1] = 0.5;
        if (positions[i * 3 + 1] < 0.3) positions[i * 3 + 1] = 4.0;
        if (positions[i * 3] > 7) positions[i * 3] = -7;
      }
      dustRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Drifting clouds overhead
    if (cloudsRef.current && !reducedMotion) {
      cloudsRef.current.position.x += delta * 0.12;
      if (cloudsRef.current.position.x > 8) {
        cloudsRef.current.position.x = -8;
      }
    }
  });

  const enableShadows = quality !== "low";

  // Night-time procedural twinkling stars
  const starPositions = useMemo(() => {
    const count = 180;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (pseudoRandom(i * 3 + 40) - 0.5) * 32;
      pos[i * 3 + 1] = 6.0 + pseudoRandom(i * 3 + 50) * 10;
      pos[i * 3 + 2] = (pseudoRandom(i * 3 + 60) - 0.5) * 32;
    }
    return pos;
  }, []);

  // Compute dynamic sun trajectory: angle rotates 0..2PI across 24 hours
  const sunAngle = ((time - 6) / 24) * Math.PI * 2;
  const sunX = Math.cos(sunAngle) * 9.5;
  const sunY = Math.max(0.5, Math.sin(sunAngle) * 8.5);
  const sunZ = Math.sin(sunAngle * 0.5) * 4.5;

  // Compute dynamic lighting parameters based on weather & time
  const { ambientColor, ambientIntensity, sunColor, sunIntensity, sunPos } = useMemo(() => {
    if (isRaining) {
      return {
        ambientColor: "#64748b",
        ambientIntensity: 0.55,
        sunColor: "#94a3b8",
        sunIntensity: 0.65,
        sunPos: [sunX, sunY, sunZ],
      };
    }

    if (isDrought) {
      return {
        ambientColor: "#fed7aa",
        ambientIntensity: 0.85,
        sunColor: "#f97316", // scorching orange-red sun
        sunIntensity: 2.2,
        sunPos: [sunX, sunY, sunZ],
      };
    }

    if (isNight) {
      return {
        ambientColor: "#0f172a", // deep midnight blue
        ambientIntensity: 0.28,
        sunColor: "#818cf8", // pale silver moonlight
        sunIntensity: 0.45,
        sunPos: [-sunX, 6.5, -sunZ],
      };
    }

    if (isDawnOrDusk) {
      return {
        ambientColor: "#ffedd5",
        ambientIntensity: 0.68,
        sunColor: "#f59e0b", // warm amber sunset
        sunIntensity: 1.5 + (farmHealth / 100) * 0.4,
        sunPos: [sunX, sunY, sunZ],
      };
    }

    // Standard Clear Daytime (8am - 5pm)
    return {
      ambientColor: "#fef3c7",
      ambientIntensity: 0.72,
      sunColor: farmHealth > 50 ? "#fef08a" : "#fbbf24",
      sunIntensity: 1.6 + (farmHealth / 100) * 0.5,
      sunPos: [sunX, sunY, sunZ],
    };
  }, [isRaining, isDrought, isNight, isDawnOrDusk, farmHealth, sunX, sunY, sunZ]);

  return (
    <>
      {/* Ambient Fill Light */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Main Directional Sun / Moon / Storm Light (Shadows follow sun position) */}
      <directionalLight
        position={sunPos}
        intensity={sunIntensity}
        color={sunColor}
        castShadow={enableShadows && !isRaining}
        shadow-mapSize-width={quality === "high" ? 1024 : 512}
        shadow-mapSize-height={quality === "high" ? 1024 : 512}
        shadow-camera-far={28}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
      />

      {/* Opposite Fill Light */}
      <directionalLight
        position={[-sunPos[0], 4, -sunPos[2]]}
        intensity={isRaining ? 0.35 : 0.25}
        color={isRaining ? "#38bdf8" : isNight ? "#1e1b4b" : "#93c5fd"}
      />

      {/* Twinkling Night Stars */}
      {isNight && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={starPositions.length / 3}
              array={starPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.14}
            color="#ffffff"
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </points>
      )}

      {/* Floating Volumetric Cloud Formations */}
      <group ref={cloudsRef} position={[-2, 6.2, -1]}>
        {[
          { pos: [-4, 0, -2], s: [2.5, 0.7, 1.8] },
          { pos: [0, 0.3, 0], s: [3.2, 0.9, 2.2] },
          { pos: [3.8, -0.2, 1.5], s: [2.8, 0.8, 1.9] },
        ].map((c, i) => (
          <mesh key={i} position={c.pos} scale={c.s}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={isRaining ? "#334155" : isDrought ? "#fdba74" : isNight ? "#1e293b" : "#ffffff"}
              transparent
              opacity={isRaining ? 0.92 : isNight ? 0.6 : 0.75}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* Rain Particle System */}
      {isRaining && rainPositions && (
        <points ref={rainRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={rainPositions.length / 3}
              array={rainPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.12}
            color="#38bdf8"
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </points>
      )}

      {/* Circling Crows High Above Dead Banyan */}
      {!isRaining && !isNight && (
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
                <mesh>
                  <boxGeometry args={[0.08, 0.05, 0.2]} />
                  <meshBasicMaterial color="#1e293b" />
                </mesh>
                <mesh position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.42, 0.01, 0.1]} />
                  <meshBasicMaterial color="#0f172a" />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* Dust motes (warm amber motes or drought dust storm) */}
      {!isNight && dustPositions && (
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
            size={isDrought ? 0.09 : 0.06}
            color={isDrought ? "#ea580c" : "#fef08a"}
            transparent
            opacity={isDrought ? 0.75 : 0.65}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </>
  );
}

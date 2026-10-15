import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 3D Representation of an individual farm plot (Plots 1, 2, 3)
 * Reacts to:
 * - locked: true/false (rusty padlock marker, dry untilled ground)
 * - crop: "wheat" | null
 * - growth: 0 (seed/sprout), 1 (mid shoot), 2+ (ripe golden wheat ready for harvest)
 * - watered: true/false (wet dark soil, shimmering puddle)
 */
function PlotField({ plot, position, weather, reducedMotion }) {
  const wheatGroupRef = useRef();
  const isRaining = weather === "rain";
  const isDrought = weather === "drought";

  const isWatered = plot.watered || isRaining;
  const isLocked = plot.locked;
  const hasCrop = Boolean(plot.crop);
  const growth = plot.growth ?? 0;
  const isRipe = growth >= 2;

  // Sway animation for mature wheat
  useFrame((state) => {
    if (wheatGroupRef.current && hasCrop && isRipe && !reducedMotion) {
      const t = state.clock.elapsedTime;
      wheatGroupRef.current.rotation.z = Math.sin(t * 2 + position[0]) * 0.05;
      wheatGroupRef.current.rotation.x = Math.cos(t * 1.5 + position[2]) * 0.04;
    }
  });

  // Plot soil color: darker wet earth if watered/rain, pale cracked if drought, standard loam otherwise
  const soilColor = useMemo(() => {
    if (isWatered) return "#2d1a0e"; // rich wet dark loam
    if (isDrought) return "#b88a58"; // parched dusty earth
    if (isLocked) return "#6b4724"; // uncultivated rough ground
    return "#5c3a1e"; // tilled farm plot soil
  }, [isWatered, isDrought, isLocked]);

  // Crop shoots generator (12 stems arranged in neat furrow rows within plot)
  const stems = useMemo(() => {
    if (!hasCrop) return [];
    const arr = [];
    const rows = 3;
    const cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - 1.5) * 0.32 + ((r % 2) * 0.06 - 0.03);
        const z = (r - 1) * 0.38;
        arr.push({ x, z, key: `${r}-${c}` });
      }
    }
    return arr;
  }, [hasCrop]);

  return (
    <group position={position}>
      {/* Plot raised soil mound / furrow bed */}
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.08, 1.4]} />
        <meshStandardMaterial color={soilColor} roughness={0.9} />
      </mesh>

      {/* Plot wooden border edges */}
      <mesh position={[0, 0.08, 0.72]} castShadow receiveShadow>
        <boxGeometry args={[1.64, 0.08, 0.05]} />
        <meshStandardMaterial color="#422006" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.08, -0.72]} castShadow receiveShadow>
        <boxGeometry args={[1.64, 0.08, 0.05]} />
        <meshStandardMaterial color="#422006" roughness={0.8} />
      </mesh>
      <mesh position={[-0.82, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.08, 1.44]} />
        <meshStandardMaterial color="#422006" roughness={0.8} />
      </mesh>
      <mesh position={[0.82, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.08, 1.44]} />
        <meshStandardMaterial color="#422006" roughness={0.8} />
      </mesh>

      {/* Water sheen overlay if watered */}
      {isWatered && (
        <mesh position={[0, 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 1.3]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            roughness={0.15}
            metalness={0.4}
          />
        </mesh>
      )}

      {/* Locked Marker / Chain & Post */}
      {isLocked && (
        <group position={[0, 0.1, 0]}>
          {/* Wooden post with padlock */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.6, 6]} />
            <meshStandardMaterial color="#57381e" roughness={0.9} />
          </mesh>
          {/* Padlock */}
          <mesh position={[0, 0.55, 0.06]} castShadow>
            <boxGeometry args={[0.12, 0.1, 0.04]} />
            <meshStandardMaterial color="#78716c" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.62, 0.06]}>
            <torusGeometry args={[0.04, 0.012, 6, 8, Math.PI]} />
            <meshStandardMaterial color="#a8a29e" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* Crop Growth Visuals */}
      {hasCrop && !isLocked && (
        <group ref={wheatGroupRef} position={[0, 0.08, 0]}>
          {stems.map((s) => {
            if (growth === 0) {
              // Stage 0: Fresh sprout / seed shoots
              return (
                <group key={s.key} position={[s.x, 0, s.z]}>
                  <mesh position={[0, 0.06, 0]} castShadow>
                    <coneGeometry args={[0.03, 0.12, 4]} />
                    <meshStandardMaterial color="#4ade80" roughness={0.6} />
                  </mesh>
                </group>
              );
            }

            if (growth === 1) {
              // Stage 1: Half-grown green wheat stalks
              return (
                <group key={s.key} position={[s.x, 0, s.z]}>
                  {/* Stem */}
                  <mesh position={[0, 0.2, 0]} castShadow>
                    <cylinderGeometry args={[0.012, 0.016, 0.4, 4]} />
                    <meshStandardMaterial color="#84cc16" roughness={0.7} />
                  </mesh>
                  {/* Growing head */}
                  <mesh position={[0, 0.42, 0]} castShadow>
                    <coneGeometry args={[0.04, 0.2, 4]} />
                    <meshStandardMaterial color="#65a30d" roughness={0.7} />
                  </mesh>
                </group>
              );
            }

            // Stage 2+: Ripe golden-amber wheat ear ready for harvest!
            return (
              <group key={s.key} position={[s.x, 0, s.z]}>
                {/* Golden Stem */}
                <mesh position={[0, 0.32, 0]} castShadow>
                  <cylinderGeometry args={[0.015, 0.02, 0.64, 4]} />
                  <meshStandardMaterial color="#d97706" roughness={0.7} />
                </mesh>
                {/* Ripe Grain Ear */}
                <mesh position={[0, 0.68, 0]} castShadow>
                  <coneGeometry args={[0.06, 0.32, 5]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.6} />
                </mesh>
                {/* Whiskers / Awns */}
                <mesh position={[0.02, 0.85, 0]} rotation={[0, 0, 0.2]}>
                  <cylinderGeometry args={[0.004, 0.004, 0.14, 3]} />
                  <meshStandardMaterial color="#fef08a" />
                </mesh>
                <mesh position={[-0.02, 0.85, 0]} rotation={[0, 0, -0.2]}>
                  <cylinderGeometry args={[0.004, 0.004, 0.14, 3]} />
                  <meshStandardMaterial color="#fef08a" />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

/**
 * Procedural Indian farmland diorama:
 * - Dynamic ground plane with weather-driven color (mud in rain, parched in drought)
 * - Dynamic puddles that shimmer and fill when it rains
 * - 3 Dedicated interactive agricultural plots reflecting live crop growth stages
 * - Canal trench whose water level rises in rain or when pump is running
 * - Ancient stone well
 */
export function Terrain({
  plots = [],
  weather = "clear",
  isPumpRunning = false,
  reducedMotion = false,
}) {
  const waterRef = useRef();
  const puddlesRef = useRef();

  const isRaining = weather === "rain";
  const isDrought = weather === "drought";

  // Match plots or fallback to default 3
  const plotList = useMemo(() => {
    const list = [
      { id: 1, locked: false, crop: null, growth: 0, watered: false },
      { id: 2, locked: true, crop: null, growth: 0, watered: false },
      { id: 3, locked: true, crop: null, growth: 0, watered: false },
    ];
    plots.forEach((p) => {
      const idx = list.findIndex((item) => item.id === p.id);
      if (idx !== -1) list[idx] = p;
    });
    return list;
  }, [plots]);

  // Plot world positions
  const plotPositions = [
    [-4.0, 0, -1.8], // Plot 1 (North-West)
    [-2.1, 0, -2.6], // Plot 2 (North-Center)
    [-0.2, 0, -2.4], // Plot 3 (North-East)
  ];

  // Ground plane color reacting to weather
  const soilColor = useMemo(() => {
    if (isRaining) return "#3b2314"; // deep saturated muddy earth
    if (isDrought) return "#9a6c42"; // pale parched dust
    return "#694020"; // standard red-brown Indian loam
  }, [isRaining, isDrought]);

  // Canal water oscillation & level
  useFrame((state, delta) => {
    if (!waterRef.current) return;
    const time = state.clock.elapsedTime;

    // Target water height: high in rain or pump running, medium clear, dried in drought
    const targetY = isRaining || isPumpRunning ? -0.06 : isDrought ? -0.35 : -0.18;
    waterRef.current.position.y = THREE.MathUtils.lerp(
      waterRef.current.position.y,
      targetY,
      delta * 2
    );

    if (!reducedMotion && (isRaining || isPumpRunning)) {
      waterRef.current.position.x = 2.0 + Math.sin(time * 2.5) * 0.02;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Main Ground Plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[22, 22, 16, 16]} />
        <meshStandardMaterial color={soilColor} roughness={0.95} />
      </mesh>

      {/* Rain Puddles on the ground during rain */}
      {isRaining && (
        <group ref={puddlesRef} position={[0, 0.01, 0]}>
          {[
            { pos: [-1.2, 0, 0.8], s: [1.8, 1.2] },
            { pos: [1.0, 0, 1.6], s: [2.2, 1.4] },
            { pos: [-3.0, 0, 0.4], s: [1.5, 1.1] },
          ].map((pud, i) => (
            <mesh key={i} position={pud.pos} rotation={[-Math.PI / 2, 0, 0.3 * i]}>
              <circleGeometry args={[pud.s[0] * 0.5, 16]} />
              <meshStandardMaterial
                color="#0284c7"
                transparent
                opacity={0.65}
                roughness={0.1}
                metalness={0.6}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 3 Dedicated Agricultural Plots */}
      {plotList.map((plot, i) => (
        <PlotField
          key={plot.id}
          plot={plot}
          position={plotPositions[i] || [0, 0, 0]}
          weather={weather}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Raised Verandah / Porch Foundation */}
      <mesh position={[0, 0.15, 0.2]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.3, 3.2]} />
        <meshStandardMaterial color="#7c4a27" roughness={0.9} />
      </mesh>

      {/* Stone steps from verandah to courtyard */}
      <mesh position={[0, 0.08, 1.9]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.16, 0.45]} />
        <meshStandardMaterial color="#a8a29e" roughness={0.9} />
      </mesh>

      {/* Canal Trench cutting through farm */}
      <group position={[2.2, -0.2, -1.0]} rotation={[0, 0.15, 0]}>
        <mesh position={[-0.75, 0.1, 0]} receiveShadow>
          <boxGeometry args={[0.3, 0.2, 9]} />
          <meshStandardMaterial color="#543317" roughness={0.95} />
        </mesh>
        <mesh position={[0.75, 0.1, 0]} receiveShadow>
          <boxGeometry args={[0.3, 0.2, 9]} />
          <meshStandardMaterial color="#543317" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <boxGeometry args={[1.2, 0.1, 9]} />
          <meshStandardMaterial color="#38210e" roughness={0.95} />
        </mesh>
        {/* Canal Water Plane */}
        <mesh ref={waterRef} position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 8.8]} />
          <meshStandardMaterial
            color={isRaining || isPumpRunning ? "#0284c7" : "#5b6577"}
            transparent
            opacity={0.85}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
      </group>

      {/* Ancient Stone Well */}
      <group position={[-3.2, 0, 2.2]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 0.95, 0.9, 12, 1, true]} />
          <meshStandardMaterial color="#78716c" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.82, 12]} />
          <meshStandardMaterial color="#0c4a6e" roughness={0.1} />
        </mesh>
        <mesh position={[-0.8, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.4, 6]} />
          <meshStandardMaterial color="#57381e" roughness={0.8} />
        </mesh>
        <mesh position={[0.8, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.4, 6]} />
          <meshStandardMaterial color="#57381e" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.75, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.8, 6]} />
          <meshStandardMaterial color="#57381e" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.03, 6, 12]} />
          <meshStandardMaterial color="#292524" />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.1, 4]} />
          <meshStandardMaterial color="#d6d3d1" />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.28, 8]} />
          <meshStandardMaterial color="#854d0e" roughness={0.7} />
        </mesh>
      </group>

      {/* Field Fence Rails */}
      <group position={[-5.2, 0, -0.6]}>
        {[-1.5, 0.5, 2.5, 4.5].map((xOffset, i) => (
          <mesh key={i} position={[xOffset, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 5]} />
            <meshStandardMaterial color="#57381e" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[1.5, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 6.2, 4]} />
          <meshStandardMaterial color="#57381e" roughness={0.9} />
        </mesh>
        <mesh position={[1.5, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 6.2, 4]} />
          <meshStandardMaterial color="#57381e" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Minecraft-style Farmland Plot
 * - Dimensions: 2.8m x 2.2m (much larger, realistic blocky agriculture bed)
 * - Tilled furrow blocks with water channels (hydrated farmland)
 * - Wheat crops grow through blocky stages (seeds, green shoots, full golden wheat block ears)
 * - Wooden fence perimeter with oak gate
 */
function PlotField({ plot, position, weather, reducedMotion, onPlotClick }) {
  const wheatGroupRef = useRef();
  const [hovered, setHovered] = React.useState(false);
  const isRaining = weather === "rain";
  const isDrought = weather === "drought";

  const isWatered = plot.watered || isRaining;
  const isLocked = plot.locked;
  const hasCrop = Boolean(plot.crop);
  const growth = plot.growth ?? 0;
  const isRipe = growth >= 2;

  // Gentle crop sway in breeze
  useFrame((state) => {
    if (wheatGroupRef.current && hasCrop && isRipe && !reducedMotion) {
      const t = state.clock.elapsedTime;
      wheatGroupRef.current.rotation.z = Math.sin(t * 1.8 + position[0]) * 0.04;
      wheatGroupRef.current.rotation.x = Math.cos(t * 1.4 + position[2]) * 0.03;
    }
  });

  // Minecraft farmland soil color with hover feedback
  const soilColor = useMemo(() => {
    if (hovered && !isLocked) return "#3b82f6"; // highlight on hover
    if (isWatered) return "#2e1a0b"; // dark wet tilled farmland
    if (isDrought) return "#a17244"; // dried out coarse dirt
    if (isLocked) return "#5c3d24";  // overgrown untilled dirt
    return "#4a2d14"; // standard tilled farmland
  }, [isWatered, isDrought, isLocked, hovered]);

  // Generates 24 wheat plants in 4 furrow rows across the larger field
  const stems = useMemo(() => {
    if (!hasCrop) return [];
    const arr = [];
    const rows = 4;
    const cols = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - 2.5) * 0.40;
        const z = (r - 1.5) * 0.45;
        arr.push({ x, z, key: `${r}-${c}`, seed: (r * 7 + c * 13) % 5 });
      }
    }
    return arr;
  }, [hasCrop]);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onPlotClick) onPlotClick(plot);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!isLocked) {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {/* Raised Blocky Farmland Bed (Minecraft Farmland Slab: 2.8 x 0.2 x 2.2) */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.8, 0.2, 2.2]} />
        <meshStandardMaterial color={soilColor} roughness={0.95} flatShading />
      </mesh>

      {/* Tilled Furrow Ridges on Top Surface */}
      {[-0.68, -0.22, 0.22, 0.68].map((zFurrow, fi) => (
        <mesh key={fi} position={[0, 0.21, zFurrow]} receiveShadow>
          <boxGeometry args={[2.7, 0.02, 0.18]} />
          <meshStandardMaterial color={isWatered ? "#241307" : "#3b220e"} roughness={0.9} flatShading />
        </mesh>
      ))}

      {/* Wooden Border Enclosure (Minecraft Oak Log Retaining Beams) */}
      {/* Front edge */}
      <mesh position={[0, 0.16, 1.14]} castShadow receiveShadow>
        <boxGeometry args={[2.92, 0.16, 0.12]} />
        <meshStandardMaterial color="#452817" roughness={0.85} flatShading />
      </mesh>
      {/* Back edge */}
      <mesh position={[0, 0.16, -1.14]} castShadow receiveShadow>
        <boxGeometry args={[2.92, 0.16, 0.12]} />
        <meshStandardMaterial color="#452817" roughness={0.85} flatShading />
      </mesh>
      {/* Left edge */}
      <mesh position={[-1.44, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.16, 2.2]} />
        <meshStandardMaterial color="#452817" roughness={0.85} flatShading />
      </mesh>
      {/* Right edge */}
      <mesh position={[1.44, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.16, 2.2]} />
        <meshStandardMaterial color="#452817" roughness={0.85} flatShading />
      </mesh>

      {/* Water irrigation sheen / hydrated channels */}
      {isWatered && (
        <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.7, 2.1]} />
          <meshStandardMaterial
            color="#0ea5e9"
            transparent
            opacity={0.4}
            roughness={0.1}
            metalness={0.5}
          />
        </mesh>
      )}

      {/* Locked Marker: Minecraft-style Wooden Post, Cross Fence & Rusty Padlock */}
      {isLocked && (
        <group position={[0, 0.2, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.16, 0.9, 0.16]} />
            <meshStandardMaterial color="#3d2314" roughness={0.9} flatShading />
          </mesh>
          {/* Iron Padlock */}
          <mesh position={[0, 0.8, 0.1]} castShadow>
            <boxGeometry args={[0.2, 0.18, 0.08]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} flatShading />
          </mesh>
          <mesh position={[0, 0.94, 0.1]}>
            <torusGeometry args={[0.06, 0.02, 6, 8, Math.PI]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Warning ribbon */}
          <mesh position={[0, 0.5, 0.09]}>
            <boxGeometry args={[0.5, 0.08, 0.02]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* Distinct 3D Minecraft-style Crops (Wheat, Rice, Sugarcane, Marigold) */}
      {hasCrop && !isLocked && (
        <group ref={wheatGroupRef} position={[0, 0.21, 0]}>
          {stems.map((s) => {
            const cropType = plot.crop || "wheat";

            // Stage 0: Sprout stage for all crops
            if (growth === 0) {
              const sproutColor = cropType === "marigold" ? "#22c55e" : cropType === "rice" ? "#34d399" : "#4ade80";
              return (
                <group key={s.key} position={[s.x, 0, s.z]}>
                  <mesh position={[0, 0.05, 0]} castShadow>
                    <boxGeometry args={[0.06, 0.1, 0.06]} />
                    <meshStandardMaterial color={sproutColor} flatShading />
                  </mesh>
                  <mesh position={[0.03, 0.04, -0.02]}>
                    <boxGeometry args={[0.04, 0.08, 0.04]} />
                    <meshStandardMaterial color="#16a34a" flatShading />
                  </mesh>
                </group>
              );
            }

            // Stage 1: Half-grown vegetative stage
            if (growth === 1) {
              if (cropType === "sugarcane") {
                // Tall green cane shoots
                return (
                  <group key={s.key} position={[s.x, 0, s.z]}>
                    <mesh position={[0, 0.35, 0]} castShadow>
                      <boxGeometry args={[0.08, 0.7, 0.08]} />
                      <meshStandardMaterial color="#84cc16" flatShading />
                    </mesh>
                  </group>
                );
              }
              if (cropType === "rice") {
                // Flooded grass tufts
                return (
                  <group key={s.key} position={[s.x, 0, s.z]}>
                    <mesh position={[0, 0.2, 0]} castShadow>
                      <boxGeometry args={[0.05, 0.4, 0.05]} />
                      <meshStandardMaterial color="#10b981" flatShading />
                    </mesh>
                    <mesh position={[0, 0.15, 0]} rotation={[0, 0.6, 0]}>
                      <boxGeometry args={[0.18, 0.1, 0.02]} />
                      <meshStandardMaterial color="#059669" flatShading />
                    </mesh>
                  </group>
                );
              }
              if (cropType === "marigold") {
                // Bushy green with tiny flower buds
                return (
                  <group key={s.key} position={[s.x, 0, s.z]}>
                    <mesh position={[0, 0.16, 0]} castShadow>
                      <boxGeometry args={[0.12, 0.32, 0.12]} />
                      <meshStandardMaterial color="#15803d" flatShading />
                    </mesh>
                    <mesh position={[0, 0.34, 0]}>
                      <boxGeometry args={[0.08, 0.08, 0.08]} />
                      <meshStandardMaterial color="#f59e0b" flatShading />
                    </mesh>
                  </group>
                );
              }
              // Standard wheat stage 1
              return (
                <group key={s.key} position={[s.x, 0, s.z]}>
                  <mesh position={[0, 0.22, 0]} castShadow>
                    <boxGeometry args={[0.05, 0.44, 0.05]} />
                    <meshStandardMaterial color="#84cc16" flatShading />
                  </mesh>
                  <mesh position={[0, 0.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                    <boxGeometry args={[0.22, 0.14, 0.03]} />
                    <meshStandardMaterial color="#65a30d" flatShading />
                  </mesh>
                  <mesh position={[0, 0.35, 0]} rotation={[0, -Math.PI / 4, 0]} castShadow>
                    <boxGeometry args={[0.22, 0.14, 0.03]} />
                    <meshStandardMaterial color="#65a30d" flatShading />
                  </mesh>
                </group>
              );
            }

            // Stage 2+: Fully ripe harvestable crops
            if (cropType === "sugarcane") {
              // Tall segmented bamboo-like cane (1.2m tall)
              return (
                <group key={s.key} position={[s.x, 0, s.z]}>
                  <mesh position={[0, 0.6, 0]} castShadow>
                    <boxGeometry args={[0.10, 1.2, 0.10]} />
                    <meshStandardMaterial color="#65a30d" roughness={0.7} flatShading />
                  </mesh>
                  {/* Cane nodes / joints */}
                  {[0.3, 0.6, 0.9].map((yJoint, ji) => (
                    <mesh key={ji} position={[0, yJoint, 0]}>
                      <boxGeometry args={[0.12, 0.04, 0.12]} />
                      <meshStandardMaterial color="#a3e635" flatShading />
                    </mesh>
                  ))}
                  {/* Top leaf plume */}
                  <mesh position={[0, 1.25, 0]} rotation={[0, 0.4, 0]}>
                    <boxGeometry args={[0.3, 0.16, 0.04]} />
                    <meshStandardMaterial color="#4ade80" flatShading />
                  </mesh>
                </group>
              );
            }

            if (cropType === "rice") {
              // Golden-amber arched rice panicles
              return (
                <group key={s.key} position={[s.x, 0, s.z]}>
                  <mesh position={[0, 0.28, 0]} castShadow>
                    <boxGeometry args={[0.06, 0.56, 0.06]} />
                    <meshStandardMaterial color="#10b981" flatShading />
                  </mesh>
                  {/* Drooping golden grain head */}
                  <mesh position={[0.06, 0.52, 0]} rotation={[0, 0, 0.35]} castShadow>
                    <boxGeometry args={[0.14, 0.26, 0.14]} />
                    <meshStandardMaterial color="#facc15" roughness={0.5} flatShading />
                  </mesh>
                </group>
              );
            }

            if (cropType === "marigold") {
              // Vibrant Orange & Gold blossom crowns (Indian genda phool)
              return (
                <group key={s.key} position={[s.x, 0, s.z]}>
                  <mesh position={[0, 0.22, 0]} castShadow>
                    <boxGeometry args={[0.08, 0.44, 0.08]} />
                    <meshStandardMaterial color="#15803d" flatShading />
                  </mesh>
                  {/* Orange blossom head */}
                  <mesh position={[0, 0.48, 0]} castShadow>
                    <boxGeometry args={[0.22, 0.18, 0.22]} />
                    <meshStandardMaterial color="#ea580c" roughness={0.5} flatShading />
                  </mesh>
                  {/* Yellow blossom center highlight */}
                  <mesh position={[0, 0.58, 0]}>
                    <boxGeometry args={[0.12, 0.08, 0.12]} />
                    <meshStandardMaterial color="#facc15" flatShading />
                  </mesh>
                </group>
              );
            }

            // Default: Golden Wheat
            return (
              <group key={s.key} position={[s.x, 0, s.z]}>
                <mesh position={[0, 0.32, 0]} castShadow>
                  <boxGeometry args={[0.06, 0.64, 0.06]} />
                  <meshStandardMaterial color="#d97706" flatShading />
                </mesh>
                <mesh position={[0, 0.62, 0]} castShadow>
                  <boxGeometry args={[0.18, 0.32, 0.18]} />
                  <meshStandardMaterial color="#f59e0b" roughness={0.6} flatShading />
                </mesh>
                <mesh position={[0, 0.82, 0]} castShadow>
                  <boxGeometry args={[0.12, 0.12, 0.12]} />
                  <meshStandardMaterial color="#fde047" flatShading />
                </mesh>
                <mesh position={[0, 0.68, 0]} rotation={[0, 0.5, 0]}>
                  <boxGeometry args={[0.24, 0.04, 0.04]} />
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
 * Procedural Farmland World with Minecraft Realism:
 * - Stepped terrain with grassy top layer and dirt substratum
 * - 3 Vast agricultural plots (2.8m x 2.2m each) arranged neatly in the Western fields
 * - Stone paved cobblestone pathway connecting the house, well, and fields
 * - Stone well with bucket & wooden gantry
 * - Water irrigation canal running through stone-lined culverts
 * - Wooden fence perimeter posts
 */
export function Terrain({
  plots = [],
  weather = "clear",
  isPumpRunning = false,
  isSluiceOpen = false,
  reducedMotion = false,
  onPlotClick,
  onSluiceClick,
}) {
  const waterRef = useRef();
  const isRaining = weather === "rain";
  const isDrought = weather === "drought";

  // Match plots or fallback to default 6
  const plotList = useMemo(() => {
    const list = [
      { id: 1, locked: false, crop: null, growth: 0, watered: false },
      { id: 2, locked: true, crop: null, growth: 0, watered: false },
      { id: 3, locked: true, crop: null, growth: 0, watered: false },
      { id: 4, locked: true, crop: null, growth: 0, watered: false },
      { id: 5, locked: true, crop: null, growth: 0, watered: false },
      { id: 6, locked: true, crop: null, growth: 0, watered: false },
    ];
    plots.forEach((p) => {
      const idx = list.findIndex((item) => item.id === p.id);
      if (idx !== -1) list[idx] = p;
    });
    return list;
  }, [plots]);

  // Vast, neatly arranged fields on the left and south-west side
  const plotPositions = [
    [-4.6, 0, -1.8], // Plot 1 (Spacious North-West)
    [-4.6, 0, 1.0],  // Plot 2 (Mid-West)
    [-1.6, 0, -2.4], // Plot 3 (North-Central)
    [-4.6, 0, 3.8],  // Plot 4 (South-West)
    [-1.6, 0, 3.8],  // Plot 5 (South-Central)
    [-7.6, 0, 1.0],  // Plot 6 (Far-West Paddy)
  ];

  // Ground colors
  const grassTopColor = useMemo(() => {
    if (isRaining) return "#15803d"; // lush dark wet grass
    if (isDrought) return "#854d0e"; // dried savannah grass
    return "#16a34a"; // vibrant Minecraft grass green
  }, [isRaining, isDrought]);

  const dirtSideColor = useMemo(() => {
    if (isRaining) return "#3b2314";
    if (isDrought) return "#9a6c42";
    return "#5c3a1e";
  }, [isRaining, isDrought]);

  // Canal water oscillation & level
  useFrame((state, delta) => {
    if (!waterRef.current) return;
    const time = state.clock.elapsedTime;
    const targetY = isRaining || isPumpRunning ? -0.04 : isDrought ? -0.32 : -0.15;
    waterRef.current.position.y = THREE.MathUtils.lerp(
      waterRef.current.position.y,
      targetY,
      delta * 2
    );

    if (!reducedMotion && (isRaining || isPumpRunning)) {
      waterRef.current.position.x = 2.4 + Math.sin(time * 2) * 0.02;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ── Main Minecraft Ground Block (Large 28m x 28m blocky world) ── */}
      {/* Top Grass Layer (Blocky slab) */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[28, 0.1, 28]} />
        <meshStandardMaterial color={grassTopColor} roughness={0.9} flatShading />
      </mesh>

      {/* Dirt Substratum visible below */}
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <boxGeometry args={[28, 0.5, 28]} />
        <meshStandardMaterial color={dirtSideColor} roughness={0.95} flatShading />
      </mesh>

      {/* Terraced Hillocks in the distant background (Minecraft voxel terrain elevation) */}
      <mesh position={[-7.5, 0.4, -9.0]} receiveShadow castShadow>
        <boxGeometry args={[9.0, 0.8, 6.0]} />
        <meshStandardMaterial color={grassTopColor} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-7.5, 0.9, -10.0]} receiveShadow castShadow>
        <boxGeometry args={[7.0, 0.6, 4.0]} />
        <meshStandardMaterial color={grassTopColor} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[6.5, 0.35, -8.5]} receiveShadow castShadow>
        <boxGeometry args={[8.0, 0.7, 5.0]} />
        <meshStandardMaterial color={grassTopColor} roughness={0.9} flatShading />
      </mesh>

      {/* Cobblestone Pathway connecting House, Well, and Fields */}
      <group position={[0, 0.01, 0]}>
        {/* Main spine walkway */}
        {[
          { pos: [-0.2, 0, 1.4], s: [1.4, 0.02, 1.8] },
          { pos: [-0.4, 0, 2.8], s: [1.2, 0.02, 1.4] },
          { pos: [-1.4, 0, 2.5], s: [1.4, 0.02, 1.0] },
          { pos: [-2.6, 0, 2.3], s: [1.2, 0.02, 0.9] },
          { pos: [-2.4, 0, 0.2], s: [1.0, 0.02, 2.4] },
          { pos: [-2.5, 0, -1.2], s: [1.0, 0.02, 1.6] },
          { pos: [1.4, 0, 0.8], s: [1.6, 0.02, 0.8] },
          { pos: [2.8, 0, 0.8], s: [1.5, 0.02, 0.8] },
          // East road leading across canal to Salim's Market
          { pos: [4.4, 0, 0.8], s: [1.8, 0.02, 0.9] },
          { pos: [6.2, 0, 0.8], s: [1.8, 0.02, 0.9] },
          { pos: [8.0, 0, 0.6], s: [1.8, 0.02, 1.4] },
          { pos: [9.5, 0, 0.5], s: [3.4, 0.02, 3.4] }, // Market courtyard flagstones
        ].map((tile, i) => (
          <mesh key={i} position={tile.pos} receiveShadow>
            <boxGeometry args={[tile.s[0], tile.s[1], tile.s[2]]} />
            <meshStandardMaterial color="#78716c" roughness={0.95} flatShading />
          </mesh>
        ))}
      </group>

      {/* ── 3 Big Dedicated Agricultural Fields ── */}
      {plotList.map((plot, i) => (
        <PlotField
          key={plot.id}
          plot={plot}
          position={plotPositions[i] || [0, 0, 0]}
          weather={weather}
          reducedMotion={reducedMotion}
          onPlotClick={onPlotClick}
        />
      ))}

      {/* Farmhouse Stone Verandah Base */}
      <mesh position={[0.2, 0.15, -0.2]} receiveShadow castShadow>
        <boxGeometry args={[4.4, 0.3, 3.2]} />
        <meshStandardMaterial color="#57381e" roughness={0.9} flatShading />
      </mesh>

      {/* Stone steps from verandah to courtyard */}
      <mesh position={[0.2, 0.08, 1.5]} receiveShadow castShadow>
        <boxGeometry args={[1.8, 0.16, 0.5]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} flatShading />
      </mesh>

      {/* Stone-Lined Irrigation Canal Trench */}
      <group position={[2.4, -0.15, -0.5]}>
        {/* Left Stone Wall */}
        <mesh position={[-0.7, 0.15, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.3, 0.3, 11]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} flatShading />
        </mesh>
        {/* Right Stone Wall */}
        <mesh position={[0.7, 0.15, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.3, 0.3, 11]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} flatShading />
        </mesh>
        {/* Canal Bed */}
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <boxGeometry args={[1.2, 0.1, 11]} />
          <meshStandardMaterial color="#334155" roughness={0.95} flatShading />
        </mesh>
        {/* Animated Water Surface */}
        <mesh ref={waterRef} position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.15, 10.8]} />
          <meshStandardMaterial
            color={isRaining || isPumpRunning || isSluiceOpen ? "#0284c7" : "#0369a1"}
            transparent
            opacity={0.85}
            roughness={0.15}
            metalness={0.4}
          />
        </mesh>

        {/* ── Interactive Canal Sluice Gate ── */}
        <group
          position={[0, 0.25, 0.5]}
          onClick={(e) => {
            e.stopPropagation();
            if (onSluiceClick) onSluiceClick();
          }}
          cursor="pointer"
        >
          {/* Wooden Arch Frame */}
          <mesh position={[-0.55, 0.6, 0]} castShadow>
            <boxGeometry args={[0.16, 1.3, 0.16]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0.55, 0.6, 0]} castShadow>
            <boxGeometry args={[0.16, 1.3, 0.16]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow>
            <boxGeometry args={[1.26, 0.16, 0.16]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
          </mesh>

          {/* Sluice Gate Oak Slab (slides up when open) */}
          <mesh
            position={[0, isSluiceOpen ? 0.85 : 0.25, 0]}
            castShadow
          >
            <boxGeometry args={[0.94, 0.7, 0.08]} />
            <meshStandardMaterial color={isSluiceOpen ? "#854d0e" : "#57381e"} roughness={0.8} flatShading />
          </mesh>

          {/* Cast Iron Turning Wheel on Top */}
          <group position={[0, 1.35, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.18, 0.03, 8, 12]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.08, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>

          {/* Interactive floating label */}
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[0.6, 0.12, 0.02]} />
            <meshStandardMaterial color={isSluiceOpen ? "#10b981" : "#f59e0b"} />
          </mesh>
        </group>
      </group>

      {/* Minecraft-style Stone Well */}
      <group position={[-3.8, 0, 2.8]}>
        {/* Cobblestone well ring (octagonal / square voxel base) */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.9, 1.6]} />
          <meshStandardMaterial color="#64748b" roughness={0.95} flatShading />
        </mesh>
        {/* Inner hollow / water level */}
        <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.1, 1.1]} />
          <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.6} />
        </mesh>
        {/* 2 Corner Wooden Support Posts */}
        <mesh position={[-0.65, 1.25, 0]} castShadow>
          <boxGeometry args={[0.14, 1.6, 0.14]} />
          <meshStandardMaterial color="#452817" roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0.65, 1.25, 0]} castShadow>
          <boxGeometry args={[0.14, 1.6, 0.14]} />
          <meshStandardMaterial color="#452817" roughness={0.85} flatShading />
        </mesh>
        {/* Crossbeam */}
        <mesh position={[0, 2.0, 0]} castShadow>
          <boxGeometry args={[1.6, 0.14, 0.14]} />
          <meshStandardMaterial color="#452817" roughness={0.85} flatShading />
        </mesh>
        {/* Well Roof Cap (Minecraft Oak Stairs / Slabs) */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <boxGeometry args={[1.8, 0.2, 1.6]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} flatShading />
        </mesh>
        {/* Hanging rope & bucket */}
        <mesh position={[0, 1.45, 0]}>
          <boxGeometry args={[0.04, 0.9, 0.04]} />
          <meshStandardMaterial color="#d97706" />
        </mesh>
        <mesh position={[0, 0.88, 0]} castShadow>
          <boxGeometry args={[0.28, 0.26, 0.28]} />
          <meshStandardMaterial color="#57381e" roughness={0.8} flatShading />
        </mesh>
      </group>

      {/* Perimeter Oak Fencing around Fields (Minecraft Oak Fence) */}
      <group position={[-6.3, 0, 0]}>
        {[-3.0, -1.5, 0, 1.5, 3.0].map((zPos, idx) => (
          <group key={idx} position={[0, 0, zPos]}>
            {/* Fence Post */}
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.12, 0.9, 0.12]} />
              <meshStandardMaterial color="#452817" roughness={0.9} flatShading />
            </mesh>
            {/* Horizontal Fence Rails */}
            {idx < 4 && (
              <>
                <mesh position={[0, 0.65, 0.75]} castShadow>
                  <boxGeometry args={[0.06, 0.08, 1.4]} />
                  <meshStandardMaterial color="#57381e" roughness={0.9} flatShading />
                </mesh>
                <mesh position={[0, 0.35, 0.75]} castShadow>
                  <boxGeometry args={[0.06, 0.08, 1.4]} />
                  <meshStandardMaterial color="#57381e" roughness={0.9} flatShading />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}

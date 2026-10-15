import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * Minecraft-style Village Farmhouse & Verandah:
 * - Built from Minecraft terracotta, oak wood logs, cobblestone base, and stepped hay bale / dark oak slab roof
 * - Front glass-paned windows and oak door
 * - Porch with Charpai (woven bed) and wooden side table for inventory items (Seeds, Map)
 */
export function HutAndProps({
  position = [0.2, 0.3, -2.0],
  inventory = [],
}) {
  const materials = useMemo(() => {
    return {
      terracotta: new THREE.MeshStandardMaterial({
        color: "#b45309", // warm brown terracotta
        roughness: 0.9,
        flatShading: true,
      }),
      cobbleBase: new THREE.MeshStandardMaterial({
        color: "#64748b", // cobblestone foundation
        roughness: 0.95,
        flatShading: true,
      }),
      woodLog: new THREE.MeshStandardMaterial({
        color: "#452817", // oak log pillars
        roughness: 0.85,
        flatShading: true,
      }),
      woodPlank: new THREE.MeshStandardMaterial({
        color: "#78350f", // oak wood planks
        roughness: 0.85,
        flatShading: true,
      }),
      roofHay: new THREE.MeshStandardMaterial({
        color: "#ca8a04", // thatch / hay bale golden roof
        roughness: 0.9,
        flatShading: true,
      }),
      door: new THREE.MeshStandardMaterial({
        color: "#3e2815",
        roughness: 0.9,
        flatShading: true,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: "#bae6fd",
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
      }),
      charpaiRope: new THREE.MeshStandardMaterial({
        color: "#d97706",
        roughness: 0.85,
        flatShading: true,
      }),
      seedSack: new THREE.MeshStandardMaterial({
        color: "#cbd5e1",
        roughness: 0.9,
        flatShading: true,
      }),
      seedGrain: new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        roughness: 0.6,
        flatShading: true,
      }),
      parchment: new THREE.MeshStandardMaterial({
        color: "#fef08a",
        roughness: 0.7,
        flatShading: true,
      }),
      redRibbon: new THREE.MeshBasicMaterial({ color: "#ef4444" }),
    };
  }, []);

  const hasSeeds = Array.isArray(inventory)
    ? inventory.includes("seeds")
    : Boolean(inventory && inventory.seeds && inventory.seeds > 0);
  const hasMap = Array.isArray(inventory)
    ? inventory.includes("old_map")
    : Boolean(inventory && inventory.old_map && inventory.old_map > 0);

  return (
    <group position={position}>
      {/* ── Minecraft Cobblestone Foundation (Base perimeter) ── */}
      <mesh position={[0, 0.25, -0.6]} castShadow receiveShadow material={materials.cobbleBase}>
        <boxGeometry args={[4.4, 0.5, 2.6]} />
      </mesh>

      {/* ── Terracotta Mud Brick Walls (Minecraft blocky building) ── */}
      <mesh position={[0, 1.6, -0.6]} castShadow receiveShadow material={materials.terracotta}>
        <boxGeometry args={[4.2, 2.2, 2.4]} />
      </mesh>

      {/* 4 Oak Wood Corner Log Columns (1x1 block columns on building corners) */}
      {[-2.05, 2.05].map((x, xi) =>
        [-1.75, 0.55].map((z, zi) => (
          <mesh
            key={`corner-col-${xi}-${zi}`}
            position={[x, 1.45, z]}
            castShadow
            material={materials.woodLog}
          >
            <boxGeometry args={[0.32, 2.7, 0.32]} />
          </mesh>
        ))
      )}

      {/* ── Stepped Minecraft Roof (Tiered slabs of thatch/planks) ── */}
      {/* Tier 1 (Lowest, widest eaves overhang) */}
      <mesh position={[0, 2.75, -0.6]} castShadow receiveShadow material={materials.roofHay}>
        <boxGeometry args={[4.8, 0.35, 3.0]} />
      </mesh>
      {/* Tier 2 */}
      <mesh position={[0, 3.1, -0.6]} castShadow receiveShadow material={materials.roofHay}>
        <boxGeometry args={[3.8, 0.35, 2.3]} />
      </mesh>
      {/* Tier 3 (Peak ridge) */}
      <mesh position={[0, 3.45, -0.6]} castShadow material={materials.roofHay}>
        <boxGeometry args={[2.8, 0.35, 1.5]} />
      </mesh>

      {/* ── Front Oak Door ── */}
      <mesh position={[0, 1.15, 0.62]} castShadow material={materials.door}>
        <boxGeometry args={[0.9, 1.8, 0.08]} />
      </mesh>
      {/* Door Handle */}
      <mesh position={[0.32, 1.15, 0.68]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color="#ca8a04" metalness={0.7} />
      </mesh>

      {/* ── 2 Symmetrical Front Windows (Minecraft Glass Panes) ── */}
      {[-1.3, 1.3].map((xWin, wi) => (
        <group key={`win-${wi}`} position={[xWin, 1.5, 0.62]}>
          <mesh material={materials.glass}>
            <boxGeometry args={[0.7, 0.7, 0.06]} />
          </mesh>
          {/* Wooden Window Crossbars */}
          <mesh material={materials.woodLog}>
            <boxGeometry args={[0.72, 0.06, 0.08]} />
          </mesh>
          <mesh material={materials.woodLog}>
            <boxGeometry args={[0.06, 0.72, 0.08]} />
          </mesh>
        </group>
      ))}

      {/* ── Verandah Front Pillars (Minecraft Fences / Thin Logs) ── */}
      <mesh position={[-1.9, 1.1, 1.1]} castShadow material={materials.woodLog}>
        <boxGeometry args={[0.18, 2.2, 0.18]} />
      </mesh>
      <mesh position={[1.9, 1.1, 1.1]} castShadow material={materials.woodLog}>
        <boxGeometry args={[0.18, 2.2, 0.18]} />
      </mesh>
      {/* Verandah Overhead Canopy Beam */}
      <mesh position={[0, 2.15, 1.1]} castShadow material={materials.woodPlank}>
        <boxGeometry args={[4.0, 0.18, 0.18]} />
      </mesh>

      {/* ── Traditional Charpai (Minecraft-style blocky wooden bed) ── */}
      <group position={[-1.2, 0, 0.8]}>
        {/* 4 Blocky Wooden Legs */}
        {[-0.45, 0.45].map((x, xi) =>
          [-0.65, 0.65].map((z, zi) => (
            <mesh key={`charpai-leg-${xi}-${zi}`} position={[x, 0.2, z]} castShadow material={materials.woodLog}>
              <boxGeometry args={[0.1, 0.4, 0.1]} />
            </mesh>
          ))
        )}
        {/* Frame Rails */}
        <mesh position={[0, 0.38, -0.65]} material={materials.woodPlank}>
          <boxGeometry args={[0.9, 0.08, 0.1]} />
        </mesh>
        <mesh position={[0, 0.38, 0.65]} material={materials.woodPlank}>
          <boxGeometry args={[0.9, 0.08, 0.1]} />
        </mesh>
        <mesh position={[-0.45, 0.38, 0]} material={materials.woodPlank}>
          <boxGeometry args={[0.1, 0.08, 1.3]} />
        </mesh>
        <mesh position={[0.45, 0.38, 0]} material={materials.woodPlank}>
          <boxGeometry args={[0.1, 0.08, 1.3]} />
        </mesh>
        {/* Woven Coir Mat Slab */}
        <mesh position={[0, 0.39, 0]} castShadow material={materials.charpaiRope}>
          <boxGeometry args={[0.82, 0.06, 1.22]} />
        </mesh>
      </group>

      {/* ── Side Table for Inventory Items ── */}
      <group position={[1.2, 0, 0.8]}>
        {/* 4 Blocky Table Legs */}
        {[-0.3, 0.3].map((x, xi) =>
          [-0.2, 0.2].map((z, zi) => (
            <mesh key={`tbl-leg-${xi}-${zi}`} position={[x, 0.3, z]} castShadow material={materials.woodLog}>
              <boxGeometry args={[0.08, 0.6, 0.08]} />
            </mesh>
          ))
        )}
        {/* Table Top Slab */}
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow material={materials.woodPlank}>
          <boxGeometry args={[0.85, 0.08, 0.65]} />
        </mesh>

        {/* Inventory Item: Heirloom Seeds Bag */}
        {hasSeeds && (
          <group position={[-0.2, 0.76, 0]}>
            <mesh castShadow material={materials.seedSack}>
              <boxGeometry args={[0.24, 0.22, 0.24]} />
            </mesh>
            <mesh position={[0, 0.12, 0]} material={materials.seedGrain}>
              <boxGeometry args={[0.18, 0.06, 0.18]} />
            </mesh>
          </group>
        )}

        {/* Inventory Item: Rolled Ancient Valley Map */}
        {hasMap && (
          <group position={[0.18, 0.68, 0]} rotation={[0, 0.3, 0]}>
            <mesh castShadow material={materials.parchment}>
              <boxGeometry args={[0.1, 0.1, 0.36]} />
            </mesh>
            <mesh position={[0, 0, 0]} material={materials.redRibbon}>
              <boxGeometry args={[0.11, 0.11, 0.06]} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

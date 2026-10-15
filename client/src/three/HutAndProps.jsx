import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * Farmhouse Hut, Verandah, Charpai (Rope Cot), and Inventory Props Table:
 * - Shows Heirloom Seed Bag on table if player has "seeds" in inventory
 * - Shows Rolled Antique Map Scroll on table if player has "old_map" in inventory
 */
export function HutAndProps({
  position = [0, 0.3, -1.8],
  inventory = [],
}) {
  const materials = useMemo(() => {
    return {
      mudWall: new THREE.MeshStandardMaterial({ color: "#9a5b32", roughness: 0.95 }),
      thatchRoof: new THREE.MeshStandardMaterial({ color: "#a16207", roughness: 0.9 }),
      wood: new THREE.MeshStandardMaterial({ color: "#54381e", roughness: 0.85 }),
      door: new THREE.MeshStandardMaterial({ color: "#3e2815", roughness: 0.9 }),
      charpaiRope: new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.8 }),
      seedSack: new THREE.MeshStandardMaterial({ color: "#d4d4d8", roughness: 0.9 }),
      seedGrain: new THREE.MeshStandardMaterial({ color: "#ca8a04", roughness: 0.7 }),
      parchment: new THREE.MeshStandardMaterial({ color: "#fef08a", roughness: 0.7 }),
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
      {/* Farmhouse Mud Brick Walls */}
      <mesh position={[0, 1.4, -0.6]} castShadow receiveShadow material={materials.mudWall}>
        <boxGeometry args={[4.2, 2.5, 2.2]} />
      </mesh>

      {/* Overhanging Thatched Straw Roof */}
      <mesh position={[0, 2.85, -0.4]} rotation={[0, 0, 0]} castShadow material={materials.thatchRoof}>
        <coneGeometry args={[3.2, 1.2, 4]} />
      </mesh>

      {/* Rustic Wooden Front Door */}
      <mesh position={[0, 1.0, 0.52]} material={materials.door}>
        <boxGeometry args={[1.0, 1.8, 0.08]} />
      </mesh>

      {/* Small Shuttered Verandah Windows */}
      <mesh position={[-1.2, 1.3, 0.52]} material={materials.door}>
        <boxGeometry args={[0.6, 0.6, 0.06]} />
      </mesh>
      <mesh position={[1.2, 1.3, 0.52]} material={materials.door}>
        <boxGeometry args={[0.6, 0.6, 0.06]} />
      </mesh>

      {/* Verandah Corner Posts */}
      <mesh position={[-1.9, 1.1, 1.1]} castShadow material={materials.wood}>
        <cylinderGeometry args={[0.07, 0.07, 2.2, 6]} />
      </mesh>
      <mesh position={[1.9, 1.1, 1.1]} castShadow material={materials.wood}>
        <cylinderGeometry args={[0.07, 0.07, 2.2, 6]} />
      </mesh>

      {/* Traditional Indian Charpai (Woven Rope Cot) */}
      <group position={[-1.2, 0, 0.8]} rotation={[0, 0.2, 0]}>
        {/* 4 Wooden Turned Legs */}
        {[-0.45, 0.45].map((x, xi) =>
          [-0.7, 0.7].map((z, zi) => (
            <mesh key={`charpai-leg-${xi}-${zi}`} position={[x, 0.2, z]} castShadow material={materials.wood}>
              <cylinderGeometry args={[0.04, 0.035, 0.4, 6]} />
            </mesh>
          ))
        )}
        {/* Wooden Frame Rails */}
        <mesh position={[0, 0.38, -0.7]} material={materials.wood}>
          <boxGeometry args={[0.9, 0.06, 0.06]} />
        </mesh>
        <mesh position={[0, 0.38, 0.7]} material={materials.wood}>
          <boxGeometry args={[0.9, 0.06, 0.06]} />
        </mesh>
        <mesh position={[-0.45, 0.38, 0]} material={materials.wood}>
          <boxGeometry args={[0.06, 0.06, 1.4]} />
        </mesh>
        <mesh position={[0.45, 0.38, 0]} material={materials.wood}>
          <boxGeometry args={[0.06, 0.06, 1.4]} />
        </mesh>
        {/* Woven Coir Webbing Surface */}
        <mesh position={[0, 0.37, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.charpaiRope}>
          <planeGeometry args={[0.82, 1.34]} />
        </mesh>
      </group>

      {/* Rustic Wooden Side Table for Inventory Clues */}
      <group position={[1.3, 0, 0.9]} rotation={[0, -0.15, 0]}>
        {/* Table Legs */}
        {[-0.3, 0.3].map((x, xi) =>
          [-0.2, 0.2].map((z, zi) => (
            <mesh key={`tbl-leg-${xi}-${zi}`} position={[x, 0.3, z]} castShadow material={materials.wood}>
              <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
            </mesh>
          ))
        )}
        {/* Table Top */}
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow material={materials.wood}>
          <boxGeometry args={[0.8, 0.06, 0.6]} />
        </mesh>

        {/* Inventory Item: Heirloom Seeds Bag */}
        {hasSeeds && (
          <group position={[-0.18, 0.72, 0]}>
            <mesh castShadow material={materials.seedSack}>
              <cylinderGeometry args={[0.1, 0.14, 0.22, 7]} />
            </mesh>
            <mesh position={[0, 0.11, 0]} material={materials.seedGrain}>
              <sphereGeometry args={[0.09, 6, 6]} />
            </mesh>
          </group>
        )}

        {/* Inventory Item: Rolled Ancient Valley Map */}
        {hasMap && (
          <group position={[0.16, 0.65, 0]} rotation={[0, 0.4, 0]}>
            <mesh castShadow material={materials.parchment}>
              <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
            </mesh>
            {/* Red binding ribbon */}
            <mesh position={[0, 0, 0]} material={materials.redRibbon}>
              <torusGeometry args={[0.042, 0.008, 4, 8]} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

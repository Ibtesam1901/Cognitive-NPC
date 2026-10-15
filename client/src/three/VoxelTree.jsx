import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * Minecraft-style Blocky Tree
 * - Variants: "oak" (rich green blocky foliage), "birch" (creamy bark with black notch bands), "acacia" (savannah flat-top), "spruce" (pine cone stepped tiers)
 * - Pure Minecraft aesthetic: voxel / cubic trunks and stepped box leaf clusters
 */
export function VoxelTree({
  position = [0, 0, 0],
  scale = 1,
  type = "oak", // "oak" | "birch" | "spruce" | "fruit"
  rotation = 0,
}) {
  const materials = useMemo(() => {
    const barkColor =
      type === "birch"
        ? "#e2e8f0"
        : type === "spruce"
        ? "#29180c"
        : type === "fruit"
        ? "#5c3a1e"
        : "#452817"; // oak log

    const leafColor =
      type === "birch"
        ? "#4ade80"
        : type === "spruce"
        ? "#14532d"
        : type === "fruit"
        ? "#22c55e"
        : "#16a34a"; // oak leaves

    return {
      log: new THREE.MeshStandardMaterial({
        color: barkColor,
        roughness: 0.9,
        flatShading: true,
      }),
      logRing: new THREE.MeshStandardMaterial({
        color: type === "birch" ? "#1e293b" : "#854d0e",
        roughness: 0.9,
      }),
      leaves: new THREE.MeshStandardMaterial({
        color: leafColor,
        roughness: 0.85,
        flatShading: true,
      }),
      apple: new THREE.MeshStandardMaterial({
        color: "#dc2626",
        roughness: 0.4,
        flatShading: true,
      }),
    };
  }, [type]);

  const treeHeight = type === "spruce" ? 4.2 : type === "birch" ? 3.6 : 3.2;

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, rotation, 0]}>
      {/* Voxel Trunk - 1x1 base column */}
      <mesh
        position={[0, treeHeight / 2, 0]}
        castShadow
        receiveShadow
        material={materials.log}
      >
        <boxGeometry args={[0.42, treeHeight, 0.42]} />
      </mesh>

      {/* Birch notch markings */}
      {type === "birch" && (
        <group>
          <mesh position={[0.22, 1.0, 0]} material={materials.logRing}>
            <boxGeometry args={[0.02, 0.12, 0.22]} />
          </mesh>
          <mesh position={[-0.22, 1.8, 0.05]} material={materials.logRing}>
            <boxGeometry args={[0.02, 0.14, 0.2]} />
          </mesh>
          <mesh position={[0.04, 2.5, 0.22]} material={materials.logRing}>
            <boxGeometry args={[0.22, 0.12, 0.02]} />
          </mesh>
        </group>
      )}

      {/* Voxel Leaves Clusters - Minecraft cubic layers */}
      {type === "spruce" ? (
        // Pine / Spruce stepped tiers
        <group position={[0, treeHeight * 0.55, 0]}>
          {/* Bottom broad tier */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow material={materials.leaves}>
            <boxGeometry args={[2.0, 0.6, 2.0]} />
          </mesh>
          {/* Middle tier */}
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow material={materials.leaves}>
            <boxGeometry args={[1.5, 0.6, 1.5]} />
          </mesh>
          {/* Top tier */}
          <mesh position={[0, 1.3, 0]} castShadow receiveShadow material={materials.leaves}>
            <boxGeometry args={[1.0, 0.6, 1.0]} />
          </mesh>
          {/* Tip block */}
          <mesh position={[0, 1.8, 0]} castShadow material={materials.leaves}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
          </mesh>
        </group>
      ) : (
        // Classic Minecraft Oak / Fruit Tree Canopy
        <group position={[0, treeHeight - 0.4, 0]}>
          {/* Bottom broad layer (3x3 blocks wide) */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow material={materials.leaves}>
            <boxGeometry args={[2.2, 0.65, 2.2]} />
          </mesh>
          {/* Mid core layer */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow material={materials.leaves}>
            <boxGeometry args={[1.8, 0.65, 1.8]} />
          </mesh>
          {/* Top canopy layer */}
          <mesh position={[0, 1.15, 0]} castShadow receiveShadow material={materials.leaves}>
            <boxGeometry args={[1.2, 0.55, 1.2]} />
          </mesh>
          {/* Tip cross block */}
          <mesh position={[0, 1.55, 0]} castShadow material={materials.leaves}>
            <boxGeometry args={[0.65, 0.35, 0.65]} />
          </mesh>

          {/* Fruit / Apple blocks hanging under oak/fruit tree */}
          {type === "fruit" && (
            <group>
              <mesh position={[0.8, -0.35, 0.6]} castShadow material={materials.apple}>
                <boxGeometry args={[0.18, 0.18, 0.18]} />
              </mesh>
              <mesh position={[-0.7, -0.35, -0.5]} castShadow material={materials.apple}>
                <boxGeometry args={[0.18, 0.18, 0.18]} />
              </mesh>
              <mesh position={[0.4, -0.35, -0.8]} castShadow material={materials.apple}>
                <boxGeometry args={[0.18, 0.18, 0.18]} />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
}

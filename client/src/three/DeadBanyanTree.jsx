import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * Procedural Banyan Tree (Key story landmark):
 * - Gnarled multi-stem trunks
 * - Sprawling twisted bare branches
 * - Hanging aerial roots
 * - Dynamic green foliage that sprouts and grows lush as trust increases
 * - Hoofprints on the dusty ground nearby
 */
export function DeadBanyanTree({ position = [-5.2, 0, -5.5], trust = 0 }) {
  const materials = useMemo(() => {
    return {
      bark: new THREE.MeshStandardMaterial({ color: "#3d2b1f", roughness: 0.95 }),
      roots: new THREE.MeshStandardMaterial({ color: "#543d2b", roughness: 0.9 }),
      hoofprint: new THREE.MeshStandardMaterial({ color: "#29180c", roughness: 1.0 }),
      leaves: new THREE.MeshStandardMaterial({
        color: trust >= 6 ? "#15803d" : "#22c55e",
        roughness: 0.7,
        flatShading: true,
      }),
      blossom: new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        roughness: 0.6,
      }),
    };
  }, [trust]);

  // Leaf cluster positions at branch ends
  const leafClusters = useMemo(() => {
    return [
      { pos: [1.6, 3.5, 0.9], scale: 0.6 },
      { pos: [-1.7, 3.4, -0.8], scale: 0.65 },
      { pos: [0.5, 3.8, -1.7], scale: 0.7 },
      { pos: [-0.4, 3.3, 0.8], scale: 0.55 },
      { pos: [0.8, 3.0, 0.5], scale: 0.5 },
      { pos: [0, 4.0, -0.3], scale: 0.8 },
      { pos: [-1.0, 3.7, 0.2], scale: 0.6 },
      { pos: [1.2, 3.9, -0.7], scale: 0.65 },
    ];
  }, []);

  // Growth scale multiplier based on trust (0-2: bare/dead, 3-5: early sprout, 6+: lush canopy)
  const leafScale = trust < 2 ? 0 : Math.min(1.2, 0.35 + (trust - 2) * 0.15);

  return (
    <group position={position}>
      {/* Central Trunk Cluster */}
      <mesh position={[0, 1.4, 0]} rotation={[0.1, 0.2, -0.05]} castShadow receiveShadow material={materials.bark}>
        <cylinderGeometry args={[0.35, 0.65, 2.8, 7]} />
      </mesh>
      <mesh position={[0.3, 1.2, 0.2]} rotation={[-0.15, -0.3, 0.1]} castShadow receiveShadow material={materials.bark}>
        <cylinderGeometry args={[0.25, 0.45, 2.4, 6]} />
      </mesh>
      <mesh position={[-0.25, 1.1, -0.2]} rotation={[0.2, 0.4, -0.1]} castShadow receiveShadow material={materials.bark}>
        <cylinderGeometry args={[0.22, 0.4, 2.2, 6]} />
      </mesh>

      {/* Sprawling Major Branches */}
      <mesh position={[0.7, 2.7, 0.4]} rotation={[0.6, 0.5, -0.7]} castShadow material={materials.bark}>
        <cylinderGeometry args={[0.16, 0.28, 2.1, 5]} />
      </mesh>
      <mesh position={[-0.8, 2.6, -0.3]} rotation={[-0.5, -0.6, 0.8]} castShadow material={materials.bark}>
        <cylinderGeometry args={[0.15, 0.26, 2.0, 5]} />
      </mesh>
      <mesh position={[0.2, 2.9, -0.8]} rotation={[-0.7, 0.3, 0.2]} castShadow material={materials.bark}>
        <cylinderGeometry args={[0.14, 0.24, 2.2, 5]} />
      </mesh>
      <mesh position={[-0.3, 3.1, 0.7]} rotation={[0.7, -0.4, -0.3]} castShadow material={materials.bark}>
        <cylinderGeometry args={[0.13, 0.22, 1.9, 5]} />
      </mesh>

      {/* Secondary Bare Twigs / Upper Branches */}
      <mesh position={[1.5, 3.4, 0.8]} rotation={[0.4, 0.8, -0.9]} castShadow material={materials.bark}>
        <cylinderGeometry args={[0.07, 0.15, 1.6, 4]} />
      </mesh>
      <mesh position={[-1.6, 3.3, -0.7]} rotation={[-0.4, -0.7, 0.9]} castShadow material={materials.bark}>
        <cylinderGeometry args={[0.06, 0.14, 1.5, 4]} />
      </mesh>
      <mesh position={[0.4, 3.7, -1.6]} rotation={[-0.9, 0.2, 0.4]} castShadow material={materials.bark}>
        <cylinderGeometry args={[0.06, 0.13, 1.6, 4]} />
      </mesh>

      {/* Hanging Aerial Roots */}
      <mesh position={[0.9, 1.4, 0.6]} rotation={[0.05, 0, -0.05]} castShadow material={materials.roots}>
        <cylinderGeometry args={[0.04, 0.03, 2.6, 4]} />
      </mesh>
      <mesh position={[-1.0, 1.3, -0.4]} rotation={[-0.04, 0, 0.06]} castShadow material={materials.roots}>
        <cylinderGeometry args={[0.035, 0.025, 2.4, 4]} />
      </mesh>
      <mesh position={[0.3, 1.5, -1.0]} rotation={[-0.06, 0, 0.03]} castShadow material={materials.roots}>
        <cylinderGeometry args={[0.03, 0.02, 2.8, 4]} />
      </mesh>

      {/* Dynamic Foliage: Sprouting banyan leaves based on player trust */}
      {leafScale > 0 &&
        leafClusters.map((cluster, i) => (
          <group
            key={i}
            position={cluster.pos}
            scale={[cluster.scale * leafScale, cluster.scale * leafScale, cluster.scale * leafScale]}
          >
            {/* Primary low-poly leaf puff */}
            <mesh castShadow receiveShadow material={materials.leaves}>
              <dodecahedronGeometry args={[0.55, 0]} />
            </mesh>
            {/* Secondary offset clump for natural canopy */}
            <mesh position={[0.2, 0.15, 0.1]} material={materials.leaves}>
              <icosahedronGeometry args={[0.4, 0]} />
            </mesh>
            {/* Sacred banyan blossom buds when trust is very high */}
            {trust >= 5 && (
              <mesh position={[0, 0.35, 0.1]} material={materials.blossom}>
                <sphereGeometry args={[0.08, 5, 4]} />
              </mesh>
            )}
          </group>
        ))}

      {/* Cow Hoofprints in Soil (visual clue corresponding to the surveyor map) */}
      <group position={[0.8, 0.02, 1.2]} rotation={[0, -0.3, 0]}>
        {[0, 0.6, 1.2, 1.8].map((step, idx) => (
          <group key={idx} position={[step * 0.25, 0, step * 0.5]}>
            {/* Left hoof pair */}
            <mesh position={[-0.08, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.hoofprint}>
              <ringGeometry args={[0.02, 0.055, 6, 1, 0, Math.PI]} />
            </mesh>
            {/* Right hoof pair */}
            <mesh position={[0.08, 0, 0.05]} rotation={[-Math.PI / 2, 0, 0]} material={materials.hoofprint}>
              <ringGeometry args={[0.02, 0.055, 6, 1, 0, Math.PI]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

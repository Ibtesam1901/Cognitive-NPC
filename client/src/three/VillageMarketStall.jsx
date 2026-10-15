import React from "react";

/**
 * VillageMarketStall:
 * 3D Minecraft-diorama style trading post on the eastern village border.
 * Features:
 * - Striped linen bazaar canopy (terracotta / golden yellow)
 * - Wooden merchant trestle table with baskets of grain, seeds, sugarcane bundles
 * - Hanging clay oil lanterns
 * - Friendly merchant NPC ("Salim the Trader") with interaction prompt
 */
export function VillageMarketStall({
  position = [9.5, 0, 0.5],
  onOpenMarket,
  isNearMarket = false,
}) {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onOpenMarket) onOpenMarket();
      }}
      cursor="pointer"
    >
      {/* Wooden Stage / Plank Flooring */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 3.2]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
      </mesh>

      {/* 4 Oak Stall Support Pillars */}
      {[
        [-1.4, -1.4],
        [1.4, -1.4],
        [-1.4, 1.4],
        [1.4, 1.4],
      ].map(([px, pz], idx) => (
        <mesh key={idx} position={[px, 1.2, pz]} castShadow>
          <boxGeometry args={[0.16, 2.4, 0.16]} />
          <meshStandardMaterial color="#3d1e08" roughness={0.85} flatShading />
        </mesh>
      ))}

      {/* Striped Bazaar Canopy Roof (Minecraft Wool Awning) */}
      <group position={[0, 2.4, 0]}>
        {/* Main curved / sloped cloth */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[3.4, 0.12, 3.4]} />
          <meshStandardMaterial color="#ea580c" roughness={0.8} flatShading />
        </mesh>
        {/* Yellow Wool Center Stripes */}
        {[-1.0, 0, 1.0].map((xStripe, si) => (
          <mesh key={si} position={[xStripe, 0.13, 0]}>
            <boxGeometry args={[0.55, 0.1, 3.42]} />
            <meshStandardMaterial color="#facc15" roughness={0.8} flatShading />
          </mesh>
        ))}
        {/* Hanging Awning Flaps */}
        <mesh position={[0, -0.15, 1.7]}>
          <boxGeometry args={[3.4, 0.25, 0.06]} />
          <meshStandardMaterial color="#c2410c" flatShading />
        </mesh>
        <mesh position={[0, -0.15, -1.7]}>
          <boxGeometry args={[3.4, 0.25, 0.06]} />
          <meshStandardMaterial color="#c2410c" flatShading />
        </mesh>
      </group>

      {/* Heavy Timber Counter Table */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.9, 0.8]} />
        <meshStandardMaterial color="#57381e" roughness={0.85} flatShading />
      </mesh>

      {/* Woven Grain Baskets on Counter */}
      <mesh position={[-0.7, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.24, 8]} />
        <meshStandardMaterial color="#d97706" roughness={0.9} flatShading />
      </mesh>
      {/* Golden wheat grain fill */}
      <mesh position={[-0.7, 1.15, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 8]} />
        <meshStandardMaterial color="#fef08a" flatShading />
      </mesh>

      {/* Rice Seed Sack */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.32, 0.25, 0.32]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} flatShading />
      </mesh>

      {/* Sugarcane bundle tied with rope */}
      <group position={[0.7, 1.15, 0]} rotation={[0, 0, 0.2]}>
        {[-0.05, 0.05].map((xOffset, ci) => (
          <mesh key={ci} position={[xOffset, 0, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
            <meshStandardMaterial color="#84cc16" flatShading />
          </mesh>
        ))}
        {/* Rope tie */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 8]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
      </group>

      {/* Merchant Character ("Salim the Wandering Trader") stood warmly behind counter */}
      <group position={[0, 0.1, -0.7]}>
        {/* Blue / Gold Trader Robes */}
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[0.42, 0.8, 0.3]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.8} flatShading />
        </mesh>
        {/* White Sash */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.44, 0.14, 0.32]} />
          <meshStandardMaterial color="#f8fafc" flatShading />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.25, 0]} castShadow>
          <boxGeometry args={[0.26, 0.28, 0.26]} />
          <meshStandardMaterial color="#d4a373" roughness={0.7} flatShading />
        </mesh>
        {/* Merchant Turban / Pagri */}
        <mesh position={[0, 1.45, 0]} castShadow>
          <boxGeometry args={[0.32, 0.18, 0.32]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.7} flatShading />
        </mesh>
        <mesh position={[0, 1.54, 0.05]}>
          <boxGeometry args={[0.12, 0.12, 0.1]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>

      {/* Hanging Warm Porch Lantern */}
      <group position={[1.3, 1.8, 1.3]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.14, 0.2, 0.14]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[0.1, 0.12, 0.1]} />
          <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={1.2} />
        </mesh>
        <pointLight position={[0, 0, 0]} color="#f59e0b" intensity={0.9} distance={5} />
      </group>

      {/* Floating 3D "Village Market" Sign Billboard */}
      <mesh position={[0, 2.7, 0]} castShadow>
        <boxGeometry args={[1.6, 0.35, 0.08]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 2.7, 0.05]}>
        <boxGeometry args={[1.4, 0.24, 0.02]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 5 Scattered Collectibles + 1 Secret Area Cache across Bhima's Hollow:
 * 1. Old Mughal Copper Coin (near stone well cobblestone path)
 * 2. Carved Terracotta Stone (tucked behind the cattle barn)
 * 3. Lost Silver Bangle (tangled in dry grass near north fields)
 * 4. Antique Brass Bell (resting on the irrigation pump culvert)
 * 5. Sacred Peepal Leaf Pendant (nested by the ancient banyan roots)
 * 6. Secret Village Cache (hidden hollow behind the northern forest ridge)
 */
export const COLLECTIBLES_CATALOG = [
  {
    id: "old_coin",
    name: "Old Copper Coin",
    pos: [3.8, 0.15, -3.8],
    icon: "🪙",
    color: "#f59e0b",
    lore: "A weathered copper coin bearing royal grain engravings from generations past.",
  },
  {
    id: "carved_stone",
    name: "Carved Terracotta Stone",
    pos: [7.2, 0.2, 0.8],
    icon: "🧱",
    color: "#b45309",
    lore: "A miniature clay relief of Kamadhenu, the wish-granting cow.",
  },
  {
    id: "lost_bangle",
    name: "Lost Silver Bangle",
    pos: [-7.2, 0.15, -3.2],
    icon: "💍",
    color: "#38bdf8",
    lore: "A handcrafted silver bangle, perhaps lost by Raghu's family during the last harvest fair.",
  },
  {
    id: "brass_bell",
    name: "Antique Brass Bell",
    pos: [3.1, 0.45, -2.2],
    icon: "🔔",
    color: "#fbbf24",
    lore: "A clear-toned brass temple bell whose chiming used to signal prayer time.",
  },
  {
    id: "sacred_pendant",
    name: "Sacred Peepal Pendant",
    pos: [-5.2, 0.2, -6.2],
    icon: "🍃",
    color: "#10b981",
    lore: "A preserved bronze peepal leaf inscribed with auspicious farm mantras.",
  },
  {
    id: "secret_cache",
    name: "Hidden Hollow Shrine Cache",
    pos: [1.8, 0.2, -8.2],
    icon: "✨",
    color: "#a855f7",
    rewardGold: 50,
    lore: "An ancient stone chest concealed within the northern forest containing gold and heirloom seeds!",
  },
];

function SingleCollectible({ item, isFound, onCollect, playerPos }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Gentle bobbing and continuous golden spin
    meshRef.current.position.y = item.pos[1] + Math.sin(t * 2.5 + item.pos[0]) * 0.05;
    meshRef.current.rotation.y += 0.025;
  });

  if (isFound) return null;

  // Check proximity for sparkle hint
  const dist = playerPos ? Math.hypot(playerPos.x - item.pos[0], playerPos.z - item.pos[2]) : 999;
  const isNear = dist < 2.8;

  return (
    <group
      position={item.pos}
      onClick={(e) => {
        e.stopPropagation();
        onCollect(item);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      {/* Floating Sparkle Ring */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial
          color={item.color}
          emissive={item.color}
          emissiveIntensity={isNear ? 1.2 : 0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Proximity Sparkle Aura */}
      {isNear && (
        <mesh position={[0, 0.1, 0]}>
          <ringGeometry args={[0.24, 0.32, 16]} />
          <meshBasicMaterial color={item.color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export function Collectibles({ foundList = [], onCollect, playerPos }) {
  return (
    <group>
      {COLLECTIBLES_CATALOG.map((item) => (
        <SingleCollectible
          key={item.id}
          item={item}
          isFound={foundList.includes(item.id)}
          onCollect={onCollect}
          playerPos={playerPos}
        />
      ))}
    </group>
  );
}

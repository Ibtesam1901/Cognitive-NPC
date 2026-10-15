import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Traditional Indian Clay Chulha (Outdoor Cooking Hearth) & Windmill:
 * - Brick & dried clay stove with glowing embers, clay pot, and smoke
 * - Interactive: click to open the Cooking & Crafting Menu
 */
export function VillageChulha({
  position = [-1.5, 0, 0.4],
  onOpenKitchen,
}) {
  const embersRef = useRef();

  useFrame((state) => {
    if (embersRef.current) {
      const t = state.clock.elapsedTime;
      embersRef.current.intensity = 1.2 + Math.sin(t * 8) * 0.4;
    }
  });

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onOpenKitchen) onOpenKitchen();
      }}
      cursor="pointer"
    >
      {/* Stone foundation slab */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[1.2, 0.1, 1.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.95} flatShading />
      </mesh>

      {/* Horseshoe-shaped Mud / Terracotta Chulha */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.7, 0.3, 0.7]} />
        <meshStandardMaterial color="#b45309" roughness={0.9} flatShading />
      </mesh>

      {/* Inner firebox opening */}
      <mesh position={[0, 0.22, 0.25]}>
        <boxGeometry args={[0.35, 0.22, 0.3]} />
        <meshStandardMaterial color="#1e1b18" roughness={0.95} />
      </mesh>

      {/* Glowing Firewood Embers */}
      <mesh position={[0, 0.16, 0.1]}>
        <boxGeometry args={[0.26, 0.1, 0.26]} />
        <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={1.8} />
      </mesh>
      <pointLight ref={embersRef} position={[0, 0.3, 0.1]} color="#f97316" distance={3.5} intensity={1.5} />

      {/* Clay Cooking Pot (Handi / Karahi) atop the stove */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.16, 0.2, 10]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} flatShading />
      </mesh>
      {/* Pot Lid handle */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#ca8a04" />
      </mesh>

      {/* Firewood Stack beside Chulha */}
      <group position={[0.5, 0.15, -0.2]}>
        {[-0.08, 0, 0.08].map((y, yi) => (
          <mesh key={yi} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.45, 6]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
          </mesh>
        ))}
      </group>

      {/* Floating 3D "Village Chulha" Tag */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.65, 0.16, 0.02]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
    </group>
  );
}

/**
 * Traditional Village Wooden Windmill:
 * - Stands majestically on the northern forest ridge
 * - 4 rotating wooden lattice sails driven by the wind
 */
export function VillageWindmill({
  position = [6.5, 0.35, -8.5],
}) {
  const bladesRef = useRef();

  useFrame((state, delta) => {
    if (bladesRef.current) {
      bladesRef.current.rotation.z += delta * 0.8;
    }
  });

  return (
    <group position={position}>
      {/* Octagonal Stone Tower Base */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.6, 4.4, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} flatShading />
      </mesh>

      {/* Conical Thatched / Shingle Windmill Cap */}
      <mesh position={[0, 4.8, 0]} castShadow>
        <coneGeometry args={[1.35, 1.2, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} flatShading />
      </mesh>

      {/* Rotor Axle */}
      <mesh position={[0, 4.5, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* 4 Spinning Sails */}
      <group ref={bladesRef} position={[0, 4.5, 1.2]}>
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((rot, idx) => (
          <group key={idx} rotation={[0, 0, rot]}>
            {/* Spar */}
            <mesh position={[0, 1.4, 0]} castShadow>
              <boxGeometry args={[0.08, 2.8, 0.06]} />
              <meshStandardMaterial color="#451a03" roughness={0.9} />
            </mesh>
            {/* White Linen Cloth Sail */}
            <mesh position={[0.22, 1.4, 0.02]}>
              <boxGeometry args={[0.38, 2.5, 0.02]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * Village Courtyard Campfire with warm nighttime embers and wooden bench
 */
export function VillageCampfire({
  position = [1.8, 0, 3.8],
  isNight = false,
}) {
  const lightRef = useRef();

  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.elapsedTime;
      lightRef.current.intensity = (isNight ? 2.2 : 0.8) + Math.sin(t * 10) * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Stone Ring */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.45, 0.08, Math.sin(angle) * 0.45]} castShadow>
            <boxGeometry args={[0.18, 0.14, 0.18]} />
            <meshStandardMaterial color="#475569" roughness={0.95} flatShading />
          </mesh>
        );
      })}

      {/* Tepee Firewood logs */}
      {[-0.3, 0, 0.3].map((angle, ai) => (
        <mesh key={ai} position={[0, 0.16, 0]} rotation={[0.4, angle, 0]} castShadow>
          <boxGeometry args={[0.08, 0.42, 0.08]} />
          <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
        </mesh>
      ))}

      {/* Fire flame block */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.22, 0.28, 0.22]} />
        <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={2.0} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0.5, 0]} color="#f97316" distance={6} intensity={isNight ? 2.2 : 0.8} />

      {/* Wooden Courtyard Rest Bench */}
      <group position={[0, 0, 0.95]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[1.2, 0.08, 0.36]} />
          <meshStandardMaterial color="#78350f" roughness={0.85} flatShading />
        </mesh>
        {[-0.45, 0.45].map((bx, bi) => (
          <mesh key={bi} position={[bx, 0.1, 0]} castShadow>
            <boxGeometry args={[0.1, 0.2, 0.28]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

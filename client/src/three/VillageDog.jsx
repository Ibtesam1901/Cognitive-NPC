import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Sheru the Village Dog:
 * - Playful low-poly indie village dog (golden tan coat with white chest & muzzle)
 * - Sits or paces peacefully in the farmhouse courtyard
 * - Wags tail happily when the player approaches
 * - Can be petted by clicking on him
 */
export function VillageDog({
  position = [-1.0, 0, 2.2],
  playerPos = { x: 0, z: 0 },
  onPet,
}) {
  const tailRef = useRef();
  const headRef = useRef();

  const isNear =
    Math.hypot((playerPos?.x || 0) - position[0], (playerPos?.z || 0) - position[2]) < 2.5;

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // Tail wagging increases when player is near
    if (tailRef.current) {
      const wagSpeed = isNear ? 12 : 3;
      const wagAmp = isNear ? 0.4 : 0.15;
      tailRef.current.rotation.y = Math.sin(time * wagSpeed) * wagAmp;
    }

    // Gentle head tilt looking around or towards player
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(time * 1.5) * 0.08;
      headRef.current.rotation.y = isNear ? Math.sin(time * 2) * 0.15 : 0;
    }
  });

  return (
    <group
      position={position}
      rotation={[0, Math.PI / 3, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (onPet) onPet();
      }}
      cursor="pointer"
    >
      {/* Dog Body (Golden Tan) */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.34, 0.32, 0.65]} />
        <meshStandardMaterial color="#c28e46" roughness={0.8} flatShading />
      </mesh>

      {/* White Chest Patch */}
      <mesh position={[0, 0.32, 0.28]}>
        <boxGeometry args={[0.22, 0.24, 0.12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} flatShading />
      </mesh>

      {/* Head Group */}
      <group ref={headRef} position={[0, 0.55, 0.35]}>
        {/* Head Base */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.26, 0.24, 0.26]} />
          <meshStandardMaterial color="#c28e46" roughness={0.8} flatShading />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.04, 0.18]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} flatShading />
        </mesh>
        {/* Black Nose */}
        <mesh position={[0, 0.01, 0.26]}>
          <boxGeometry args={[0.06, 0.05, 0.04]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        {/* Floppy Ears */}
        <mesh position={[-0.14, 0.06, -0.02]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.06, 0.15, 0.1]} />
          <meshStandardMaterial color="#8c5828" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0.14, 0.06, -0.02]} rotation={[0, 0, 0.2]}>
          <boxGeometry args={[0.06, 0.15, 0.1]} />
          <meshStandardMaterial color="#8c5828" roughness={0.9} flatShading />
        </mesh>
      </group>

      {/* 4 Sturdy Paws / Legs */}
      {[-0.12, 0.12].map((x, xi) =>
        [-0.22, 0.22].map((z, zi) => (
          <mesh key={`dogleg-${xi}-${zi}`} position={[x, 0.12, z]} castShadow>
            <boxGeometry args={[0.08, 0.24, 0.08]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} flatShading />
          </mesh>
        ))
      )}

      {/* Wagging Tail */}
      <group ref={tailRef} position={[0, 0.45, -0.32]}>
        <mesh position={[0, 0.12, -0.1]} rotation={[-0.6, 0, 0]}>
          <boxGeometry args={[0.06, 0.24, 0.06]} />
          <meshStandardMaterial color="#c28e46" roughness={0.8} flatShading />
        </mesh>
        {/* White tail tip */}
        <mesh position={[0, 0.23, -0.18]} rotation={[-0.6, 0, 0]}>
          <boxGeometry args={[0.05, 0.08, 0.05]} />
          <meshStandardMaterial color="#f8fafc" flatShading />
        </mesh>
      </group>

      {/* Floating 3D Interaction Billboard when near */}
      {isNear && (
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.6, 0.16, 0.02]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      )}
    </group>
  );
}

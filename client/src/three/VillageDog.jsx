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
  position = [-0.8, 0, 2.4],
  playerPos = { x: 0, z: 0 },
  onPet,
}) {
  const dogGroupRef = useRef();
  const tailRef = useRef();
  const headRef = useRef();
  const legsRef = useRef([]);

  // Internal dog coordinates for smooth walking AI
  const dogPos = useRef({ x: position[0], z: position[2], rotY: Math.PI / 3 });
  const [isNear, setIsNear] = React.useState(false);

  const targetX = playerPos?.x ?? 0;
  const targetZ = playerPos?.z ?? 0;

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const dx = targetX - dogPos.current.x;
    const dz = targetZ - dogPos.current.z;
    const dist = Math.hypot(dx, dz);
    const close = dist < 2.5;

    if (close !== isNear) {
      setIsNear(close);
    }

    // Follow player if further than 2.0m, stop if closer than 1.8m
    let isMoving = false;
    if (dist > 2.0 && dist < 14) {
      isMoving = true;
      const angle = Math.atan2(dx, dz);
      dogPos.current.rotY = angle;

      // Move toward player at 2.4 m/s
      const moveDist = Math.min(dist - 1.8, delta * 2.4);
      dogPos.current.x += Math.sin(angle) * moveDist;
      dogPos.current.z += Math.cos(angle) * moveDist;
    }

    // Apply position & rotation to 3D group
    if (dogGroupRef.current) {
      dogGroupRef.current.position.x = dogPos.current.x;
      dogGroupRef.current.position.z = dogPos.current.z;
      dogGroupRef.current.rotation.y = dogPos.current.rotY;
    }

    // Tail wagging increases when near or moving
    if (tailRef.current) {
      const wagSpeed = isMoving ? 14 : isNear ? 10 : 3;
      const wagAmp = isMoving || isNear ? 0.35 : 0.12;
      tailRef.current.rotation.y = Math.sin(time * wagSpeed) * wagAmp;
    }

    // Gentle head tilt looking around or towards player
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(time * 1.5) * 0.08;
      headRef.current.rotation.y = isNear ? Math.sin(time * 2) * 0.15 : 0;
    }

    // Leg trotting animation when walking
    if (legsRef.current.length === 4) {
      legsRef.current.forEach((leg, idx) => {
        if (!leg) return;
        if (isMoving) {
          const phase = idx % 2 === 0 ? 1 : -1;
          leg.rotation.x = Math.sin(time * 10) * 0.4 * phase;
        } else {
          leg.rotation.x = 0;
        }
      });
    }
  });

  return (
    <group
      ref={dogGroupRef}
      position={[position[0], 0, position[2]]}
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
      {[
        [-0.12, 0.18, 0],
        [0.12, 0.18, 1],
        [-0.12, -0.18, 2],
        [0.12, -0.18, 3],
      ].map(([x, z, idx]) => (
        <group
          key={`dogleg-${idx}`}
          position={[x, 0.22, z]}
          ref={(el) => {
            if (el) legsRef.current[idx] = el;
          }}
        >
          <mesh position={[0, -0.11, 0]} castShadow>
            <boxGeometry args={[0.08, 0.22, 0.08]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} flatShading />
          </mesh>
        </group>
      ))}

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

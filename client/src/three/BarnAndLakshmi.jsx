import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Open Wooden Cattle Barn & Lakshmi the Cow (Indian Zebu Cow)
 * - If Lakshmi is missing (flags.found_cow is false), shows empty stall and tether rope
 * - When found (flags.found_cow is true), Lakshmi stands peacefully chewing cud, flicking ears and swishing tail
 */
export function BarnAndLakshmi({
  position = [4.8, 0, 1.2],
  isCowFound = true,
  reducedMotion = false,
  onCowClick,
}) {
  const headRef = useRef();
  const tailRef = useRef();
  const earsRef = useRef();

  const materials = useMemo(() => {
    return {
      timber: new THREE.MeshStandardMaterial({ color: "#54381e", roughness: 0.9 }),
      thatch: new THREE.MeshStandardMaterial({ color: "#a16207", roughness: 0.95 }),
      hay: new THREE.MeshStandardMaterial({ color: "#eab308", roughness: 0.9 }),
      cowWhite: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.8 }),
      cowBrown: new THREE.MeshStandardMaterial({ color: "#9a3412", roughness: 0.8 }),
      horns: new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.5 }),
      bell: new THREE.MeshStandardMaterial({ color: "#ca8a04", roughness: 0.3, metalness: 0.8 }),
      rope: new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.9 }),
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Gentle head bob (chewing cud)
    if (headRef.current && !reducedMotion) {
      headRef.current.rotation.x = Math.sin(time * 2.5) * 0.05 + 0.1;
      headRef.current.rotation.y = Math.sin(time * 1.2) * 0.04;
    }

    // Tail swishing
    if (tailRef.current && !reducedMotion) {
      tailRef.current.rotation.z = Math.sin(time * 3) * 0.25;
    }

    // Ear flick
    if (earsRef.current && !reducedMotion) {
      earsRef.current.rotation.z = Math.sin(time * 5) * 0.08;
    }
  });

  return (
    <group position={position} rotation={[0, -Math.PI / 4, 0]}>
      {/* Barn Structure */}
      <group position={[0, 0, 0]}>
        {/* 4 Wooden Corner Posts */}
        {[-1.2, 1.2].map((x, xi) =>
          [-1.0, 1.0].map((z, zi) => (
            <mesh key={`${xi}-${zi}`} position={[x, 1.1, z]} castShadow material={materials.timber}>
              <boxGeometry args={[0.16, 2.2, 0.16]} />
            </mesh>
          ))
        )}

        {/* Support Rafter Beams */}
        <mesh position={[0, 2.15, -1.0]} castShadow material={materials.timber}>
          <boxGeometry args={[2.6, 0.12, 0.12]} />
        </mesh>
        <mesh position={[0, 2.15, 1.0]} castShadow material={materials.timber}>
          <boxGeometry args={[2.6, 0.12, 0.12]} />
        </mesh>
        <mesh position={[-1.2, 2.15, 0]} castShadow material={materials.timber}>
          <boxGeometry args={[0.12, 0.12, 2.1]} />
        </mesh>
        <mesh position={[1.2, 2.15, 0]} castShadow material={materials.timber}>
          <boxGeometry args={[0.12, 0.12, 2.1]} />
        </mesh>

        {/* Sloped Thatched Roof */}
        <mesh position={[0, 2.45, 0]} rotation={[0, 0, 0]} castShadow material={materials.thatch}>
          <coneGeometry args={[2.1, 0.7, 4]} />
        </mesh>

        {/* Hay Feeder Trough */}
        <mesh position={[0, 0.35, -0.75]} castShadow material={materials.timber}>
          <boxGeometry args={[1.8, 0.45, 0.45]} />
        </mesh>
        <mesh position={[0, 0.5, -0.75]} material={materials.hay}>
          <boxGeometry args={[1.7, 0.2, 0.35]} />
        </mesh>

        {/* Tethering Stake in ground */}
        <mesh position={[0.6, 0.3, 0.5]} material={materials.timber}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
        </mesh>
      </group>

      {/* Lakshmi the Cow (Indian Zebu sacred farm cow) or Missing Stall state */}
      {isCowFound ? (
        <group
          position={[0, 0.55, 0]}
          rotation={[0, Math.PI / 2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (onCowClick) onCowClick();
          }}
          cursor="pointer"
        >
          {/* Main Cow Body (Barrel) */}
          <mesh position={[0, 0.45, 0]} castShadow material={materials.cowWhite}>
            <boxGeometry args={[1.3, 0.75, 0.65]} />
          </mesh>

          {/* Brown spot on flank */}
          <mesh position={[0.15, 0.55, 0.33]} material={materials.cowBrown}>
            <boxGeometry args={[0.5, 0.4, 0.02]} />
          </mesh>
          <mesh position={[-0.2, 0.4, -0.33]} material={materials.cowBrown}>
            <boxGeometry args={[0.45, 0.35, 0.02]} />
          </mesh>

          {/* Indian Zebu Cow Hump */}
          <mesh position={[0.35, 0.95, 0]} castShadow material={materials.cowWhite}>
            <sphereGeometry args={[0.22, 7, 7]} />
          </mesh>

          {/* Head & Neck */}
          <group ref={headRef} position={[0.75, 0.75, 0]}>
            {/* Neck */}
            <mesh position={[-0.1, -0.1, 0]} rotation={[0, 0, -0.4]} material={materials.cowWhite}>
              <boxGeometry args={[0.35, 0.45, 0.35]} />
            </mesh>
            {/* Head */}
            <mesh position={[0.2, 0.05, 0]} castShadow material={materials.cowWhite}>
              <boxGeometry args={[0.45, 0.38, 0.32]} />
            </mesh>
            {/* Snout / Muzzle */}
            <mesh position={[0.42, -0.05, 0]} material={materials.cowBrown}>
              <boxGeometry args={[0.2, 0.25, 0.28]} />
            </mesh>
            {/* Horns */}
            <mesh position={[0.15, 0.3, 0.16]} rotation={[0.4, 0, -0.2]} material={materials.horns}>
              <coneGeometry args={[0.04, 0.3, 5]} />
            </mesh>
            <mesh position={[0.15, 0.3, -0.16]} rotation={[-0.4, 0, -0.2]} material={materials.horns}>
              <coneGeometry args={[0.04, 0.3, 5]} />
            </mesh>
            {/* Ears */}
            <group ref={earsRef}>
              <mesh position={[0.08, 0.12, 0.22]} rotation={[0.2, 0, -0.3]} material={materials.cowWhite}>
                <boxGeometry args={[0.06, 0.16, 0.08]} />
              </mesh>
              <mesh position={[0.08, 0.12, -0.22]} rotation={[-0.2, 0, -0.3]} material={materials.cowWhite}>
                <boxGeometry args={[0.06, 0.16, 0.08]} />
              </mesh>
            </group>
            {/* Brass Bell Necklace */}
            <mesh position={[0.05, -0.25, 0]} rotation={[0, 0, 0]} material={materials.rope}>
              <torusGeometry args={[0.18, 0.03, 5, 10]} />
            </mesh>
            <mesh position={[0.12, -0.42, 0]} material={materials.bell}>
              <coneGeometry args={[0.06, 0.1, 6]} />
            </mesh>
          </group>

          {/* 4 Sturdy Legs */}
          {[-0.4, 0.4].map((x, xi) =>
            [-0.22, 0.22].map((z, zi) => (
              <mesh key={`cowleg-${xi}-${zi}`} position={[x, -0.1, z]} castShadow material={materials.cowWhite}>
                <cylinderGeometry args={[0.07, 0.06, 0.55, 6]} />
              </mesh>
            ))
          )}

          {/* Swishing Tail */}
          <group ref={tailRef} position={[-0.65, 0.65, 0]}>
            <mesh position={[0, -0.3, 0]} rotation={[0, 0, 0.1]} material={materials.rope}>
              <cylinderGeometry args={[0.02, 0.015, 0.6, 4]} />
            </mesh>
            <mesh position={[0, -0.6, 0]} material={materials.horns}>
              <coneGeometry args={[0.05, 0.14, 4]} />
            </mesh>
          </group>
        </group>
      ) : (
        /* Empty Stall: Slack halter rope coiled on the ground */
        <group position={[0.5, 0.05, 0.2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.rope}>
            <torusGeometry args={[0.25, 0.03, 4, 8]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

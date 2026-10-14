import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural Antique Diesel Irrigation Pump (1893):
 * - Cast-iron engine block & fuel tank
 * - Large flywheel that rotates vigorously when repaired / running
 * - Pressure gauge with needle matching blueprint (30 PSI)
 * - Pipes connecting to the irrigation canal
 * - Running vibrations & exhaust puffs
 */
export function IrrigationPump({
  position = [1.8, 0.25, -2.4],
  isRepaired = false,
  reducedMotion = false,
}) {
  const flywheelRef = useRef();
  const pumpBodyRef = useRef();
  const smokeRef = useRef();

  const materials = useMemo(() => {
    return {
      iron: new THREE.MeshStandardMaterial({
        color: isRepaired ? "#0f766e" : "#57534e", // oxidized teal when running, rusted grey when broken
        roughness: 0.6,
        metalness: 0.5,
      }),
      rust: new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.8 }),
      brass: new THREE.MeshStandardMaterial({ color: "#ca8a04", roughness: 0.3, metalness: 0.7 }),
      pipe: new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.5, metalness: 0.6 }),
      gaugeFace: new THREE.MeshBasicMaterial({ color: "#fef08a" }),
      smoke: new THREE.MeshBasicMaterial({ color: "#e2e8f0", transparent: true, opacity: 0.35 }),
    };
  }, [isRepaired]);

  useFrame((state, delta) => {
    if (!isRepaired) return;
    const time = state.clock.elapsedTime;

    // Spin flywheel when running
    if (flywheelRef.current) {
      flywheelRef.current.rotation.x += delta * 12;
    }

    // Engine running vibration
    if (pumpBodyRef.current && !reducedMotion) {
      pumpBodyRef.current.position.y = 0.35 + Math.sin(time * 30) * 0.008;
    }

    // Exhaust puff oscillation
    if (smokeRef.current && !reducedMotion) {
      const cycle = (time * 3) % 1;
      smokeRef.current.position.y = 1.3 + cycle * 0.4;
      smokeRef.current.scale.setScalar(0.4 + cycle * 0.8);
      smokeRef.current.material.opacity = (1 - cycle) * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Concrete Mounting Base */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.3, 0.16, 1.8]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>

      {/* Main Cast-Iron Engine Block */}
      <group ref={pumpBodyRef} position={[0, 0.35, 0]}>
        <mesh castShadow receiveShadow material={materials.iron}>
          <boxGeometry args={[0.7, 0.55, 0.9]} />
        </mesh>

        {/* Cylindrical Fuel Tank on Top */}
        <mesh position={[0, 0.42, -0.1]} rotation={[0, 0, Math.PI / 2]} castShadow material={materials.brass}>
          <cylinderGeometry args={[0.18, 0.18, 0.65, 10]} />
        </mesh>

        {/* Antique Pressure Gauge (Matches 30 PSI Clue) */}
        <group position={[0.36, 0.15, 0.2]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={materials.brass}>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 12]} />
          </mesh>
          <mesh position={[0, 0, 0.021]} material={materials.gaugeFace}>
            <circleGeometry args={[0.07, 12]} />
          </mesh>
          {/* Needle pointing near 30 PSI */}
          <mesh position={[0, 0, 0.023]} rotation={[0, 0, isRepaired ? -0.6 : -1.8]}>
            <boxGeometry args={[0.01, 0.05, 0.005]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>

        {/* Exhaust Stack */}
        <mesh position={[-0.22, 0.65, 0.25]} castShadow material={materials.rust}>
          <cylinderGeometry args={[0.04, 0.04, 0.55, 6]} />
        </mesh>
        <mesh position={[-0.22, 0.95, 0.28]} rotation={[0.4, 0, 0]} material={materials.rust}>
          <cylinderGeometry args={[0.04, 0.05, 0.15, 6]} />
        </mesh>

        {/* Exhaust Smoke Puff (Visible when pump is running) */}
        {isRepaired && (
          <mesh ref={smokeRef} position={[-0.22, 1.3, 0.35]} material={materials.smoke}>
            <sphereGeometry args={[0.12, 6, 6]} />
          </mesh>
        )}
      </group>

      {/* Large Spoked Flywheel */}
      <group position={[-0.42, 0.45, 0]}>
        <group ref={flywheelRef}>
          {/* Wheel rim */}
          <mesh rotation={[0, Math.PI / 2, 0]} castShadow material={materials.iron}>
            <torusGeometry args={[0.38, 0.04, 6, 16]} />
          </mesh>
          {/* Center Hub */}
          <mesh rotation={[0, Math.PI / 2, 0]} material={materials.brass}>
            <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
          </mesh>
          {/* 4 Spokes */}
          {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((angle, i) => (
            <mesh key={i} rotation={[angle, 0, 0]} material={materials.iron}>
              <cylinderGeometry args={[0.018, 0.018, 0.72, 4]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Heavy-Duty Intake & Outlet Pipes */}
      <group position={[0.38, 0.25, 0]}>
        {/* Outlet Pipe running down to canal */}
        <mesh position={[0.2, 0.05, 0.2]} rotation={[0, 0, -Math.PI / 4]} castShadow material={materials.pipe}>
          <cylinderGeometry args={[0.06, 0.06, 0.45, 8]} />
        </mesh>
        <mesh position={[0.45, -0.1, 0.4]} rotation={[Math.PI / 2, 0, 0]} castShadow material={materials.pipe}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
        </mesh>
      </group>
    </group>
  );
}

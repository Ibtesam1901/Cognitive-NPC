import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural Indian farmland diorama:
 * - Parched / cracked earth terrain plane
 * - Irrigation canal with dynamic water plane that fills as farmHealth increases & pump runs
 * - Instanced crops & grass shoots that grow and turn greener with farmHealth
 * - Ancient stone well with wooden posts and bucket
 */
export function Terrain({ farmHealth = 20, isPumpRunning = false, reducedMotion = false }) {
  const waterRef = useRef();
  const cropMeshRef = useRef();
  const groundRef = useRef();

  // Interpolated visual values
  const healthRatio = Math.max(0, Math.min(100, farmHealth)) / 100;

  // Ground colors interpolated between parched red-dust and nourished fertile earth
  const soilColor = useMemo(() => {
    const dry = new THREE.Color("#8c5324");
    const fertile = new THREE.Color("#4a3b2c");
    return dry.clone().lerp(fertile, healthRatio);
  }, [healthRatio]);

  const cropColor = useMemo(() => {
    const withered = new THREE.Color("#a16207"); // dry straw
    const lush = new THREE.Color("#65a30d"); // green wheat shoots
    return withered.clone().lerp(lush, healthRatio);
  }, [healthRatio]);

  // Crop instances placement (North field)
  const cropCount = 60;
  const cropTransforms = useMemo(() => {
    const transforms = [];
    const dummy = new THREE.Object3D();
    const rows = 6;
    const cols = 10;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = r * 10 + c + 1;
        const pseudo1 = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
        const pseudo2 = (Math.sin(seed * 78.233) * 43758.5453) % 1;
        const pseudo3 = (Math.sin(seed * 45.164) * 43758.5453) % 1;
        const x = -4.5 + c * 0.45 + (pseudo1 - 0.5) * 0.1;
        const z = -2.5 - r * 0.45 + (pseudo2 - 0.5) * 0.1;
        dummy.position.set(x, 0, z);
        dummy.rotation.y = (pseudo3 - 0.5) * 0.4;
        dummy.updateMatrix();
        transforms.push(dummy.matrix.clone());
      }
    }
    return transforms;
  }, []);

  // Update instanced crop matrices on mount / change
  useEffect(() => {
    if (!cropMeshRef.current) return;
    const dummy = new THREE.Object3D();
    const heightScale = 0.3 + healthRatio * 0.7; // grows taller with health

    cropTransforms.forEach((matrix, idx) => {
      dummy.matrix.copy(matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.scale.set(0.8, heightScale, 0.8);
      dummy.updateMatrix();
      cropMeshRef.current.setMatrixAt(idx, dummy.matrix);
    });
    cropMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [cropTransforms, healthRatio]);

  // Canal water oscillation
  useFrame((state, delta) => {
    if (!waterRef.current) return;
    const time = state.clock.elapsedTime;

    // Target water height: very low/dry if health <= 20 and !isPumpRunning
    const targetY = isPumpRunning || healthRatio > 0.3 ? -0.15 + healthRatio * 0.18 : -0.32;
    waterRef.current.position.y = THREE.MathUtils.lerp(
      waterRef.current.position.y,
      targetY,
      delta * 2
    );

    // Wave ripples
    if (!reducedMotion && (isPumpRunning || healthRatio > 0.2)) {
      waterRef.current.position.x = 2.0 + Math.sin(time * 2) * 0.02;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Main Ground Plane */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[22, 22, 16, 16]} />
        <meshStandardMaterial color={soilColor} roughness={0.95} />
      </mesh>

      {/* Raised Verandah / Porch Foundation */}
      <mesh position={[0, 0.15, 0.2]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.3, 3.2]} />
        <meshStandardMaterial color="#7c4a27" roughness={0.9} />
      </mesh>

      {/* Stone steps from verandah to courtyard */}
      <mesh position={[0, 0.08, 1.9]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.16, 0.45]} />
        <meshStandardMaterial color="#a8a29e" roughness={0.9} />
      </mesh>

      {/* Canal Trench (depressed slot cutting through farm) */}
      <group position={[2.2, -0.2, -1.0]} rotation={[0, 0.15, 0]}>
        {/* Canal banks (left & right) */}
        <mesh position={[-0.75, 0.1, 0]} receiveShadow>
          <boxGeometry args={[0.3, 0.2, 9]} />
          <meshStandardMaterial color="#643e1d" roughness={0.95} />
        </mesh>
        <mesh position={[0.75, 0.1, 0]} receiveShadow>
          <boxGeometry args={[0.3, 0.2, 9]} />
          <meshStandardMaterial color="#643e1d" roughness={0.95} />
        </mesh>
        {/* Canal Bed */}
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <boxGeometry args={[1.2, 0.1, 9]} />
          <meshStandardMaterial color="#452a14" roughness={0.95} />
        </mesh>
        {/* Canal Water Plane */}
        <mesh ref={waterRef} position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 8.8]} />
          <meshStandardMaterial
            color={healthRatio > 0.4 || isPumpRunning ? "#0284c7" : "#78716c"}
            transparent
            opacity={0.82}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
      </group>

      {/* Instanced Crops (North Field) */}
      <instancedMesh
        ref={cropMeshRef}
        args={[null, null, cropCount]}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[0.08, 0.7, 4]} />
        <meshStandardMaterial color={cropColor} roughness={0.8} />
      </instancedMesh>

      {/* Ancient Stone Well */}
      <group position={[-3.2, 0, 2.2]}>
        {/* Outer stone ring */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 0.95, 0.9, 12, 1, true]} />
          <meshStandardMaterial color="#78716c" roughness={0.95} />
        </mesh>
        {/* Dark interior well water */}
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.82, 12]} />
          <meshStandardMaterial color="#0c4a6e" roughness={0.1} />
        </mesh>
        {/* Wooden vertical posts */}
        <mesh position={[-0.8, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.4, 6]} />
          <meshStandardMaterial color="#57381e" roughness={0.8} />
        </mesh>
        <mesh position={[0.8, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.4, 6]} />
          <meshStandardMaterial color="#57381e" roughness={0.8} />
        </mesh>
        {/* Wooden horizontal crossbeam */}
        <mesh position={[0, 1.75, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.8, 6]} />
          <meshStandardMaterial color="#57381e" roughness={0.8} />
        </mesh>
        {/* Pulley wheel & rope */}
        <mesh position={[0, 1.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.03, 6, 12]} />
          <meshStandardMaterial color="#292524" />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.1, 4]} />
          <meshStandardMaterial color="#d6d3d1" />
        </mesh>
        {/* Wooden Bucket */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.28, 8]} />
          <meshStandardMaterial color="#854d0e" roughness={0.7} />
        </mesh>
      </group>

      {/* Field Fence Rails (Rustic wooden fence along field edge) */}
      <group position={[-4.5, 0, -0.6]}>
        {[-2, 0, 2, 4].map((xOffset, i) => (
          <mesh key={i} position={[xOffset, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 5]} />
            <meshStandardMaterial color="#57381e" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[1, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 6.2, 4]} />
          <meshStandardMaterial color="#57381e" roughness={0.9} />
        </mesh>
        <mesh position={[1, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 6.2, 4]} />
          <meshStandardMaterial color="#57381e" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

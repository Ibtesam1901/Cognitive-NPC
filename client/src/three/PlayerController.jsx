import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { checkCollision } from "./Colliders.js";

/**
 * PlayerController:
 * - 3rd-person WASD / Arrow keys movement with smooth acceleration
 * - Shift to sprint (1.6x speed)
 * - Obstacle collision avoidance against buildings, well, and trees
 * - Smooth camera follow with mouse drag rotation
 * - Walking animation (bobbing / footsteps hook)
 * - Reports player position & proximity to landmarks
 */
export function PlayerController({
  initialPosition = [-0.5, 0, 4.0],
  onPositionChange,
  onProximityToRaghu,
  onFootstep,
  enabled = true,
}) {
  const playerRef = useRef();
  const avatarGroupRef = useRef();
  const { camera, gl } = useThree();

  // Internal physics & motion vectors
  const pos = useRef(new THREE.Vector3(...initialPosition));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const isMoving = useRef(false);
  const walkCycle = useRef(0);

  // Key tracking
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  // Camera Orbit angles (pitch, yaw, distance)
  const cameraYaw = useRef(0);
  const cameraPitch = useRef(0.45); // Radians up
  const cameraDistance = useRef(5.5);
  const isMouseDown = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  // Event Listeners for Keyboard & Mouse Drag
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Don't capture when typing in an input field
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const code = e.code;
      if (code === "KeyW" || code === "ArrowUp") keys.current.forward = true;
      if (code === "KeyS" || code === "ArrowDown") keys.current.backward = true;
      if (code === "KeyA" || code === "ArrowLeft") keys.current.left = true;
      if (code === "KeyD" || code === "ArrowRight") keys.current.right = true;
      if (code === "ShiftLeft" || code === "ShiftRight") keys.current.sprint = true;
    };

    const handleKeyUp = (e) => {
      const code = e.code;
      if (code === "KeyW" || code === "ArrowUp") keys.current.forward = false;
      if (code === "KeyS" || code === "ArrowDown") keys.current.backward = false;
      if (code === "KeyA" || code === "ArrowLeft") keys.current.left = false;
      if (code === "KeyD" || code === "ArrowRight") keys.current.right = false;
      if (code === "ShiftLeft" || code === "ShiftRight") keys.current.sprint = false;
    };

    const canvas = gl.domElement;

    const handleMouseDown = (e) => {
      if (e.button === 0 || e.button === 2) {
        isMouseDown.current = true;
        prevMouse.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e) => {
      if (!isMouseDown.current) return;
      const deltaX = e.clientX - prevMouse.current.x;
      const deltaY = e.clientY - prevMouse.current.y;
      prevMouse.current = { x: e.clientX, y: e.clientY };

      cameraYaw.current -= deltaX * 0.005;
      cameraPitch.current = Math.max(0.12, Math.min(Math.PI / 2.3, cameraPitch.current + deltaY * 0.004));
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;
    };

    const handleWheel = (e) => {
      cameraDistance.current = Math.max(3.0, Math.min(12.0, cameraDistance.current + e.deltaY * 0.005));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [gl, enabled]);

  // Main Frame Loop: Movement, Collisions & Camera Follow
  useFrame((_, delta) => {
    if (!enabled) return;
    const clampedDelta = Math.min(delta, 0.05);

    // 1. Calculate Move Vector relative to camera yaw
    let moveZ = 0;
    let moveX = 0;
    if (keys.current.forward) moveZ -= 1;
    if (keys.current.backward) moveZ += 1;
    if (keys.current.left) moveX -= 1;
    if (keys.current.right) moveX += 1;

    const hasInput = moveX !== 0 || moveZ !== 0;
    isMoving.current = hasInput;

    const baseSpeed = keys.current.sprint ? 5.8 : 3.6;

    if (hasInput) {
      // Normalize
      const inputLen = Math.hypot(moveX, moveZ);
      const nx = moveX / inputLen;
      const nz = moveZ / inputLen;

      // Project into world coordinates based on camera yaw
      const forwardAngle = cameraYaw.current;
      const worldMoveX = nx * Math.cos(forwardAngle) + nz * Math.sin(forwardAngle);
      const worldMoveZ = -nx * Math.sin(forwardAngle) + nz * Math.cos(forwardAngle);

      // Desired target orientation
      targetRotation.current = Math.atan2(worldMoveX, worldMoveZ);

      // Accelerate towards desired velocity
      velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, worldMoveX * baseSpeed, clampedDelta * 12);
      velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, worldMoveZ * baseSpeed, clampedDelta * 12);
    } else {
      // Decelerate smoothly
      velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, 0, clampedDelta * 14);
      velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, 0, clampedDelta * 14);
    }

    // 2. Collision Detection: Try moving on X, then on Z (allows sliding along walls)
    const proposedX = pos.current.x + velocity.current.x * clampedDelta;
    const proposedZ = pos.current.z + velocity.current.z * clampedDelta;

    // Test X move
    if (!checkCollision(proposedX, pos.current.z)) {
      pos.current.x = proposedX;
    } else {
      velocity.current.x = 0;
    }

    // Test Z move
    if (!checkCollision(pos.current.x, proposedZ)) {
      pos.current.z = proposedZ;
    } else {
      velocity.current.z = 0;
    }

    // Keep within world boundary bounds [-10, 10]
    pos.current.x = Math.max(-9.5, Math.min(9.5, pos.current.x));
    pos.current.z = Math.max(-9.5, Math.min(9.5, pos.current.z));

    // Update Player Mesh Position
    if (playerRef.current) {
      playerRef.current.position.copy(pos.current);
    }

    // 3. Smooth Avatar Heading Rotation
    currentRotation.current = THREE.MathUtils.lerp(
      currentRotation.current,
      targetRotation.current,
      clampedDelta * 15
    );
    if (avatarGroupRef.current) {
      avatarGroupRef.current.rotation.y = currentRotation.current;

      // Bobbing walking animation
      if (hasInput) {
        walkCycle.current += clampedDelta * (keys.current.sprint ? 14 : 9);
        const bob = Math.sin(walkCycle.current) * 0.05;
        avatarGroupRef.current.position.y = Math.abs(bob);

        // Notify footstep audio if applicable
        if (onFootstep && Math.sin(walkCycle.current) > 0.95) {
          onFootstep(pos.current.x, pos.current.z);
        }
      } else {
        avatarGroupRef.current.position.y = THREE.MathUtils.lerp(
          avatarGroupRef.current.position.y,
          0,
          clampedDelta * 10
        );
      }
    }

    // 4. Smooth Camera Follow
    const lookTarget = new THREE.Vector3(pos.current.x, pos.current.y + 0.9, pos.current.z);
    const camOffset = new THREE.Vector3(
      Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current) * cameraDistance.current,
      Math.sin(cameraPitch.current) * cameraDistance.current,
      Math.cos(cameraYaw.current) * Math.cos(cameraPitch.current) * cameraDistance.current
    );
    const desiredCamPos = lookTarget.clone().add(camOffset);

    camera.position.lerp(desiredCamPos, clampedDelta * 8);
    camera.lookAt(lookTarget);

    // 5. Check proximity to Raghu (NPC at [0.2, 0, 1.6])
    const distToRaghu = Math.hypot(pos.current.x - 0.2, pos.current.z - 1.6);
    if (onProximityToRaghu) {
      onProximityToRaghu(distToRaghu < 2.6);
    }

    // 6. Report position update periodically
    if (onPositionChange) {
      onPositionChange(pos.current.x, pos.current.z);
    }
  });

  return (
    <group ref={playerRef} position={initialPosition}>
      {/* Visual Voxel Farmer Player Character */}
      <group ref={avatarGroupRef}>
        {/* Soft Ground Contact Shadow */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.25} />
        </mesh>

        {/* Boots (Brown leather) */}
        <mesh position={[-0.12, 0.1, 0]} castShadow>
          <boxGeometry args={[0.14, 0.2, 0.18]} />
          <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0.12, 0.1, 0]} castShadow>
          <boxGeometry args={[0.14, 0.2, 0.18]} />
          <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
        </mesh>

        {/* Legs / Dhoti / Trousers */}
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.34, 0.35, 0.2]} />
          <meshStandardMaterial color="#334155" roughness={0.8} flatShading />
        </mesh>

        {/* Kurta / Shirt (Deep Teal / Indigo) */}
        <mesh position={[0, 0.68, 0]} castShadow>
          <boxGeometry args={[0.42, 0.4, 0.24]} />
          <meshStandardMaterial color="#0e7490" roughness={0.8} flatShading />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.26, 0.65, 0]} castShadow>
          <boxGeometry args={[0.1, 0.34, 0.12]} />
          <meshStandardMaterial color="#0e7490" roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0.26, 0.65, 0]} castShadow>
          <boxGeometry args={[0.1, 0.34, 0.12]} />
          <meshStandardMaterial color="#0e7490" roughness={0.8} flatShading />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[0.28, 0.26, 0.26]} />
          <meshStandardMaterial color="#d4a373" roughness={0.7} flatShading />
        </mesh>

        {/* Straw / Cloth Sun Hat */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshStandardMaterial color="#ca8a04" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, 1.22, 0]} castShadow>
          <boxGeometry args={[0.26, 0.1, 0.26]} />
          <meshStandardMaterial color="#ca8a04" roughness={0.9} flatShading />
        </mesh>
      </group>
    </group>
  );
}

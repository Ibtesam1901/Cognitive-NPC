import React, { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Terrain } from "./Terrain.jsx";
import { RaghuModel } from "./RaghuModel.jsx";
import { DeadBanyanTree } from "./DeadBanyanTree.jsx";
import { IrrigationPump } from "./IrrigationPump.jsx";
import { BarnAndLakshmi } from "./BarnAndLakshmi.jsx";
import { HutAndProps } from "./HutAndProps.jsx";
import { SkyAndAtmosphere } from "./SkyAndAtmosphere.jsx";
import { Hotspots } from "./Hotspots.jsx";
import { WebGLBoundary } from "./WebGLBoundary.jsx";
import { ThreeLoadingScreen } from "./ThreeLoadingScreen.jsx";
import { usePrefersReducedMotion } from "../utils/motion.js";

/**
 * 3D "Bhima's Hollow" Scene with Raghu the Farmer
 *
 * READ-ONLY VISUAL LAYER:
 * Receives existing game state (trust, mood, farmHealth, quests, inventory, flags, speaking)
 * and never mutates game state itself.
 */
export default function FarmScene({
  trust = 0,
  mood = "neutral",
  farmHealth = 20,
  quests = [],
  inventory = [],
  flags = {},
  isSpeaking = false,
  quality = "medium", // 'low' | 'medium' | 'high'
  onFallback,
  onPumpClick,
  onNorthFieldClick,
  onWellClick,
  onMapClick,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Pause rendering when tab is hidden to conserve laptop battery
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Compute pixel ratio cap (max 2)
  const dpr = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    quality === "high" ? 2 : quality === "medium" ? 1.5 : 1
  );

  const isPumpRunning = Boolean(flags.pump_repaired);
  const isCowFound = Boolean(flags.found_cow);

  return (
    <WebGLBoundary onFallback={onFallback}>
      <div className="three-scene-wrapper" aria-hidden="true">
        <Suspense fallback={<ThreeLoadingScreen />}>
          <Canvas
            shadows={quality !== "low"}
            dpr={dpr}
            frameloop={isTabVisible ? "always" : "never"}
            camera={{ position: [0, 2.5, 6.8], fov: 45 }}
            gl={{
              antialias: quality !== "low",
              powerPreference: "high-performance",
              preserveDrawingBuffer: false,
            }}
          >
            {/* Environment, Sky & Golden-Hour Lighting */}
            <SkyAndAtmosphere
              farmHealth={farmHealth}
              quality={quality}
              reducedMotion={reducedMotion}
            />

            {/* Farmhouse Porch & Inventory Clues */}
            <HutAndProps inventory={inventory} />

            {/* Terrain, Dynamic Canal & Crops */}
            <Terrain
              farmHealth={farmHealth}
              isPumpRunning={isPumpRunning}
              reducedMotion={reducedMotion}
            />

            {/* Ancient Dead Banyan Landmark */}
            <DeadBanyanTree />

            {/* Antique Irrigation Diesel Pump */}
            <IrrigationPump
              isRepaired={isPumpRunning}
              reducedMotion={reducedMotion}
            />

            {/* Barn & Lakshmi the Cow */}
            <BarnAndLakshmi
              isCowFound={isCowFound}
              reducedMotion={reducedMotion}
            />

            {/* Low-Poly Animated Raghu */}
            <RaghuModel
              trust={trust}
              mood={mood}
              isSpeaking={isSpeaking}
              reducedMotion={reducedMotion}
            />

            {/* 3D Hotspot Interactive Billboards */}
            <Hotspots
              flags={flags}
              quests={quests}
              inventory={inventory}
              onPumpClick={onPumpClick}
              onNorthFieldClick={onNorthFieldClick}
              onWellClick={onWellClick}
              onMapClick={onMapClick}
            />

            {/* Cinematic Camera Orbit with Strict Bounds */}
            <OrbitControls
              enablePan={false}
              minDistance={4.5}
              maxDistance={14.0}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2 - 0.08} // Prevent looking through ground plane
              dampingFactor={0.05}
              autoRotate={!reducedMotion && !isSpeaking}
              autoRotateSpeed={0.25}
            />
          </Canvas>
        </Suspense>
      </div>
    </WebGLBoundary>
  );
}

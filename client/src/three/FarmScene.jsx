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
 * Receives live game state:
 * - weather ("clear", "rain", "drought", "overcast")
 * - day (int)
 * - time (0-23 hour of day)
 * - plots (array of {id, locked, crop, growth, watered})
 * - trust (int)
 * - mood ("happy", "neutral", "annoyed", "worried", "proud")
 * - quests & inventory & flags
 */
export default function FarmScene({
  trust = 0,
  mood = "neutral",
  weather = "clear",
  day = 1,
  time = 8,
  plots = [],
  quests = [],
  inventory = {},
  flags = {},
  isSpeaking = false,
  latestRaghuMessage = "",
  isThinking = false,
  onSendMessage,
  voiceEnabled = true,
  onToggleVoice,
  quality = "medium", // 'low' | 'medium' | 'high'
  onFallback,
  onInspectHotspot,
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

  // Calculate overall farm health derived from live plots and trust
  const activeCropsCount = plots.filter((p) => p.crop).length;
  const matureCropsCount = plots.filter((p) => p.crop && p.growth >= 2).length;
  const farmHealth = Math.min(100, 20 + activeCropsCount * 15 + matureCropsCount * 15 + trust * 4);

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
            {/* Dynamic Sky, Sun, Rain & Atmosphere */}
            <SkyAndAtmosphere
              weather={weather}
              time={time}
              farmHealth={farmHealth}
              quality={quality}
              reducedMotion={reducedMotion}
            />

            {/* Farmhouse Porch & Inventory Clues */}
            <HutAndProps inventory={inventory} />

            {/* Dynamic Farmland Diorama: Per-plot crops, puddles, locked gates */}
            <Terrain
              plots={plots}
              weather={weather}
              isPumpRunning={isPumpRunning}
              reducedMotion={reducedMotion}
            />

            {/* Ancient Banyan: Sprouts lush green foliage with player trust */}
            <DeadBanyanTree trust={trust} />

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

            {/* Low-Poly Animated Raghu with Floating 3D Dialogue */}
            <RaghuModel
              trust={trust}
              mood={mood}
              isSpeaking={isSpeaking}
              reducedMotion={reducedMotion}
              latestRaghuMessage={latestRaghuMessage}
              isThinking={isThinking}
              onSendMessage={onSendMessage}
              voiceEnabled={voiceEnabled}
              onToggleVoice={onToggleVoice}
            />

            {/* 3D Hotspot Interactive Billboards */}
            <Hotspots
              flags={flags}
              quests={quests}
              inventory={inventory}
              onInspect={onInspectHotspot}
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
              maxPolarAngle={Math.PI / 2 - 0.08}
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

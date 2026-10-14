import React from "react";
import { Html } from "@react-three/drei";

/**
 * Interactive 3D Hotspot Billboards:
 * Connects directly to existing App.jsx handlers (never makes new API calls)
 */
export function Hotspots({
  flags = {},
  quests = [],
  _inventory = [],
  onPumpClick,
  onNorthFieldClick,
  onWellClick,
  onMapClick,
}) {
  const isPumpRepaired = Boolean(flags.pump_repaired);
  const isCowFound = Boolean(flags.found_cow);
  const cowQuestActive = quests.some((q) => q.id === "find_cow" && q.status === "active");
  const pumpQuestActive = quests.some((q) => q.id === "fix_pump" && q.status === "active");

  return (
    <group>
      {/* Hotspot 1: Irrigation Pump */}
      <group position={[1.8, 1.4, -2.4]}>
        <Html center distanceFactor={10} zIndexRange={[100, 0]}>
          <button
            className={`three-hotspot-btn ${isPumpRepaired ? "completed" : pumpQuestActive ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onPumpClick) onPumpClick();
            }}
            title={
              isPumpRepaired
                ? "Irrigation pump running at full pressure"
                : pumpQuestActive
                ? "Calibrate pump valves (Puzzle 1)"
                : "Antique diesel pump - inspect blueprint first"
            }
          >
            <span className="hotspot-icon">🔧</span>
            <span className="hotspot-text">
              {isPumpRepaired ? "Pump (Running)" : "Irrigation Pump"}
            </span>
          </button>
        </Html>
      </group>

      {/* Hotspot 2: Dead Banyan Tree / North Field */}
      <group position={[-5.2, 2.2, -5.5]}>
        <Html center distanceFactor={10} zIndexRange={[100, 0]}>
          <button
            className={`three-hotspot-btn ${isCowFound ? "completed" : cowQuestActive ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onNorthFieldClick) onNorthFieldClick();
            }}
            title={
              isCowFound
                ? "North scrub explored - Lakshmi brought home"
                : cowQuestActive
                ? "Search North Field near Dead Banyan"
                : "Dead Banyan Tree & cattle trail"
            }
          >
            <span className="hotspot-icon">🔍</span>
            <span className="hotspot-text">
              {isCowFound ? "North Field (Explored)" : "Dead Banyan"}
            </span>
          </button>
        </Html>
      </group>

      {/* Hotspot 3: Ancient Stone Well */}
      <group position={[-3.2, 1.8, 2.2]}>
        <Html center distanceFactor={10} zIndexRange={[100, 0]}>
          <button
            className="three-hotspot-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onWellClick) onWellClick();
            }}
            title="Ancient Dry Well - inspect trail deduction"
          >
            <span className="hotspot-icon">🧱</span>
            <span className="hotspot-text">Ancient Well</span>
          </button>
        </Html>
      </group>

      {/* Hotspot 4: Farmhouse Verandah & Schematics */}
      <group position={[1.3, 1.3, -0.9]}>
        <Html center distanceFactor={10} zIndexRange={[100, 0]}>
          <button
            className="three-hotspot-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onMapClick) onMapClick();
            }}
            title="Examine antique valley map & clues"
          >
            <span className="hotspot-icon">🗺️</span>
            <span className="hotspot-text">Valley Map Clue</span>
          </button>
        </Html>
      </group>
    </group>
  );
}

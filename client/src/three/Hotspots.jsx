import React from "react";
import { Html } from "@react-three/drei";

/**
 * Interactive 3D Hotspot Billboards:
 * Connects directly to App.jsx handlers to inspect story landmarks and trigger clues/toasts.
 */
export function Hotspots({
  flags = {},
  quests = [],
  _inventory = {},
  onInspect,
  onPumpClick,
  onNorthFieldClick,
  onWellClick,
  onMapClick,
}) {
  const firstHarvestActive = quests.some((q) => q.id === "first_harvest" && q.status === "active");
  const dawnWateringActive = quests.some((q) => q.id === "dawn_watering" && q.status === "active");
  const villagePrayerActive = quests.some((q) => q.id === "village_prayer" && q.status === "active");

  return (
    <group>
      {/* Hotspot 1: Irrigation Canal & Pump */}
      <group position={[2.4, 1.4, -2.4]}>
        <Html center distanceFactor={10} zIndexRange={[100, 0]}>
          <button
            className={`three-hotspot-btn ${dawnWateringActive ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onPumpClick) onPumpClick();
              else if (onInspect) onInspect("irrigation_canal");
            }}
            title="Irrigation canal & water pump"
          >
            <span className="hotspot-icon">💧</span>
            <span className="hotspot-text">Irrigation Canal</span>
          </button>
        </Html>
      </group>

      {/* Hotspot 2: Dead Banyan Tree / Sacred Roots */}
      <group position={[-6.2, 2.6, -7.0]}>
        <Html center distanceFactor={10} zIndexRange={[100, 0]}>
          <button
            className={`three-hotspot-btn ${villagePrayerActive ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onNorthFieldClick) onNorthFieldClick();
              else if (onInspect) onInspect("ancient_banyan");
            }}
            title="Ancient Banyan Tree - landmark of Bhima's Hollow"
          >
            <span className="hotspot-icon">🌳</span>
            <span className="hotspot-text">Ancient Banyan</span>
          </button>
        </Html>
      </group>

      {/* Hotspot 3: Ancient Stone Well (North Grove Glade) */}
      <group position={[3.8, 1.8, -4.5]}>
        <Html center distanceFactor={10} zIndexRange={[100, 0]}>
          <button
            className="three-hotspot-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onWellClick) onWellClick();
              else if (onInspect) onInspect("village_well");
            }}
            title="Ancient Stone Well - cool fresh groundwater"
          >
            <span className="hotspot-icon">🧱</span>
            <span className="hotspot-text">Stone Well</span>
          </button>
        </Html>
      </group>

      {/* Hotspot 4: Farmhouse Verandah & Crop Fields */}
      <group position={[-4.6, 1.4, -0.4]}>
        <Html center distanceFactor={10} zIndexRange={[100, 0]}>
          <button
            className={`three-hotspot-btn ${firstHarvestActive ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onMapClick) onMapClick();
              else if (onInspect) onInspect("cultivation_plots");
            }}
            title="Tilled Cultivation Beds"
          >
            <span className="hotspot-icon">🌾</span>
            <span className="hotspot-text">Wheat Plots</span>
          </button>
        </Html>
      </group>
    </group>
  );
}

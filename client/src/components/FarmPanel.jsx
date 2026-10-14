import React from "react";
import {
  Sun,
  CloudRain,
  Flame,
  Cloud,
  Coins,
  Sprout,
  Droplets,
  Lock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Clock,
} from "lucide-react";

const WEATHER_META = {
  clear: { label: "Clear Sun", icon: Sun, color: "#f59e0b", desc: "Warm dry air" },
  rain: { label: "Blessed Rain", icon: CloudRain, color: "#3b82f6", desc: "Soils watered naturally" },
  drought: { label: "Severe Drought", icon: Flame, color: "#ef4444", desc: "Intense heat on the fields" },
  overcast: { label: "Cloudy Skies", icon: Cloud, color: "#9ca3af", desc: "Gentle cool breeze" },
};

export function FarmPanel({
  farmState,
  onFarmAction,
  isActing,
}) {
  const weather = (farmState?.weather || "clear").toLowerCase();
  const weatherInfo = WEATHER_META[weather] || WEATHER_META.clear;
  const WeatherIcon = weatherInfo.icon;

  const plots = farmState?.plots || [];
  const inventory = farmState?.inventory || { seeds: 0, wheat: 0, tools: [] };
  const gold = farmState?.gold ?? 100;
  const market = farmState?.market || { wheat_price: 25, seed_cost: 10 };

  return (
    <div className="npc-farm-panel">
      {/* Farm HUD Header */}
      <div className="farm-hud-header">
        <div className="hud-metric-card day-metric">
          <Clock size={16} className="metric-icon" />
          <div className="metric-text">
            <span className="metric-title">TIME</span>
            <span className="metric-value">Day {farmState?.day ?? 1}</span>
          </div>
        </div>

        <div className="hud-metric-card weather-metric" style={{ borderColor: weatherInfo.color }}>
          <WeatherIcon size={18} style={{ color: weatherInfo.color }} />
          <div className="metric-text">
            <span className="metric-title">WEATHER</span>
            <span className="metric-value" style={{ color: weatherInfo.color }}>
              {weatherInfo.label}
            </span>
          </div>
        </div>

        <div className="hud-metric-card gold-metric">
          <Coins size={18} className="gold-icon" />
          <div className="metric-text">
            <span className="metric-title">TREASURY</span>
            <span className="metric-value gold-amount">{gold} Gold</span>
          </div>
        </div>

        <button
          className="advance-day-btn"
          onClick={() => onFarmAction("ADVANCE_DAY")}
          disabled={isActing}
          title="Sleep and advance to the next morning"
        >
          <span>Next Morning</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Interactive 4 Plots Grid */}
      <div className="plots-section">
        <div className="section-title-row">
          <h4>🌾 Cultivation Fields</h4>
          <span className="section-subtitle">
            {plots.filter((p) => p.unlocked).length} / 4 Plots Active
          </span>
        </div>

        <div className="plots-grid">
          {plots.map((plot) => {
            const isUnlocked = plot.unlocked;
            const hasCrop = Boolean(plot.crop);
            const isRipe = hasCrop && plot.stage >= 3;
            const isWatered = Boolean(plot.watered);

            return (
              <div
                key={plot.id}
                className={`farm-plot-card ${isUnlocked ? "plot-unlocked" : "plot-locked"} ${
                  isWatered ? "plot-watered" : "plot-dry"
                } ${isRipe ? "plot-ripe" : ""}`}
              >
                <div className="plot-card-header">
                  <span className="plot-number">Plot #{plot.id}</span>
                  {isUnlocked ? (
                    <span className={`moisture-badge ${isWatered ? "damp" : "parched"}`}>
                      <Droplets size={12} /> {isWatered ? "Watered" : "Dry Soil"}
                    </span>
                  ) : (
                    <span className="lock-badge">
                      <Lock size={12} /> Locked
                    </span>
                  )}
                </div>

                <div className="plot-visual-soil">
                  {!isUnlocked ? (
                    <div className="locked-plot-message">
                      <Lock size={24} className="lock-soil-icon" />
                      <p>Raghu's Ancestral Land</p>
                      <small>Requires Trust ≥ 3</small>
                    </div>
                  ) : !hasCrop ? (
                    <div className="empty-soil-visual">
                      <div className="soil-patch"></div>
                      <p className="soil-hint">Tilled earth ready for seed</p>
                    </div>
                  ) : (
                    <div className="crop-growth-visual">
                      <div className={`crop-stage-icon stage-${plot.stage}`}>
                        {plot.stage === 1 && "🌱"}
                        {plot.stage === 2 && "🌿"}
                        {plot.stage >= 3 && "🌾"}
                      </div>
                      <span className="crop-label">
                        {plot.stage === 1 && "Wheat Sprout (Stage 1/3)"}
                        {plot.stage === 2 && "Growing Wheat (Stage 2/3)"}
                        {plot.stage >= 3 && "Golden Wheat (Ripe & Ready!)"}
                      </span>
                    </div>
                  )}
                </div>

                {isUnlocked && (
                  <div className="plot-actions-row">
                    {!hasCrop ? (
                      <button
                        className="plot-btn plant-btn"
                        onClick={() => onFarmAction("PLANT", { plotId: plot.id })}
                        disabled={isActing || (inventory.seeds || 0) < 1}
                      >
                        <Sprout size={14} /> Plant Seed
                      </button>
                    ) : isRipe ? (
                      <button
                        className="plot-btn harvest-btn"
                        onClick={() => onFarmAction("HARVEST", { plotId: plot.id })}
                        disabled={isActing}
                      >
                        <Sparkles size={14} /> Harvest Wheat!
                      </button>
                    ) : (
                      <button
                        className={`plot-btn water-btn ${isWatered ? "water-done" : ""}`}
                        onClick={() => onFarmAction("WATER", { plotId: plot.id })}
                        disabled={isActing || isWatered}
                      >
                        <Droplets size={14} /> {isWatered ? "Watered" : "Water Soil"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory & Village Market Stall */}
      <div className="farm-market-section">
        <div className="inventory-block">
          <h5>🎒 Helper's Bag</h5>
          <div className="inventory-items-row">
            <div className="inv-item">
              <span className="inv-icon">🌱</span>
              <div className="inv-detail">
                <span className="inv-count">{inventory.seeds || 0}</span>
                <span className="inv-name">Wheat Seeds</span>
              </div>
            </div>
            <div className="inv-item">
              <span className="inv-icon">🌾</span>
              <div className="inv-detail">
                <span className="inv-count">{inventory.wheat || 0}</span>
                <span className="inv-name">Harvested Bundles</span>
              </div>
            </div>
          </div>
        </div>

        <div className="market-block">
          <h5>
            <ShoppingBag size={14} /> Village Market
          </h5>
          <div className="market-trade-row">
            <button
              className="market-btn buy-seed-btn"
              onClick={() => onFarmAction("BUY_SEEDS", { qty: 1 })}
              disabled={isActing || gold < (market.seed_cost || 10)}
            >
              Buy 1 Seed ({market.seed_cost || 10}g)
            </button>
            <button
              className="market-btn sell-wheat-btn"
              onClick={() => onFarmAction("SELL_WHEAT", { qty: 1 })}
              disabled={isActing || (inventory.wheat || 0) < 1}
            >
              Sell 1 Wheat (+{market.wheat_price || 25}g)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

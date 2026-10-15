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
  FlowerIcon,
  Church,
} from "lucide-react";

const WEATHER_META = {
  clear:   { label: "Clear Sun",     icon: Sun,       color: "#f59e0b", desc: "Warm dry air" },
  rain:    { label: "Blessed Rain",  icon: CloudRain, color: "#3b82f6", desc: "Soils watered naturally" },
  drought: { label: "Severe Drought",icon: Flame,     color: "#ef4444", desc: "Intense heat on the fields" },
  overcast:{ label: "Cloudy Skies",  icon: Cloud,     color: "#9ca3af", desc: "Gentle cool breeze" },
};

const GROWTH_DAYS = 2; // must match engine

export function FarmPanel({ farmState, onFarmAction, isActing }) {
  const weather    = (farmState?.weather || "clear").toLowerCase();
  const weatherInfo = WEATHER_META[weather] || WEATHER_META.clear;
  const WeatherIcon = weatherInfo.icon;

  const plots     = farmState?.plots     || [];
  const inventory = farmState?.inventory || { seeds: 0, wheat: 0, water_can: 0, fertilizer: 0, flowers: 0 };
  const gold      = farmState?.gold      ?? 100;
  const wheatMult = farmState?.prices?.wheat ?? 1;
  const sellPrice = Math.round(10 * wheatMult);
  const day       = farmState?.day  ?? 1;
  const time      = farmState?.time ?? 8;

  // Helper: dispatch to /api/npc/farm-action using new engine event names
  const send = (type, extra = {}) => onFarmAction(type, extra);

  return (
    <div className="npc-farm-panel">
      {/* Farm HUD Header */}
      <div className="farm-hud-header">
        <div className="hud-metric-card day-metric">
          <Clock size={16} className="metric-icon" />
          <div className="metric-text">
            <span className="metric-title">DAY / TIME</span>
            <span className="metric-value">Day {day} · {time}:00</span>
          </div>
        </div>

        <div className="hud-metric-card weather-metric" style={{ borderColor: weatherInfo.color }}>
          <WeatherIcon size={18} style={{ color: weatherInfo.color }} />
          <div className="metric-text">
            <span className="metric-title">WEATHER</span>
            <span className="metric-value" style={{ color: weatherInfo.color }}>{weatherInfo.label}</span>
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
          onClick={() => send("NEXT_DAY")}
          disabled={isActing}
          title="Sleep and advance to the next morning"
        >
          <span>Next Morning</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Interactive Plots Grid */}
      <div className="plots-section">
        <div className="section-title-row">
          <h4>🌾 Cultivation Fields</h4>
          <span className="section-subtitle">
            {plots.filter((p) => !p.locked).length} / {plots.length} Plots Active
          </span>
        </div>

        <div className="plots-grid">
          {plots.map((plot) => {
            const isLocked  = Boolean(plot.locked);
            const hasCrop   = Boolean(plot.crop);
            const isRipe    = hasCrop && plot.growth >= GROWTH_DAYS;
            const isWatered = Boolean(plot.watered);
            const growthPct = hasCrop ? Math.round((plot.growth / GROWTH_DAYS) * 100) : 0;

            return (
              <div
                key={plot.id}
                className={`farm-plot-card ${isLocked ? "plot-locked" : "plot-unlocked"} ${
                  isWatered ? "plot-watered" : "plot-dry"
                } ${isRipe ? "plot-ripe" : ""}`}
              >
                <div className="plot-card-header">
                  <span className="plot-number">Plot #{plot.id}</span>
                  {!isLocked ? (
                    <span className={`moisture-badge ${isWatered ? "damp" : "parched"}`}>
                      <Droplets size={12} /> {isWatered ? "Watered" : "Dry Soil"}
                    </span>
                  ) : (
                    <span className="lock-badge"><Lock size={12} /> Locked</span>
                  )}
                </div>

                <div className="plot-visual-soil">
                  {isLocked ? (
                    <div className="locked-plot-message">
                      <Lock size={24} className="lock-soil-icon" />
                      <p>Raghu's Ancestral Land</p>
                      <small>Earn trust ≥ 4 &amp; complete a quest</small>
                    </div>
                  ) : !hasCrop ? (
                    <div className="empty-soil-visual">
                      <div className="soil-patch"></div>
                      <p className="soil-hint">Tilled earth ready for seed</p>
                    </div>
                  ) : (
                    <div className="crop-growth-visual">
                      <div className={`crop-stage-icon stage-${isRipe ? 3 : plot.growth > 0 ? 2 : 1}`}>
                        {isRipe         ? "🌾"
                         : plot.growth > 0 ? "🌿"
                         : "🌱"}
                      </div>
                      <span className="crop-label">
                        {isRipe
                          ? "Golden Wheat (Ripe & Ready!)"
                          : plot.growth > 0
                          ? `Growing Wheat (Day ${plot.growth}/${GROWTH_DAYS})`
                          : "Wheat Sprout (just planted)"}
                      </span>
                      {!isRipe && (
                        <div className="growth-bar-track">
                          <div className="growth-bar-fill" style={{ width: `${growthPct}%` }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isLocked && (
                  <div className="plot-actions-row">
                    {!hasCrop ? (
                      <button
                        className="plot-btn plant-btn"
                        onClick={() => send("PLANT", { plotId: plot.id, crop: "wheat" })}
                        disabled={isActing || (inventory.seeds || 0) < 1}
                      >
                        <Sprout size={14} /> Plant Seed
                      </button>
                    ) : isRipe ? (
                      <button
                        className="plot-btn harvest-btn"
                        onClick={() => send("HARVEST", { plotId: plot.id })}
                        disabled={isActing}
                      >
                        <Sparkles size={14} /> Harvest Wheat!
                      </button>
                    ) : (
                      <button
                        className={`plot-btn water-btn ${isWatered ? "water-done" : ""}`}
                        onClick={() => send("WATER", { plotId: plot.id })}
                        disabled={isActing || isWatered || (inventory.water_can || 0) < 1}
                      >
                        <Droplets size={14} /> {isWatered ? "Watered ✓" : "Water Soil"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory & Village Market */}
      <div className="farm-market-section">
        <div className="inventory-block">
          <h5>🎒 Helper's Bag</h5>
          <div className="inventory-items-row">
            {[
              { icon: "🌱", key: "seeds",      label: "Seeds"       },
              { icon: "🌾", key: "wheat",       label: "Wheat"       },
              { icon: "💧", key: "water_can",   label: "Water Cans"  },
              { icon: "🌿", key: "fertilizer",  label: "Fertilizer"  },
              { icon: "🌸", key: "flowers",     label: "Flowers"     },
            ].map(({ icon, key, label }) => (
              <div className="inv-item" key={key}>
                <span className="inv-icon">{icon}</span>
                <div className="inv-detail">
                  <span className="inv-count">{inventory[key] || 0}</span>
                  <span className="inv-name">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="market-block">
          <h5><ShoppingBag size={14} /> Village Market</h5>
          <div className="market-trade-row">
            <button
              className="market-btn sell-wheat-btn"
              onClick={() => send("SELL", { item: "wheat", qty: 1 })}
              disabled={isActing || (inventory.wheat || 0) < 1}
            >
              Sell 1 Wheat (+{sellPrice}g)
            </button>
            <button
              className="market-btn pick-flowers-btn"
              onClick={() => send("PICK_FLOWERS")}
              disabled={isActing}
              title="Pick flowers to offer at the shrine"
            >
              🌸 Pick Flowers
            </button>
            <button
              className="market-btn shrine-btn"
              onClick={() => send("VISIT_SHRINE")}
              disabled={isActing || (inventory.flowers || 0) < 1}
              title="Offer flowers at the village shrine"
            >
              🙏 Visit Shrine
            </button>
          </div>
          <div className="price-hint">
            Current wheat price: <strong>×{wheatMult.toFixed(2)}</strong>
            {wheatMult > 1 && <span className="price-up"> ▲ Raghu is paying above market</span>}
            {wheatMult < 1 && <span className="price-down"> ▼ Raghu has docked the price</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

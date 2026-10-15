import React from "react";
import { Store, TrendingUp, TrendingDown, Coins, X, ShoppingBag, Sparkles } from "lucide-react";

const SEED_CATALOG = [
  { id: "seeds", name: "Wheat Seeds", crop: "wheat", price: 6, desc: "Standard hardy wheat. Yields +2 Wheat." },
  { id: "rice_seeds", name: "Paddy Rice Seeds", crop: "rice", price: 10, desc: "Thrives in flooded paddy beds. Yields +2 Rice." },
  { id: "marigold_seeds", name: "Marigold Seeds", crop: "marigold", price: 8, desc: "Vibrant yellow/orange flowers for village shrines & market." },
  { id: "cane_cuttings", name: "Sugarcane Cuttings", crop: "sugarcane", price: 15, desc: "Tall sweet cane stalks. High yield (+3 Cane)." },
  { id: "fertilizer", name: "Rich Compost Bag", price: 20, desc: "Enriches soil for faster growth." },
];

const CROPS_LIST = [
  { id: "wheat", name: "Harvested Wheat", basePrice: 10 },
  { id: "rice", name: "Polished Rice", basePrice: 16 },
  { id: "marigold", name: "Marigold Blossoms", basePrice: 12 },
  { id: "sugarcane", name: "Sugarcane Stalks", basePrice: 24 },
];

export function MarketModal({
  isOpen,
  onClose,
  gold = 100,
  inventory = {},
  prices = {},
  onBuy,
  onSell,
}) {
  if (!isOpen) return null;

  return (
    <div className="market-modal-backdrop" onClick={onClose}>
      <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="market-header">
          <div className="market-title-group">
            <Store size={20} className="text-amber" />
            <div>
              <h3>Salim's Village Trading Post</h3>
              <p className="market-subtitle">Bhima's Hollow Eastern Caravan</p>
            </div>
          </div>

          <div className="market-header-right">
            <div className="market-gold-pill">
              <Coins size={15} className="text-gold" />
              <span>{gold} Gold</span>
            </div>
            <button className="market-close-btn" onClick={onClose} title="Close Market">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Tabs: BUY & SELL in side-by-side or stacked layout */}
        <div className="market-grid-container">
          {/* Section 1: Buy Seeds & Supplies */}
          <div className="market-section">
            <div className="section-title-row">
              <ShoppingBag size={15} />
              <h4>Buy Seeds & Farm Tools</h4>
            </div>

            <div className="market-items-list">
              {SEED_CATALOG.map((item) => {
                const canAfford = gold >= item.price;
                return (
                  <div key={item.id} className="market-item-row">
                    <div className="item-info-col">
                      <div className="item-name-row">
                        <span className="item-name">{item.name}</span>
                        <span className="item-price-tag">{item.price} Gold</span>
                      </div>
                      <p className="item-desc">{item.desc}</p>
                      <span className="item-owned">Owned: {inventory[item.id] || 0}</span>
                    </div>

                    <button
                      className="market-buy-btn"
                      disabled={!canAfford}
                      onClick={() => onBuy(item.id, 1)}
                      title={canAfford ? `Buy 1 ${item.name}` : "Not enough gold"}
                    >
                      Buy (1)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Sell Farm Harvests */}
          <div className="market-section">
            <div className="section-title-row">
              <Sparkles size={15} className="text-amber" />
              <h4>Sell Harvested Produce</h4>
            </div>

            <div className="market-items-list">
              {CROPS_LIST.map((crop) => {
                const owned = inventory[crop.id] || 0;
                const multiplier = prices[crop.id] ?? 1.0;
                const unitPrice = Math.round(crop.basePrice * multiplier);
                const isPriceHigh = multiplier >= 1.05;
                const isPriceLow = multiplier <= 0.95;

                return (
                  <div key={crop.id} className="market-item-row">
                    <div className="item-info-col">
                      <div className="item-name-row">
                        <span className="item-name">{crop.name}</span>
                        <div className="price-trend-tag">
                          {isPriceHigh ? (
                            <span className="trend-up" title="High market demand today">
                              <TrendingUp size={12} /> x{multiplier}
                            </span>
                          ) : isPriceLow ? (
                            <span className="trend-down" title="Lower market demand today">
                              <TrendingDown size={12} /> x{multiplier}
                            </span>
                          ) : (
                            <span className="trend-neutral">x{multiplier}</span>
                          )}
                          <span className="unit-gold">{unitPrice}g each</span>
                        </div>
                      </div>
                      <span className="item-owned">Inventory: {owned} in stock</span>
                    </div>

                    <div className="market-sell-actions">
                      <button
                        className="market-sell-btn"
                        disabled={owned < 1}
                        onClick={() => onSell(crop.id, 1)}
                        title={owned >= 1 ? `Sell 1 ${crop.name} for ${unitPrice}g` : "None in inventory"}
                      >
                        Sell 1
                      </button>
                      {owned > 1 && (
                        <button
                          className="market-sell-all-btn"
                          onClick={() => onSell(crop.id, owned)}
                          title={`Sell all ${owned} for ${unitPrice * owned}g`}
                        >
                          All ({owned})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

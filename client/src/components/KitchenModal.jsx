import React from "react";
import { X, Flame, ChefHat, Sparkles, Check, AlertCircle } from "lucide-react";

export function KitchenModal({
  isOpen,
  onClose,
  inventory = {},
  gold = 0,
  onCookRecipe,
}) {
  if (!isOpen) return null;

  const recipes = [
    {
      id: "roti",
      name: "Crispy Warm Roti",
      desc: "Wholesome hearth-baked flatbread from fresh golden wheat.",
      ingredients: [{ item: "wheat", name: "Wheat", required: 1 }],
      yield: "2x Roti",
      sellValue: "22 Gold each",
      icon: "🫓",
    },
    {
      id: "gur",
      name: "Raw Caramel Gur (Jaggery)",
      desc: "Boiled golden jaggery rich with pure molasses aroma.",
      ingredients: [{ item: "sugarcane", name: "Sugarcane", required: 2 }],
      yield: "1x Gur",
      sellValue: "45 Gold",
      icon: "🍯",
    },
    {
      id: "kheer",
      name: "Festive Rice Kheer",
      desc: "Rich slow-cooked sweet pudding of rice, whole cow milk, and golden gur.",
      ingredients: [
        { item: "rice", name: "Rice", required: 1 },
        { item: "milk", name: "Cow Milk", required: 1 },
        { item: "gur", name: "Gur", required: 1 },
      ],
      yield: "1x Kheer",
      sellValue: "75 Gold",
      icon: "🥣",
    },
  ];

  return (
    <div className="market-modal-overlay" onClick={onClose}>
      <div
        className="market-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "580px" }}
      >
        {/* Header */}
        <div className="market-modal-header" style={{ borderBottomColor: "#f97316" }}>
          <div className="market-header-title">
            <div className="market-badge" style={{ background: "rgba(249, 115, 22, 0.2)", color: "#f97316" }}>
              <Flame size={18} />
              <span>Village Chulha</span>
            </div>
            <h2>Village Hearth & Kitchen</h2>
            <p className="market-subtitle">
              Turn your raw farm harvests into warm meals, sweet jaggery, and festive delicacies.
            </p>
          </div>
          <button className="market-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Inventory Summary Bar */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            padding: "10px 16px",
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "10px",
            margin: "14px 18px 4px 18px",
            fontSize: "0.85rem",
          }}
        >
          <span>🌾 Wheat: <b>{inventory.wheat || 0}</b></span>
          <span>🍚 Rice: <b>{inventory.rice || 0}</b></span>
          <span>🎋 Cane: <b>{inventory.sugarcane || 0}</b></span>
          <span>🥛 Milk: <b>{inventory.milk || 0}</b></span>
          <span>🫓 Roti: <b>{inventory.roti || 0}</b></span>
          <span>🍯 Gur: <b>{inventory.gur || 0}</b></span>
          <span>🥣 Kheer: <b>{inventory.kheer || 0}</b></span>
        </div>

        {/* Recipes List */}
        <div className="market-trade-list" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {recipes.map((rcp) => {
            const canCook = rcp.ingredients.every(
              (ing) => (inventory[ing.item] || 0) >= ing.required
            );

            return (
              <div
                key={rcp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: canCook ? "1px solid rgba(249, 115, 22, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "2rem" }}>{rcp.icon}</span>
                  <div>
                    <h4 style={{ margin: "0 0 2px 0", color: "#f8fafc" }}>{rcp.name}</h4>
                    <p style={{ margin: "0 0 4px 0", fontSize: "0.78rem", color: "#94a3b8" }}>{rcp.desc}</p>
                    <div style={{ display: "flex", gap: "8px", fontSize: "0.75rem", color: "#cbd5e1" }}>
                      <span>Yield: <b style={{ color: "#f59e0b" }}>{rcp.yield}</b></span>
                      <span>•</span>
                      <span>Market Value: <b style={{ color: "#10b981" }}>{rcp.sellValue}</b></span>
                    </div>
                    {/* Ingredients needed */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      {rcp.ingredients.map((ing) => {
                        const hasEnough = (inventory[ing.item] || 0) >= ing.required;
                        return (
                          <span
                            key={ing.item}
                            style={{
                              fontSize: "0.72rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: hasEnough ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              color: hasEnough ? "#34d399" : "#f87171",
                            }}
                          >
                            {ing.name}: {inventory[ing.item] || 0}/{ing.required}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  disabled={!canCook}
                  onClick={() => onCookRecipe && onCookRecipe(rcp.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    border: "none",
                    cursor: canCook ? "pointer" : "not-allowed",
                    background: canCook
                      ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                      : "rgba(255, 255, 255, 0.1)",
                    color: canCook ? "#fff" : "#64748b",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  Cook
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

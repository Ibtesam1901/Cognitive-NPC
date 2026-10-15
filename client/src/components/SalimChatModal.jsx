import React, { useState } from "react";
import { MessageSquare, Send, X, Store, Sparkles, Coins } from "lucide-react";

export function SalimChatModal({
  isOpen,
  onClose,
  onOpenTrade,
  apiBase = "http://localhost:5000",
}) {
  const [messages, setMessages] = useState([
    {
      sender: "salim",
      text: "Salam and warm greetings, my good friend! I am Salim, purveyor of rare spices, hearty seeds, and finest village gossip. What brings you to my caravan?",
      mood: "jovial",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    setMessages((prev) => [...prev, { sender: "player", text }]);
    setIsSending(true);

    try {
      const res = await fetch(`${apiBase}/api/merchant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: "salim", text: data.reply || "Ah, magnificent!", mood: data.mood || "jovial" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "salim",
          text: "Ah, gold and seeds speak louder than words in the eastern dunes! Check my caravan cart for today's goods.",
          mood: "bargaining",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="market-modal-backdrop" onClick={onClose}>
      <div
        className="market-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px", display: "flex", flexDirection: "column", height: "520px" }}
      >
        {/* Header */}
        <div className="market-header" style={{ borderBottomColor: "#3b82f6" }}>
          <div className="market-title-group">
            <div style={{ fontSize: "1.8rem" }}>👳🏾‍♂️</div>
            <div>
              <h3 style={{ margin: 0, color: "#93c5fd" }}>Salim the Wandering Trader</h3>
              <p className="market-subtitle">Eastern Caravan Merchant • World Traveler</p>
            </div>
          </div>
          <div className="market-header-right">
            <button
              onClick={() => {
                onClose();
                if (onOpenTrade) onOpenTrade();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                border: "none",
                color: "#1e1b18",
                fontWeight: "600",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              <Store size={14} />
              <span>Trade Stall</span>
            </button>
            <button className="market-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Log */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.sender === "player" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: m.sender === "player" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                background:
                  m.sender === "player"
                    ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                    : "rgba(30, 41, 59, 0.85)",
                border: m.sender === "player" ? "none" : "1px solid rgba(59, 130, 246, 0.25)",
                color: "#f8fafc",
                fontSize: "0.9rem",
                lineHeight: "1.4",
              }}
            >
              {m.sender === "salim" && (
                <div style={{ fontSize: "0.72rem", color: "#60a5fa", marginBottom: "4px", fontWeight: "600" }}>
                  Salim [{m.mood || "jovial"}]
                </div>
              )}
              {m.text}
            </div>
          ))}
          {isSending && (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "8px 14px",
                borderRadius: "14px",
                background: "rgba(30, 41, 59, 0.6)",
                fontSize: "0.8rem",
                color: "#94a3b8",
                fontStyle: "italic",
              }}
            >
              Salim strokes his beard thoughtfully...
            </div>
          )}
        </div>

        {/* Chat input */}
        <form
          onSubmit={handleSend}
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            gap: "8px",
          }}
        >
          <input
            type="text"
            placeholder="Ask Salim about trades, cooking, or distant lands..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              outline: "none",
              fontSize: "0.9rem",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "#3b82f6",
              border: "none",
              color: "#fff",
              cursor: input.trim() && !isSending ? "pointer" : "not-allowed",
              opacity: input.trim() && !isSending ? 1 : 0.6,
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

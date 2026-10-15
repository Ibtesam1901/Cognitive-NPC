import React, { useRef, useState, useEffect } from "react";

/**
 * TouchJoystick:
 * Virtual analog joystick on left screen for WASD movement,
 * and large interactive Action/Interact button on right screen for mobile touch users.
 * Emits onMove(x, y) where x, y are normalized [-1, 1], and onAction() on tap.
 */
export function TouchJoystick({ onMove, onAction, actionLabel = "E: Interact" }) {
  const containerRef = useRef(null);
  const touchIdRef = useRef(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const baseCenterRef = useRef({ x: 0, y: 0 });

  const RADIUS = 44; // max stick travel radius in px

  const handleTouchStart = (e) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsActive(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      baseCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    updateStick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateStick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsActive(false);
        setStickPos({ x: 0, y: 0 });
        if (onMove) onMove(0, 0);
        break;
      }
    }
  };

  const updateStick = (clientX, clientY) => {
    const dx = clientX - baseCenterRef.current.x;
    const dy = clientY - baseCenterRef.current.y;
    const dist = Math.hypot(dx, dy);

    let normX = dx;
    let normY = dy;
    if (dist > RADIUS) {
      normX = (dx / dist) * RADIUS;
      normY = (dy / dist) * RADIUS;
    }

    setStickPos({ x: normX, y: normY });

    if (onMove) {
      // Send normalized vector: x in [-1, 1], y in [-1, 1] (y positive = forward/up)
      onMove(normX / RADIUS, -normY / RADIUS);
    }
  };

  return (
    <div className="touch-controls-layer">
      {/* Left Virtual Joystick */}
      <div
        ref={containerRef}
        className={`touch-joystick-base ${isActive ? "active" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="touch-joystick-thumb"
          style={{
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
          }}
        />
        <span className="touch-joystick-guide">MOVE</span>
      </div>

      {/* Right Quick Action Button */}
      {onAction && (
        <button
          type="button"
          className="touch-action-btn"
          onTouchStart={(e) => {
            e.preventDefault();
            onAction();
          }}
          onClick={(e) => {
            e.preventDefault();
            onAction();
          }}
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

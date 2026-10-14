import React from "react";

export function ThreeLoadingScreen({ message = "Waking up Bhima's Hollow..." }) {
  return (
    <div className="three-loading-overlay" aria-live="polite">
      <div className="three-loading-card">
        <div className="three-spinner">
          <div className="spinner-ring"></div>
          <span className="spinner-icon">🌾</span>
        </div>
        <h4 className="three-loading-title">{message}</h4>
        <p className="three-loading-sub">Assembling 3D procedural diorama & Raghu's farmstead</p>
      </div>
    </div>
  );
}

import React from "react";

export class WebGLBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("3D Scene WebGL Error:", error, errorInfo);
    if (this.props.onFallback) {
      this.props.onFallback(error);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.95)",
            color: "#f87171",
            padding: "24px",
            textAlign: "center",
            zIndex: 999,
          }}
        >
          <div style={{ fontSize: "2.4rem", marginBottom: "8px" }}>⚠️</div>
          <h3 style={{ margin: "0 0 8px 0", color: "#f8fafc" }}>3D Living Diorama Notice</h3>
          <p style={{ maxWidth: "480px", color: "#cbd5e1", fontSize: "0.9rem", margin: "0 0 16px 0" }}>
            {this.state.error?.message || "WebGL initialization error encountered."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload 3D World
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

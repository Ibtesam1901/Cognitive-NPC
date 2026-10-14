/**
 * WebGL and device capability detection for 3D Mode
 */

export function isWebGLAvailable() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("experimental-webgl");
    return Boolean(gl && gl instanceof WebGLRenderingContext);
  } catch {
    return false;
  }
}

export function isLowPowerDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return true;

  // Check device memory in GB (Chrome/Edge only)
  if ("deviceMemory" in navigator && navigator.deviceMemory < 2) {
    return true;
  }

  // Check for very small screen width mobile devices under battery constraint
  const isSmallMobile = window.innerWidth < 480;
  if (isSmallMobile && cores < 4) return true;

  return false;
}

export function getRecommendedQuality() {
  if (isLowPowerDevice()) return "low";
  if (typeof window !== "undefined" && window.innerWidth < 768) return "medium";
  return "medium";
}

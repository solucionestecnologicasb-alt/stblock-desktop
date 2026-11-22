export type ViewportCapabilityProfile = {
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  width: number;
  height: number;
};

/**
 * Returns a conservative drawing-buffer ratio for CAD scenes. Physical pixels
 * grow quadratically with DPR, so this policy protects integrated GPUs while
 * retaining extra sharpness on capable desktops.
 */
export function preferredViewportPixelRatio(profile: ViewportCapabilityProfile) {
  const cores = Math.max(1, profile.hardwareConcurrency || 1);
  const memory = profile.deviceMemory ?? 4;
  const pixels = Math.max(1, profile.width) * Math.max(1, profile.height);
  const lowTier = cores <= 2 || memory <= 2;
  const constrained = cores <= 4 || memory <= 4 || pixels >= 2_000_000;
  const ceiling = lowTier ? 1 : constrained ? 1.25 : 1.5;
  return Math.max(0.5, Math.min(profile.devicePixelRatio || 1, ceiling));
}

export function interactionViewportPixelRatio(basePixelRatio: number) {
  return Math.min(Math.max(0.5, basePixelRatio), 1);
}

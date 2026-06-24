// src/scoring/normalization.ts

export type IntensityScale = {
  min: number;
  max: number;
};

export function normalizeIntensity(
  rawIntensity: number,
  intensityScale: IntensityScale
): number {
  const { min, max } = intensityScale;

  if (!Number.isFinite(rawIntensity)) {
    return 0;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Invalid intensityScale: min and max must be finite numbers.');
  }

  if (max <= min) {
    throw new Error('Invalid intensityScale: max must be greater than min.');
  }

  const normalized = (rawIntensity - min) / (max - min);

  return Math.max(0, Math.min(1, normalized));
}
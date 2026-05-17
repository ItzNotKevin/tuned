/** Score a round. Both values are in semitones. Returns 0–10. */
export function scoreRound(
  targetCorrection: number,
  playerCorrection: number
): number {
  const errorCents = Math.abs(targetCorrection - playerCorrection) * 100;

  // Perfect: within 10 cents
  if (errorCents <= 10) return 10;

  // 0 beyond 200 cents (2 semitones)
  if (errorCents >= 200) return 0;

  // Linear interpolation between 10 (at 10 cents) and 0 (at 200 cents)
  return Math.round(10 * (1 - (errorCents - 10) / 190));
}

/**
 * Pick a random pitch shift in the range [-maxShift, -minAbs] ∪ [minAbs, maxShift].
 * Avoids values too close to 0 so the game isn't trivially easy.
 */
export function randomShift(minAbs = 1.5, maxShift = 6): number {
  const magnitude = minAbs + Math.random() * (maxShift - minAbs);
  return Math.random() < 0.5 ? magnitude : -magnitude;
}

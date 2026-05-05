/**
 * Centralized timing constants for card flight + play animations.
 *
 * The play sequence is two legs:
 *   leg1: hand → table (capture target or empty slot)
 *   leg2: table → capture pile (only on capture moves)
 *
 * Layout:
 *   |── LEG1 (460ms) ──|gap|── LEG2 (420ms) ──|── BUFFER (150ms) ──|
 *   <─────────────── TOTAL (1050ms) ───────────────────────────────>
 *
 * Owners: useFlightChoreographer (leg specs), useGameNetwork (delayed
 * displayedTableCards update + roundEnd overlay timing), PlayAnimationsLayer
 * (per-flight watchdog).
 */
export const FLIGHT = {
  /** Hand→table duration (leg 1 of any play). */
  LEG1_MS: 460,
  /** Table→capture pile duration (leg 2 of capture plays only). */
  LEG2_MS: 420,
  /** Inter-leg gap to let table cards settle before lifting them. */
  GAP_MS: 20,
  /** Settle buffer after final flight ends — covers transitionend jitter. */
  BUFFER_MS: 150,
} as const;

/** Total wall time of a worst-case (capture) play animation. */
export const TOTAL_PLAY_ANIM_MS =
  FLIGHT.LEG1_MS + FLIGHT.GAP_MS + FLIGHT.LEG2_MS + FLIGHT.BUFFER_MS;

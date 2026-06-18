import crypto from "node:crypto";
import type { LiveBet } from "./types.js";

const AVATAR_COUNT = 72;

function maskedName(): string {
  const first = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  const last = Math.floor(Math.random() * 9) + 1;
  return `${first}***${last}`;
}

const BET_TIERS = [
  2, 4, 5, 10, 20, 25, 40, 50, 75, 100, 150, 200, 250, 300, 500, 750, 1000,
  1500, 1642.01, 1670.73,
];

function randomBet(): number {
  return BET_TIERS[Math.floor(Math.random() * BET_TIERS.length)];
}

/**
 * Generate a fresh batch of bots for a round. Each bot is assigned a target
 * cashout multiplier; the engine resolves it once the live multiplier passes it
 * (and the round has not yet crashed).
 */
export function generateBots(count: number): Array<LiveBet & { target: number }> {
  const bots: Array<LiveBet & { target: number }> = [];
  for (let i = 0; i < count; i++) {
    // Skewed toward low cashouts (most players bail early).
    const r = Math.random();
    let target: number;
    if (r < 0.55) target = 1.1 + Math.random() * 0.9; // 1.1 - 2.0
    else if (r < 0.85) target = 2 + Math.random() * 3; // 2 - 5
    else if (r < 0.97) target = 5 + Math.random() * 10; // 5 - 15
    else target = 15 + Math.random() * 85; // 15 - 100

    bots.push({
      id: crypto.randomUUID(),
      name: maskedName(),
      avatar: Math.floor(Math.random() * AVATAR_COUNT),
      bet: randomBet(),
      cashedOutAt: null,
      win: null,
      cashedOut: false,
      target: Math.round(target * 100) / 100,
    });
  }
  // Sort by bet descending to mimic the real "All Bets" ordering.
  bots.sort((a, b) => b.bet - a.bet);
  return bots;
}

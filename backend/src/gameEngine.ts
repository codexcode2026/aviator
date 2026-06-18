import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { crashPointFromSeed, generateSeed } from "./provablyFair.js";
import { generateBots } from "./fakeBets.js";
import type {
  GamePhase,
  LiveBet,
  PublicRoundState,
  RoundHistoryItem,
} from "./types.js";

const BETTING_MS = 5000; // pre-round betting window
const TICK_MS = 50; // multiplier update cadence
const CRASH_PAUSE_MS = 3000; // "Flew away" pause before next round
const GROWTH = 0.16; // multiplier growth rate per second (exp curve)
const HISTORY_LIMIT = 40;

type BotBet = LiveBet & { target: number };

export interface PlayerBet {
  socketId: string;
  panel: 0 | 1;
  amount: number;
  cashedOut: boolean;
  cashedOutAt: number | null;
  win: number | null;
}

export class GameEngine extends EventEmitter {
  phase: GamePhase = "betting";
  roundId = "";
  multiplier = 1.0;
  crashPoint = 1.0;
  countdown = BETTING_MS;

  private seed = "";
  hashedSeed = "";
  history: RoundHistoryItem[] = [];
  private bots: BotBet[] = [];
  private playerBets: PlayerBet[] = [];
  private roundStart = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Seed some history so the bar isn't empty on first load.
    for (let i = 0; i < HISTORY_LIMIT; i++) {
      const { seed } = generateSeed();
      this.history.unshift({ id: crypto.randomUUID(), multiplier: crashPointFromSeed(seed) });
    }
  }

  start() {
    this.beginBetting();
  }

  private beginBetting() {
    this.phase = "betting";
    this.roundId = crypto.randomUUID();
    this.multiplier = 1.0;
    this.countdown = BETTING_MS;

    const s = generateSeed();
    this.seed = s.seed;
    this.hashedSeed = s.hashedSeed;
    this.crashPoint = crashPointFromSeed(this.seed);

    this.playerBets = [];
    this.bots = generateBots(60 + Math.floor(Math.random() * 120));

    this.emit("round:betting", this.publicState());

    const startedAt = Date.now();
    this.clearTimer();
    this.timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      this.countdown = Math.max(0, BETTING_MS - elapsed);
      this.emit("tick:countdown", { countdown: this.countdown });
      if (this.countdown <= 0) {
        this.clearTimer();
        this.beginFlying();
      }
    }, 100);
  }

  private beginFlying() {
    this.phase = "flying";
    this.multiplier = 1.0;
    this.roundStart = Date.now();
    this.emit("round:flying", this.publicState());

    this.clearTimer();
    this.timer = setInterval(() => {
      const t = (Date.now() - this.roundStart) / 1000;
      // Exponential growth curve, identical shape to classic crash games.
      this.multiplier = Math.floor(Math.exp(GROWTH * t) * 100) / 100;

      if (this.multiplier >= this.crashPoint) {
        this.multiplier = this.crashPoint;
        this.resolveBots(true);
        this.emit("tick:multiplier", {
          multiplier: this.multiplier,
          bets: this.allBets(),
        });
        this.beginCrash();
        return;
      }

      this.resolveBots(false);
      this.emit("tick:multiplier", {
        multiplier: this.multiplier,
        bets: this.allBets(),
      });
    }, TICK_MS);
  }

  private beginCrash() {
    this.phase = "crashed";
    this.clearTimer();

    this.history.unshift({ id: this.roundId, multiplier: this.crashPoint });
    this.history = this.history.slice(0, HISTORY_LIMIT);

    this.emit("round:crashed", {
      multiplier: this.crashPoint,
      seed: this.seed,
      hashedSeed: this.hashedSeed,
      history: this.history,
    });

    this.timer = setTimeout(() => this.beginBetting(), CRASH_PAUSE_MS);
  }

  private resolveBots(roundEnding: boolean) {
    for (const bot of this.bots) {
      if (bot.cashedOut) continue;
      if (bot.target <= this.multiplier && bot.target < this.crashPoint) {
        bot.cashedOut = true;
        bot.cashedOutAt = bot.target;
        bot.win = Math.round(bot.bet * bot.target * 100) / 100;
      } else if (roundEnding) {
        // Lost — never cashed out before crash.
        bot.cashedOut = false;
        bot.cashedOutAt = null;
        bot.win = null;
      }
    }
  }

  placeBet(socketId: string, panel: 0 | 1, amount: number): boolean {
    if (this.phase !== "betting") return false;
    if (amount <= 0) return false;
    const existing = this.playerBets.find(
      (b) => b.socketId === socketId && b.panel === panel,
    );
    if (existing) return false;
    this.playerBets.push({
      socketId,
      panel,
      amount,
      cashedOut: false,
      cashedOutAt: null,
      win: null,
    });
    return true;
  }

  cancelBet(socketId: string, panel: 0 | 1): boolean {
    if (this.phase !== "betting") return false;
    const before = this.playerBets.length;
    this.playerBets = this.playerBets.filter(
      (b) => !(b.socketId === socketId && b.panel === panel),
    );
    return this.playerBets.length < before;
  }

  cashOut(socketId: string, panel: 0 | 1): PlayerBet | null {
    if (this.phase !== "flying") return null;
    const bet = this.playerBets.find(
      (b) => b.socketId === socketId && b.panel === panel && !b.cashedOut,
    );
    if (!bet) return null;
    bet.cashedOut = true;
    bet.cashedOutAt = this.multiplier;
    bet.win = Math.round(bet.amount * this.multiplier * 100) / 100;
    return bet;
  }

  getPlayerBets(socketId: string): PlayerBet[] {
    return this.playerBets.filter((b) => b.socketId === socketId);
  }

  private allBets(): LiveBet[] {
    const botBets: LiveBet[] = this.bots.map((b) => ({
      id: b.id,
      name: b.name,
      avatar: b.avatar,
      bet: b.bet,
      cashedOutAt: b.cashedOutAt,
      win: b.win,
      cashedOut: b.cashedOut,
    }));
    return botBets;
  }

  publicState(): PublicRoundState {
    const bets = this.allBets();
    const totalWin = bets.reduce((acc, b) => acc + (b.win ?? 0), 0);
    return {
      phase: this.phase,
      roundId: this.roundId,
      multiplier: this.multiplier,
      countdown: this.countdown,
      hashedSeed: this.hashedSeed,
      history: this.history,
      bets,
      totalBets: bets.length,
      totalWin: Math.round(totalWin * 100) / 100,
    };
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

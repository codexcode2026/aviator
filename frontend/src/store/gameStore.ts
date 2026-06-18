import { create } from "zustand";
import { socket } from "../lib/socket";
import type {
  GamePhase,
  LiveBet,
  PanelState,
  PublicRoundState,
  RoundHistoryItem,
} from "../types";

interface CrashFlash {
  multiplier: number;
  at: number;
}

interface GameState {
  connected: boolean;
  phase: GamePhase;
  roundId: string;
  multiplier: number;
  countdown: number;
  history: RoundHistoryItem[];
  bets: LiveBet[];
  totalBets: number;
  totalWin: number;
  balance: number;
  currency: string;
  crashFlash: CrashFlash | null;
  /** wall-clock ms at which the flying phase began (for animation). */
  flyingStartedAt: number | null;
  panels: [PanelState, PanelState];
  lastWinToast: { panel: number; mult: number; win: number; at: number } | null;

  setPanel: (panel: 0 | 1, patch: Partial<PanelState>) => void;
  placeBet: (panel: 0 | 1) => void;
  cancelBet: (panel: 0 | 1) => void;
  cashOut: (panel: 0 | 1) => void;
  init: () => void;
}

function defaultPanel(amount: number): PanelState {
  return {
    mode: "bet",
    amount,
    active: false,
    queued: false,
    cashedOut: false,
    cashedOutAt: null,
    win: null,
    autoBet: false,
    autoCashOut: false,
    autoCashOutValue: 1.1,
  };
}

export const useGame = create<GameState>((set, get) => ({
  connected: false,
  phase: "betting",
  roundId: "",
  multiplier: 1.0,
  countdown: 5000,
  history: [],
  bets: [],
  totalBets: 0,
  totalWin: 0,
  balance: 50000,
  currency: "ZAR",
  crashFlash: null,
  flyingStartedAt: null,
  panels: [defaultPanel(2), defaultPanel(2)],
  lastWinToast: null,

  setPanel: (panel, patch) =>
    set((s) => {
      const panels = [...s.panels] as [PanelState, PanelState];
      panels[panel] = { ...panels[panel], ...patch };
      return { panels };
    }),

  placeBet: (panel) => {
    const s = get();
    const p = s.panels[panel];
    if (p.active || p.queued) return;
    if (p.amount > s.balance) return;
    socket.emit("bet:place", { panel, amount: p.amount });
    // If we're mid-round, the bet is queued for next round.
    if (s.phase === "betting") {
      get().setPanel(panel, { active: true });
    } else {
      get().setPanel(panel, { queued: true });
    }
  },

  cancelBet: (panel) => {
    const s = get();
    const p = s.panels[panel];
    socket.emit("bet:cancelWithAmount", { panel, amount: p.amount });
    get().setPanel(panel, { active: false, queued: false });
  },

  cashOut: (panel) => {
    socket.emit("bet:cashout", { panel });
  },

  init: () => {
    socket.on("connect", () => set({ connected: true }));
    socket.on("disconnect", () => set({ connected: false }));

    socket.on(
      "init",
      (data: { state: PublicRoundState; balance: number; currency: string }) => {
        const st = data.state;
        set({
          phase: st.phase,
          roundId: st.roundId,
          multiplier: st.multiplier,
          countdown: st.countdown,
          history: st.history,
          bets: st.bets,
          totalBets: st.totalBets,
          totalWin: st.totalWin,
          balance: data.balance,
          currency: data.currency,
          flyingStartedAt: st.phase === "flying" ? Date.now() : null,
        });
      },
    );

    socket.on("round:betting", (st: PublicRoundState) => {
      set((s) => {
        // New round: promote queued bets to active, reset cashout flags.
        const panels = s.panels.map((p) => {
          const next = { ...p };
          if (next.queued) {
            next.queued = false;
            next.active = true;
          }
          next.cashedOut = false;
          next.cashedOutAt = null;
          next.win = null;
          return next;
        }) as [PanelState, PanelState];
        return {
          phase: "betting",
          roundId: st.roundId,
          multiplier: 1.0,
          countdown: st.countdown,
          bets: st.bets,
          totalBets: st.totalBets,
          totalWin: st.totalWin,
          crashFlash: null,
          flyingStartedAt: null,
          panels,
        };
      });

      // Auto-bet: re-place bets flagged for auto.
      const s2 = get();
      s2.panels.forEach((p, i) => {
        if (p.autoBet && !p.active && p.amount <= get().balance) {
          get().placeBet(i as 0 | 1);
        }
      });
    });

    socket.on("tick:countdown", (p: { countdown: number }) =>
      set({ countdown: p.countdown }),
    );

    socket.on("round:flying", (st: PublicRoundState) => {
      set({
        phase: "flying",
        multiplier: 1.0,
        flyingStartedAt: Date.now(),
        bets: st.bets,
        totalBets: st.totalBets,
      });
    });

    socket.on(
      "tick:multiplier",
      (p: { multiplier: number; bets: LiveBet[] }) => {
        set({ multiplier: p.multiplier, bets: p.bets });

        // Auto cash-out handling.
        const s = get();
        s.panels.forEach((panel, i) => {
          if (
            panel.active &&
            !panel.cashedOut &&
            panel.autoCashOut &&
            p.multiplier >= panel.autoCashOutValue
          ) {
            get().cashOut(i as 0 | 1);
          }
        });
      },
    );

    socket.on(
      "round:crashed",
      (p: {
        multiplier: number;
        history: RoundHistoryItem[];
      }) => {
        set((s) => {
          const panels = s.panels.map((panel) => {
            if (panel.active && !panel.cashedOut) {
              // Lost this round.
              return { ...panel, active: false };
            }
            return { ...panel, active: false };
          }) as [PanelState, PanelState];
          return {
            phase: "crashed",
            multiplier: p.multiplier,
            history: p.history,
            crashFlash: { multiplier: p.multiplier, at: Date.now() },
            panels,
          };
        });
      },
    );

    socket.on(
      "bet:accepted",
      (p: { panel: 0 | 1; amount: number; balance: number }) => {
        set({ balance: p.balance });
      },
    );

    socket.on(
      "bet:cancelled",
      (p: { panel: 0 | 1; balance?: number }) => {
        if (p.balance != null) set({ balance: p.balance });
        get().setPanel(p.panel, { active: false, queued: false });
      },
    );

    socket.on("bet:rejected", (p: { panel: 0 | 1 }) => {
      get().setPanel(p.panel, { active: false, queued: false });
    });

    socket.on(
      "bet:cashedout",
      (p: {
        panel: 0 | 1;
        multiplier: number;
        win: number;
        balance: number;
      }) => {
        set({ balance: p.balance });
        get().setPanel(p.panel, {
          cashedOut: true,
          cashedOutAt: p.multiplier,
          win: p.win,
          active: false,
        });
        set({
          lastWinToast: {
            panel: p.panel,
            mult: p.multiplier,
            win: p.win,
            at: Date.now(),
          },
        });
      },
    );
  },
}));

import "dotenv/config";
import http from "node:http";
import os from "node:os";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { GameEngine } from "./gameEngine.js";
import { supabase } from "./supabaseClient.js";
import { authRouter, requireAuth, type AuthedRequest } from "./authRouter.js";
import type { CancelBetPayload, CashOutPayload, PlaceBetPayload } from "./types.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const STARTING_BALANCE = Number(process.env.STARTING_BALANCE ?? 50000);

function lanIpv4(): string[] {
  const out: string[] = [];
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

const app = express();

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "16kb" }));

// Global API rate limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, reason: "too_many_requests" },
});
app.use("/api", globalLimiter);

// Auth routes
app.use("/api/auth", authRouter);
app.use("/api", authRouter); // also mounts /api/admin/users

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const engine = new GameEngine();

// Expose engine globally so authRouter can push overrides into it
(globalThis as Record<string, unknown>).__gameEngine = engine;

// Demo in-memory balances for unauthenticated (demo) sockets.
const demoBalances = new Map<string, number>();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", phase: engine.phase, ts: Date.now() });
});

app.get("/api/state", (_req, res) => {
  res.json(engine.publicState());
});

/** Authenticated wallet balance endpoint. */
app.get("/api/wallet", async (req, res) => {
  await requireAuth(req, res, async () => {
    const uid = (req as AuthedRequest).user!.id;
    const { data, error } = await supabase
      .from("wallets")
      .select("balance, currency")
      .eq("user_id", uid)
      .single();
    if (error || !data) {
      res.status(404).json({ ok: false, reason: "wallet_not_found" });
      return;
    }
    res.json({ ok: true, balance: Number(data.balance), currency: data.currency });
  });
});

/** Fetch a user's real wallet balance from Supabase. */
async function getWalletBalance(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return Number(data.balance);
}

function broadcast(event: string, payload: unknown) {
  io.emit(event, payload);
}

engine.on("round:betting", (state) => broadcast("round:betting", state));
engine.on("round:flying", (state) => broadcast("round:flying", state));
engine.on("tick:countdown", (p) => broadcast("tick:countdown", p));
engine.on("tick:multiplier", (p) => broadcast("tick:multiplier", p));
engine.on("round:crashed", (p) => {
  // Broadcast the crash to all clients first.
  broadcast("round:crashed", p);
  // Then send each demo socket their authoritative balance
  // (covers players who lost their bet this round).
  for (const [sid, socket] of io.sockets.sockets) {
    const bal = demoBalances.get(sid);
    if (bal != null) {
      socket.emit("balance:sync", { balance: bal });
    }
  }
});

// Persistent demo balances keyed by stable client token (survives socket reconnect).
const persistentBalances = new Map<string, number>();

io.on("connection", (socket) => {
  // Client may send a stable token so balance persists across page refreshes.
  let clientToken: string | null = null;

  const getDemoBalance = () =>
    clientToken != null
      ? (persistentBalances.get(clientToken) ?? STARTING_BALANCE)
      : (demoBalances.get(socket.id) ?? STARTING_BALANCE);

  const setDemoBalance = (v: number) => {
    demoBalances.set(socket.id, v);
    if (clientToken != null) persistentBalances.set(clientToken, v);
  };

  demoBalances.set(socket.id, STARTING_BALANCE);

  socket.emit("init", {
    state: engine.publicState(),
    balance: getDemoBalance(),
    currency: "ZAR",
  });

  // Client sends its stable token on connect so balance survives refresh.
  socket.on("client:token", (token: string) => {
    if (typeof token !== "string" || token.length < 8) return;
    clientToken = token;
    // Restore persistent balance for this client.
    const saved = persistentBalances.get(token);
    if (saved != null) {
      demoBalances.set(socket.id, saved);
      socket.emit("balance:sync", { balance: saved });
    } else {
      persistentBalances.set(token, STARTING_BALANCE);
    }
  });

  socket.on("bet:place", async (payload: PlaceBetPayload) => {
    const { panel, amount, userId } = payload;

    if (userId && engine.supabaseRoundId) {
      // Authenticated path: use Supabase wallet RPC.
      const { data, error } = await supabase.rpc("place_bet", {
        p_user_id: userId,
        p_round_id: engine.supabaseRoundId,
        p_panel: panel,
        p_amount: amount,
        p_reference: socket.id,
      });
      if (error) {
        socket.emit("bet:rejected", { panel, reason: "server_error" });
        return;
      }
      const result = data as { ok: boolean; reason?: string; balance?: number; bet_id?: string };
      if (!result.ok) {
        socket.emit("bet:rejected", { panel, reason: result.reason ?? "rejected" });
        return;
      }
      engine.placeBet(socket.id, panel, amount, userId);
      socket.emit("bet:accepted", {
        panel,
        amount,
        balance: result.balance,
        betId: result.bet_id,
      });
    } else {
      // Demo / unauthenticated path: in-memory balance.
      const balance = getDemoBalance();
      if (amount > balance) {
        socket.emit("bet:rejected", { panel, reason: "insufficient" });
        return;
      }
      const ok = engine.placeBet(socket.id, panel, amount);
      if (ok) {
        const newBalance = Math.round((balance - amount) * 100) / 100;
        setDemoBalance(newBalance);
        socket.emit("bet:accepted", { panel, amount, balance: newBalance });
      } else {
        socket.emit("bet:rejected", { panel, reason: "phase" });
      }
    }
  });

  socket.on("bet:cancel", (payload: CashOutPayload) => {
    const ok = engine.cancelBet(socket.id, payload.panel);
    if (ok) {
      socket.emit("bet:cancelled", { panel: payload.panel });
    }
  });


  socket.on("bet:cancelWithAmount", async (payload: CancelBetPayload) => {
    const { panel, amount, userId } = payload;

    if (userId && engine.supabaseRoundId) {
      // Authenticated path: use Supabase wallet RPC.
      const { data, error } = await supabase.rpc("cancel_bet", {
        p_user_id: userId,
        p_round_id: engine.supabaseRoundId,
        p_panel: panel,
        p_reference: socket.id,
      });
      if (error) {
        socket.emit("bet:cancel_failed", { panel, reason: "server_error" });
        return;
      }
      const result = data as { ok: boolean; reason?: string; balance?: number };
      if (!result.ok) {
        socket.emit("bet:cancel_failed", { panel, reason: result.reason ?? "rejected" });
        return;
      }
      engine.cancelBet(socket.id, panel);
      socket.emit("bet:cancelled", { panel, balance: result.balance });
    } else {
      // Demo path — cancel in engine (betting phase) or just clear state (queued).
      const ok = engine.cancelBet(socket.id, panel);
      // Even if engine returns false (was queued, not in betting phase), refund the amount.
      const balance = getDemoBalance();
      const newBalance = Math.round((balance + amount) * 100) / 100;
      setDemoBalance(newBalance);
      socket.emit("bet:cancelled", { panel, balance: newBalance });
      void ok;
    }
  });

  socket.on("bet:cashout", async (payload: CashOutPayload) => {
    const { panel, userId } = payload;

    if (userId && engine.supabaseRoundId) {
      // Authenticated path: cashout via Supabase RPC using current multiplier.
      const multiplier = engine.multiplier;
      const { data, error } = await supabase.rpc("cashout_bet", {
        p_user_id: userId,
        p_round_id: engine.supabaseRoundId,
        p_panel: panel,
        p_multiplier: multiplier,
        p_reference: socket.id,
      });
      if (error) {
        return;
      }
      const result = data as {
        ok: boolean;
        reason?: string;
        balance?: number;
        win?: number;
        multiplier?: number;
        bet_id?: string;
      };
      if (!result.ok) return;

      engine.cashOut(socket.id, panel);
      socket.emit("bet:cashedout", {
        panel,
        multiplier: result.multiplier,
        win: result.win,
        balance: result.balance,
        betId: result.bet_id,
      });
    } else {
      // Demo path.
      const result = engine.cashOut(socket.id, panel);
      if (result && result.win != null) {
        const balance = getDemoBalance();
        const newBalance = Math.round((balance + result.win) * 100) / 100;
        setDemoBalance(newBalance);
        socket.emit("bet:cashedout", {
          panel,
          multiplier: result.cashedOutAt,
          win: result.win,
          balance: newBalance,
        });
      }
    }
  });

  socket.on("disconnect", () => {
    demoBalances.delete(socket.id);
    // Note: persistentBalances is intentionally kept — it survives reconnects.
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Aviator backend listening on http://localhost:${PORT}`);
  for (const ip of lanIpv4()) {
    console.log(`  LAN backend: http://${ip}:${PORT}`);
  }
  console.log("  (Friends use the frontend URL on :5173 — API is proxied in dev)");
  engine.start().catch((err) => {
    console.error("[startup] engine.start() failed:", err);
    process.exit(1);
  });
});

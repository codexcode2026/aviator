import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { GameEngine } from "./gameEngine.js";
import type { CashOutPayload, PlaceBetPayload } from "./types.js";

const PORT = Number(process.env.PORT ?? 4000);
const STARTING_BALANCE = 50000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const engine = new GameEngine();

// Per-connection demo balance (in-memory, resets on disconnect).
const balances = new Map<string, number>();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", phase: engine.phase });
});

app.get("/api/state", (_req, res) => {
  res.json(engine.publicState());
});

function broadcast(event: string, payload: unknown) {
  io.emit(event, payload);
}

engine.on("round:betting", (state) => broadcast("round:betting", state));
engine.on("round:flying", (state) => broadcast("round:flying", state));
engine.on("tick:countdown", (p) => broadcast("tick:countdown", p));
engine.on("tick:multiplier", (p) => broadcast("tick:multiplier", p));
engine.on("round:crashed", (p) => broadcast("round:crashed", p));

io.on("connection", (socket) => {
  balances.set(socket.id, STARTING_BALANCE);

  socket.emit("init", {
    state: engine.publicState(),
    balance: balances.get(socket.id),
    currency: "ZAR",
  });

  socket.on("bet:place", (payload: PlaceBetPayload) => {
    const balance = balances.get(socket.id) ?? 0;
    if (payload.amount > balance) {
      socket.emit("bet:rejected", { panel: payload.panel, reason: "insufficient" });
      return;
    }
    const ok = engine.placeBet(socket.id, payload.panel, payload.amount);
    if (ok) {
      balances.set(socket.id, Math.round((balance - payload.amount) * 100) / 100);
      socket.emit("bet:accepted", {
        panel: payload.panel,
        amount: payload.amount,
        balance: balances.get(socket.id),
      });
    } else {
      socket.emit("bet:rejected", { panel: payload.panel, reason: "phase" });
    }
  });

  socket.on("bet:cancel", (payload: CashOutPayload) => {
    const ok = engine.cancelBet(socket.id, payload.panel);
    if (ok) {
      // Refund handled by recomputing: find the cancelled amount.
      socket.emit("bet:cancelled", { panel: payload.panel });
      // Refund: we need the amount; engine removed it, so track via accepted side.
    }
  });

  // Refund on cancel requires the amount; handle it here with a wrapper.
  socket.on("bet:cancelWithAmount", (payload: PlaceBetPayload) => {
    const ok = engine.cancelBet(socket.id, payload.panel);
    if (ok) {
      const balance = balances.get(socket.id) ?? 0;
      balances.set(socket.id, Math.round((balance + payload.amount) * 100) / 100);
      socket.emit("bet:cancelled", {
        panel: payload.panel,
        balance: balances.get(socket.id),
      });
    }
  });

  socket.on("bet:cashout", (payload: CashOutPayload) => {
    const result = engine.cashOut(socket.id, payload.panel);
    if (result && result.win != null) {
      const balance = balances.get(socket.id) ?? 0;
      balances.set(socket.id, Math.round((balance + result.win) * 100) / 100);
      socket.emit("bet:cashedout", {
        panel: payload.panel,
        multiplier: result.cashedOutAt,
        win: result.win,
        balance: balances.get(socket.id),
      });
    }
  });

  socket.on("disconnect", () => {
    balances.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Aviator backend listening on http://localhost:${PORT}`);
  engine.start();
});

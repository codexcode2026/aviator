/**
 * Comprehensive backend test suite for Aviator.
 * Tests: HTTP health, WebSocket lifecycle, bet:place, bet:cancel, bet:cashout,
 *        DB round rows, DB bets rows, wallet_ledger, audit_rounds.
 * Run: node test-backend.mjs
 */

import { io } from "socket.io-client";
import { createClient } from "@supabase/supabase-js";

const BACKEND = "http://localhost:4000";
const SUPABASE_URL = "https://xegrnkniwoidhgghbsmu.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZ3Jua25pd29pZGhnZ2hic211Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg3MjQ1NSwiZXhwIjoyMDk3NDQ4NDU1fQ.ONWCeElcmvZGsX_-NZzFOxgB8iQvVcn6nIpzwCLGmBA";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

let passed = 0;
let failed = 0;
const errors = [];

function pass(name) {
  console.log(`  ✅ PASS: ${name}`);
  passed++;
}
function fail(name, reason) {
  console.error(`  ❌ FAIL: ${name}\n       reason: ${reason}`);
  failed++;
  errors.push({ name, reason });
}
function assert(cond, name, detail = "") {
  cond ? pass(name) : fail(name, detail || "assertion false");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connectSocket() {
  return new Promise((resolve, reject) => {
    const s = io(BACKEND, { transports: ["websocket"], timeout: 6000 });
    s.once("connect", () => resolve(s));
    s.once("connect_error", (e) => reject(e));
    setTimeout(() => reject(new Error("connect timeout")), 7000);
  });
}

function waitFor(socket, event, ms = 12000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout: ${event}`)), ms);
    socket.once(event, (d) => { clearTimeout(t); resolve(d); });
  });
}

// ── SECTION 1: HTTP ─────────────────────────────────────────────────────────
async function testHttp() {
  console.log("\n━━ 1. HTTP endpoints ━━");
  const h = await fetch(`${BACKEND}/api/health`);
  assert(h.ok, "GET /api/health → 200");
  const hb = await h.json();
  assert(hb.status === "ok", `health.status = ok (got ${hb.status})`);
  assert(["betting","flying","crashed"].includes(hb.phase), `health.phase valid (${hb.phase})`);

  const s = await fetch(`${BACKEND}/api/state`);
  assert(s.ok, "GET /api/state → 200");
  const sb2 = await s.json();
  assert(!!sb2.roundId, "state.roundId present");
  assert(Array.isArray(sb2.history) && sb2.history.length > 0, `state.history populated (${sb2.history?.length})`);
  assert(typeof sb2.multiplier === "number" && sb2.multiplier >= 1, `state.multiplier >= 1 (${sb2.multiplier})`);
  assert(["betting","flying","crashed"].includes(sb2.phase), `state.phase valid (${sb2.phase})`);
  return sb2;
}

// ── SECTION 2: WebSocket Init ───────────────────────────────────────────────
async function testWsInit() {
  console.log("\n━━ 2. WebSocket init event ━━");
  const socket = await connectSocket().catch(e => { fail("socket connect", e.message); return null; });
  if (!socket) return null;
  pass("socket connected");

  const init = await waitFor(socket, "init").catch(e => { fail("init event", e.message); return null; });
  if (!init) { socket.disconnect(); return null; }
  pass("init event received");
  assert(!!init.state, "init.state present");
  assert(typeof init.balance === "number", `init.balance is number (${init.balance})`);
  assert(init.balance === 50000, `init.balance = 50000 (${init.balance})`);
  assert(init.currency === "ZAR", `init.currency = ZAR (${init.currency})`);
  assert(Array.isArray(init.state.history), "init.state.history is array");
  assert(!!init.state.roundId, "init.state.roundId present");
  return socket;
}

// ── SECTION 3: Demo bet:place (unauthenticated) ─────────────────────────────
async function testDemoBetPlace(socket) {
  console.log("\n━━ 3. Demo bet:place (unauthenticated) ━━");

  // Wait for betting phase
  let phase = (await fetch(`${BACKEND}/api/health`).then(r=>r.json())).phase;
  if (phase !== "betting") {
    console.log("  Waiting for betting phase...");
    await waitFor(socket, "round:betting", 15000).catch(() => {});
    phase = "betting";
  }

  const accepted = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("bet:accepted timeout")), 5000);
    socket.once("bet:accepted", d => { clearTimeout(t); res(d); });
    socket.once("bet:rejected", d => { clearTimeout(t); rej(new Error(`rejected: ${d.reason}`)); });
  });

  socket.emit("bet:place", { panel: 0, amount: 100 });
  const ack = await accepted.catch(e => { fail("bet:place demo → bet:accepted", e.message); return null; });
  if (!ack) return;
  pass("bet:place demo → bet:accepted");
  assert(ack.panel === 0, `accepted.panel = 0 (${ack.panel})`);
  assert(ack.amount === 100, `accepted.amount = 100 (${ack.amount})`);
  assert(ack.balance === 49900, `balance deducted to 49900 (${ack.balance})`);
}

// ── SECTION 4: Demo bet:cancel ──────────────────────────────────────────────
async function testDemoBetCancel(socket) {
  console.log("\n━━ 4. Demo bet:cancelWithAmount ━━");

  // Place a bet first
  const acceptedP = waitFor(socket, "bet:accepted", 5000);
  socket.emit("bet:place", { panel: 1, amount: 200 });
  const placed = await acceptedP.catch(e => { fail("setup bet:place for cancel", e.message); return null; });
  if (!placed) return;

  const cancelledP = waitFor(socket, "bet:cancelled", 5000);
  socket.emit("bet:cancelWithAmount", { panel: 1, amount: 200 });
  const cancelled = await cancelledP.catch(e => { fail("bet:cancelWithAmount → bet:cancelled", e.message); return null; });
  if (!cancelled) return;
  pass("bet:cancelWithAmount → bet:cancelled");
  assert(cancelled.panel === 1, `cancelled.panel = 1 (${cancelled.panel})`);
  // balance should be restored (was 49900 after prev test, placed 200 = 49700, cancel = 49900)
  assert(typeof cancelled.balance === "number", `cancelled.balance is number (${cancelled.balance})`);
}

// ── SECTION 5: Demo cashout ──────────────────────────────────────────────────
async function testDemoCashout() {
  console.log("\n━━ 5. Demo bet:cashout ━━");

  // Use a DEDICATED socket so we don't race with the phase-event listener
  const sock = await connectSocket().catch(e => { fail("cashout test socket connect", e.message); return null; });
  if (!sock) return;

  // Wait for init so demo balance is set
  await waitFor(sock, "init", 5000).catch(() => {});

  // Make sure we're in betting
  let phase = (await fetch(`${BACKEND}/api/health`).then(r=>r.json())).phase;
  if (phase !== "betting") {
    console.log("  Waiting for next betting phase...");
    await waitFor(sock, "round:betting", 15000).catch(() => {});
  }

  const acceptedP = waitFor(sock, "bet:accepted", 5000);
  sock.emit("bet:place", { panel: 0, amount: 500 });
  const placed = await acceptedP.catch(e => { fail("place bet for cashout test", e.message); return null; });
  if (!placed) { sock.disconnect(); return; }
  pass("bet placed for cashout test");

  // Wait for flying phase
  console.log("  Waiting for flying phase...");
  await waitFor(sock, "round:flying", 12000).catch(e => { fail("round:flying for cashout", e.message); });

  // Small delay so multiplier ticks above 1.00
  await sleep(600);

  const cashedP = waitFor(sock, "bet:cashedout", 5000);
  sock.emit("bet:cashout", { panel: 0 });
  const cashed = await cashedP.catch(e => { fail("bet:cashout → bet:cashedout", e.message); return null; });
  sock.disconnect();
  if (!cashed) return;
  pass("bet:cashout → bet:cashedout");
  assert(cashed.panel === 0, `cashedout.panel = 0 (${cashed.panel})`);
  assert(typeof cashed.multiplier === "number" && cashed.multiplier >= 1, `cashedout.multiplier >= 1 (${cashed.multiplier})`);
  assert(typeof cashed.win === "number" && cashed.win >= 500, `cashedout.win >= 500 (${cashed.win})`);
  assert(typeof cashed.balance === "number", `cashedout.balance is number (${cashed.balance})`);
}

// ── SECTION 6: Round lifecycle in DB ────────────────────────────────────────
async function testDbRoundLifecycle() {
  console.log("\n━━ 6. DB round lifecycle ━━");

  // Fetch the latest rounds
  const { data, error } = await sb
    .from("rounds")
    .select("id, status, hashed_seed, seed, crash_point, started_at, ended_at")
    .order("id", { ascending: false })
    .limit(10);

  if (error) { fail("DB rounds query", error.message); return; }
  assert(data.length > 0, `rounds table has rows (${data.length})`);

  const crashed = data.filter(r => r.status === "crashed");

  assert(crashed.length > 0, `at least one crashed round in DB (${crashed.length})`);

  // Active round check: query live (not limited to last 10)
  const { data: active } = await sb
    .from("rounds")
    .select("id, status")
    .in("status", ["betting", "flying"])
    .limit(5);
  assert((active?.length ?? 0) > 0, `at least one active round in DB (${active?.length ?? 0}) — checked live`);

  // Verify crashed round has seed revealed and crash_point set
  const c = crashed[0];
  assert(!!c.hashed_seed, `crashed round has hashed_seed`);
  assert(!!c.seed, `crashed round seed revealed (${c.seed?.slice(0,8)}...)`);
  assert(c.crash_point >= 1, `crash_point >= 1 (${c.crash_point})`);
  assert(!!c.ended_at, `crashed round has ended_at timestamp`);
}

// ── SECTION 7: audit_rounds populated ───────────────────────────────────────
async function testDbAuditRounds() {
  console.log("\n━━ 7. audit_rounds table ━━");

  const { data, error } = await sb
    .from("audit_rounds")
    .select("round_id, status, crash_point, seed, hashed_seed, server_instance_id")
    .eq("status", "crashed")
    .order("round_id", { ascending: false })
    .limit(5);

  if (error) { fail("DB audit_rounds query", error.message); return; }
  assert(data.length > 0, `audit_rounds has crashed rows (${data.length})`);
  const a = data[0];
  assert(!!a.round_id, "audit_round.round_id present");
  assert(!!a.hashed_seed, "audit_round.hashed_seed present");
  assert(!!a.seed, "audit_round.seed revealed after crash");
  assert(a.crash_point >= 1, `audit_round.crash_point >= 1 (${a.crash_point})`);
  assert(a.server_instance_id === "server-1", `server_instance_id = server-1 (${a.server_instance_id})`);
}

// ── SECTION 8: Authenticated bet:place + DB bets + wallet_ledger ─────────────
async function testAuthenticatedBetFlow() {
  console.log("\n━━ 8. Authenticated bet flow (create user → wallet → place_bet RPC) ━━");

  // Create a test user in auth.users via service role
  const testEmail = `testuser_${Date.now()}@aviator-test.com`;
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email: testEmail,
    password: "TestPass123!",
    email_confirm: true,
  });
  if (authErr) { fail("create test auth user", authErr.message); return; }
  const userId = authData.user.id;
  pass(`test user created (${userId.slice(0,8)}...)`);

  // Insert user row + wallet
  const { error: userErr } = await sb.from("users").insert({ id: userId, email: testEmail });
  if (userErr && !userErr.message.includes("duplicate")) {
    fail("insert users row", userErr.message); return;
  }

  const { error: walletErr } = await sb.from("wallets").insert({ user_id: userId, balance: 10000 });
  if (walletErr) { fail("create wallet", walletErr.message); return; }
  pass("wallet created with 10000 balance");

  // Wait for betting phase
  const phase = (await fetch(`${BACKEND}/api/health`).then(r=>r.json())).phase;
  if (phase !== "betting") {
    console.log("  Waiting for betting phase...");
    const socket2 = await connectSocket();
    await waitFor(socket2, "round:betting", 15000).catch(() => {});
    socket2.disconnect();
  }

  // Get current supabaseRoundId from /api/state
  const stateRes = await fetch(`${BACKEND}/api/state`).then(r=>r.json());
  const roundId = stateRes.supabaseRoundId;
  if (!roundId) { fail("supabaseRoundId present in /api/state", "got empty"); return; }
  assert(!!roundId, `supabaseRoundId in state (${roundId.slice(0,8)}...)`);

  // Call place_bet RPC directly via service role
  const { data: betData, error: betErr } = await sb.rpc("place_bet", {
    p_user_id: userId,
    p_round_id: roundId,
    p_panel: 0,
    p_amount: 500,
    p_reference: "test-suite",
  });
  if (betErr) { fail("place_bet RPC", betErr.message); return; }
  assert(betData.ok === true, `place_bet RPC ok=true (${JSON.stringify(betData)})`);
  assert(betData.balance === 9500, `wallet deducted to 9500 (${betData.balance})`);
  assert(!!betData.bet_id, `bet_id returned (${betData.bet_id?.slice(0,8)}...)`);

  // Verify bet in DB
  const { data: betRow, error: betRowErr } = await sb
    .from("bets")
    .select("id, status, amount, panel")
    .eq("id", betData.bet_id)
    .single();
  if (betRowErr) { fail("bets row query", betRowErr.message); return; }
  assert(betRow.status === "locked", `bet status = locked (${betRow.status})`);
  assert(betRow.amount == 500, `bet amount = 500 (${betRow.amount})`);
  assert(betRow.panel === 0, `bet panel = 0 (${betRow.panel})`);

  // Verify wallet_ledger entry
  const { data: ledger, error: ledgerErr } = await sb
    .from("wallet_ledger")
    .select("type, amount, running_balance, bet_id")
    .eq("user_id", userId)
    .eq("type", "bet_lock")
    .single();
  if (ledgerErr) { fail("wallet_ledger bet_lock entry", ledgerErr.message); return; }
  assert(ledger.type === "bet_lock", `ledger type = bet_lock`);
  assert(ledger.amount == -500, `ledger amount = -500 (${ledger.amount})`);
  assert(ledger.running_balance == 9500, `ledger running_balance = 9500 (${ledger.running_balance})`);
  pass("wallet_ledger bet_lock entry correct");

  // Test cancel_bet RPC
  const { data: cancelData, error: cancelErr } = await sb.rpc("cancel_bet", {
    p_user_id: userId,
    p_round_id: roundId,
    p_panel: 0,
    p_reference: "test-suite-cancel",
  });
  if (cancelErr) { fail("cancel_bet RPC", cancelErr.message); return; }
  assert(cancelData.ok === true, `cancel_bet RPC ok=true (${JSON.stringify(cancelData)})`);
  assert(cancelData.balance === 10000, `balance restored to 10000 (${cancelData.balance})`);

  // Verify wallet_ledger refund entry
  const { data: refundLedger, error: refundErr } = await sb
    .from("wallet_ledger")
    .select("type, amount, running_balance")
    .eq("user_id", userId)
    .eq("type", "bet_refund")
    .single();
  if (refundErr) { fail("wallet_ledger bet_refund entry", refundErr.message); return; }
  assert(refundLedger.amount == 500, `refund amount = 500 (${refundLedger.amount})`);
  assert(refundLedger.running_balance == 10000, `refund running_balance = 10000 (${refundLedger.running_balance})`);
  pass("wallet_ledger bet_refund entry correct");

  // Cleanup: delete test user
  await sb.auth.admin.deleteUser(userId);
  pass("test user cleaned up");
}

// ── SECTION 9: WebSocket phase events stream ─────────────────────────────────
async function testPhaseEvents(socket) {
  console.log("\n━━ 9. Phase event stream (round:betting → round:flying → round:crashed) ━━");

  // We may already be mid-round, so wait for a full new cycle
  console.log("  Waiting for round:betting...");
  const betting = await waitFor(socket, "round:betting", 15000).catch(e => { fail("round:betting event", e.message); return null; });
  if (!betting) return;
  pass("round:betting event received");
  assert(betting.phase === "betting", `betting event phase=betting (${betting.phase})`);
  assert(typeof betting.countdown === "number", `betting.countdown is number (${betting.countdown})`);

  console.log("  Waiting for round:flying...");
  const flying = await waitFor(socket, "round:flying", 10000).catch(e => { fail("round:flying event", e.message); return null; });
  if (!flying) return;
  pass("round:flying event received");
  assert(flying.phase === "flying", `flying event phase=flying (${flying.phase})`);
  assert(flying.multiplier === 1, `flying starts at multiplier=1 (${flying.multiplier})`);

  console.log("  Waiting for round:crashed (may take up to 60s)...");
  const crashed = await waitFor(socket, "round:crashed", 65000).catch(e => { fail("round:crashed event", e.message); return null; });
  if (!crashed) return;
  pass("round:crashed event received");
  assert(typeof crashed.multiplier === "number" && crashed.multiplier >= 1, `crashed.multiplier >= 1 (${crashed.multiplier})`);
  assert(!!crashed.seed, "crashed.seed revealed");
  assert(!!crashed.hashedSeed, "crashed.hashedSeed present");
  assert(Array.isArray(crashed.history), "crashed.history is array");
}

// ── SECTION 10: Provably fair seed verification ───────────────────────────────
async function testProvablyFair() {
  console.log("\n━━ 10. Provably fair seed integrity ━━");
  const { data, error } = await sb
    .from("audit_rounds")
    .select("hashed_seed, seed, crash_point")
    .eq("status", "crashed")
    .not("seed", "is", null)
    .limit(5);

  if (error || !data.length) { fail("fetch audit rows for PF check", error?.message || "no rows"); return; }

  const { createHash } = await import("crypto");
  let allMatch = true;
  for (const row of data) {
    const computed = createHash("sha256").update(row.seed).digest("hex");
    if (computed !== row.hashed_seed) {
      fail(`PF hash match for seed ${row.seed.slice(0,8)}`, `computed=${computed.slice(0,8)} vs stored=${row.hashed_seed.slice(0,8)}`);
      allMatch = false;
    }
  }
  if (allMatch) pass(`provably fair: ${data.length} seeds verified — SHA256(seed)=hashed_seed`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  AVIATOR BACKEND TEST SUITE");
  console.log("═══════════════════════════════════════════");

  try {
    // HTTP
    await testHttp();

    // WebSocket
    const socket = await testWsInit();

    if (socket) {
      // Demo (unauthenticated) flows — need betting phase
      await testDemoBetPlace(socket);
      await testDemoBetCancel(socket);
      await testDemoCashout(); // uses its own dedicated socket

      // Phase event stream
      await testPhaseEvents(socket);

      socket.disconnect();
      pass("socket disconnected cleanly");
    }

    // DB checks (no socket needed)
    await testDbRoundLifecycle();
    await testDbAuditRounds();
    await testAuthenticatedBetFlow();
    await testProvablyFair();

  } catch (e) {
    fail("unexpected top-level error", e.message);
    console.error(e);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  if (errors.length) {
    console.log("\n  FAILURES:");
    errors.forEach(e => console.log(`    ✗ ${e.name}: ${e.reason}`));
  }
  console.log("═══════════════════════════════════════════\n");
  process.exit(failed > 0 ? 1 : 0);
}

main();

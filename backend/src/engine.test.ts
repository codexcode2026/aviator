import { GameEngine } from "./gameEngine.js";

/**
 * Lightweight assertions for the core bet/cashout math and phase guards.
 * Run with: npx tsx src/engine.test.ts
 */
let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  } else {
    console.log("ok  :", msg);
  }
}

const e = new GameEngine();

// Force a controlled round state without starting the timers.
(e as any).phase = "betting";
(e as any).crashPoint = 5.0;

// Bets only accepted during betting.
assert(e.placeBet("sock-1", 0, 100) === true, "bet accepted during betting");
assert(e.placeBet("sock-1", 0, 100) === false, "duplicate bet on same panel rejected");
assert(e.placeBet("sock-1", 1, 50) === true, "second panel bet accepted");

// Cashout not allowed before flight.
assert(e.cashOut("sock-1", 0) === null, "cashout rejected while not flying");

// Enter flight and set a live multiplier.
(e as any).phase = "flying";
(e as any).multiplier = 2.5;

const r0 = e.cashOut("sock-1", 0);
assert(r0 !== null, "cashout succeeds in flight");
assert(r0?.win === 250, `win = bet*mult (100*2.5=250), got ${r0?.win}`);

// Cannot cash out twice.
assert(e.cashOut("sock-1", 0) === null, "double cashout rejected");

// Panel 1 still open; cashout at higher multiplier.
(e as any).multiplier = 3.0;
const r1 = e.cashOut("sock-1", 1);
assert(r1?.win === 150, `panel1 win 50*3=150, got ${r1?.win}`);

// Bet during betting cannot be placed mid-flight.
assert(e.placeBet("sock-2", 0, 10) === false, "bet rejected during flight");

console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);

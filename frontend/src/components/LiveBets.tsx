import { useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { Avatar } from "./Avatar";
import { fmt, multTier } from "../lib/format";
import { Footer } from "./Footer";
import type { LiveBet } from "../types";

const tabs = ["All Bets", "Previous", "Top"] as const;
const topMetricTabs = ["X", "Win", "Rounds"] as const;
const topPeriodTabs = ["Day", "Month", "Year"] as const;

const tierColor: Record<string, string> = {
  low: "text-low",
  mid: "text-mid",
  high: "text-high",
};

/** Shared column grid so headers and rows line up perfectly.
 *  Narrower fixed columns on small screens so the Player column never collapses. */
const COLS =
  "grid grid-cols-[minmax(0,1fr)_68px_46px_72px] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_92px_60px_92px] sm:gap-2";

/** Deterministic 0..1 pseudo-random from a string seed (stable across renders). */
function seeded(str: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

export function LiveBets() {
  const bets = useGame((s) => s.bets);
  const history = useGame((s) => s.history);
  const currency = useGame((s) => s.currency);
  const totalWin = useGame((s) => s.totalWin);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All Bets");
  const [topMetric, setTopMetric] = useState<(typeof topMetricTabs)[number]>("X");
  const [topPeriod, setTopPeriod] = useState<(typeof topPeriodTabs)[number]>("Day");

  return (
    <div
      data-testid="live-bets"
      className="flex h-full flex-col gap-2 bg-[#0d0e10] p-2"
    >
      {/* Box 1 — tabs */}
      <div className="shrink-0 rounded-2xl bg-[#15171a] p-1">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-1.5 text-[12px] font-medium transition ${
                tab === t
                  ? "bg-[#26282c] text-white shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                  : "text-white/45 hover:text-white/75"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "All Bets" && (
        <AllBets bets={bets} currency={currency} totalWin={totalWin} />
      )}
      {tab === "Previous" && (
        <Previous
          bets={bets}
          currency={currency}
          result={history[0]?.multiplier ?? null}
        />
      )}
      {tab === "Top" && (
        <Top
          bets={bets}
          currency={currency}
          metric={topMetric}
          period={topPeriod}
          onMetric={setTopMetric}
          onPeriod={setTopPeriod}
        />
      )}

      <Footer />
    </div>
  );
}

/* ------------------------------- All Bets -------------------------------- */

function AllBets({
  bets,
  currency,
  totalWin,
}: {
  bets: LiveBet[];
  currency: string;
  totalWin: number;
}) {
  const sorted = useMemo(
    () =>
      [...bets].sort((a, b) => {
        if (a.cashedOut && !b.cashedOut) return -1;
        if (!a.cashedOut && b.cashedOut) return 1;
        return b.bet - a.bet;
      }),
    [bets],
  );

  const total = bets.length;
  const settled = bets.filter((b) => b.cashedOut).length;
  const pct = total ? Math.max(0.04, settled / total) : 0;

  return (
    <>
      {/* Box 2 — summary */}
      <div className="shrink-0 rounded-2xl bg-[#15171a] px-3.5 py-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex -space-x-2.5">
              {bets.slice(0, 3).map((b) => (
                <span
                  key={`s-${b.id}`}
                  className="rounded-full ring-2 ring-[#15171a]"
                >
                  <Avatar id={b.avatar} size={26} />
                </span>
              ))}
            </div>
            <span className="text-[12px] leading-none text-white/55">
              <span className="font-bold text-white">{settled}</span>
              <span className="text-white/80">/{total}</span> Bets
            </span>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-extrabold leading-none text-white">
              {fmt(totalWin)}
            </div>
            <div className="mt-1.5 text-[11px] text-white/40">
              Total win {currency}
            </div>
          </div>
        </div>
        <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-[#26292c]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1f9e2c] to-[#3fc94a] transition-[width] duration-500"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>

      <BetList rows={sorted} currency={currency} />
    </>
  );
}

/* ------------------------------- Previous -------------------------------- */

function Previous({
  bets,
  currency,
  result,
}: {
  bets: LiveBet[];
  currency: string;
  result: number | null;
}) {
  const sorted = useMemo(
    () =>
      [...bets].sort((a, b) => {
        if (a.cashedOut && !b.cashedOut) return -1;
        if (!a.cashedOut && b.cashedOut) return 1;
        return b.bet - a.bet;
      }),
    [bets],
  );

  return (
    <>
      <div className="shrink-0 rounded-2xl bg-[#15171a] py-2.5 text-center">
        <div className="text-[11px] text-white/45">Round Result</div>
        <div
          className={`text-[20px] font-extrabold leading-tight ${
            result != null ? tierColor[multTier(result)] : "text-white"
          }`}
        >
          {result != null ? `${result.toFixed(2)}x` : "—"}
        </div>
      </div>

      <BetList rows={sorted} currency={currency} forceResolved />
    </>
  );
}

/** Scrollable list with a sticky, perfectly aligned column header. */
function BetList({
  rows,
  currency,
  forceResolved,
}: {
  rows: LiveBet[];
  currency: string;
  forceResolved?: boolean;
}) {
  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <div
        className={`${COLS} sticky top-0 z-10 bg-[#0d0e10] px-2.5 pb-1.5 pt-0.5 text-[10px] text-white/35 sm:px-3`}
      >
        <span>Player</span>
        <span className="text-left">Bet {currency}</span>
        <span className="text-center">X</span>
        <span className="text-right">Win {currency}</span>
      </div>
      {rows.map((b) => (
        <BetRow key={b.id} bet={b} forceResolved={forceResolved} />
      ))}
    </div>
  );
}

function BetRow({ bet, forceResolved }: { bet: LiveBet; forceResolved?: boolean }) {
  const won = bet.cashedOut && bet.cashedOutAt != null;
  const lost = forceResolved && !won;
  return (
    <div
      className={`${COLS} mb-1 rounded-[12px] px-2.5 py-2 text-[12px] sm:px-3 ${
        won ? "bg-[#13301d]" : "bg-[#16181b]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Avatar id={bet.avatar} size={22} />
        <span className="truncate text-white/80">{bet.name}</span>
      </div>
      <span className="text-left tabular-nums text-white/75">{fmt(bet.bet)}</span>
      <span className="text-center">
        {won ? (
          <span
            className={`inline-block rounded-full bg-black/40 px-1.5 py-0.5 text-[11px] font-bold ${
              tierColor[multTier(bet.cashedOutAt!)]
            }`}
          >
            {bet.cashedOutAt!.toFixed(2)}x
          </span>
        ) : (
          ""
        )}
      </span>
      <span
        className={`text-right tabular-nums ${
          won ? "font-bold text-green-2" : lost ? "text-white/40" : "text-white/25"
        }`}
      >
        {won ? fmt(bet.win!) : lost ? "0.00" : ""}
      </span>
    </div>
  );
}

/* --------------------------------- Top ----------------------------------- */

interface TopEntry {
  id: string;
  name: string;
  avatar: number;
  date: string;
  bet: number;
  win: number;
  result: number;
  roundMax: number;
}

function Top({
  bets,
  currency,
  metric,
  period,
  onMetric,
  onPeriod,
}: {
  bets: LiveBet[];
  currency: string;
  metric: (typeof topMetricTabs)[number];
  period: (typeof topPeriodTabs)[number];
  onMetric: (m: (typeof topMetricTabs)[number]) => void;
  onPeriod: (p: (typeof topPeriodTabs)[number]) => void;
}) {
  const entries = useMemo<TopEntry[]>(() => {
    const roundMax = 100 + Math.round(seeded(period, 7) * 4000) + 30.26;
    return bets.map((b) => {
      const r1 = seeded(b.id, period.length + 1);
      const r2 = seeded(b.id, period.length + 99);
      const result =
        1.5 + r1 * (period === "Year" ? 3500 : period === "Month" ? 2200 : 1200);
      const bet = 5 + Math.round(r2 * 1800 * 100) / 100;
      return {
        id: b.id,
        name: b.name,
        avatar: b.avatar,
        date: "18.06.26",
        bet,
        win: Math.round(bet * result * 100) / 100,
        result: Math.round(result * 100) / 100,
        roundMax: Math.round(roundMax * 100) / 100,
      };
    });
  }, [bets, period]);

  const sorted = useMemo(() => {
    const arr = [...entries];
    if (metric === "Win") arr.sort((a, b) => b.win - a.win);
    else if (metric === "Rounds") arr.sort((a, b) => b.bet - a.bet);
    else arr.sort((a, b) => b.result - a.result);
    return arr.slice(0, 40);
  }, [entries, metric]);

  return (
    <>
      <div className="shrink-0 space-y-1.5">
        <SubTabs items={topMetricTabs} active={metric} onChange={onMetric} />
        <SubTabs items={topPeriodTabs} active={period} onChange={onPeriod} />
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {sorted.map((e) => (
          <div key={e.id} className="mb-1.5 rounded-[14px] bg-[#15171a] px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar id={e.avatar} size={24} />
                <div className="leading-tight">
                  <div className="text-[12px] text-white/85">{e.name}</div>
                  <div className="text-[10px] text-white/35">{e.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn label="Provably fair">
                  <path
                    d="M12 3l7 3v5c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6l7-3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </IconBtn>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              <Cell label={`Bet ${currency}`} value={fmt(e.bet)} />
              <Cell
                label="Result"
                value={`${fmt(e.result)}x`}
                valueClass={tierColor[multTier(e.result)]}
                align="right"
              />
              <Cell
                label={`Win ${currency}`}
                value={fmt(e.win)}
                valueClass="text-white/80"
              />
              <Cell
                label="Round max."
                value={`${fmt(e.roundMax)}x`}
                valueClass="text-high"
                align="right"
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------ shared bits ------------------------------ */

function SubTabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: readonly T[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-2xl bg-[#15171a] p-1">
      {items.map((it) => (
        <button
          key={it}
          onClick={() => onChange(it)}
          className={`flex-1 rounded-xl py-1 text-[11px] font-medium transition ${
            active === it
              ? "bg-[#26282c] text-white"
              : "text-white/45 hover:text-white/75"
          }`}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

function IconBtn({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-md bg-[#23262a] text-white/40 transition hover:text-white/70"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
        {children}
      </svg>
    </button>
  );
}

function Cell({
  label,
  value,
  valueClass = "text-white/75",
  align = "left",
}: {
  label: string;
  value: string;
  valueClass?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <span className="text-white/35">{label} </span>
      <span className={`font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

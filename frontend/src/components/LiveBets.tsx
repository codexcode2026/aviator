import { useState } from "react";
import { useGame } from "../store/gameStore";
import { Avatar } from "./Avatar";
import { fmt, multTier } from "../lib/format";
import { Footer } from "./Footer";

const tabs = ["All Bets", "Previous", "Top"] as const;

const tierColor: Record<string, string> = {
  low: "text-low",
  mid: "text-mid",
  high: "text-high",
};

export function LiveBets() {
  const bets = useGame((s) => s.bets);
  const currency = useGame((s) => s.currency);
  const totalWin = useGame((s) => s.totalWin);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All Bets");

  const sorted = [...bets].sort((a, b) => {
    if (a.cashedOut && !b.cashedOut) return -1;
    if (!a.cashedOut && b.cashedOut) return 1;
    return b.bet - a.bet;
  });

  return (
    <div className="flex h-full flex-col bg-[#1b1d1f] p-1">
      {/* Tabs */}
      <div className="rounded-t-[18px] bg-[#111315] p-1">
        <div className="flex rounded-full bg-[#101113] p-0.5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-1.5 text-[11px] font-medium transition ${
                tab === t
                  ? "bg-[#2f3034] text-white"
                  : "text-white/55 hover:text-white/80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-end justify-between bg-[#111315] px-3 pb-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {bets.slice(0, 3).map((b) => (
              <Avatar key={`s-${b.id}`} id={b.avatar} size={24} />
            ))}
          </div>
          <span className="text-[12px] leading-none text-white/65">
            <span className="font-bold text-white">{bets.length}</span>/
            {bets.length} Bets
          </span>
        </div>
        <div className="text-right">
          <div className="text-[16px] font-extrabold leading-none text-white">
            {fmt(totalWin)}
          </div>
          <div className="mt-1 text-[11px] text-white/45">Total win {currency}</div>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_74px_42px_64px] gap-1 border-t border-[#232528] bg-[#181a1c] px-3 py-2 text-[10px] text-white/38">
        <span>Player</span>
        <span className="text-right">Bet {currency}</span>
        <span className="w-12 text-center">X</span>
        <span className="w-16 text-right">Win {currency}</span>
      </div>

      {/* List */}
      <div className="scroll-thin flex-1 overflow-y-auto bg-[#1b1d1f] py-1">
        {sorted.map((b) => {
          const won = b.cashedOut && b.cashedOutAt != null;
          return (
            <div
              key={b.id}
              className={`mx-1 mb-1 grid grid-cols-[1fr_74px_42px_64px] items-center gap-1 rounded-full px-2.5 py-[6px] text-[12px] ${
                won
                  ? "bg-[#173222]"
                  : "bg-[#0f1112]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5 truncate">
                <Avatar id={b.avatar} size={24} />
                <span className="truncate text-white/80">{b.name}</span>
              </div>
              <span className="text-right tabular-nums text-white/78">
                {fmt(b.bet)}
              </span>
              <span className="w-[42px] text-center">
                {won ? (
                  <span
                    className={`inline-block rounded-full bg-black/40 px-1.5 py-0.5 text-[11px] font-bold ${
                      tierColor[multTier(b.cashedOutAt!)]
                    }`}
                  >
                    {b.cashedOutAt!.toFixed(2)}x
                  </span>
                ) : (
                  ""
                )}
              </span>
              <span
                className={`w-16 text-right tabular-nums ${
                  won ? "font-bold text-green-2" : "text-white/30"
                }`}
              >
                {won ? fmt(b.win!) : ""}
              </span>
            </div>
          );
        })}
      </div>

      <Footer />
    </div>
  );
}

import { useEffect } from "react";
import { useGame } from "./store/gameStore";
import { Header } from "./components/Header";
import { HistoryBar } from "./components/HistoryBar";
import { GameCanvas } from "./components/GameCanvas";
import { BetPanels } from "./components/BetPanels";
import { LiveBets } from "./components/LiveBets";

export default function App() {
  const init = useGame((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex min-h-full w-full flex-col bg-[#1b1d1f]">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Desktop / tablet sidebar */}
        <aside className="hidden w-[280px] shrink-0 md:block">
          <LiveBets />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <HistoryBar />
          <div className="px-1">
            <GameCanvas />
          </div>
          <BetPanels />
        </main>

        {/* Mobile: live bets below main content */}
        <aside className="min-h-[220px] flex-1 border-t border-[#212226] md:hidden">
          <LiveBets />
        </aside>
      </div>
    </div>
  );
}

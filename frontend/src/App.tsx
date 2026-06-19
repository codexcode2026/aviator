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
    <div className="flex min-h-full w-full flex-col bg-[#1b1d1f] md:h-screen md:overflow-hidden">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Desktop / tablet sidebar */}
        <aside
          data-testid="sidebar-desktop"
          className="hidden w-[360px] shrink-0 md:block"
        >
          <LiveBets />
        </aside>

        <main data-testid="main-content" className="flex min-w-0 flex-1 flex-col">
          <HistoryBar />
          <div className="px-1 md:flex md:min-h-0 md:flex-1 md:flex-col">
            <GameCanvas />
          </div>
          <BetPanels />
        </main>

        {/* Mobile: live bets below main content — bounded box that scrolls internally */}
        <aside
          data-testid="sidebar-mobile"
          className="h-[78vh] shrink-0 border-t border-[#212226] md:hidden"
        >
          <LiveBets />
        </aside>
      </div>
    </div>
  );
}

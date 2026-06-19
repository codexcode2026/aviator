/** Stable selectors for the Aviator UI test suite. */
export const sel = {
  header: '[data-testid="header"]',
  historyBar: '[data-testid="history-bar"]',
  mainContent: '[data-testid="main-content"]',
  gameCanvas: '[data-phase]',
  betPanels: '[data-testid="bet-panels"]',
  betPanel: (i: 0 | 1) => `[data-testid="bet-panel-${i}"]`,
  liveBets: '[data-testid="live-bets"]',
  sidebarDesktop: '[data-testid="sidebar-desktop"]',
  sidebarMobile: '[data-testid="sidebar-mobile"]',
  logo: 'img[alt="Aviator"]',
  funMode: 'text=FUN MODE',
  footerFair: 'text=Provably Fair Game',
  footerSpribe: 'text=SPRIBE',
} as const;

export type GamePhase = "betting" | "flying" | "crashed";

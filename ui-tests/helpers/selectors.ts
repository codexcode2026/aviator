/** Stable selectors for the Aviator UI test suite. */
export const sel = {
  // ── Shell ──────────────────────────────────────────────────────────────
  header: '[data-testid="header"]',
  historyBar: '[data-testid="history-bar"]',
  mainContent: '[data-testid="main-content"]',
  gameCanvas: '[data-phase]',
  betPanels: '[data-testid="bet-panels"]',
  betPanel: (i: 0 | 1) => `[data-testid="bet-panel-${i}"]`,
  liveBets: '[data-testid="live-bets"]',
  sidebarDesktop: '[data-testid="sidebar-desktop"]',
  sidebarMobile: '[data-testid="sidebar-mobile"]',

  // ── Header ─────────────────────────────────────────────────────────────
  logo: 'img[alt="Aviator"]',
  balance: '[data-testid="header"] .text-balance',
  currency: '[data-testid="header"] [class*="text-white/55"]',

  // ── History bar ────────────────────────────────────────────────────────
  historyButton: 'button[aria-label="History"]',
  historyPopup: '.absolute.right-1.top-9',
  historyPill: '[data-testid="history-bar"] .font-bold',

  // ── Canvas ─────────────────────────────────────────────────────────────
  funMode: 'text=FUN MODE',
  multiplierText: '[data-phase] .tabular-nums',
  flyingCanvas: '[data-phase="flying"] canvas',
  playerBubble: '[data-phase] .rounded-full.bg-black\/50',
  countdownBar: '[data-phase="betting"] .bg-brand',
  loadingLogo: 'img[alt="Aviator"]',
  winToast: '.absolute.left-1\/2.top-3',
  crashFlash: '.pointer-events-none.absolute.inset-0.z-10',

  // ── Bet panel internals ────────────────────────────────────────────────
  betInput: (i: 0 | 1) => `[data-testid="bet-panel-${i}"] input`,
  betActionBtn: (i: 0 | 1) =>
    `[data-testid="bet-panel-${i}"] .grid > button.rounded-xl`,
  decreaseBtn: (i: 0 | 1) =>
    `[data-testid="bet-panel-${i}"] button[aria-label="Decrease"]`,
  increaseBtn: (i: 0 | 1) =>
    `[data-testid="bet-panel-${i}"] button[aria-label="Increase"]`,
  mergePanelBtn: 'button[aria-label="Merge into single panel"]',
  addPanelBtn: 'button[aria-label="Add second panel"]',
  autoCashOutClearBtn: 'button[aria-label="Clear auto cash out"]',

  // ── Sidebar ────────────────────────────────────────────────────────────
  footerFair: 'text=Provably Fair Game',
  footerSpribe: 'text=SPRIBE',
  allBetsTab: 'button:text-is("All Bets")',
  previousTab: 'button:text-is("Previous")',
  topTab: 'button:text-is("Top")',
} as const;

export type GamePhase = "betting" | "flying" | "crashed";

/** Chip values shipped with the app. */
export const CHIP_VALUES = [10, 20, 50, 100] as const;

/** Backend base URL. */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

# Aviator UI Test Suite

End-to-end Playwright tests for the Aviator crash game UI. Covers rendering, interactions, responsive layout, betting flows, and optional visual regression.

## Quick start

```bash
# From repo root — installs browsers (first time only)
npm run test:ui:install

# Fast suite (excludes slow round-wait + visual tests) — ~5 min
npm run test:ui

# Full suite including slow E2E waits — ~15 min
npm run test:ui:full

# Only slow / long-running tests
npm run test:ui:slow

# Visual snapshot regression (opt-in)
npm run test:ui:visual
npm run test:ui:update-snapshots   # refresh baselines
```

Tests auto-start **backend** (`:4000`) and **frontend** (`:5173`) if not already running.

## Structure

```
ui-tests/
├── playwright.config.ts   # Projects: desktop, tablet, mobile
├── global-setup.ts        # Browser pre-flight check
├── helpers/
│   ├── selectors.ts       # Stable data-testid / role selectors
│   ├── game.ts            # Phase waits, bet helpers
│   └── layout.ts          # Layout manifest assertions
├── specs/
│   ├── 01-smoke-layout.spec.ts
│   ├── 02-header.spec.ts
│   ├── 03-history-bar.spec.ts
│   ├── 04-game-canvas.spec.ts
│   ├── 05-bet-panels.spec.ts
│   ├── 06-sidebar.spec.ts
│   ├── 07-betting-flow.spec.ts
│   ├── 08-responsive.spec.ts
│   └── 09-visual.spec.ts  (@visual — excluded by default)
├── report/                # HTML report (gitignored)
└── results/               # Traces, screenshots on failure (gitignored)
```

## What is tested

| Area | Checks |
|------|--------|
| **Smoke** | No JS errors, all regions mount, no horizontal overflow |
| **Header** | Logo, balance, currency formatting |
| **History** | Multiplier pills, popup open/close, z-index |
| **Canvas** | FUN MODE, betting/flying/crashed states, player bubble |
| **Bet panels** | Chips, +/-, auto mode, merge/add, place bet |
| **Sidebar** | Tabs, progress bar, bet rows, Top tab (no chat icon), mobile scroll |
| **E2E flow** | Bet → cash out, queue bet, cancel, auto-bet lock |
| **Responsive** | Sidebar placement, panel grid, canvas sizing |
| **Visual** | Screenshot baselines per viewport (@visual) |

## Viewports

- **desktop** — 1366×768
- **tablet** — 768×1024
- **mobile** — Pixel 5 profile

## Reports

```bash
npm run test:ui:report   # open HTML report
```

## Environment variables

| Variable | Effect |
|----------|--------|
| `CI=1` | No server reuse, 2 retries |
| `FULL=1` | Include `@slow` tests |
| `SLOW_ONLY=1` | Run only `@slow` tests |
| `VISUAL=1` | Run `@visual` snapshot tests |
| `SKIP_WEBSERVER=1` | Assume servers already running |
| `UI_BASE_URL` | Override frontend URL (default `http://localhost:5173`) |

## Adding tests

1. Add `data-testid` hooks in components when roles are ambiguous.
2. Use `visibleSidebar(page)` for sidebar queries (desktop + mobile DOM both exist).
3. Tag long waits with `@slow` so the fast CI path stays quick.
4. Tag screenshot tests with `@visual`.

# UI Verification Report

**Last updated:** 2026-06-18  
**Screenshots:** `frontend/docs/screenshots/`  
**Scripts:**
- `npm run screenshots` — ours vs saved Spribe `aviator.html` (desktop / tablet / mobile)
- `npm run verify` — ours only, 5 viewports × 3 game states (15 captures)

---

## Responsive matrix (all PASS)

| Viewport | Size | Betting | Flying | Crashed |
|----------|------|---------|--------|---------|
| xs | 320×568 | ✅ | ✅ | ✅ |
| mobile | 414×896 | ✅ | ✅ | ✅ |
| tablet | 768×1024 | ✅ | ✅ | ✅ |
| laptop | 1024×768 | ✅ | ✅ | ✅ |
| desktop | 1366×768 | ✅ | ✅ | ✅ |

See `frontend/docs/screenshots/VERIFICATION.md` for file names.

---

## Screenshot comparison vs reference

Reference = saved offline `aviator.html` (Angular shell — canvas is black without live bundle).

### Desktop — PASS

| Check | Ours | Reference |
|-------|------|-----------|
| Full-width layout | ✅ | ✅ |
| Official `logo.svg` | ✅ | — (no logo in offline shell) |
| Sidebar 280px + main | ✅ | ✅ |
| Live bets + green wins | ✅ | ✅ |
| Total win live | ✅ | ✅ |
| FUN MODE banner | ✅ | ✅ |
| Sunburst + plane on curve | ✅ | ❌ black canvas |
| Spribe dot spinner (waiting) | ✅ | ❌ |
| Dual bet panels | ✅ | ✅ |
| Clock history icon | ✅ | ✅ |

### Tablet (768px) — PASS

| Check | Status |
|-------|--------|
| Sidebar visible (`md:` breakpoint) | ✅ |
| Flying state (plane + multiplier + glow tier) | ✅ |
| Total win updates during flight | ✅ |
| Dual bet panels | ✅ |

### Mobile (414px) — PASS

| Check | Status |
|-------|--------|
| Stack: header → history → canvas → panels → bets | ✅ |
| Live bets always visible (no toggle) | ✅ |
| Dual panels side-by-side | ✅ matches reference |
| All 3 game phases render | ✅ |

### Extra-small (320px) — PASS (minor note)

| Check | Status |
|-------|--------|
| Layout intact, no overflow | ✅ |
| Bet amount readable | ⚠️ tight — chips/button text slightly compressed |

---

## Game states verified

| State | Visual elements confirmed |
|-------|---------------------------|
| **Betting** | Red dot spinner, “Waiting for next round”, countdown bar, plane docked bottom-left |
| **Flying** | Curve + plane animation, large white multiplier, tier glow (blue → purple) |
| **Crashed** | “Flew Away!” + red multiplier, purple crash glow, plane flies off |

---

## Architecture fix (this session)

- **Single DOM tree:** `App.tsx` refactored from duplicate desktop/mobile trees to one responsive layout — fixes double `GameCanvas` instances and ensures mobile Playwright captures work correctly.

---

## Remaining gaps (P2/P3 — not blocking replica)

1. Offline reference HTML cannot show canvas animation — use live Spribe demo for animation parity
2. Waiting screen partner logos (UFC / Spribe badge)
3. Chat, sound, settings header icons
4. Previous / Top tabs data
5. Provably fair seed modal
6. 320px bet panel typography could be tightened further

---

## How to re-verify

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3 — full state matrix
cd frontend && npm run verify

# Terminal 3 — side-by-side vs offline reference
cd frontend && npm run screenshots
```

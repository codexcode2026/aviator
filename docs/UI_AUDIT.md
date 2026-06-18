# Aviator UI Audit — Reference vs Ours

**Reference:** [gameaviatorofficial.com](https://gameaviatorofficial.com/) → Spribe demo (`aviator-demo.spribegaming.com`)  
**Ours:** `http://localhost:5173` (`frontend/`)  
**Assets folder:** `Aviator Game - Official Website by Spribe _ Play Online & Demo_files/`  
**Audit date:** 2026-06-17  
**Viewports checked:** Desktop 1366×768, Tablet 768×1024, Mobile 414×896  

---

## How this was compared

| Source | What it represents |
|--------|-------------------|
| Live Spribe demo | Actual in-game UI (target) |
| Saved `aviator.html` | Offline snapshot of Spribe demo shell |
| User reference screenshots | Desktop + mobile states (betting, flying, cashout, crash) |
| `logo.svg` | Official marketing wordmark + plane illustration |
| `plane-reference.png` | Official in-game plane sprite (red + navy stripe + stylized **X**) |

---

## Summary

| Area | Match % | Notes |
|------|---------|-------|
| Overall layout (desktop) | ~75% | Sidebar + main split correct; spacing/width differs |
| Overall layout (mobile) | ~65% | Bets panel hidden by default; stacked panels differ |
| Game canvas | ~70% | Sunburst/glow close; plane asset wrong |
| Bet panels | ~80% | States work; colors/shadows/chips differ |
| Typography | ~60% | Montserrat ≠ Spribe geometric sans |
| Logo / branding | ~40% | Text approximation, not `logo.svg` |
| Plane asset | ~25% | Custom SVG, not official sprite |
| Missing features | — | Chat, settings, server seed, partner splash |

---

## 1. Global shell & layout

### 1.1 Page container

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Max width | Full viewport width | `max-w-[1280px]` centered | ❌ Wrong |
| Background | `#000` / `#0e0e10` edge-to-edge | Same color but letterboxed on wide screens | ❌ |
| Outer padding | None on game view | `px-2.5` around canvas | ⚠️ Minor |

**Desktop:** Reference uses full browser width; sidebar is ~280–300px fixed, game fills remainder.  
**Tablet:** Reference keeps sidebar until narrow breakpoint; ours flips at `lg` (1024px) only.  
**Mobile:** Reference is single column with bets always visible below canvas; ours hides bets behind “Show all bets”.

### 1.2 Demo notice bar

| | Reference | Ours |
|---|-----------|------|
| Placement | Inside demo iframe / overlay on marketing site | Extra full-width bar above entire app |
| Text | “You are playing the Aviator Demo mode” | Same text ✅ |
| Close button | Red circle × | Red circle × ✅ |
| Font size | ~17px desktop | `13px` mobile / `17px` sm+ | ⚠️ Mobile smaller |

**Issue:** On reference, demo bar does not push game layout down as a separate app chrome layer in the same way.

### 1.3 Responsive breakpoints

| Breakpoint | Reference | Ours |
|------------|-----------|------|
| Desktop | ≥ ~992px sidebar visible | `lg:` ≥ 1024px |
| Tablet | Sidebar + compressed main | Uses **mobile** layout until 1024px ❌ |
| Mobile | Single column, bets always shown | Single column, bets collapsed ❌ |

**Tablet-specific gap:** 768–1023px should show sidebar + dual bet panels side-by-side; we show mobile stack.

---

## 2. Header (`Header.tsx`)

| Element | Reference | Ours | Status |
|---------|-----------|------|--------|
| Logo | Official `logo.svg` wordmark (script plane art) | Montserrat italic text + mini SVG swoosh | ❌ |
| Logo size | ~100px wide image | `text-[18–20px]` | ❌ |
| Balance color | Bright green `#1ad65d` / `#28a909` | `text-balance` `#1ad65d` | ✅ Close |
| Balance format | `50,000.00` + `ZAR` separate | Same pattern | ✅ |
| Currency label | Smaller, muted, baseline aligned | `text-[11–12px] text-white/55` | ✅ |
| Header border | Thin red bottom line | `border-brand/70` | ✅ |
| Header bg | `#1b1c20` | `#1b1c20` | ✅ |
| Menu icon | Hamburger (3 lines) | Hamburger SVG | ✅ |
| **Missing** | Chat icon, sound toggle, settings, history clock in header | Only hamburger | ❌ |
| **Missing** | “How to play” / rules button | Not present | ❌ |

**Desktop:** Reference header is only over main column (not over sidebar). Ours matches ✅.  
**Mobile:** Same; menu opens bets on ours vs full nav on reference ⚠️.

---

## 3. History bar (`HistoryBar.tsx`)

| Element | Reference | Ours | Status |
|---------|-----------|------|--------|
| Multiplier pills | Colored text only (blue / purple / pink tiers) | Same tier colors | ✅ |
| Tier thresholds | `<2` blue, `2–10` purple, `>10` pink | Same logic in `multTier()` | ✅ |
| Font | Bold, ~12–13px, tight tracking | `text-[12–13px] font-bold` | ✅ |
| Scroll | Horizontal, no visible scrollbar | `no-scrollbar` | ✅ |
| History button | **Clock** icon in circle | **Three dots** icon | ❌ |
| Expanded history | Full modal / dropdown grid with pills on dark bg | Small dropdown top-right | ⚠️ Simpler |
| Pill shape in dropdown | Rounded pill with `bg-black/40` | Same | ✅ |
| Spacing between items | ~10–12px gap | `gap-2.5` (~10px) | ✅ |

**Mobile:** Reference history row sits directly under header with minimal padding; ours similar ✅.

---

## 4. Live bets sidebar (`LiveBets.tsx`)

### 4.1 Tabs

| | Reference | Ours |
|---|-----------|------|
| Labels | All Bets / Previous / Top | Same ✅ |
| Shape | Pill toggle, active = `#2c2d30` | Same ✅ |
| **Behavior** | Previous / Top switch data | Tabs UI only — **no data switch** ❌ |

### 4.2 Summary row

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Avatar stack | 3 real player avatars | 3 gradient circles | ⚠️ |
| Bet count | `175/175 Bets` (current/total) | `{n}/{n} Bets` always equal | ⚠️ |
| Total win | Updates live (green values) | **Hardcoded `0.00`** | ❌ |
| Label | `Total win ZAR` | Same | ✅ |

### 4.3 Table

| Column | Reference | Ours | Status |
|--------|-----------|------|--------|
| Player | Avatar + masked name | Same | ✅ |
| Bet ZAR | Right-aligned, white | Same | ✅ |
| X (multiplier) | Blue/purple **pill badge** on dark bg | Same pill style | ✅ |
| Win ZAR | Bold green when won | Same | ✅ |
| Winner row bg | `#1c3326` green tint | Same | ✅ |
| Row height | ~32–36px | `py-[7px]` | ✅ |
| Column headers | Uppercase, muted, 10px | Same | ✅ |
| Header color | Brownish-grey `#8a7a6a` approx | `text-white/40` | ⚠️ Slightly different hue |

### 4.4 Footer in sidebar

| | Reference | Ours |
|---|-----------|------|
| “Provably Fair Game” + shield | Present | Present ✅ |
| “Powered by SPRIBE” | Present | Present ✅ |
| Placement | Bottom of sidebar only (desktop) | Same desktop; also on mobile footer ❌ duplicate |

**Mobile:** Reference shows full bets list always. Ours: collapsed → **“Show all bets”** button ❌.

---

## 5. Game canvas (`GameCanvas.tsx`)

### 5.1 Container

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Aspect ratio | ~16:9, fills main width | `aspect-[16/10]` → `16/8` → `16/7` | ⚠️ |
| Corner radius | Slight rounding on outer game frame | `rounded-2xl` on canvas | ⚠️ More rounded |
| Side padding | Flush to main column edges | `px-2.5` parent padding | ⚠️ |

### 5.2 FUN MODE banner

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Text | `FUN MODE` white, uppercase | Same ✅ |
| Background | Orange/gold gradient `#f0a93a` → `#d6841a` | `from-[#f0a93a] to-[#d6841a]` | ✅ |
| Height | ~22–26px | `py-1` (~24px) | ✅ |
| Letter-spacing | Wide tracking | `tracking-[0.2em]` | ✅ |
| Position | Full width top of canvas, **square bottom edge** | Inside rounded canvas | ⚠️ |

### 5.3 Background — sunburst rays

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Origin | **Bottom-left corner** (curve start) | Bottom-left ~6%/94% | ✅ Close |
| Ray style | Sharp black wedges, ~30–40 rays | CSS `repeating-conic-gradient` 5°/6° | ⚠️ Approximation |
| Ray opacity | Very bold near origin, fades out | `rgba(0,0,0,0.9)` | ⚠️ |
| Rotation | Slow continuous spin | GSAP 130s rotate | ✅ |
| Vignette | Dark edges | Radial vignette overlay | ✅ |

### 5.4 Background — tier glow

| Tier | Reference | Ours |
|------|-----------|------|
| Low (`<2x`) | Blue radial from corner | `rgba(64,150,235,0.42)` | ✅ Close |
| Mid (`2–10x`) | Purple | `rgba(150,70,235,0.46)` | ✅ Close |
| High (`>10x`) | Magenta/pink | `rgba(214,40,170,0.5)` | ✅ Close |
| Betting phase | Subtle blue | Blue glow | ✅ |

### 5.5 Flight curve

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Line color | Bright red `#fb314f` / `#e93357` | `#fb314f` stroke | ✅ |
| Line width | ~3–4px with glow | 4px + shadow blur | ✅ |
| Fill under curve | Red gradient fade to transparent | Canvas gradient fill | ✅ |
| Curve shape | Exponential, starts bottom-left | `exp` parametric path | ✅ |
| Fill boundary | Closes to bottom edge | Closes to bottom | ✅ |

### 5.6 Plane asset ⚠️ CRITICAL

| | Reference (`plane-reference.png`) | Ours (`plane.tsx` SVG) |
|---|-------------------------------------|-------------------------|
| Asset type | Bitmap sprite (Spribe) | Hand-drawn SVG |
| Colors | Red body + **navy stripe** + red X on stripe | Red gradients only |
| X mark | Stylized red **X** on navy fuselage band | White X on red rectangle |
| Propeller | Red blades + blur disc | CSS blur div |
| Wheels | Small tucked grey wheels | SVG circles |
| Wing shape | Chunky low-wing monoplane | Similar but not identical |
| Tail | Upswept fin with navy shadow | Simplified |
| Size in flight | Larger, readable silhouette | ~80×136px container |
| Angle during flight | Nearly level (±5°) | Limited tilt `max -11°` | ✅ Improved |
| Waiting state | Static plane bottom-left | Hidden (`opacity: 0`) | ❌ |

**Action required:** Replace SVG with `plane-reference.png` (or extract sprites from Spribe assets).

### 5.7 Multiplier text

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Font | Heavy geometric sans (Spribe custom) | Montserrat ExtraBold | ⚠️ |
| Size flying | ~72–96px responsive | `clamp(46px, 11vw, 96px)` | ✅ |
| Color flying | White | White | ✅ |
| Color crashed | **Red** `#e50539` | Red `text-brand` | ✅ |
| “Flew Away!” | Above multiplier, white, uppercase | Same | ✅ |
| Text shadow | Soft dark glow | `text-stroke-dark` | ✅ |
| Decimal format | Always 2 decimals + `x` | `toFixed(2)x` | ✅ |

### 5.8 Waiting / betting phase

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Main text | `WAITING FOR NEXT ROUND` | Same ✅ |
| Spinner | Red dots ellipsis animation (Spribe) | CSS ring + tiny plane SVG | ❌ |
| Progress bar | Thin red bar, full width ~40% of canvas | `w-48`/`w-64` centered bar | ⚠️ Narrower |
| Partner splash | UFC + Aviator logos, “OFFICIAL PARTNERS” | **Not present** | ❌ |
| Spribe badge | “Official Game Since 2019” green badge | **Not present** | ❌ |
| Static plane | Plane visible bottom-left before round | Plane hidden | ❌ |

### 5.9 Player count bubble

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Position | Bottom-right of canvas | Same ✅ |
| Content | 3 avatars + count (~180–320) | 3 blue circles + fake count | ⚠️ |
| Background | `bg-black/40` pill | Same | ✅ |

### 5.10 Win toast / cashout overlay

| | Reference | Ours | Status |
|---|-----------|------|--------|
| On canvas | “You have cashed out” green chip | Center-top toast | ⚠️ Position |
| On bet button | Green chip **on button** showing multiplier | Not on button | ❌ |
| Format | `1.19x` on button after cashout | Toast only | ❌ |

### 5.11 Crash state

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Text | `Flew Away!` + red multiplier | Same ✅ |
| Plane animation | Flies off screen / fades | GSAP fly-off | ✅ |
| Pause duration | ~3s | 3s backend | ✅ |

---

## 6. Bet panels (`BetPanel.tsx` / `BetPanels.tsx`)

### 6.1 Panel container

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Desktop layout | **Two panels side-by-side** | `lg:grid-cols-2` | ✅ |
| Mobile layout | **Two panels stacked** | Stacked ✅ |
| Panel bg | `#1b1c20` | Same | ✅ |
| Border | Subtle `#222327` | Same | ✅ |
| Border radius | ~16px | `rounded-2xl` (16px) | ✅ |
| Gap between panels | ~10px | `gap-2.5` | ✅ |

### 6.2 Bet / Auto tabs

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Toggle style | Pill, active `#2c2d30` | Same | ✅ |
| Labels | Bet / Auto (capitalized) | lowercase CSS `capitalize` → “Bet” | ✅ |
| Position | Centered above controls | Centered | ✅ |
| Panel 2 collapse | Minus icon right of tabs | Collapse button | ✅ |

### 6.3 Amount input row

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Shape | Pill `rounded-full` | Same | ✅ |
| Background | `#0d0e10` | Same | ✅ |
| +/- buttons | Circular `#2c2d30` | Same | ✅ |
| Default value | `2.00` | `2.00` | ✅ |
| Font | Bold 15px white | Same | ✅ |

### 6.4 Quick chips

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Values | 10, 20, 50, 100 | Same | ✅ |
| Layout | 2×2 grid | Same | ✅ |
| Shape | Rounded pill buttons | Same | ✅ |
| Action | **Set** amount | **Add** to amount | ❌ Behavior |

### 6.5 Action button — Bet (green)

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Gradient | `#3fc94a` → `#1f9e2c` | Same | ✅ |
| 3D shadow | `box-shadow: 0 4px 0 #147a1f` | `shadow-[0_4px_0_#147a1f]` | ✅ |
| Text | `Bet` + amount ZAR stacked | Same | ✅ |
| Height | Matches left column | `min-h-[78px]` | ✅ |

### 6.6 Action button — Cancel (red)

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Color | Coral/red gradient | `#e0524d` → `#c2403c` | ✅ |
| Shows amount | Yes | Yes | ✅ |

### 6.7 Action button — Cash Out (orange)

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Gradient | Orange/yellow | `#ffaf3a` → `#f08a1c` | ✅ |
| Text color | Black on orange | Black | ✅ |
| Live win amount | Updates with multiplier | `amount × multiplier` | ✅ |
| Pulse animation | Subtle on multiplier tick | GSAP pulse | ✅ |

### 6.8 Action button — Waiting

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Grey disabled state | “Waiting…” animated dots | Same | ✅ |
| After cashout chip | Green multiplier badge on button | Missing | ❌ |

### 6.9 Auto mode

| | Reference | Ours | Status |
|---|-----------|------|--------|
| Auto bet toggle | iOS-style switch | Custom toggle | ⚠️ |
| Auto cashout toggle | Same + numeric input | Same | ✅ |
| Auto cashout min | 1.01x | 1.01x | ✅ |
| Layout | Below main controls | Border-top section | ✅ |

---

## 7. Footer (`Footer.tsx`)

| | Reference (in-game) | Ours |
|---|---------------------|------|
| Desktop | Only in sidebar bottom | Sidebar bottom ✅ |
| Mobile | Part of bets section | Separate footer under “Show all bets” |
| Shield icon | Green shield + text | SVG shield ✅ |
| SPRIBE text | Bold white | `font-extrabold` ✅ |

---

## 8. Typography

| Use | Reference | Ours | Status |
|-----|-----------|------|--------|
| Primary UI | Spribe geometric sans (similar to **Rubik** / custom) | **Montserrat** | ❌ |
| Logo | Script + illustration (`logo.svg`) | Montserrat italic | ❌ |
| Multiplier | Ultra-heavy, tight tracking | `font-extrabold tabular-nums` | ⚠️ |
| Small labels | 10–11px uppercase muted | Same range | ✅ |
| Balance | Bold green 15–17px | Same | ✅ |

**Note:** `index.css` still declares unused `@font-face` for Inter — dead code.

---

## 9. Colors (token comparison)

| Token | Reference | Ours (`index.css`) | Match |
|-------|-----------|-------------------|-------|
| Brand red | `#E50539` | `#e50539` | ✅ |
| Panel bg | `#1b1c20` | `#1b1c20` | ✅ |
| Page bg | `#0e0e10` / `#000` | `#0e0e10` | ✅ |
| Green bet | `#28a909` / `#34b94a` | `#28a909` / `#34b94a` | ✅ |
| Balance green | `#1ad65d` | `#1ad65d` | ✅ |
| Low mult | `#34b4ff` | `#34b4ff` | ✅ |
| Mid mult | `#913ef8` | `#913ef8` | ✅ |
| High mult | `#c017b4` | `#c017b4` | ✅ |
| FUN MODE orange | `#f0a93a` | `#f0a93a` | ✅ |

---

## 10. Missing components (not built)

| Component | Reference | Ours |
|-----------|-----------|------|
| In-game chat | Bottom-left chat drawer | ❌ |
| Sound toggle | Header icon | ❌ |
| Settings menu | Header hamburger → settings | ❌ Partial (menu = bets on mobile) |
| Provably fair modal | Server seed / client seed UI | ❌ |
| Round ID display | Sometimes in footer | ❌ |
| “Previous” / “Top” bets data | Functional tabs | ❌ UI only |
| Partner branding screen | UFC + Spribe (FUN MODE) | ❌ |
| Age confirmation | On marketing site only | N/A |
| Server connection indicator | Green dot “connected” | ❌ |

---

## 11. Viewport-specific issues

### Desktop (≥1366px)

1. ❌ `max-w-[1280px]` — game not full width  
2. ❌ Logo not using `logo.svg`  
3. ❌ Plane sprite wrong  
4. ❌ Total win stuck at 0.00  
5. ⚠️ History button icon (dots vs clock)  
6. ❌ Missing header icons (chat, sound)  
7. ⚠️ Waiting screen missing partner splash  

### Tablet (768–1023px)

1. ❌ Uses **mobile** layout (no sidebar) — should keep sidebar  
2. ❌ Bet panels stack vertically — should stay side-by-side  
3. ❌ Bets list hidden behind toggle  

### Mobile (≤414px)

1. ❌ Live bets not visible by default  
2. ❌ “Show all bets” extra step  
3. ⚠️ Demo bar text smaller (13px vs 17px)  
4. ⚠️ Canvas aspect ratio taller than reference  
5. ❌ No cashout multiplier chip on bet button  
6. ✅ Dual bet panels stacked correctly  
7. ✅ FUN MODE + history + header present  

---

## 12. Assets inventory

| Asset | In reference folder | In our project | Used? |
|-------|--------------------|--------------------|-------|
| `logo.svg` | ✅ | ❌ | Should replace `Logo.tsx` |
| `mune1.svg` | ✅ (menu) | Custom hamburger | ⚠️ |
| `close_icon.svg` | ✅ | Custom × SVG | ⚠️ |
| `plane-reference.png` | User provided | Copied to `frontend/public/plane-reference.png` | ❌ Not wired |
| `av-28.png` | In folder | — | ❌ Wrong file (not plane) |
| `styles.*.css` | Marketing site CSS | — | N/A (not game UI) |
| `aviator.html` | Spribe demo snapshot | — | Reference only |

---

## 13. Priority fix list

### P0 — Visual identity (must fix for “exact copy”)

1. **Replace plane** — use `plane-reference.png` or official sprite in `GameCanvas`  
2. **Replace logo** — use `logo.svg` from assets in `Header`  
3. **Fix font** — match Spribe (try Rubik / Inter Tight / extract from demo CSS)  
4. **Remove `max-w-[1280px]`** — full-width layout  

### P1 — Layout & responsiveness

5. Add tablet breakpoint (`md`/`lg`) — sidebar + side-by-side panels at 768px  
6. Show live bets always on mobile (remove “Show all bets” gate)  
7. Wire **total win** in sidebar to `totalWin` from store  
8. Implement **Previous / Top** tab data  

### P2 — Canvas polish

9. Waiting screen — partner logos + Spribe badge + Spribe dot spinner  
10. Static plane visible bottom-left during betting  
11. Cashout multiplier chip **on bet button** (not just toast)  
12. History button → clock icon  
13. Quick chips **set** value instead of **add**  

### P3 — Missing features

14. Chat panel  
15. Sound / settings  
16. Provably fair seed modal  
17. Server connection indicator  

---

## 14. Files to change (implementation map)

| Component | File |
|-----------|------|
| Layout / breakpoints | `frontend/src/App.tsx` |
| Logo | `frontend/src/assets/Logo.tsx` |
| Plane | `frontend/src/assets/plane.tsx`, `GameCanvas.tsx` |
| Canvas / effects | `frontend/src/components/GameCanvas.tsx` |
| Header | `frontend/src/components/Header.tsx` |
| History | `frontend/src/components/HistoryBar.tsx` |
| Live bets | `frontend/src/components/LiveBets.tsx` |
| Bet panels | `frontend/src/components/BetPanel.tsx` |
| Fonts / tokens | `frontend/index.html`, `frontend/src/index.css` |

---

*End of audit. Use this document as the checklist for pixel-parity work.*

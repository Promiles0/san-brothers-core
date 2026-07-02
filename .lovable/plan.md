
## Scope
Landing area only — the public navbar and the home `Hero` background. No other pages, no auth/data logic, no i18n key changes.

---

## 1. Pure glassmorphism navbar (`src/components/layout/public-navbar.tsx` + `src/styles.css`)

Match the reference (Athleats): one long floating pill, real frosted glass over the page, no solid fill, no gradient, subtle inner highlight + soft outer shadow.

**Changes**
- Rewrite the `.floating-nav` utility in `src/styles.css` to be true glassmorphism:
  - `background: color-mix(in oklab, var(--background) 35%, transparent)`
  - `backdrop-filter: blur(24px) saturate(160%)` (standard property only — Lightning CSS handles the `-webkit-` prefix per project rules)
  - `border: 1px solid color-mix(in oklab, var(--foreground) 12%, transparent)`
  - Inner top highlight via `box-shadow: inset 0 1px 0 color-mix(in oklab, white 25%, transparent), 0 8px 32px -12px rgb(0 0 0 / 0.25)`
  - Dark-mode variant tuned the same way with the dark background token
- In `public-navbar.tsx`: keep the current three-region layout (nav links / centered logo / actions) but remove any non-glass fills, drop the `shadow-lg` on scroll (glass already handles depth), and let the pill stay glass at all scroll positions. No gradient anywhere.
- Mobile sheet keeps its current glass card.

**Constraint respected:** no new packages, no invented Tailwind classes — glass lives in a single CSS utility.

---

## 2. LightRays hero background (`src/components/fx/light-rays.tsx` + `src/routes/index.tsx`)

Replace the current hero background stack (`bg-gradient-to-b from-secondary/40 …`, `Aurora`, `DotGrid`, `CursorSpotlight`) with the `LightRays` WebGL component from the uploaded spec.

**Files**
- **New:** `src/components/fx/light-rays.tsx` — the exact component from the uploaded file (typed, cleanup-safe, IntersectionObserver-gated).
- **Edit:** `src/routes/index.tsx` `Hero` section — remove the gradient background class and the `Aurora` + `DotGrid` + `CursorSpotlight` layers, mount `<LightRays />` as the single absolute-positioned background layer behind the hero content. Keep the floating service glyphs, `RotatingText`, CTAs, and stats untouched.

**Color rule (your instruction: no gradient, one solid color):**
- `raysColor` = the brand primary `#1F3864` in light mode, and a lighter navy `#5B7FBF` in dark mode (readable against dark bg). Picked via a `useTheme()` read so both themes work with one solid color each. No gradient overlay on top.

**LightRays config**
```
raysOrigin="top-center"
raysSpeed={0.9}
lightSpread={0.7}
rayLength={1.4}
followMouse
mouseInfluence={0.1}
noiseAmount={0.05}
distortion={0.03}
fadeDistance={1.0}
saturation={1.0}
```

**Dependency**
The component requires `ogl` (WebGL micro-lib, ~10KB, no native deps, Worker-safe since it's client-only). This is the one exception to the "no new packages" rule for this task — install with `bun add ogl` before writing the component. Please confirm this is OK; if not, I'll fall back to a pure-CSS conic-gradient rays approximation instead.

---

## Verification
- Preview the home page in light + dark: navbar reads as frosted glass over hero content (you should see hero shapes softly through it).
- Hero shows animated light rays in solid brand color, no gradient washes.
- No console errors, no layout shift, `PublicLayout` spacing unchanged.

## Out of scope
- Translate/Consultancy navbars, footer, other routes.
- Any content, copy, or i18n changes.
- Removing the floating service glyphs or rotating text.

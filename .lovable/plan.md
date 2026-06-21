# Scroll & Page Transition Animation Layer

Goal: make the site feel alive — every route change runs a polished transition, and every section reveals as the user scrolls. Build on the existing FX stack (we already have `PageTransition`, `ScrollProgress`, `ParallaxLayer`, `TiltCard`, `Magnetic`, `AnimatedCounter`, `CustomCursor`) and add the missing scroll + transition primitives.

All work is CSS + IntersectionObserver + rAF. No new npm packages. Fully respects `prefers-reduced-motion`. SSR-safe.

## 1. New FX primitives (`src/components/fx/`)

- `Reveal.tsx` — single wrapper with variants: `fade-up`, `fade`, `slide-left`, `slide-right`, `zoom`, `blur-in`. Props: `delay`, `duration`, `once`, `threshold`. IntersectionObserver-driven.
- `StaggerGroup.tsx` + `StaggerItem.tsx` — staggered grid/list reveals (cards animate one-by-one) using CSS custom-property `--i` for index-based delay.
- `SplitReveal.tsx` — two children slide in from opposite sides simultaneously.
- `StickySection.tsx` — wraps a section that pins while inner content (passed as children) animates with scroll progress (uses `position: sticky` + scroll-linked CSS var `--p`).
- `ScrollScene.tsx` — generic scroll-progress-driven transform wrapper. Children receive a `--p` CSS var (0→1) tied to viewport position; consumers use it for rotate/scale/translate via inline CSS.
- `TextReveal.tsx` — word/line mask reveal for headings (split by space, animate each word with stagger).
- Enhance `PageTransition.tsx` — add `mode` prop: `fade` (current), `slide`, `zoom`, `blur`. Default `fade`. Route-driven via a `data-transition` attribute set on the wrapper.

## 2. Global CSS additions (`src/styles.css`)

Add keyframes + utilities (all gated by `prefers-reduced-motion: no-preference`):

- `@keyframes` for: `reveal-fade-up`, `reveal-fade`, `reveal-slide-left`, `reveal-slide-right`, `reveal-zoom`, `reveal-blur`, `reveal-text-word`, `page-slide-in`, `page-zoom-in`, `page-blur-in`.
- Utility classes: `.fx-reveal`, `.fx-reveal[data-variant=...]`, `.fx-reveal.is-visible` (triggers animation).
- `.fx-stagger > * { animation-delay: calc(var(--i, 0) * 70ms); }`.
- `.fx-page-slide`, `.fx-page-zoom`, `.fx-page-blur` variants for `PageTransition`.
- `.fx-sticky-scene` helper (sticky positioning, viewport height).
- Glassmorphism overlay utility `.fx-glass` (backdrop-blur + translucent bg) for transition overlays.
- All animations end with `@media (prefers-reduced-motion: reduce)` overrides setting `animation: none; transform: none; opacity: 1`.

## 3. Page rollouts

Apply the new primitives consistently across these routes (preserve all existing logic, Supabase queries, i18n keys, audit calls):

- `src/routes/index.tsx` — wrap each major section in `Reveal` (fade-up); stats strip uses `StaggerGroup`; services grid uses `StaggerGroup` around existing `TiltCard`s; hero headline uses `TextReveal`; process tracker uses `SplitReveal`.
- `src/routes/services.index.tsx` — hero headline `TextReveal`; stats grid `StaggerGroup`; service cards `StaggerGroup`.
- `src/routes/pricing.tsx` — tier cards `StaggerGroup` with `Reveal` zoom variant; FAQ block fade-up.
- `src/routes/about.tsx` — principles + differentiators `StaggerGroup`; CTA `Reveal slide-up`; one `StickySection` for the company story column.
- `src/routes/contact.tsx` — form fields fade-up; contact channel cards `StaggerGroup`.
- `src/routes/faq.tsx` — group headers `Reveal`; CTAs `Reveal`. (Skip animations inside Accordion content — known IntersectionObserver pitfall noted in project rules.)

## 4. Route-level page transition variants

Map a transition style per route group so navigation feels intentional, not uniform:

- Home `/` → `fade`
- `/services*` → `slide` (horizontal)
- `/pricing` → `zoom`
- `/about` → `fade`
- `/contact` → `blur`
- `/faq` → `fade`

Implemented inside `PageTransition` by reading current pathname and picking the variant; falls back to `fade`.

## 5. Verification

- Smoke-check each route in preview (mobile + desktop viewport) for: no layout shift, no flash of invisible content (FOIC), animations replay on route change, reduced-motion users see static content.
- Confirm no shadcn Tabs/Accordion content uses `Reveal` (per project rule).
- Confirm no new i18n keys needed (purely presentational).

## Out of scope

- No new packages (no Framer Motion, GSAP, Lenis).
- No changes to auth, Supabase queries, RLS, or business logic.
- No changes to dashboard/admin/staff routes — public marketing pages only.
- No 3D flip / morphing-layout transitions (would need heavy DOM choreography; can be added later if desired).

## Technical notes

- IntersectionObserver instances are created per-component and disconnected on unmount; `once: true` (default) disconnects after first trigger to avoid memory growth on long pages.
- Scroll-linked components (`ScrollScene`, `StickySection`) share a single rAF loop pattern (same as existing `ScrollProgress` / `ParallaxLayer`).
- All `useEffect`s early-return on `typeof window === 'undefined'` for SSR safety.
- `PageTransition` keys off pathname (already does) — adding the variant just swaps the className applied to the keyed wrapper.

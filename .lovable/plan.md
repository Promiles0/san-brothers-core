# Make scroll animations feel intentional + add rotating hero word

The current `AutoReveal` runs once per section with subtle 24px translations at default browser timing, so on a fast scroll users barely notice anything. We'll make the reveals dramatic, varied, and apply them to inner content blocks (not just the outer `<section>`), and add a word-rotator in the hero headline.

## 1. Rotating hero word (`RotatingText` FX primitive)

New component `src/components/fx/rotating-text.tsx`:
- Cycles through an array of words every ~2.2s
- Each swap: old word slides up + blurs out, new word slides up + fades/un-blurs in
- Inline-block, width animates to fit current word (no layout jump)
- Pauses on `prefers-reduced-motion` (shows first word only)

Wired into hero (`src/routes/index.tsx` `Hero()`):
- Headline becomes: `"{prefix} <RotatingText words=[…]/> {suffix}"`
- Words pulled from i18n (`home.heroRotatingWords` array, added to `en.json`/`zh.json`/`rw.json`): e.g. "visas", "translation", "accounting", "consultancy", "business setup" (localized).
- Static i18n keys `home.heroRotatingPrefix` / `home.heroRotatingSuffix` for the framing text so all three locales read naturally.

Existing `home.heroTitle` stays as fallback for SEO/SSR (rendered server-side, then replaced on mount).

## 2. Stronger, more varied scroll reveals

Rewrite `src/components/fx/auto-reveal.tsx` + extend `src/styles.css`:

**Broader targeting** — don't just animate `<section>`s. Inside each section, auto-tag these as individual reveals:
- Direct headings (`h1,h2,h3`) → `fade-up` with 80ms delay
- Paragraphs directly under headings → `fade-up` 160ms
- Cards (`[class*="rounded-2xl"][class*="border"]`, `.glass-card`) inside a grid → stagger items
- Standalone images / canvases → `zoom`
- Generic block elements with `data-fx` attribute → honored variant

**Stronger animation values** (in `styles.css`):
- Duration: `0.9s` → `1.1s` (was ~0.7s)
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) — already used; keep
- Translation distance: 24px → **56px** for `fade-up`, 80px for slide variants
- `zoom`: 0.94 → **0.82** + slight blur
- `blur-in`: blur 10px → **18px**
- Stagger step: 90ms → **140ms** with base 80ms

**More variants per page** — rotate through `fade-up, slide-left, slide-right, zoom, blur-in` per section index so consecutive sections feel different (currently we already alternate, but with weaker values it isn't visible).

**Re-trigger on scroll-back** — change observer to NOT unobserve; toggle `is-visible` based on intersection so users see animation again when scrolling up (only for section-level reveals, not stagger items, to avoid jank).

**Earlier trigger** — `rootMargin: "0px 0px -10% 0px"` so reveals fire while content is well inside viewport, then sustain.

## 3. New utility: `data-fx` attribute opt-in

For per-element control without React imports, add CSS hooks:
```
[data-fx="fade-up"], [data-fx="slide-left"], …
```
Same keyframes as `.fx-reveal[data-variant=…]`. `AutoReveal` reads `data-fx` first, falls back to auto-assigned variant.

## 4. Hero specifically

In `Hero()`:
- Replace `home-fade-up` static classes with `data-fx="slide-right"` on copy column and `data-fx="zoom"` on the 3D logo column
- Stats strip cards: stagger with `slide-up`, step 140ms (already a grid → AutoReveal handles)
- ServicesGrid cards: keep TiltCard, wrap grid in stagger w/ `zoom` variant
- WhyUs / Process / SocialProof / CTA sections: rotate through `slide-left`, `slide-right`, `blur-in`, `fade-up`

## 5. Accessibility

- All new animations gated by `@media (prefers-reduced-motion: no-preference)`
- Rotating text falls back to single word
- Reduce block already covers `.fx-reveal`, `.fx-stagger`, `[data-fx]` (extend it)

## Files

**Created**
- `src/components/fx/rotating-text.tsx`

**Edited**
- `src/components/fx/auto-reveal.tsx` (broader selectors, re-trigger, stronger defaults)
- `src/styles.css` (stronger keyframes/values, `[data-fx]` utility, reduced-motion update)
- `src/routes/index.tsx` (use `RotatingText` in hero, sprinkle `data-fx` attrs)
- `src/messages/en.json` + `zh.json` + `rw.json` (`home.heroRotatingPrefix`, `home.heroRotatingSuffix`, `home.heroRotatingWords[]`)

## Out of scope
- No new npm packages
- No changes to auth, Supabase, or i18n provider internals
- No edits inside Tabs/Accordion content (per project rule — IntersectionObserver pitfall)
- Other pages (services/about/etc.) inherit the upgraded `AutoReveal` automatically; no per-page edits beyond home

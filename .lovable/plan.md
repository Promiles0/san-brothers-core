## Goal

Take the three landing heroes — `/`, `/translate`, `/consultancy` — from "competent template" to a distinctive, modern, on-brand experience. Keep the San Brothers logo and all existing copy / i18n keys / Supabase calls. No new npm packages.

## Design commitment (so it doesn't slide back into generic)

- One brand voice across all three heroes: warm primary + accent gradient, off-balance centered layout, deliberate negative space, type that scales aggressively (`text-7xl` on desktop), one heavy motion moment per screen instead of micro-twitches everywhere.
- Motion register: slow, organic, cursor-aware. Nothing bouncy. Reduced-motion fully respected.
- No purple/indigo-on-white gradients, no generic blurred blobs as the only background, no identical 4-card stat strips, no 3-column "Why us" with circle icons.

---

## 1. Hero — main site (`src/routes/index.tsx`)

### 1a. Cursor-interactive 3D logo (`Logo3D` / `Logo3DScene`)

- Capture pointer position at the Canvas level and pass normalized x/y into `Logo3D` via a ref.
- `useFrame`: blend the existing idle rotation with a cursor-driven target rotation (`rotation.y → lerp(idle + nx*0.5)`, `rotation.x → lerp(idle - ny*0.4)`). Slight `position.z` push toward the cursor for parallax.
- Magnetic pull: translate the whole group ~6% toward the cursor with damping (`MathUtils.damp`).
- Click ripple: on Canvas `onPointerDown`, trigger a CSS-driven ring burst in a sibling absolutely-positioned div over the hero (expanding `border` + fade, 700 ms). Pure CSS, GPU-only.
- A soft radial "light spot" `div` follows the cursor inside the logo container — `radial-gradient` mask, mix-blend-mode `screen`, 20% opacity, updated via `requestAnimationFrame` (throttled).
- Reduced-motion: skip cursor follow + ripple, keep current idle drift.

### 1b. Ambience replacement (replaces the two `ParallaxLayer` blur blobs + `home-mesh`)

- **Warped dot-grid**: SVG/Canvas grid of small dots (24px spacing) drawn once; on pointermove inside the hero, dots within radius 180 px shift toward/away from the cursor (sine falloff). Renders at <1% CPU on a single canvas, GPU composited. Subtle by default (~12% opacity), brightens to ~25% near the cursor.
- **Drifting aurora**: two slow CSS keyframe layers (`conic-gradient` rotating 60s, `radial-gradient` translating in a figure-8 over 40s) tinted with brand tokens (`--primary`, `--accent`). Sits *behind* the dot-grid at 35% opacity.
- **Floating service glyphs**: 4–5 lucide icons (`Plane`, `Languages`, `Calculator`, `Briefcase`, `Globe`) absolutely positioned at different depths, each wrapped in `ParallaxLayer` with varying `speed` values (-0.3 to +0.4) and a slow CSS float keyframe. Muted color, 6–10% opacity — felt, not read.

### 1c. Headline: scroll-linked word-mask reveal

- New tiny component `WordMask` (next to `RotatingText`, same `src/components/fx/` folder): splits the *current* rotating phrase into words, each in an `inline-block` span with a clip-path mask. On first paint each word slides up from below the mask line with 60ms stagger. On rotate, run the same animation again per phrase.
- Pair with a thin moving gradient underline drawn under the headline that travels left-to-right on each phrase rotation.

### 1d. Cleanup

- Remove `PageStyles` inline `home-fade-up` classes (no longer used after redesign).
- Keep `Magnetic` CTAs, language strip, WhatsApp link, and trust pills unchanged.

---

## 2. Hero — Translate (`src/routes/translate/index.tsx`)

Currently a centered headline with two CTAs and a flag strip. Make it feel like a live service desk, not a generic SaaS hero.

- **Layout**: shift from dead-center to 60/40 split on `md+` — copy left, an animated "live operator" visual right.
- **Visual right**: a stacked, lightly-tilted card collage:
  - Top card: a fake "Live call" pill with a pulsing dot, current language pair (cycles through EN↔ZH, EN↔RW, EN↔FR via the same `RotatingText` primitive), and a stylized waveform (CSS-only animated bars).
  - Behind it: a translated chat-bubble pair (one source, one translated) that swaps phrases every 4s.
  - All cards subtly tilt toward the cursor (re-use `TiltCard` *but with a 4° max and damped lerp* — fixes the prior shake by clamping output and pointer-events on container, not children).
- **Ambience**: same warped dot-grid + aurora, accent-tinted (translate brand leans accent over primary).
- **Headline**: apply the same `WordMask` reveal.
- **CTAs**: keep as-is but wrap in `Magnetic` for consistency with main site.

---

## 3. Hero — Consultancy (`src/routes/consultancy/index.tsx`)

Currently a centered headline with three CTAs. Add visual weight and brand consistency.

- **Layout**: keep centered headline; introduce an under-headline "stat triplet" rendered as three large numerals with thin dividers (e.g. *500+ Companies registered · 15 yrs experience · 5 languages*) — replaces the generic flag strip, which moves below.
- **Visual**: behind the headline, render a low-opacity vector blueprint pattern (CSS `linear-gradient` + `repeating-linear-gradient` for graph-paper feel) — fits the "business setup" mental model better than blur blobs. Cursor reveals a brighter circular spotlight on it.
- **Headline**: `WordMask` reveal.
- **CTAs**: wrap in `Magnetic`.
- **Floating glyphs**: `Building2`, `ClipboardCheck`, `TrendingUp`, `Award` at varying parallax speeds.

---

## 4. Generic-section redesigns (main site only — translate/consultancy already lighter)

### 4a. Stats strip → "Editorial counter band"

Replace the 4 identical bordered cards with:
- A single full-bleed dark band (`bg-foreground text-background` or token equivalent) with a thin top/bottom border in `--accent`.
- One row of 4 stats separated by tall vertical dividers (no card chrome). Massive numerals (`text-6xl md:text-7xl`), tiny ALL-CAPS labels under them.
- A horizontal scrolling marquee of muted client-type words behind the numerals (`"Visa applicants · Importers · Diaspora · Investors · Students · NGOs …"`) at 5% opacity, looping CSS-only.

### 4b. "Why us" → vertical timeline / bento

Replace the 3-column icon-card layout with a **bento grid** (2 columns on `md`, 1 on mobile):
- One large feature tile (spans 2 cols on `lg`) with a big icon, headline, longer description, and a soft brand-gradient background.
- 3–4 supporting tiles of varying heights, each with hover-tilt and a small accent ribbon.
- All tiles share a unified rounded radius (`rounded-3xl`) and a consistent inner padding scale.

### 4c. Process → numbered horizontal stepper with progress line

Replace the current step cards with a connected horizontal stepper:
- 4 large circular step badges connected by a thin gradient line (`--primary → --accent`) that fills on scroll using IntersectionObserver + CSS variable.
- Each step has the existing icon + title + desc below the badge.
- On mobile, becomes a vertical timeline with the progress line on the left.

### 4d. Social proof → editorial pull-quote + marquee

Replace the testimonial card row with:
- One large featured quote at the top (oversized opening quote mark in `--accent`, body in serif-feeling weight via existing tokens, attribution with role + flag).
- Below: an auto-scrolling logo/text marquee of client types or partner names (CSS keyframes, pauses on hover). Two rows scrolling opposite directions.

---

## 5. New / changed files

- **New**: `src/components/fx/word-mask.tsx` — split-word reveal primitive, reused by all 3 heroes.
- **New**: `src/components/fx/dot-grid.tsx` — canvas-based warped dot grid with cursor interaction + reduced-motion fallback.
- **New**: `src/components/fx/aurora.tsx` — pure-CSS aurora layer (no JS).
- **New**: `src/components/fx/cursor-spotlight.tsx` — small radial-gradient follower for the logo area + consultancy blueprint.
- **Edit**: `src/components/fx/tilt-card.tsx` — clamp output range, damp via `requestAnimationFrame`, set `pointer-events-none` on the inner transform layer to fix the prior shake/missed-click.
- **Edit**: `src/routes/index.tsx` — new Hero, Logo3D cursor wiring, StatsStrip redesign, WhyUs redesign, Process redesign, SocialProof redesign.
- **Edit**: `src/routes/translate/index.tsx` — hero redesign (collage + dot-grid).
- **Edit**: `src/routes/consultancy/index.tsx` — hero redesign (blueprint + stat triplet).
- **Edit**: `src/styles.css` — add aurora keyframes, marquee keyframes, dot-grid CSS vars, reduced-motion overrides for every new class.
- **Edit**: `src/messages/en.json`, `zh.json`, `rw.json` — add any new copy keys (stat triplet labels, editorial pull-quote text, process step copy if changed). Mirrored across all three locales per project rule.

## Technical notes

- All cursor tracking uses one shared listener per hero, throttled via `requestAnimationFrame`. No per-frame React state — write to refs and CSS variables.
- Dot-grid uses a single `<canvas>` sized to `devicePixelRatio`, redrawn only when the cursor moves (with a 1s idle re-draw to settle).
- All new motion classes get a `@media (prefers-reduced-motion: reduce)` block that disables transforms/animations and falls back to static styling.
- No new packages; uses existing `three`, `@react-three/fiber`, lucide, Tailwind, IntersectionObserver.
- All hardcoded strings on the heroes/sections continue to go through `t()` / `tRaw()` per project i18n rule. New keys mirrored to `zh.json` and `rw.json`.
- No changes to Supabase queries, auth, or RLS-sensitive code.
- Category color rule respected — no invented `bg-visa`/`text-translation` classes; explicit Tailwind colors only where category accents appear.

## Out of scope (for this pass)

- Dashboard / staff / admin routes.
- The rest of the marketing pages (FAQ, About, Contact, Pricing) — same primitives can be applied later in a follow-up.
- New imagery or photography.

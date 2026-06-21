
# San Brothers — Modernization Audit & Redesign Plan

This plan is **public-facing only** (Home, Services, Pricing, About, FAQ, Contact + nav/footer). Dashboard/Admin/Staff portals are untouched — they're operational tools and a different design language. We also keep all i18n keys, Supabase queries, audit calls, and category color rules from project memory intact.

---

## 1. Audit — What's there today

**Public routes:** `index` (847 lines, heavy), `services.index` (471), `services.{visa,accounting,translation,consultancy}`, `pricing` (252), `about` (40 lines — basically empty), `contact` (44 lines — basically empty), `faq` (251), `interpreter`, `consultancy/*`, `translate/*`.

**Already in `styles.css`:** hero gradient, scroll-reveal, marquee, glass-nav, service-card hover, process-step tracker, chat launcher animations, home mesh + float keyframes. Good foundation.

**Tech available (already installed — no new packages):** `three`, `@react-three/fiber`, `embla-carousel-react`, `tw-animate-css`, `recharts`, `lucide-react`, `sonner`, full Radix set. We have everything needed; **no `bun add` calls**.

---

## 2. REPLACE — Modernize these

### A. Global shell
- **Custom cursor layer** (`src/components/fx/custom-cursor.tsx`): dual-element cursor (dot + ring), magnetic snap to `[data-cursor="link"]`, scale on hover, color-shifts over images. Disabled on touch + on `prefers-reduced-motion`.
- **Scroll progress bar** at top of viewport (gradient primary→accent), driven by `window.scroll` with rAF throttling.
- **Page transitions**: fade+translate on route change via a wrapper in `__root.tsx` Outlet (CSS only, key off pathname).
- **Navbar (`public-navbar.tsx`)**: keep glass-nav, add (1) shrink-on-scroll height, (2) animated underline already present — enhance with magnetic hover, (3) command palette trigger (`⌘K`) using existing `cmdk` for quick navigation to services/pricing/contact.

### B. Home (`index.tsx`) — the biggest lift
Replace the current 847-line monolith section-by-section:
1. **Hero**: keep gradient, add a subtle **react-three-fiber** canvas (low-poly floating shapes, mouse-parallax, ≤60 tris, gracefully hidden on mobile/reduced-motion). Headline uses **word-by-word reveal** + gradient text. Stat counters animate up on view.
2. **Trust marquee**: keep, but add edge fade masks and pause-on-hover.
3. **Services grid**: convert cards to **3D tilt on mouse** (CSS `perspective` + mousemove), spotlight glow follows cursor, animated lucide icons (rotate/scale on hover).
4. **Process steps**: replace static track with **scroll-linked parallax** — each step pins briefly while content fades in (CSS `position: sticky` + IntersectionObserver-based active-state).
5. **Testimonials**: keep dynamic reviews logic untouched, restyle cards with marquee row + hover-pause.
6. **CTA band**: parallax background (mouse-tilted), shimmer button (already have `cta-beam`), animated icon orbit.

### C. Services pages (`services.{visa,accounting,translation,consultancy}.tsx`)
- Hero parallax with category-color gradient (using REAL hex from project memory — blue-500/emerald-500/amber-500/purple-500, never invented `bg-visa`).
- Sticky side TOC, scroll-spy active state.
- Feature cards with bento layout, hover spotlight.

### D. Pricing (`pricing.tsx`)
- Animated tier cards, "most popular" badge with floating ribbon, count-up on prices when card enters viewport.
- Compare-table reveals row-by-row.
- All prices remain sourced from `en.json` via `t()`/`tRaw()` — no hardcoding.

### E. About (`about.tsx` — currently 40 lines, basically a stub)
Rebuild as full page: founder story, timeline (animated vertical track), team grid with hover reveal, values bento, Kigali map block.

### F. Contact (`contact.tsx` — currently 44 lines, stub)
Rebuild: split-screen layout, animated form (focus-ring glow, floating labels), live availability indicator, embedded map, WhatsApp/email/phone cards with copy-to-clipboard + toast.

### G. FAQ (`faq.tsx`)
- Add search filter (client-only, fuzzy match over `tRaw('faq.items')`).
- Category tabs with smooth indicator.
- Keep accordion — but use CSS mount animations (per project memory: IntersectionObserver+Tabs/Accordion combo is a known bug).

### H. Footer (`public-footer.tsx`)
Add newsletter input (no backend yet — just toast success), social icons with animated hover, "Back to top" with smooth scroll, year + locale auto.

---

## 3. REMOVE — Cut these

- **`react-router-dom` dep** (in package.json) — project uses TanStack Router exclusively; this is dead weight and a source of accidental wrong-import bugs.
- **`src/routes/dev.tsx` and `src/routes/maintainer.tsx`** — verify these are dev-only; if so, gate behind env or delete.
- **Duplicate chat widget**: `src/components/dashboard/ai-chat-widget.tsx` AND `src/components/chat/ai-chat-widget.tsx` both exist. Consolidate to one (the public/chat one is already polished); update imports.
- **Unused stale file** at repo root: `et --hard 0bd7734` and `tory` (look like accidental shell-paste artifacts) — delete.
- **Placeholder `<img>` tags / generic AI testimonials avatars** (if any remain after reviews-dynamic work) — replace with initials bubbles.

---

## 4. MISSING — Add these

### Design / UX
- **Custom cursor** + **scroll progress bar** + **page transitions** (above).
- **Animated icons set**: hover-spin, draw-on-view (SVG stroke-dashoffset) for hero/feature/process icons.
- **Parallax layers** on hero, CTA, services hero.
- **`prefers-reduced-motion` honored everywhere** (we already do partially — extend to new effects).
- **404 page** with personality (animated illustration + helpful links) — currently only a default boundary.
- **Loading skeletons** standardized across remaining public pages.

### Content / SEO
- **Per-route `head()`** with unique title/description/OG for every public page (some are missing — verified in route audit).
- **OG share image** wired at leaf routes (hero/cover image where available).
- **JSON-LD** Organization + LocalBusiness on `__root` (or home), Service schema on each service page, FAQ schema on `/faq`.
- **`sitemap.xml`** and **`robots.txt`** route handlers (`src/routes/api/public/sitemap.ts`).
- **Canonical tags** in head().

### Functional polish
- **Command palette (⌘K)** using existing `cmdk`.
- **Cookie/consent banner** (lightweight, locale-aware).
- **Language switcher in footer** (currently only navbar).
- **Theme toggle visible on public pages** (currently only some layouts).

---

## 5. New files / files touched (technical section)

```text
NEW
  src/components/fx/custom-cursor.tsx
  src/components/fx/scroll-progress.tsx
  src/components/fx/page-transition.tsx
  src/components/fx/tilt-card.tsx          (3D mouse tilt wrapper)
  src/components/fx/parallax-layer.tsx     (scroll-linked translate)
  src/components/fx/animated-counter.tsx
  src/components/fx/magnetic.tsx           (magnetic hover wrapper)
  src/components/home/hero-three.tsx       (react-three-fiber low-poly canvas)
  src/components/seo/json-ld.tsx
  src/routes/api/public/sitemap.ts
  src/routes/api/public/robots.ts

EDIT
  src/routes/__root.tsx          (mount cursor, scroll-progress, page-transition; JSON-LD)
  src/routes/index.tsx           (replace hero/services/process/testimonials/cta sections)
  src/routes/about.tsx           (full rebuild)
  src/routes/contact.tsx         (full rebuild)
  src/routes/faq.tsx             (search + category tabs + safe animations)
  src/routes/pricing.tsx         (animated cards + compare table)
  src/routes/services.index.tsx  (bento + tilt + parallax)
  src/routes/services.visa.tsx, services.accounting.tsx,
  services.translation.tsx, services.consultancy.tsx (modern hero + bento + scroll-spy)
  src/components/layout/public-navbar.tsx  (shrink-on-scroll, ⌘K trigger, magnetic links)
  src/components/layout/public-footer.tsx  (newsletter, socials, back-to-top, lang switcher)
  src/styles.css                 (new keyframes: tilt, draw, marquee-fade, cursor, scroll-bar)
  src/messages/{en,zh,rw}.json   (new keys for About/Contact/FAQ-search/Footer/Cursor a11y labels)

REMOVE
  react-router-dom from package.json
  src/components/dashboard/ai-chat-widget.tsx (consolidate)
  root-level junk files: "et --hard 0bd7734", "tory"
```

**Guardrails per project memory:**
- No invented Tailwind class names (`bg-visa` etc.) — only real utilities + defined CSS vars.
- Category colors use the exact hex from rules: visa #3B82F6, accounting #10B981, consultancy #F59E0B, translation #8B5CF6.
- All copy via `t()`/`tRaw()` — keys mirrored in `en/zh/rw`.
- IntersectionObserver reveals are NOT used inside Tabs/Accordion content — those use plain CSS mount animations.
- Dashboard/Admin/Staff routes untouched.
- No new npm packages.
- Auth, useAuth, RLS queries untouched.

---

## 6. Suggested rollout (3 phases)

1. **Phase 1 — FX foundation + Home** (highest visual impact): cursor, scroll-progress, page transitions, tilt-card, parallax, animated-counter, magnetic, three.js hero, home rebuild.
2. **Phase 2 — Other public pages**: services (4 pages) + pricing + about + contact + faq + footer/navbar polish.
3. **Phase 3 — SEO + cleanup**: JSON-LD, sitemap/robots, per-route head, command palette, cookie banner, remove dead deps/files, consolidate chat widget.

Approve and I'll start with Phase 1 (or tell me to bundle all phases into one build pass).

## Goal

Turn `src/routes/index.tsx` (1,764 lines, duplicated hero, invisible sections, fake testimonials, generic blue/violet gradient look) into a clean, friendly, professional landing page that loads fast, paints correctly on mobile, and feels distinct from default AI templates.

## What gets removed

1. **Duplicate hero block** at lines ~1344–1761 (dead/second-hero code).
2. `**useIntersectionObserver` + `.animate-fade-up { opacity: 0 }**` — replaced with CSS-only entrance animations that don't hide content if JS hasn't run.
3. **~350 lines of inline `<style>**` keyframes — only the few still in use move to `src/styles.css`; the rest deleted.
4. **Fake testimonials** (Wang Wei, Li Fang, Marie C., David O., etc.) and **unverified stats** (1,000+ clients, 98% success rate).
5. Floating orbs, glow-pulse buttons, shimmer headline, glass-card decorations, hardcoded hex backgrounds like `dark:bg-[#080D1A]`.

## What gets added / restructured

### File split (under `src/components/marketing/home/`)

- `hero.tsx` — single, focused hero with headline, subhead, primary + secondary CTA, language strip.
- `services-grid.tsx` — 4 service cards using semantic tokens, outcome-focused copy.
- `why-us.tsx` — 3–4 reasons with icons, no glow.
- `process.tsx` — 4-step "How it works" timeline.
- `social-proof.tsx` — empty-state-friendly slot for real client logos, named testimonials, and stats (renders nothing if data is empty; placeholder copy clearly marked).
- `cta-section.tsx` — final "Talk to an expert" band.
- `sticky-contact.tsx` — mobile sticky WhatsApp / Call CTA.

`src/routes/index.tsx` becomes a thin composition (~80 lines) wiring those components inside `PublicLayout` with the existing `head()` meta intact.

### Visual direction (Modern & friendly)

- **Palette**: warm neutrals + a single friendly accent. Defined as semantic tokens in `src/styles.css` (`--background`, `--foreground`, `--primary`, `--accent`, `--muted`) so dark mode and theming keep working. No more `text-white`, `bg-[#080D1A]`, or `from-blue-500 to-violet-500` in components.
- **Typography**: distinctive heading pair (e.g. a friendly geometric display) + clean body, loaded via existing font setup. No Inter/Poppins defaults.
- **Shape language**: generous radii (`rounded-2xl`), soft shadows, no neon glows.
- **Motion**: subtle CSS `@keyframes fade-in-up` applied unconditionally (no observer gating), `prefers-reduced-motion` respected.

### Content changes

- Hero subhead rewritten to be outcome-focused, not feature list.
- Service cards: each gets a one-line outcome ("Student visa to China — handled end to end") instead of generic descriptors.
- Real-data slots for stats/logos/testimonials — when empty, section either hides or shows a neutral "Trusted by clients across Rwanda & beyond" line. You can drop in real numbers + logos later.
- Trust strip: payment methods + supported languages, no invented certifications.

### Performance & SEO

- Remove opacity-based hiding so content is in the initial HTML for crawlers and slow phones.
- Keep existing `head()` meta, add `og:image` placeholder slot for a real share image you provide.
- `loading="lazy"` on any below-the-fold imagery.

## Technical notes

- All color, gradient, shadow values live in `src/styles.css` as semantic tokens; components only use class names like `bg-background`, `text-foreground`, `bg-primary`, `text-accent`.
- New components are presentation-only — no data fetching, no Supabase calls added.
- Keep `PublicLayout`, existing nav/footer, and `useI18n` translation keys. New copy that needs translation gets added to `src/messages/en.json`, `zh.json`, `rw.json` under a `home.*` namespace; existing keys stay.
- Mobile sticky CTA respects safe-area-inset.
- No new npm packages. Icons stay on `lucide-react`.  
aslo add those

1.

  Add i18n translations for all new staff dashboard labels, status/filter names, and button text across en/zh/rw.  
  2. and must supporrt well our all theme modes (dark and light) must math well

## Out of scope

- No backend / Supabase / auth changes.
- Other routes (`/services/*`, `/dashboard/*`, `/staff/*`) untouched.
- Real testimonial text, client logos, share image — you'll provide; I'll wire the slots.

## Deliverable

A faster, cleaner home page that paints correctly on first load, uses your design tokens consistently, drops the AI-template look, and is broken into small files you can maintain. Approve and I'll build it.

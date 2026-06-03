## Goal

Build multi-portal infrastructure so San Brothers, Translate, and Consultancy share one backend/auth/dashboard but render distinct public sites. Add the full Consultancy portal from scratch and make signup/login/dashboard/support portal-aware.

---

## Part 1 — Database migrations (one batch)

Migration file applied via Supabase:

1. `users.source_portals TEXT[] DEFAULT ARRAY['san-brothers']`
2. `service_requests.portal_source TEXT DEFAULT 'san-brothers'`
3. `support_messages.portal_source TEXT DEFAULT 'san-brothers'`
4. New `portal_configurations` table (portal_slug PK, name, display_name, tagline, services_available TEXT[], support_enabled, timestamps)
5. Seed three rows: `san-brothers`, `translate`, `consultancy` (services_available matches spec)
6. Grants: `GRANT SELECT ON portal_configurations TO anon, authenticated; GRANT ALL TO service_role`
7. RLS: enable + `FOR SELECT USING (true)` public read policy

---

## Part 2 — Portal context (`src/lib/portal-context.ts`)

- `Portal = 'san-brothers' | 'translate' | 'consultancy'`
- Static `PORTAL_CONFIG` map with displayName, tagline, servicesAvailable, hostname, isChild flag
- `detectPortal()` reads `window.location.hostname`; SSR → `'san-brothers'`
- `usePortal()` hook returns `{ current, config, isSanBrothers, isChild, displayName, tagline, servicesAvailable }`
- `getParentLink()` returns parent san-brothers URL

---

## Part 3 — Consultancy public portal

Mirror `src/routes/translate/` structure:

- `src/routes/consultancy.tsx` — layout with Outlet, navbar (lang switcher EN/中文/RW/FR/AR + "Back to San Brothers"), footer
- `src/routes/consultancy/index.tsx` — hero "Expert Business Solutions", 3-step "How it works", service cards (Company Registration, Document Processing, Trade & Investment, Business Planning, Administrative Support), CTA buttons use `handleConsultancyApply(slug)`
- `src/routes/consultancy/how-it-works.tsx` — 3 steps (Choose consultation → Meet expert → Get solution)
- `src/routes/consultancy/about.tsx` — company/team/why us
- `src/routes/consultancy/pricing.tsx` — service pricing + monthly packages + custom quote CTA

`handleConsultancyApply(slug)`:

- If session → `navigate({ to: '/dashboard/services', search: { apply: slug } })`
- Else → set `sessionStorage` keys + `navigate({ to: '/signup', search: { intent: slug, portal: 'consultancy' } })`

Reuse `src/components/marketing/` primitives where possible. Match Translate's design tone.

---

## Part 4 — Auth wiring (portal tracking)

`**src/routes/signup.tsx**`

- Extend `validateSearch` with `portal?: string`
- On successful signup, set `users.source_portals = [targetPortal]`
- Persist `signup_intent` + `signup_portal` in sessionStorage

`**src/routes/login.tsx**`

- Extend `validateSearch` with `portal?: string`
- After successful login: read `source_portals`, append current portal if missing, update

Both use `usePortal()` + the explicit `portal` search param (param wins for cross-portal redirects).

---

## Part 5 — Dashboard portal awareness

`**src/routes/dashboard.services.index.tsx**`

- Fetch `portal_configurations` row for current portal
- Filter services list by `services_available`
- Honor existing `?apply=` intent flow

`**src/components/layout/dashboard-layout.tsx**`

- When `isChild`, render banner above main: "You're on: {displayName}" + "← Back to San Brothers" link via `getParentLink()`

**Service request creation** (`service-apply-modal.tsx`): include `portal_source: currentPortal` on insert.

---

## Part 6 — Support form portal awareness

`src/components/support/support-form.tsx` (or current contact form):

- San Brothers → full subject dropdown
- Translate child → locked "Translation & Interpretation Services"
- Consultancy child → locked "Business Consultancy"
- Always insert `portal_source: currentPortal`

If no existing support-form component, edit `src/routes/contact.tsx` similarly.

---

## Part 7 — Staff capabilities

Add to existing staff capability options (in admin staff management UI + capability-context):

- `handle_consultancy`
- `approve_consultancy`
- `manage_consultancy_cases`

Consultancy staff routes already exist (`staff.consultancy.*`); ensure capability gate uses `handle_consultancy` (already does per `staff.consultancy.index.tsx`). Verify sidebar (`sidebar-menus.ts`) hides consultancy nav when capability missing.

---

## Files touched

**New**

- `src/lib/portal-context.ts`
- `src/routes/consultancy.tsx`
- `src/routes/consultancy/index.tsx`
- `src/routes/consultancy/how-it-works.tsx`
- `src/routes/consultancy/about.tsx`
- `src/routes/consultancy/pricing.tsx`
- One SQL migration

**Edited**

- `src/routes/signup.tsx`
- `src/routes/login.tsx`
- `src/routes/dashboard.services.index.tsx`
- `src/components/layout/dashboard-layout.tsx`
- `src/components/dashboard/service-apply-modal.tsx` (add `portal_source`)
- Support/contact form
- Admin staff capabilities UI + `src/lib/staff/capability-context.tsx` (add new capability keys)

No changes to: payment logic, existing translate portal, RLS on user data, server functions.

---

## Out of scope

- Subdomain DNS / hosting config (must be set up separately on Cloudflare; code uses hostname detection only)
- Migrating existing rows (defaults handle new rows; backfill not requested)
- Email templates per portal
- Per-portal branding theming (uses same design tokens; only copy/labels differ)  
  
## Clarifications & Missing Details
  ### Service Slugs Verification
  Before building, verify these 5 service slugs exist in Supabase `services` table:
  - 'company-registration'
  - 'document-processing'
  - 'trade-investment'
  - 'business-planning'
  - 'administrative-support'
  If any are missing, create them first in services table with:
  - name: (human-readable)
  - slug: (above)
  - description: (brief)
  - category: 'consultancy'
  - price_min/price_max: (use reasonable values)
  ### Navbar Implementation
  - Language switcher: **Reuse existing component from `src/routes/translate/` navbar** — same EN/中文/RW/FR/AR flags
  - "Back to San Brothers" link: **Place in navbar top-right**, near language switcher, as text link with arrow icon (← style), links to `getParentLink()`
  - Consultancy navbar component: Create `src/components/consultancy-navbar.tsx` or conditionally render in shared navbar based on `usePortal()`
  ### Consultancy Footer
  - Reuse footer from `src/routes/translate/` 
  - Keep same company info, contact details
  - No per-portal branding changes needed
  ### Staff Routes & Dashboard
  - **No new consultancy staff routes** `/staff/consultancy` does NOT need to exist)
  - Consultancy staff use shared `/staff` dashboard
  - Capability gate: existing `useCapabilities()` hook + `hasCapability('handle_consultancy')` check in sidebar
  - Sidebar already hides consultancy nav items when user lacks `handle_consultancy` capability
  ### Service Request Creation
  - **File:** `src/components/dashboard/service-apply-modal.tsx`
  - **Location:** In handleSubmit function, when inserting to `service_requests` table
  - **Add this field:** `portal_source: usePortal().current`
  - Ensure import: `import { usePortal } from '@/lib/portal-context'`
  ### Optional: Consultancy Pricing Defaults
  If pricing page needs sample data, use (adjust as needed):
  - Company Registration: $150–$300
  - Document Processing: $50–$150
  - Trade & Investment: $200–$500
  - Business Planning: $300–$1000
  - Administrative Support: $75–$200
  ### Testing Order
  1. Create consultancy services in DB (if missing)
  2. Deploy portal context + auth updates
  3. Deploy consultancy routes
  4. Test signup flow: /consultancy → not logged in → /signup?portal=consultancy → create account → /dashboard/services with modal open
  5. Test existing user: logged in on San Brothers → visit /consultancy → add consultancy to source_portals → access services
  6. Test support: fill form on /consultancy/contact → auto-subject + portal_source = 'consultancy'
# Client Dashboard Build Plan

This is a large feature build — ~15 new files, 1 sidebar update, and i18n additions for 3 languages. Here's how I'll structure it.

## Files to create

**Route files (under `src/routes/dashboard/`):**

1. `dashboard.index.tsx` — Home (welcome, quick stats, active services, quick actions)
2. `dashboard.services.index.tsx` — Service catalog (search + category tabs, language-aware names)
3. `dashboard.services.$slug.tsx` — Request a service (dynamic form per category + document checklist + upload)
4. `dashboard.my-services.index.tsx` — Active/Completed/Cancelled tabs
5. `dashboard.my-services.$id.tsx` — Progress timeline + documents + chat stub
6. `dashboard.documents.tsx` — Folder view grouped by service request
7. `dashboard.messages.tsx` — Stub "coming soon"
8. `dashboard.payments.tsx` — Stub + read-only price history
9. `dashboard.claims.index.tsx` — Open/Resolved/Rejected tabs
10. `dashboard.claims.new.tsx` — New claim form with evidence upload
11. `dashboard.claims.$id.tsx` — Claim detail
12. `dashboard.profile.tsx` — Editable profile + avatar upload
13. `dashboard.settings.tsx` — Theme, language, security stubs

**Shared helpers (under `src/lib/dashboard/`):**

- `queries.ts` — Reusable Supabase query functions (sidebar counts, my services, documents-by-folder, etc.)
- `status-badge.tsx` — Status badge component with consistent colors
- `service-requirements.ts` — Hardcoded slug → required documents mapping
- `useDashboardCounts.ts` — Hook returning `{ activeServices, unreadMessages, openClaims }` for sidebar badges

## Files to update

- `src/components/layout/sidebar-menus.ts` — Replace static client menu with full menu (Home, Browse Services, My Services, Documents, Messages, Payments, Claims, Profile, Settings, Log out)
- `src/components/layout/sidebar.tsx` — Accept `to` prop on items + render as `<Link>`; pull badge counts from `useDashboardCounts`; bold "Log out" red at bottom
- `src/components/layout/sidebar-menus.ts` types — extend `MenuItem` with `to` and dynamic `badge`
- `src/messages/en.json`, `zh.json`, `rw.json` — add `dashboard.*` keys
- `src/lib/types/index.ts` — possibly extend `UserRole` if needed (already exists)

## Behavior contracts

- **Guarding**: every route's component wraps in existing `<ProtectedRoute>`. The actual `/dashboard` route already uses it. New routes do the same.
- **Role redirect**: in a top-level `dashboard.tsx` layout, if `profile.role !== 'client'`, redirect to `/dashboard` (no-op for now; staff dashboards land here in 5C).
- **Sidebar**: `DashboardLayout` already accepts a role. I'll pass `client` for these routes.
- **All Supabase queries** use the existing `supabase` browser client; RLS does the access control.
- **Storage**: client docs go to `client-documents/clients/{user_id}/{request_id}/{filename}`; claim evidence to `client-documents/claims/{user_id}/{claim_id}/{filename}`; avatars to `avatars/{user_id}/...`. SQL block at the end for the `avatars` bucket.
- **Loading states**: use `Skeleton`.
- **Empty states**: lucide icon + heading + CTA button.
- **i18n**: every visible string in en/zh/rw under `dashboard.*` with status sub-keys.

## Out of scope (per prompt)

- Staff/admin dashboards
- Realtime chat (UI stub only)
- Payment processing (stub only)
- 2FA setup (toggle UI only)
- Notification preferences storage

## SQL output at end

A single SQL block to create the `avatars` storage bucket + RLS policies (the `client-documents` bucket already exists from prompt 5A).

---

Ready to build. Approve and I'll write all files in parallel batches.  
  
Plan approved with one small addition:

On the /dashboard/services page, at the end of the services grid (after the last real service card), add a special "+ See more services" card. This card should have:

- A "+" icon (lucide Plus or PlusCircle)

- Text: "Need something not listed?"

- Subtext: "Contact us to discuss custom services"

- Style: dashed border to differentiate it from real service cards

- On click: navigate to /contact

Otherwise the plan is perfect. Proceed.
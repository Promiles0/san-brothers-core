# Admin Panel Full Build-Out

Eight admin pages already exist as scaffolds at `/admin/*`. I'll enhance each with the requested functionality. The admin layout, sidebar, and Supabase wiring are already in place.

## Dependencies & Schema

1. Install `jszip` + `file-saver` (used for client-side ZIP downloads).
2. Create one new table via migration:
  - `company_settings (key text PK, value jsonb, updated_at timestamptz)` — for Settings page.
3. Add a storage helper that takes a list of `documents` rows, fetches each from the `documents` bucket via signed URLs, bundles into a ZIP, and triggers download.

## 1. Documents (`admin.documents.tsx`)

Rebuild as a 2-pane folder browser:

- Left: collapsible client tree (clients → cases).
- Right: breadcrumb + document table with checkboxes, per-row preview/download, and bulk "Download Selected as ZIP" and "Download All for Client" buttons.
- Global search filters across client name + document name.

## 2. Clients (`admin.clients.tsx` + `admin.clients.$id.tsx`)

- List: keep table; add country + status filters and a Total Cases column (count from `service_requests`).
- Detail page: profile header + Tabs (Overview / Cases / Documents / Activity).
  - Overview: KPI stats (total/pending/completed cases, total paid) + recent activity timeline.
  - Cases: list of their service_requests, click → existing case detail (read-only).
  - Documents: grouped by case with download + "Download All" ZIP.
  - Activity: filtered audit_log entries.

## 3. Cases (`admin.cases.tsx`)

Extend existing table with:

- Status, category, assigned-staff, and date-range filters.
- Colored status badges per spec.
- Sortable columns.
- Click row → read-only Dialog showing client info, staff, timeline, documents, notes, plus link to staff full-page view.

## 4. Staff (`admin.staff.tsx`)

Extend existing staff page with:

- Active/completed case counts and last-active per row.
- Role filter + status filter.
- Activate/deactivate toggle and role dropdown (already partially there).
- "Add Staff" modal that inserts to `users` with `status='invited'`.
- Staff detail Dialog: profile, metrics, current cases, capabilities list.

## 5. Revenue (`admin.revenue.tsx`)

- 4 KPI cards (total, month, week, avg per case).
- Recharts: line (12-month revenue), bar (revenue by service category), pie (by payment method).
- Payments table with method/status/date filters + "Export CSV".

## 6. Services (`admin.services.tsx`)

Extend existing toggle list with:

- Add Service modal (name EN/FR/RW, category, base price, description).
- Edit Service modal (same form, pre-filled).
- Inline price edit.

## 7. Audit Log (`admin.audit.tsx`)

Extend existing table with:

- Action-type color coding (create/update/delete/login/download).
- Staff, action-type, date-range filters + free-text search.
- 50-per-page pagination.
- Export filtered results to CSV.

## 8. Settings (`admin.settings.tsx`)

Replace placeholder with form sections backed by `company_settings`:

- Company Info (name, address, phone, email, website, logo upload to storage).
- Working Hours (per-day toggle + time range).
- Notifications (toggles).
- Payments (MoMo number, card/cash toggles).
- Save → upsert into `company_settings`.

## Cross-cutting

- All pages: loading skeletons, empty states, error+retry, sortable headers, responsive, sonner toasts, dark-mode tokens.
- Admin is read-only for client data; only Services / Staff roles+status / Settings are editable.

## Technical Notes

- Reuse existing Supabase client, UI primitives, and status-badge helper.
- ZIP util: `src/lib/admin/download-zip.ts` using `jszip` + `saveAs`.
- New route file: none beyond what exists (admin.clients.$id already present — will extend with tabs).
- Migration: create `company_settings` table with RLS allowing only admins to select/upsert.
- CSV export: simple in-memory string → Blob → download (no extra dep).

## Scope Confirmation

This is a large build (~8 files heavily edited + 1 migration + 1 util + 1 dep). I'll batch edits in parallel where possible. Want me to proceed with all 8, or prioritize a subset first (e.g., Documents + Clients + Settings, then the rest)?  
  
answer : Proceed with all 8 at once
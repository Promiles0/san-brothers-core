
## Goal

Make the post-payment confirmation page a real, professional receipt + status tracker — showing the live Stripe payment reference and the current `service_requests.status`, and tightening the surrounding flow so clients feel confident and stay engaged.

---

## Part 1 — Confirmation page upgrade (`src/routes/dashboard.confirmation.$requestId.tsx`)

### 1.1 Accept and display the Stripe reference

Extend `validateSearch` with one more optional field:

- `paymentRef?: string` — the Stripe `paymentIntentId` (e.g. `pi_3Q…`)

Show it in the receipt card as a new row "Payment ID" (monospace, truncated with copy-to-clipboard button). Fallback to the existing `SB-XXXXXXXX` short reference when absent (e.g. free / momo / paypal).

### 1.2 Load the real service request + payment row

Replace the current single `service_requests` fetch with a parallel fetch:

- `service_requests` → `id, status, progress_step, progress_total, created_at, services(name_en, category)`
- `payments` (latest for this `service_request_id`) → `amount_rwf, currency, method, status, reference`

Drive the receipt and the status badge from this real data instead of relying solely on URL search params (URL params remain as instant fallback to avoid loading flash).

### 1.3 Live status tracker (real, not hardcoded)

Replace the static `NEXT_STEPS` array with a dynamic stepper computed from `status` + `progress_step`:

```text
submitted → under_review → verified → submitted_to_authority → completed
```

- Done steps: green check.
- Current step: animated pulse + Loader2.
- Future steps: muted number.
- Map `service_requests.status` to the active step. Re-use `StatusBadge` from `src/lib/dashboard/status-badge.tsx` for the headline badge.

Subscribe via Supabase realtime channel on `service_requests` (filter `id=eq.${requestId}`) so the badge and stepper update without reload when staff move the case.

### 1.4 Receipt polish

- Add brand header strip with the logo and "Official Receipt" label.
- Add `Payment status` row (green "Paid" badge from the payments row).
- Update `downloadReceipt` HTML template to include `Payment ID` and `Payment status`.
- Keep `.html` download, but rename file to `SanBrothers-Receipt-{ref}.html`.

### 1.5 Modern visual treatment

- Replace flat success circle with a layered glow: outer soft ring + inner gradient using `--success` / `--primary` tokens (from `src/styles.css`).
- Confetti burst on first mount (lightweight CSS keyframes — no extra dep).
- Cards use `backdrop-blur` + subtle gradient border (`bg-gradient-to-br from-card to-card/60`).
- Sticky bottom action bar on mobile (viewport is 661px) with primary "Track My Case" CTA always visible.
- Respect existing design tokens — no hardcoded colors.

---

## Part 2 — Wire the Stripe reference through

In `src/components/dashboard/service-apply-modal.tsx`, both navigation calls to the confirmation route already happen after the payment record is created. Add `paymentRef` to the `search` object:

- Line ~549 (service request flow): pass `paymentRef: stripeIntentId` (already in scope as the resolved intent id).
- Line ~705 (interpreter booking flow): pass `paymentRef: stripeIntentId`.

No business-logic changes — only an extra search param.

---

## Part 3 — UX polish around the funnel (trust + conversion)

These are small, focused presentation tweaks that strengthen the weak handoffs the user mentioned. No new features, no backend changes.

### 3.1 Confirmation → next action clarity

Right now the page ends with three side-by-side buttons of equal weight. Restructure:

- **Primary** (full-width on mobile): "Track My Case" with arrow.
- **Secondary**: "Message your case manager" (links to the assigned staff thread if `assigned_staff_id` exists, otherwise generic messages).
- **Tertiary** (ghost / icon-only): Download receipt.

Add an "Estimated response time: within 2 business hours" trust line above the buttons.

### 3.2 Post-purchase reassurance card

New small card between receipt and next-steps:

- "What happens next" — 3 plain-language bullets tailored to the service category (visa / accounting / translation / consultancy / interpreter), pulled from a small lookup map in the route file.
- Contact strip: WhatsApp, email, phone — same row, icon buttons.

### 3.3 Service request detail page deep link

The "Track My Case" CTA links to `/dashboard/my-services/$id` (the detail view already exists at `src/routes/dashboard.my-services.$id.tsx`) instead of the index, so the client lands directly on their case.

### 3.4 Loading/empty states

- While `request === undefined`, render skeleton receipt + skeleton stepper (no layout shift).
- If `request === null` (not found / permission), show a friendly empty state with "Back to dashboard" instead of the current silent fallback.

---

## Files touched

- `src/routes/dashboard.confirmation.$requestId.tsx` — major upgrade (search schema, data fetching, realtime, stepper, receipt, layout).
- `src/components/dashboard/service-apply-modal.tsx` — add `paymentRef` to both `navigate(...)` search payloads (2 lines each).

No new dependencies. No DB migrations. No changes to payment logic, RLS, or server functions.

---

## Out of scope (call out, ask later if needed)

- Email receipt delivery (would need a server function + email provider).
- PDF receipt (current HTML download is kept; a true PDF would need a Worker-compatible library).
- Refund / dispute UI.

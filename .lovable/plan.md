## Goal
Make the live interpreter call actually connect both client and staff, then polish the calling experience with a more modern, premium UI while preserving the existing Supabase workflow.

## What I found
- The staff side successfully creates a Daily room and saves `daily_room_url`.
- Both staff and client load the same URL in an iframe.
- The room is created with `privacy: 'private'`, but the app does not generate or pass Daily meeting tokens for either participant.
- Daily private rooms commonly reject iframe joins without a valid meeting token, which matches the error: `You are not allowed to join this meeting`.
- The iframe `allow` attribute includes `speaker`, which Chrome warns is unrecognized. That warning is not the main failure, but it should be cleaned up.

## Fix plan
1. Update Daily room creation
   - Keep using the configured Daily API key and domain.
   - Create rooms in a way that both authenticated app participants can join reliably.
   - Preferred minimal fix: use a non-private room with a hard expiry and max 2 participants, since the random UUID-based room name is unguessable and the app only exposes the URL to the two call participants.
   - If you later want stricter Daily-level access control, we can add token generation and store separate client/staff join URLs, but that likely requires database columns for tokens/URLs.

2. Improve room URL handling
   - Normalize the Daily domain so `sanbroh.daily.co`, `https://sanbroh.daily.co`, or accidental trailing slashes all produce a valid join URL.
   - Avoid stale room-name collisions by preserving the existing call-id-based room name.
   - Keep room expiry and participant limit.

3. Clean the video iframe embeds
   - Remove the unsupported `speaker` permission from both client and staff iframes.
   - Add stronger camera/mic/fullscreen permissions and a better loading/connection shell.
   - Add clear fallback UI when the Daily room URL is not ready yet.

4. Polish the live call screens
   - Client active-call screen: glassy layered call console, stronger connected state, language pair display with flags, animated connection indicators, better timers/minutes cards, smoother buttons.
   - Staff active-call screen: matching premium console, clear client/language context, large video stage, improved Hold & Forward / End / Release action bar.
   - Keep all current Supabase queries, timers, billing, queue, end-call, release, and forward behavior intact.

5. Polish the incoming staff call overlay
   - Keep the existing accept logic.
   - Improve drama and clarity: pulsing rings, glass panel, caller/language pair, clear “Accept Call” green action, subtle decline action, and audio-enable hint.

6. Add reusable presentation helpers where useful
   - Use shared language flag/name helpers in the touched call UI to avoid duplicated inconsistent flag logic.
   - Use CSS design tokens/semantic colors and small CSS animations in `src/styles.css` for glow/ring/reveal effects.

## Files I expect to edit
- `src/lib/interpreter/daily-rooms.ts`
- `src/routes/dashboard.interpreter.$callId.tsx`
- `src/routes/staff.interpreter.$callId.tsx`
- `src/components/layout/staff-layout.tsx`
- `src/styles.css`

## Validation
- Confirm the code no longer creates private Daily rooms without tokens.
- Confirm both client and staff iframes use the same valid Daily URL and no unsupported `speaker` permission.
- Run a targeted syntax/type-safe inspection where possible after edits.
- You will still need to test with real camera/mic permissions in the deployed browser, because Daily permissions depend on the actual host and user gesture.
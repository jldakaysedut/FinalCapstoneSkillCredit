# SkillCredit Web — centered dialogs, notification routing, and selected realtime refresh

Source: `capstoneskillcredit.zip` supplied in chat (6 November 2026).

This ZIP is **a patch, not a replacement project**. Copy its `src/` contents into the **Web** project `src/` folder, preserving the subfolder paths. Keep the existing `package.json`, lockfile, `.env.local`, `supabase/` functions, `.git`, and other files. Back up or commit your working changes first. This patch is based on the uploaded archive; merge instead of overwriting if you have made edits to any affected files since uploading.

## Changes

1. **Uniform centered Web dialogs**: `src/components/CustomAlert.jsx` retains the app-wide `window.alert` look and adds centered green-and-white asynchronous confirmation dialogs. `src/components/confirmDialog.js` exposes `confirmDialog(message)` returning a boolean Promise. Existing `window.confirm` call sites now use `await confirmDialog(...)` in the affected user and moderator pages. Existing action callbacks and Supabase writes remain in their original locations. Confirmations cannot be implemented by overriding synchronous `window.confirm` with a custom UI without changing invocation behavior, so only the callers are adapted to await the user's choice.
2. **Notification routing**: `src/pages/user/Notifications.jsx` uses a valid existing internal `link_url` for booking/session, review, dispute and session-expired notifications. Support reply and ticket-updated notifications first use their exact `/messages?ticket=...` link when available. Legacy notifications without an exact link retain the original fallback. Existing report/safety notices continue to open their inspection modal. The producer of some older `booking` notifications sends only `/sessions` and thus cannot target a specific record until it includes the session ID; this patch does not alter notification writes.
3. **Realtime display refresh**: `src/hooks/useRealtimeRefresh.js` provides debounced Supabase `postgres_changes` listeners plus refresh on returning to the browser tab. Applied to Moderator dashboard/queues, My Listings, User Dashboard, Admin dashboard/user management/logs/platform viewer, and Payments **display refresh only**. Listeners call existing loaders or existing reload triggers. Channels and browser listeners are removed on unmount. This patch does not modify payment checkout, webhook, credit awarding, server-side mutations, schema or RLS.

## Affected files (20)

- `src/components/CustomAlert.jsx` (replace)
- `src/components/confirmDialog.js` (new)
- `src/hooks/useRealtimeRefresh.js` (new)
- `src/pages/user/Community.jsx`
- `src/pages/user/Messages.jsx`
- `src/pages/user/MyListings.jsx`
- `src/pages/user/Notifications.jsx`
- `src/pages/user/Profile.jsx`
- `src/pages/user/Sessions.jsx`
- `src/pages/user/UserDashboard.jsx`
- `src/pages/user/Payments.jsx` (read-only refresh, no payment operations changed)
- `src/pages/moderator/Disputes.jsx`
- `src/pages/moderator/ModDashboard.jsx`
- `src/pages/moderator/SkillApprovals.jsx`
- `src/pages/moderator/SkillReview.jsx`
- `src/pages/moderator/UserReports.jsx`
- `src/pages/admin/AdminDashboard.jsx`
- `src/pages/admin/AdminLogs.jsx`
- `src/pages/admin/PlatformViewer.jsx`
- `src/pages/admin/UserManagement.jsx`

## Checks and limitations

- JSX/JS parsing passed across all patched source modules. Relative source imports were checked. Native `window.confirm` calls were removed from the patched UI pages.
- A full Vite production build could **not** run in this Linux container using the Windows `node_modules` packaged in the source archive. Vite/Rolldown reported a missing Linux-specific optional native binding. **Run `npm install` (or `npm ci` if lockfile is current), `npm run build`, and `npm run dev` on your machine** before deploying.
- No real browser interaction test, database subscription test, or Supabase schema/RLS/publication test was performed. Realtime listeners only work if corresponding tables are enabled for Realtime and policies permit the user's events. The scope is a targeted refresh improvement, **not a guarantee every Web view is fully realtime**.
- The existing fetch functions may display their original loading indicators during realtime refreshes. Further performance tuning can be done separately if necessary.
- The notification target must provide a valid link / record ID to route to a specific record. Older links without IDs still open a general page or legacy fallback.

## Test checklist

1. Open Community: delete post/comment dialogs — Cancel makes no changes, Confirm runs the original action.
2. Open Messages: delete message and Mark Done; check data writes happen only after Confirm.
3. Open Sessions: approve/decline/cancel/refund/start/mark done; check Cancel does nothing, Confirm runs original logic.
4. Test moderator Skill Review approval and My Listings removal.
5. Open a notification with `/sessions?session=<id>` and a support reply with `/messages?ticket=<id>`; check correct target. Test older notifications without a specific target.
6. With two accounts/browsers, verify realtime updates in moderator/admin screens and My Listings. Switch tabs and return to verify focus refresh.
7. Test payments **test-key mode only**; confirm credits and paid status continue to originate from the backend, not a client-side realtime event.

## Security

The patch archive intentionally contains no `.env.local`, `.git`, `node_modules`, PayMongo secrets, or Supabase functions. Continue to keep service-role and PayMongo secret credentials out of frontend files.

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


---

## 9 November 2026 — Web sync with latest Expo Skiro AI V3 (targeted follow-up)

**Reference:** Uploaded `capstoneskillcredit (2)(1).zip` (Web) and `skillcredit-mobile-fixed (2)(1).zip` (Expo Mobile). This update changes **Web source only**.

### Exactly which files changed

1. `src/components/SkillCreditAIChat.jsx` — Added Expo V3's local intent clarification for vague skill-finding requests and all-16-category read-only skill/title/description relevance lookup. Clarification uses one existing AI user-message row with the user's original wording plus a selected-topic suffix; the UI displays these separately and recognizes previously saved Expo and legacy synthetic records. The existing Edge Function still handles the request, history, quota and cooldown. If the supplementary query has no verified results or encounters RLS/network issues, the original backend answer is retained. Existing responsive Web chat layout, header, sidebar, cards, mobile-size composer, navigation, Markdown, and creator-draft presentation are preserved.
2. `src/pages/user/Profile.jsx` — Removed only the extra `Create First Listing` and `Add First Project` buttons from empty states. Kept their descriptions and the existing header buttons (`+ Create Listing`, `+ Add Project`) with their original handlers. No changes to portfolio operations, profile saves or visual breakpoints.
3. `src/WEB-PATCH-NOTES.md` — Appended this change log.

### Constraints and verification

- **No** Web CSS/theme/responsive layout rewrite, Expo Mobile edits, `AIMessageMarkdown.jsx` edits, Supabase schema/RLS/RPC/Edge Function changes, AI quota/cooldown adjustments, or changed write operations.
- Existing AI search result card navigation and chat-history persistence are retained. Local clarification does not write a row or use AI quota until a subject is selected or typed. One resolved request is still a single user message in `ai_chat_messages`.
- Parsing and simulated search/clarification tests validate syntax and representative cases; actual browser/UI rendering and live Supabase/RLS behavior require testing in your deployment.
- Source project ZIP intentionally excludes `.git`, `node_modules`, `.env*` and build caches. Keep your existing local `.env.local` and run `npm install`/`npm ci` on your own development machine. A smaller drop-in patch ZIP is also included separately for users who want to keep their current project structure exactly.

### Regression checklist

1. On desktop **and mobile Web**, verify the existing Skiro chat header, pane widths, Info panel, History drawer, category chooser and input styles remain unchanged.
2. Ask `Find me a teacher`, select Gardening; the question remains in the user's original wording, the chosen subject is shown separately, and chat history can be opened on Expo and Web. Repeat with a manually typed subject.
3. Search `garden`, `farming`, `Python`, `Photoshop`, `tech-related skills`, and `May nagtuturo ba ng halaman?`; approved active relevant listings should rank ahead of unrelated ones where RLS permits them.
4. Check AI quota and 5-second cooldown, conversation delete, new chat, result-card links and AI skill drafts.
5. New Profile with no skills or portfolio: only one header action per section and the original empty-state message. Test creating a listing and adding a project through the retained header controls.

---

## 10 November 2026 — Canonical 16-category Web synchronization (pre-migration)

**Source of truth:** `src/pages/user/CreateSkill.jsx` from the user-uploaded Web `src.zip`.

### Web source changes (category metadata only)

- `src/pages/user/UserDashboard.jsx` — replaced its outdated 17-category `CATEGORIES` array with the exact 16 Create Skill labels. Existing category filters, card rendering, category icon lookup, search, recommendation sorting, bookmarks, Supabase fetching and responsive layout are unchanged.
- `src/pages/user/SetupInterests.jsx` — replaced the old category choices with the same 16 labels. Existing interest selection and saving operations are unchanged; new users will save the canonical names.
- `src/pages/user/MyListings.jsx` — updated category/icon metadata to the canonical list. Imported the existing Lucide `PiggyBank` icon to match the Create Skill finance category; existing `Coins` usages elsewhere are unchanged.
- `src/pages/user/Messages.jsx` — updated only `CATEGORY_ICON_META`, so session messages show the correct icons with canonical labels. Message sending and session handling are unchanged.
- `src/pages/public/Home.jsx` — replaced the old 17-category marketing pills with the 16 current names and updated the count to `learnTopics.length`. All layouts, styles, transitions, and other content are unchanged.
- `src/WEB-PATCH-NOTES.md` — appended this note. `CreateSkill.jsx` and `EditSkill.jsx` are unchanged.

### Permanent data migration is a **separate, manual step**

Two SQL files are delivered separately with this code:

1. `sql/01_PREVIEW_ONLY.sql` — read-only inventory of existing skill categories and `user_profiles.interests`, including unidentified values and ambiguous `Gaming & Hobbies` records.
2. `sql/02_ONE_TIME_RENAME_REQUIRES_APPROVAL.sql` — prepared transactionally guarded, **not executed**, to rename known legacy category strings in `public.skills.category` and existing saved user-interest arrays. It refuses to proceed when unknown/ambiguous category labels remain. It does not change skill IDs, prices, sessions, reviews, schema, policies, functions, or other application data.

**DO NOT** execute the one-time migration without backing up affected data and reviewing the preview. Web and Expo share the same Supabase; the Expo category UI must also be synchronized before running it or old Expo filters/icons may fail. A Git push, Vercel deploy, or JSX replacement **never** automatically renames old Supabase records. The Web category filters will match canonical categories only; old records will remain under their old names until the migration is reviewed and executed.

### Test checklist

- Confirm all 16 labels match Create Skill across Browse filters (desktop/mobile Web), Setup Interests, My Listings, Messages, and public Home.
- Confirm a newly approved canonical-category listing shows its corresponding icon rather than the Pin fallback.
- Before migration, check that old-category listings still exist in All Skills (this change does not delete them); they will not match new exact-category filters until migrated.
- Inventory historic `Gaming & Hobbies` or other unexpected categories. Review their actual skill titles and decide on the correct category per record; never force an unrelated category.
- After Web **and Expo** category UI checks and backup, run preview SQL, independently approve the migration, and verify renamed skill categories **and** profile interests.
- Retest recommendations (`profile.interests`), Category filters, My Listings, messages, bookings, reviews, credit price validation, and Skiro AI against actual Supabase data.
- Static JSX parsing and category-list comparisons were performed; live browser and database migration were **not** executed here.


---

## 10 November 2026 — Skiro AI expressive avatar (Web-only)

Added a lightweight, state-aware sparkle mascot (SVG/CSS) to the AI chat header, empty/reply/clarification avatars, thinking indicator, info panel and pinned Messages entry. The mascot has four **visual** states: idle (gentle breathing), typing (curious face), thinking (thought dots), and replying (brief happy pop **after a saved AI answer**). Respect `prefers-reduced-motion` and keep historical message avatars static. Changed only `SkillCreditAIChat.jsx`, `Messages.jsx`, and new `SkiroMascot.jsx` / `.css`. **No Supabase, AI Edge Function, chat quota, cooldown, message content, data model, navigation or other behavior changes.** See `SKIRO-WEB-MASCOT-PATCH-NOTES.md` in the delivery ZIP for testing and rollback instructions. Expo adaptation deferred.

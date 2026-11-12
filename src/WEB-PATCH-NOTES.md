## 2026-11-13 — Public-page navigation scroll reset (Web only)

- **Fixed**: Clicking **Privacy**, **Terms**, or **Contact** in the Home footer now opens the destination from the **top of the page**, rather than retaining the Home footer scroll position. The same reset applies when moving between public pages without a URL hash.
- **File modified**: `src/layouts/MainLayout.jsx`. The public layout already uses React Router `useLocation`; added a pathname-based `useLayoutEffect` with instant scroll reset before paint. In-page anchor navigation (`/#explore`, `/#about`, `/#download-app`) is excluded so its scroll target remains functional.
- **Unchanged**: Home content, footer link destinations, public-page content, existing smooth scrolling for section links, login/register links, user/dashboard routes, Supabase, PayMongo, and Expo Mobile. No new dependencies or database changes.
- **Verification**: JSX parse check, link/route assertions, and source-diff check. Live mobile browser and Vercel testing still required.

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


---

## 11 November 2026 — Universal leaderboard (Web-only, existing Edge Function)

**Reference:** Latest uploaded `capstoneskillcredit(1).zip`. The existing `supabase/functions/skillcredit-leaderboard/index.ts` already implements global, signed-in-only read aggregation using the Supabase service role internally; the browser does **not** receive or use the service role key.

### Files modified

1. `src/pages/user/Leaderboard.jsx` — Replaced the three browser-side reads from `user_profiles`, `reviews`, and `sessions` with one `supabase.functions.invoke('skillcredit-leaderboard')`. Preserves the existing tabs, header, skeleton, cards, ranking categories, metrics, wallet-balance interpretation of Credits, and profile navigation. Added deterministic UUID tie-breakers for equal scores; a focused error state and Retry button prevent a failed function request from silently appearing as an empty leaderboard.
2. `src/WEB-PATCH-NOTES.md` — This note.

### Explicitly unchanged

- The existing function source `supabase/functions/skillcredit-leaderboard/index.ts` (no new function file).
- All other Web UI, logic, routes, Supabase database tables/records, RLS policies, SQL, Auth configuration, PayMongo and Skiro AI; no Expo Mobile files.
- Original leaderboard calculation: Top Rated = average of 5 review scores per review, averaged per instructor, rounded to 1 decimal; Most Sessions = sessions with status `completed` for the instructor; Credits = `user_profiles.credits_balance` (current wallet, **not** lifetime earnings).

### Required manual deployment (not performed by a local ZIP or Git push)

From the existing Web project root after authenticating/linking Supabase CLI to the correct project:

```bash
npx supabase functions deploy skillcredit-leaderboard
```

This deploys the existing function; simply uploading `Leaderboard.jsx` to Vercel is **not** enough. Do not place service credentials in `.env.local` or browser code. Supabase Edge Function runtime must have `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` environment values available server-side (normally automatically supplied by Supabase); do not share their values. Keep JWT verification enabled and ensure callers are signed in.

### Manual verification (live Supabase required)

1. In Supabase Dashboard → Edge Functions, confirm `skillcredit-leaderboard` appears as deployed, then check logs for failures if any.
2. Run `npm run build` and deploy the Web update to Vercel via the normal Git push.
3. Sign in as two regular users in separate browser sessions; compare Top Rated, Most Sessions and Credits ranking order and summary values. Allow for the function's ~20-second cache if records just changed.
4. Verify profile navigation, skeleton, no-members state, and Retry behavior when the function is temporarily unavailable.
5. The function has a deliberate maximum dataset guard of 100,000 rows per table and may return an error above that threshold; production scalability should be reviewed if usage approaches this limit.

This patch is prepared locally only. No Supabase deployment or live cross-account test has been performed by ChatGPT.

---

## 11 November 2026 — Top Rated Top 3/Top 10 qualification (Web only)

**Baseline:** the working universal-leaderboard Web patch (`SkillCredit-Web-Universal-Leaderboard-SOURCE.zip`), not the older browser-side leaderboard.

### Changes

- `src/pages/user/Leaderboard.jsx` — For **Top Rated only**, require **at least 3 received reviews** (`totalReviews >= 3`) for the Top 3 and Top 10 (#4–#10) positions. A member with 0–2 reviews remains in the existing **Community** list regardless of their rating, and all qualified members who fall outside Top 10 also remain in Community. Community members are ranked by the existing average-rating ordering **without a minimum review count**. Community ranks on Top Rated are labeled `C1`, `C2`, etc., to distinguish them from podium/Top 10 positions; short progress text explains when a member is below the threshold.
- The existing average rating calculation, tie-break rules, display/cards, navigation, tab controls, and `Top Rating` summary are preserved. If nobody has 3 reviews, the featured positions are empty but Community still displays members. When review counts update, eligibility is re-evaluated on the next leaderboard data fetch.
- **Most Sessions** and **Credits** retain their original Top 3, Top 10, Community order and numbering exactly.

### Explicitly unchanged

- `supabase/functions/skillcredit-leaderboard/index.ts` — not modified and no Edge Function re-deployment needed for this patch.
- No database changes, RLS adjustments, new tables/functions/pages, Expo files, or changes to other Web features.

### Verification

1. Top Rated: users with 0, 1, or 2 reviews appear in Community only, even with a 5-star rating.
2. Top Rated: users with 3+ reviews populate Champion, Runner-up, and Top 10 in descending average-rating order. If fewer than 10 qualify, leave the remaining featured slots unfilled.
3. Top Rated: users outside qualified Top 10 appear in Community; `C1`, `C2` represent **Community positions**, not global Top Rated places.
4. Most Sessions and Credits: verify the original sorting, positions (#1–#10 and #11+), and displayed wallet balance remain unchanged.
5. Update reviews in Supabase and re-open/reload the leaderboard: newly qualified members can move into featured spots. The Edge Function's existing short cache can delay visibility briefly.

**Note:** Changes have been checked with local test fixtures/syntax validation; real account and deployment checks still need to be done on the live app.

---

## 12 November 2026 — Community post See more / See less (Web only)

**Baseline:** `SkillCredit-Web-TopRated-3Reviews-SOURCE.zip` (working global leaderboard and 3-review Top Rated eligibility preserved).

### Files modified

1. `src/pages/user/Community.jsx` — Adds a small `ExpandablePostContent` display component for **Community feed post text only**. Posts longer than **3 rendered lines** are collapsed by default and show `See more`. Selecting it reveals the entire original post and changes the action to `See less`; selecting that collapses the content again. Short posts remain fully visible without a button. An invisible measurement element and `ResizeObserver` detect real line wrapping, including newlines and responsive widths. Existing hashtags remain active.
2. `src/WEB-PATCH-NOTES.md` — Documents this UI-only change.

### Explicitly unchanged

- Database content, Supabase queries, auth, post creation/update/deletion, hashtags, images/media collage, likes, comments, moderation/reporting, and Community filters.
- Leaderboard (including global rankings and 3-review rule), other Web pages, payment, Edge Functions, AI, and Expo Mobile.
- No added dependencies, no SQL, no database migration.

### Manual verification

1. A post of one to three visible lines displays normally with **no See more** action.
2. A longer post shows at most three visible lines and **See more**. Click to expand full text, then **See less** to collapse.
3. Verify different widths (desktop and mobile), multiline posts, hashtags, and posts with image attachments.
4. Verify editing, comments, likes, reports and post navigation remain normal.

**Verification completed locally:** JSX syntax validated; full Vite/browser/E2E testing and Vercel deployment not performed here.


---

## 12 November 2026 — Session decline and cancellation notifications (Web only)

**Baseline:** `SkillCredit-Web-Community-SeeMore-SOURCE.zip`, which already includes the global leaderboard, Top Rated 3-review threshold, and Community See More behavior.

### Changed files

1. `src/pages/user/Sessions.jsx` — Added `notifications` inserts after a successful session status update for existing `decline` and `cancel` actions, notifying the *other* participant. Message wording distinguishes teacher declining an initial booking, teacher withdrawing a proposed schedule, learner declining a proposed time (which cancels the entire session), learner cancelling a pending booking, and either participant cancelling an upcoming session. Uses the existing `session_cancelled` type and `/sessions?session=<id>` destination. Added a `session_update` notice when a participant uses existing **Undo** on Mark as Done. Existing `cancel_no_show` notification is left intact. Notification-insert errors are logged and do not re-run or undo session/refund operations.
2. `src/WEB-PATCH-NOTES.md` — This note.

### Explicitly unchanged

- Session state choices, confirmation dialogs, refund amounts and update statements, completion RPC, booking, start, scheduling, disputes, review logic, notifications UI, routes, and all other code paths.
- Supabase database schema, RLS, Edge Functions, Auth, Web leaderboard, Community, payment, AI, and all Expo Mobile files.

### Verification performed / remaining

- Local JSX parse, targeted static checks, and distribution ZIP integrity checks performed.
- Live Supabase / UI validation remains necessary: teacher decline, learner cancel pending, teacher and learner cancel upcoming, learner rejects proposed schedule, teacher cancels proposed schedule, undo done, existing no-show refund, and recipient link navigation.
- This patch does NOT make credit refunds atomic or address pre-existing cancellation concurrency/permission risks. The notification is sent when the `sessions.update` call returns no error; it does not independently verify the credit balance update.


---

## 12 November 2026 — Home page mobile responsive alignment and CTA sizing (Web only)

**Baseline:** `SkillCredit-Web-Session-Cancel-Notifications-SOURCE.zip`. Preserves all previously implemented global leaderboard, Top Rated 3-review rule, Community See More/See Less, and session cancellation notifications.

### Changed files

1. `src/pages/public/Home.jsx` — Adds scoped mobile breakpoint styling for the Home hero, final signup CTA, and footer. Fixes the footer attribution's fixed `translateX(35px)` offset on screens at 768px or below, centers the attribution pill and footer links, improves mobile contrast for fine print, and makes signup/login CTAs compact rather than oversized on narrow screens. Desktop layout and existing destinations/handlers are unchanged.
2. `src/components/DownloadAppSection.jsx` — Adjusts Android download CTA sizing and responsive padding for narrow screens, without touching the existing download URL or navigation behavior.
3. `src/WEB-PATCH-NOTES.md` — This documentation entry.

### Explicitly unchanged

- MainLayout navigation logic, Login/Register routes, hero links, Android build destination, IntersectionObserver behavior, animations, public content, Supabase database and Edge Functions, authentication, payment code, leaderboard, Community, Sessions, and Expo Mobile.
- No new database tables/SQL, no new packages, no new pages.

### Manual verification checklist

1. Open Home at browser widths 320, 360, 390, 480, 768, and desktop (1280+). Check page has no horizontal scroll.
2. Final green signup area: CTA text is legible, button is centered and compact rather than taking nearly the full width.
3. Footer: SkillCredit wordmark, “Built with ❤️...”, Team SkillCredit attribution, Privacy/Terms/Contact links, and copyright are horizontally centered on mobile.
4. Hero: “Get 20 free credits — join now” and “Log in” buttons fit narrow mobile widths, still navigate to the original routes.
5. Android section: download CTA is touch-friendly but no longer forced to stretch full-width on mobile.
6. Desktop navigation/footer arrangement remain as before; all links and data flows still work.

### Local validation

- Parsed both modified JSX files via TypeScript's JSX parser: no syntax errors.
- Browser-based responsive CSS layout fixture validated centered footer / signup CTA and no horizontal overflow at widths 320, 360, 390, 480, 768, and 1280px. This fixture is not a full app/browser end-to-end test.
- Full Vite build could not be completed in this Linux workspace because the uploaded node_modules contains incompatible/missing native Rolldown bindings. Build locally on the user's machine using `npm run build` and test on mobile Chrome before deployment.

## Home copy alignment and compact mobile CTA
- Made Home hero and final join CTA compact and mobile-friendly.
- Corrected Home marketing copy to match actual SkillCredit features and optional top-up.
- Removed the Home Teaching Activity preview and its unused session query; preserved Home recent Student Ratings and the global `/leaderboard` implementation.
- No changes to auth logic, Supabase, payments, or Expo. See `SkillCredit-Web-Home-Content-CTA-Cleanup-Patch-Notes.md`.


---

## 13 November 2026 — Public pages: mobile tabs and SkillCredit logo (Web only)

**Baseline:** `SkillCredit-Web-Public-Pages-Scroll-To-Top-SOURCE.zip`, including all earlier Web updates (global leaderboard, Top Rated 3-review rule, Community See more/less, session notifications, Home mobile corrections, and scroll-to-top public navigation).

### Changed files

1. `src/layouts/MainLayout.jsx` — Uses the existing `src/assets/logo.png` beside the `SkillCredit` wordmark. Adds small-screen logo sizing and scoped CSS for public information navigation tabs. Existing home destination, auth links, scroll-to-top, page routing and layout functions are unchanged.
2. `src/pages/public/PrivacyPolicy.jsx` — Identifies the existing public-info tab group for responsive styling. No content or links changed.
3. `src/pages/public/TermsConditions.jsx` — Identifies the existing public-info tab group for responsive styling. No content or links changed.
4. `src/pages/public/ContactUs.jsx` — Identifies the existing public-info tab group for responsive styling. No form, email, content or links changed.
5. `src/WEB-PATCH-NOTES.md` — Documents this targeted UI adjustment.

### Mobile behavior

- At widths 540px and below, Privacy Policy / Terms & Conditions / Contact Us form one 3-column navigation row. Labels may wrap **inside their own tab** when necessary but the entire Contact Us tab stays on the same row. Tap targets retain minimum 44px height.
- Desktop navigation layout remains the same. Header includes the existing SkillCredit illustrated mark, scaled/cropped visually via CSS to accommodate transparency around the original artwork.
- No additional image files/dependencies. No Supabase, logic, payment, notifications, leaderboard, or Expo changes.

### Validate

- Check public pages at 320, 360, 390, 480px and 768px in mobile browser. All three tabs must remain visible in one row.
- Test link navigation and automatically scroll-to-top between Privacy, Terms, Contact, Home.
- Check logo and both auth buttons in MainLayout header, with no overflow on narrow phones.
- Check desktop header and public page nav at 1280px.
- Run `npm run build` locally and test on a real mobile phone before pushing.

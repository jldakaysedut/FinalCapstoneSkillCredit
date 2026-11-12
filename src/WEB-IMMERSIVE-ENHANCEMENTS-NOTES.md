# SkillCredit Web — 5 Immersive UX Enhancements (SRC-only)

Baseline: `SkillCredit-Web-Session-Cancel-Notifications-SOURCE.zip` (latest available Web source from 12 Nov 2026 in the user Library).

## What was changed
1. `src/components/SessionJourney.jsx` — New read-only journey component mapping existing statuses to visual progress; supports pending, reschedule_proposed, upcoming, active, completed, cancelled and disputed; reads two existing completion flags.
2. `src/pages/user/Sessions.jsx` — Integrates SessionJourney into existing session cards; no new transaction/query/status action.
3. `src/components/SkiroPageGuide.jsx` — New page-aware, dismissible compact inline guide using the existing SkiroMascot; predefined tips and existing route links only. No AI API calls. Session-only dismissal in sessionStorage.
4. `src/layouts/UserLayout.jsx` — Renders inline SkiroPageGuide above Outlet; existing Support floating button, navigation, and AI chat are untouched.
5. `src/pages/user/Profile.jsx` — Adds a read-only Skill Passport using the existing loaded profile listings, completed teaching sessions, reviews, portfolio, and categories. No new achievement or verification claims.
6. `src/pages/user/UserDashboard.jsx` — Adds Discover Compass: explains current interest-based suggestions, shows match count and quick category filters, uses existing filters.
7. `src/pages/user/Community.jsx` — Preserves already-working 3-line See More/See Less and adds accessible reaction feedback/focus styling. No change to like/comment actions.
8. `src/userDarkMode.css` — Scoped dark-theme backgrounds for the new Web UI sections.
9. `src/WEB-IMMERSIVE-ENHANCEMENTS-NOTES.md` — This note.

## Explicitly unchanged
- All `supabase/` folder files, tables, SQL, RLS, storage, Edge Functions and the shared backend.
- `src/supabaseClient.js`, existing query/write logic, wallet/PayMongo and AI messaging behavior.
- Router definitions and all files outside `src/`.
- Narrative, ERD, Data Dictionary, other capstone documentation and Expo Mobile.
- Existing global leaderboard, Top Rated three-review condition, Community expand behavior, session decline/cancel notifications.

## Manual QA checklist
- Web Dashboard: same skill results; Explore category filters act via original filter; saved skills remain intact.
- Profile: Skill Passport numbers match existing profile data; no change when adding/editing portfolio or listings.
- Sessions: expand pending, rescheduled, upcoming, active, completed, cancelled, disputed; confirm timeline labels and action buttons.
- Skiro guide: different tips on dashboard, create skill, sessions, profile and community; dismiss per browser tab/session; other routes unaffected; Support button and AI chat unchanged.
- Community: See More/See Less, likes, comments, report, edit/delete and deep-link routing still work.
- Responsive/mobile-width browser and Web dark mode visual review.

## Safety constraints
All changes are UI-only and derived from existing visible frontend data. Actual user action flows and Supabase operations remain as before. Backend permission/financial issues cannot be fixed or claimed resolved by this patch.

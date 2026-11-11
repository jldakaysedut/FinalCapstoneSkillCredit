/**
 * SkillCredit global leaderboard — read-only aggregate endpoint.
 * No SQL migrations, existing table changes, or RLS policy changes.
 * Deploy this ONLY as a Supabase Edge Function (never ship service keys to Web).
 * A signed-in user's JWT is verified with Supabase Auth before admin-scoped reads.
 */

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  credits_balance: number | null;
};
type ReviewRow = {
  id: string;
  instructor_id: string | null;
  rating: number | null;
  q1_clarity: number | null;
  q2_patience: number | null;
  q3_relevance: number | null;
  q4_professionalism: number | null;
};
type SessionRow = { id: string; instructor_id: string | null };

type PublicLeaderboardRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  avgRating: number;
  totalReviews: number;
  sessionsCompleted: number;
  creditsBalance: number;
};

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
};
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' };
const PAGE_SIZE = 750; // below PostgREST's common 1000-row default cap
const MAX_RECORDS_PER_TABLE = 100000; // fail closed instead of showing incomplete global totals
const CACHE_MS = 20_000; // short shared in-isolate cache; JWT still verified on each invocation
let cached: { at: number; payload: unknown } | null = null;
let inflight: Promise<unknown> | null = null;

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function finiteAmount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function verifySignedInUser(request: Request, url: string, anonKey: string): Promise<boolean> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return false;
  const result = await fetch(`${url}/auth/v1/user`, {
    method: 'GET',
    headers: { authorization: `Bearer ${match[1]}`, apikey: anonKey, accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!result.ok) return false;
  const user = await result.json().catch(() => null);
  return Boolean(user && typeof user.id === 'string' && user.id.length > 0);
}

// Only internal, service-role Supabase REST reads. Raw session and review rows
// never appear in the response; clients receive ONLY per-instructor aggregates.
async function readEveryRow<T>(
  url: string,
  serviceRoleKey: string,
  table: 'user_profiles' | 'reviews' | 'sessions',
  fields: string,
  filter: string,
  consume: (row: T) => void,
): Promise<void> {
  let total = 0;
  while (true) {
    const query = new URL(`${url}/rest/v1/${table}`);
    query.searchParams.set('select', fields);
    query.searchParams.set('order', 'id.asc'); // stable unique-key pagination
    query.searchParams.set('limit', String(PAGE_SIZE));
    query.searchParams.set('offset', String(total));
    for (const [key, value] of new URLSearchParams(filter)) query.searchParams.set(key, value);
    const result = await fetch(query, {
      method: 'GET',
      headers: { authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!result.ok) throw new Error(`${table} aggregate read failed (${result.status})`);
    const rows: unknown = await result.json();
    if (!Array.isArray(rows)) throw new Error(`Unexpected ${table} response`);
    for (const row of rows) consume(row as T);
    total += rows.length;
    if (total > MAX_RECORDS_PER_TABLE) throw new Error(`The ${table} leaderboard dataset exceeds the safety limit`);
    if (rows.length < PAGE_SIZE) return;
  }
}

async function computeGlobalLeaderboard(url: string, serviceRoleKey: string): Promise<unknown> {
  const profiles: ProfileRow[] = [];
  const reviewMap = new Map<string, { sum: number; count: number }>();
  const sessionMap = new Map<string, number>();
  let totalDone = 0;

  await Promise.all([
    readEveryRow<ProfileRow>(url, serviceRoleKey, 'user_profiles',
      'id,full_name,avatar_url,bio,role,credits_balance', 'is_deleted=eq.false',
      (profile) => { if (profile && typeof profile.id === 'string') profiles.push(profile); }),
    readEveryRow<ReviewRow>(url, serviceRoleKey, 'reviews',
      'id,instructor_id,rating,q1_clarity,q2_patience,q3_relevance,q4_professionalism', '',
      (review) => {
        if (!review?.instructor_id) return;
        // Match original Web scoring: each review is an average of these five questions.
        const avg5 = (finiteAmount(review.rating) + finiteAmount(review.q1_clarity) +
          finiteAmount(review.q2_patience) + finiteAmount(review.q3_relevance) +
          finiteAmount(review.q4_professionalism)) / 5;
        const prev = reviewMap.get(review.instructor_id) || { sum: 0, count: 0 };
        prev.sum += avg5;
        prev.count++;
        reviewMap.set(review.instructor_id, prev);
      }),
    readEveryRow<SessionRow>(url, serviceRoleKey, 'sessions',
      'id,instructor_id', 'status=eq.completed',
      (session) => {
        totalDone++;
        if (session?.instructor_id) sessionMap.set(session.instructor_id,
          (sessionMap.get(session.instructor_id) || 0) + 1);
      }),
  ]);

  let topRating = 0;
  let totalCredits = 0;
  const leaderboardRows: PublicLeaderboardRow[] = profiles.map((p) => {
    const reviews = reviewMap.get(p.id) || { sum: 0, count: 0 };
    const avgRating = reviews.count ? Number((reviews.sum / reviews.count).toFixed(1)) : 0;
    topRating = Math.max(topRating, avgRating);
    const creditsBalance = finiteAmount(p.credits_balance);
    totalCredits += creditsBalance;
    return {
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      bio: p.bio,
      role: p.role,
      avgRating,
      totalReviews: reviews.count,
      sessionsCompleted: sessionMap.get(p.id) || 0,
      creditsBalance,
    };
  });
  // Stabilize the base order. The Web sorting has an explicit UUID tie-breaker too.
  leaderboardRows.sort((a, b) => a.id.localeCompare(b.id));

  return {
    profiles: leaderboardRows,
    statsSummary: {
      totalUsers: leaderboardRows.length,
      topRating: topRating.toFixed(1),
      totalSessionsCompleted: totalDone,
      totalCreditsCirculating: totalCredits,
    },
    updatedAt: new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return response(405, { error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('[leaderboard] Missing Supabase Edge Function credentials');
    return response(503, { error: 'Leaderboard is not configured.' });
  }

  try {
    // Authenticate BEFORE using service credentials, including on cached results.
    const authenticated = await verifySignedInUser(req, supabaseUrl, anonKey);
    if (!authenticated) return response(401, { error: 'Sign in to view the leaderboard.' });

    if (cached && Date.now() - cached.at < CACHE_MS) return response(200, cached.payload);
    if (!inflight) {
      inflight = computeGlobalLeaderboard(supabaseUrl, serviceRoleKey)
        .then((payload) => { cached = { at: Date.now(), payload }; return payload; })
        .finally(() => { inflight = null; });
    }
    const payload = await inflight;
    return response(200, payload);
  } catch (error) {
    console.error('[leaderboard] Unable to compute global leaderboard:', error instanceof Error ? error.message : 'Unknown error');
    return response(503, { error: 'Global leaderboard is temporarily unavailable. Please try again.' });
  }
});

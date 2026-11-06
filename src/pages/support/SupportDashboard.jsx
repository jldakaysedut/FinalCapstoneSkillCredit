import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Headset, Star, Ticket, Users } from 'lucide-react';
import supabase from '../../supabaseClient';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2';

export default function SupportDashboard() {
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, total: 0 });
  const [topAgents, setTopAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).single();
        setProfile(profileData);
      }

      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('status, rating, agent:user_profiles!support_tickets_assigned_to_fkey(id, full_name, avatar_url)');

      if (!error && tickets) {
        setStats({
          open: tickets.filter(ticket => ticket.status === 'open').length,
          inProgress: tickets.filter(ticket => ticket.status === 'in_progress').length,
          resolved: tickets.filter(ticket => ticket.status === 'resolved').length,
          total: tickets.length,
        });

        const agentCounts = {};
        tickets.filter(ticket => ticket.status === 'resolved' && ticket.agent).forEach(ticket => {
          const agentId = ticket.agent.id;
          if (!agentCounts[agentId]) agentCounts[agentId] = { ...ticket.agent, count: 0, totalStars: 0, ratedTickets: 0 };
          agentCounts[agentId].count += 1;
          if (ticket.rating) {
            agentCounts[agentId].totalStars += ticket.rating;
            agentCounts[agentId].ratedTickets += 1;
          }
        });
        setTopAgents(Object.values(agentCounts).sort((a, b) => b.count - a.count).slice(0, 5));
      } else if (error) {
        console.error('Dashboard fetch error:', error);
      }
      setLoading(false);
    };

    fetchDashboardData();
    const channel = supabase.channel('support_dashboard_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchDashboardData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 font-sans text-gray-700" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading overview</span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Welcome back.</h1>
          <p className="mt-1 text-sm text-gray-500">Loading the latest figures…</p>
        </div>
        <div className="grid animate-pulse grid-cols-1 gap-6 lg:grid-cols-12" aria-hidden="true">
          <div className="h-72 rounded-2xl border border-gray-200 bg-white lg:col-span-8" />
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <div className="h-36 rounded-2xl bg-yellow-100" />
            <div className="h-32 rounded-2xl border border-gray-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  const resolutionRate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

  // ── Display-only values derived from the stats above ──
  const queues = [
    { label: 'Open queue', note: 'Waiting for an agent', count: stats.open, icon: Ticket, tone: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
    { label: 'In progress', note: 'Being handled now', count: stats.inProgress, icon: Clock3, tone: 'bg-blue-50 text-blue-700', bar: 'bg-blue-500' },
    { label: 'Resolved', note: 'Successfully closed', count: stats.resolved, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  ];

  // Team rating: add up each agent's own average rating, then divide by how many agents have a rating.
  const ratedAgents = topAgents.filter(agent => agent.ratedTickets > 0);
  const overallRating = ratedAgents.length > 0
    ? (ratedAgents.reduce((sum, agent) => sum + agent.totalStars / agent.ratedTickets, 0) / ratedAgents.length).toFixed(1)
    : '—';

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">Here’s the current pulse of your support team and customer queue.</p>
        </div>
        <Link to="/support/tickets" className={`inline-flex items-center justify-center gap-2 self-start rounded-lg bg-yellow-400 px-3.5 py-2 text-[13px] font-semibold text-gray-900 shadow-sm transition-colors hover:bg-yellow-500 sm:self-auto ${FOCUS_RING}`}>
          Open ticket queue <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── ROW 1: WORK QUEUES + RESOLUTION / WORKLOAD ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Work queues (the only place the open / in progress / resolved counts appear) */}
        <section aria-labelledby="queues-heading" className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 id="queues-heading" className="text-sm font-semibold text-gray-900">Ticket queues</h2>
            <span className="text-xs text-gray-500">Share of all requests</span>
          </div>
          <ul className="flex flex-1 flex-col divide-y divide-gray-100">
            {queues.map(({ label, note, count, icon: Icon, tone, bar }) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <li key={label} className="flex flex-1">
                  <Link to="/support/tickets" className={`group flex flex-1 flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:gap-6 ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0`}>
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{note}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 sm:w-[46%]">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`${pct}% of all requests`}>
                        <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-12 text-right text-2xl font-semibold leading-none tabular-nums text-gray-900">{count}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors group-hover:border-yellow-400 group-hover:bg-yellow-50 group-hover:text-yellow-700">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Resolution rate + workload */}
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-[auto_1fr]">
          <section aria-labelledby="rate-heading" className="rounded-2xl bg-yellow-400 p-6 text-gray-900 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 id="rate-heading" className="text-sm font-medium text-yellow-950/80">Resolution rate</h2>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/10">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums">{resolutionRate}</span>
              <span className="text-sm font-semibold text-yellow-950/80">%</span>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-yellow-950/80">Share of all support requests that have been successfully closed.</p>
          </section>

          <section aria-labelledby="workload-heading" className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 id="workload-heading" className="text-sm font-semibold text-gray-900">Workload</h2>
            <dl className="mt-auto grid grid-cols-2 gap-4 pt-4">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-gray-500"><Headset className="h-3.5 w-3.5" /> All requests</dt>
                <dd className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-gray-900">{stats.total}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-gray-500"><Star className="h-3.5 w-3.5" /> Avg. rating</dt>
                <dd className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-gray-900">{overallRating}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* ── ROW 2: AGENT PERFORMANCE + NEXT STEP ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Agent performance */}
        <section aria-labelledby="agents-heading" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div>
              <h2 id="agents-heading" className="text-sm font-semibold text-gray-900">Agent performance</h2>
              <p className="mt-0.5 text-xs text-gray-500">Resolved tickets and customer ratings</p>
            </div>
            {topAgents.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Top {topAgents.length}</span>
            )}
          </div>

          {topAgents.length === 0 ? (
            <div className="p-12 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
                <Users className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-gray-900">No resolved tickets yet</p>
              <p className="mt-1 text-xs text-gray-500">Agent performance will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {topAgents.map((agent, index) => {
                const avgRating = agent.ratedTickets > 0 ? (agent.totalStars / agent.ratedTickets).toFixed(1) : '—';
                const maxCount = Math.max(...topAgents.map(item => item.count), 1);
                return (
                  <li key={agent.id} className="relative flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/70">
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-yellow-400" aria-hidden="true" />
                    <span className="w-5 text-center text-xs font-semibold tabular-nums text-gray-400">{String(index + 1).padStart(2, '0')}</span>
                    {agent.avatar_url
                      ? <img src={agent.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                      : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-sm font-semibold text-yellow-800">{agent.full_name?.charAt(0) || 'A'}</span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-gray-900">{agent.full_name || 'Support agent'}</p>
                        <span className="shrink-0 text-xs tabular-nums text-gray-500">{agent.count} resolved</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-yellow-400 transition-all duration-500" style={{ width: `${Math.max(8, (agent.count / maxCount) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="inline-flex w-12 shrink-0 items-center justify-end gap-1 text-xs font-semibold tabular-nums text-gray-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{avgRating}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Next step */}
        <aside aria-labelledby="next-heading" className="lg:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-[132px]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">
                <Headset className="h-4 w-4" />
              </span>
              <h2 id="next-heading" className="text-sm font-semibold text-gray-900">Stay on top of every request</h2>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-gray-600">
              A calmer queue starts with a clear next step. Review unassigned requests, pick up a ticket, and keep customers moving toward a resolution.
            </p>
          </div>
        </aside>
      </div>

    </div>
  );
}
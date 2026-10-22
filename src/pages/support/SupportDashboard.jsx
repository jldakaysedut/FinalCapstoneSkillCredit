import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Headset, Star, Ticket, Users } from 'lucide-react';
import supabase from '../../supabaseClient';
​
export default function SupportDashboard() {
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, total: 0 });
  const [topAgents, setTopAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
​
  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).single();
        setProfile(profileData);
      }
​
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('status, rating, agent:user_profiles!support_tickets_assigned_to_fkey(id, full_name, avatar_url)');
​
      if (!error && tickets) {
        setStats({
          open: tickets.filter(ticket => ticket.status === 'open').length,
          inProgress: tickets.filter(ticket => ticket.status === 'in_progress').length,
          resolved: tickets.filter(ticket => ticket.status === 'resolved').length,
          total: tickets.length,
        });
​
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
​
    fetchDashboardData();
    const channel = supabase.channel('support_dashboard_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchDashboardData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);
​
  if (loading) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
          <span><span className="block text-sm font-semibold text-slate-800">Loading overview</span><span className="mt-0.5 block text-xs text-slate-400">Gathering queue data</span></span>
        </div>
      </div>
    );
  }
​
  const resolutionRate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const metricCards = [
    { label: 'Open queue', value: stats.open, hint: 'Waiting for an agent', Icon: Ticket, color: 'amber' },
    { label: 'In progress', value: stats.inProgress, hint: 'Being handled now', Icon: Clock3, color: 'blue' },
    { label: 'Resolved', value: stats.resolved, hint: 'Successfully closed', Icon: CheckCircle2, color: 'emerald' },
    { label: 'All requests', value: stats.total, hint: `${resolutionRate}% resolution rate`, Icon: Headset, color: 'slate' },
  ];
  const tone = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
​
  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans text-slate-700 animate-in fade-in duration-300">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Support operations
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Here’s the current pulse of your support team and customer queue.</p>
        </div>
        <Link to="/support/tickets" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2">
          Open ticket queue <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
​
      <section aria-label="Ticket summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, hint, Icon, color }) => (
          <article key={label} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-slate-500">{label}</p>
                <p className="mt-3 text-[34px] font-bold leading-none tracking-tight text-[#303833]">{value}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tone[color]}`}><Icon className="h-[19px] w-[19px]" /></span>
            </div>
            <p className="mt-4 text-[11px] font-medium text-slate-400">{hint}</p>
          </article>
        ))}
      </section>
​
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#303833]"><Users className="h-4 w-4 text-emerald-600" /><h3 className="text-[15px] font-bold">Agent performance</h3></div>
              <p className="mt-1.5 text-xs text-slate-500">Resolved tickets and customer ratings</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Top 5</span>
          </div>
          {topAgents.length === 0 ? (
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center">
              <div><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm"><Users className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-slate-700">No resolved tickets yet</p><p className="mt-1 text-xs text-slate-400">Agent performance will appear here.</p></div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topAgents.map((agent, index) => {
                const avgRating = agent.ratedTickets > 0 ? (agent.totalStars / agent.ratedTickets).toFixed(1) : '—';
                const maxCount = Math.max(...topAgents.map(item => item.count), 1);
                return (
                  <div key={agent.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                    <span className="w-5 text-center text-[11px] font-bold text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                    {agent.avatar_url ? <img src={agent.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">{agent.full_name?.charAt(0) || 'A'}</span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3"><p className="truncate text-[13px] font-semibold text-slate-800">{agent.full_name || 'Support agent'}</p><span className="shrink-0 text-[11px] font-semibold text-slate-500">{agent.count} resolved</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(8, (agent.count / maxCount) * 100)}%` }} /></div>
                    </div>
                    <span className="inline-flex w-12 shrink-0 items-center justify-end gap-1 text-xs font-bold text-slate-700"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{avgRating}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
​
        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 text-[#303833] shadow-sm sm:p-7">
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm"><Headset className="h-5 w-5" /></span>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-800">Stay on top of every request</p>
              <h3 className="mt-2 max-w-sm text-2xl font-bold leading-tight tracking-tight text-[#303833]">A calmer queue starts with a clear next step.</h3>
              <p className="mt-3 max-w-sm text-[13px] leading-6 text-[#68716a]">Review unassigned requests, pick up a ticket, and keep customers moving toward a resolution.</p>
            </div>
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs text-[#68716a]"><span className="h-2 w-2 rounded-full bg-amber-400" />{stats.open} waiting <span className="text-slate-300">·</span> <span className="h-2 w-2 rounded-full bg-blue-400" />{stats.inProgress} in progress</div>
              <Link to="/support/tickets" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">Go to queue <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
​
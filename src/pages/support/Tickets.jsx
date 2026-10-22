import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowRight, Clock3, Search, Ticket as TicketIcon, Users } from 'lucide-react';
import supabase from '../../supabaseClient';

const STATUS_META = {
  open: { label: 'Open', style: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  in_progress: { label: 'Investigating', style: 'bg-blue-50 text-blue-800 ring-blue-200', dot: 'bg-blue-500' },
  resolved: { label: 'Resolved', style: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
};
const FILTERS = ['all', 'open', 'in_progress', 'resolved'];

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const formatCreatedAt = (value) => value
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

export default function Tickets() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, user:user_profiles!support_tickets_user_id_fkey(id, full_name, avatar_url), agent:user_profiles!support_tickets_assigned_to_fkey(id, full_name)')
      .order('created_at', { ascending: false });
    if (error) console.error('Ticket queue fetch error:', error);
    if (data) setTickets(data);
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      await fetchTickets();
    };
    init();

    const channel = supabase.channel('support_queue_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchTickets(false))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const filteredTickets = tickets.filter(ticket => {
    const matchesTab = filter === 'all' || ticket.status === filter;
    const searchLower = searchQuery.trim().toLowerCase();
    const matchesSearch = !searchLower || [ticket.subject, ticket.id, ticket.user?.full_name]
      .some(value => String(value ?? '').toLowerCase().includes(searchLower));
    return matchesTab && matchesSearch;
  });

  const counts = FILTERS.reduce((result, status) => {
    result[status] = status === 'all' ? tickets.length : tickets.filter(ticket => ticket.status === status).length;
    return result;
  }, {});

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) return alert('No data to export.');
    const headers = ['Ticket ID', 'Subject', 'Status', 'User', 'Assigned Agent', 'Created At'];
    const rows = filteredTickets.map(ticket => [
      ticket.id,
      ticket.subject,
      STATUS_META[ticket.status]?.label || ticket.status,
      ticket.user?.full_name || 'Unknown',
      ticket.agent?.full_name || 'Unassigned',
      formatCreatedAt(ticket.created_at),
    ].map(csvCell).join(','));
    const blob = new Blob([[headers.map(csvCell).join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans text-slate-700 animate-in fade-in duration-300">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
            <TicketIcon className="h-3.5 w-3.5" /> Support operations
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Ticket queue</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Find the right request, review ownership, and move it forward.</p>
        </div>
        <button onClick={handleExportCSV} disabled={filteredTickets.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <ArrowDownToLine className="h-4 w-4" /> Export CSV
        </button>
      </section>

      <section aria-label="Queue totals" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'All tickets', status: 'all', Icon: TicketIcon, color: 'text-slate-700 bg-slate-100' },
          { label: 'Open', status: 'open', Icon: Clock3, color: 'text-amber-700 bg-amber-50' },
          { label: 'Investigating', status: 'in_progress', Icon: Users, color: 'text-blue-700 bg-blue-50' },
          { label: 'Resolved', status: 'resolved', Icon: TicketIcon, color: 'text-emerald-700 bg-emerald-50' },
        ].map(({ label, status, Icon, color }) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md ${filter === status ? 'border-slate-400 ring-2 ring-slate-900/5' : 'border-slate-200/80'}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0"><span className="block text-[11px] font-semibold text-slate-500">{label}</span><span className="mt-0.5 block text-xl font-bold leading-none text-[#303833]">{counts[status]}</span></span>
          </button>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-[360px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" role="searchbox" inputMode="search" placeholder="Search tickets, people, or IDs…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50" />
          </div>
          <div role="group" aria-label="Filter tickets by status" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {FILTERS.map(status => (
              <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold capitalize transition ${filter === status ? 'bg-white text-[#303833] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {status === 'all' ? 'All' : STATUS_META[status]?.label} <span className={`ml-1 ${filter === status ? 'text-slate-500' : 'text-slate-400'}`}>{counts[status]}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center"><div className="flex items-center gap-3 text-sm font-medium text-slate-500"><span className="h-6 w-6 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />Loading tickets…</div></div>
        ) : filteredTickets.length === 0 ? (
          <div className="grid min-h-72 place-items-center px-5 py-12 text-center">
            <div><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search className="h-5 w-5" /></span><p className="mt-4 text-sm font-semibold text-slate-800">No tickets found</p><p className="mt-1 text-xs text-slate-400">Try changing your search or status filter.</p></div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><th className="px-5 py-3.5">Requester</th><th className="px-5 py-3.5">Ticket</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Assigned to</th><th className="px-5 py-3.5">Created</th><th className="px-5 py-3.5 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.map(ticket => {
                    const ownTicket = ticket.user_id === currentUserId;
                    const status = STATUS_META[ticket.status] || STATUS_META.open;
                    return (
                      <tr key={ticket.id} className="group transition hover:bg-slate-50/80">
                        <td className="px-5 py-4"><div className="flex min-w-[150px] items-center gap-3">{ticket.user?.avatar_url ? <img src={ticket.user.avatar_url} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{ticket.user?.full_name?.charAt(0) || 'U'}</span>}<div className="min-w-0"><p className="truncate text-[12px] font-semibold text-slate-800">{ticket.user?.full_name || 'Unknown user'}</p><p className="mt-0.5 text-[10px] font-mono text-slate-400">#{ticket.id.split('-')[0]}</p></div></div></td>
                        <td className="max-w-[300px] px-5 py-4"><p className="truncate text-[13px] font-semibold text-slate-800">{ticket.subject || 'Untitled request'}</p><p className="mt-1 text-[11px] text-slate-400">Support request</p></td>
                        <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ring-1 ring-inset ${status.style}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span></td>
                        <td className="px-5 py-4">{ticket.agent ? <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-700"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">{ticket.agent.full_name?.charAt(0) || 'A'}</span>{ticket.agent.full_name || 'Agent'}</span> : <span className="text-[12px] font-medium text-slate-400">Unassigned</span>}</td>
                        <td className="px-5 py-4 text-[11px] text-slate-500">{formatCreatedAt(ticket.created_at)}</td>
                        <td className="px-5 py-4 text-right">{ownTicket ? <span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-400">Your ticket</span> : <button type="button" onClick={() => navigate(`/support/tickets/${ticket.id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-emerald-700 hover:text-white">View ticket <ArrowRight className="h-3.5 w-3.5" /></button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {filteredTickets.map(ticket => {
                const ownTicket = ticket.user_id === currentUserId;
                const status = STATUS_META[ticket.status] || STATUS_META.open;
                return (
                  <article key={ticket.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[13px] font-semibold leading-5 text-slate-900">{ticket.subject || 'Untitled request'}</p><p className="mt-1 text-[10px] font-mono text-slate-400">#{ticket.id.split('-')[0]}</p></div><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ring-1 ring-inset ${status.style}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span></div>
                    <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5">{ticket.user?.avatar_url ? <img src={ticket.user.avatar_url} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600">{ticket.user?.full_name?.charAt(0) || 'U'}</span>}<div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-700">{ticket.user?.full_name || 'Unknown user'}</p><p className="text-[10px] text-slate-400">{ticket.agent?.full_name || 'Unassigned'} · {formatCreatedAt(ticket.created_at)}</p></div></div>{ownTicket ? <span className="shrink-0 text-[10px] font-semibold text-slate-400">Your ticket</span> : <button type="button" onClick={() => navigate(`/support/tickets/${ticket.id}`)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-semibold text-white">Open <ArrowRight className="h-3.5 w-3.5" /></button>}</div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {!loading && filteredTickets.length > 0 && <div className="border-t border-slate-100 px-5 py-3 text-[10px] font-medium text-slate-400">Showing {filteredTickets.length} of {tickets.length} tickets</div>}
      </section>
    </div>
  );
}
​
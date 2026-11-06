import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowRight, Search, Ticket as TicketIcon, X, AlertTriangle } from 'lucide-react';
import supabase from '../../supabaseClient';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2';

// One column template shared by the header row and every ticket row (desktop),
// so all columns line up exactly.
const ROW_GRID = 'lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_124px_136px] lg:items-center lg:gap-6';

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

  // ── Display-only: the four filter tabs ──
  const tabs = [
    { id: 'open', label: 'Open', hint: 'Waiting for an agent', count: counts.open },
    { id: 'in_progress', label: 'Investigating', hint: 'Being handled now', count: counts.in_progress },
    { id: 'resolved', label: 'Resolved', hint: 'Closed', count: counts.resolved },
    { id: 'all', label: 'All tickets', hint: 'Everything on record', count: counts.all },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Ticket queue</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Find the right request, review ownership, and move it forward.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredTickets.length === 0}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto ${FOCUS_RING}`}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* ── STAT TABS (counts double as the queue filter) ── */}
      <div role="group" aria-label="Filter the queue" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tabs.map(tab => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              aria-pressed={isActive}
              className={`rounded-2xl border p-4 text-left transition-colors ${FOCUS_RING} ${
                isActive
                  ? 'border-yellow-500 bg-yellow-50 shadow-sm ring-1 ring-yellow-500'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className={`block text-[13px] font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{tab.label}</span>
              <span className={`mt-2 block text-2xl font-semibold leading-none tabular-nums text-gray-900 transition-opacity ${loading ? 'opacity-30' : ''}`}>{tab.count}</span>
              <span className={`mt-1.5 block text-xs ${isActive ? 'text-yellow-800' : 'text-gray-500'}`}>{tab.hint}</span>
            </button>
          );
        })}
      </div>

      {/* ── SEARCH ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-200 sm:max-w-md">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            role="searchbox"
            inputMode="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search tickets, people, or IDs"
            aria-label="Search tickets"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="rounded p-0.5 text-gray-300 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        {!loading && (
          <p className="text-xs text-gray-500" role="status">
            Showing <span className="font-semibold tabular-nums text-gray-900">{filteredTickets.length}</span> of <span className="tabular-nums">{tickets.length}</span> tickets
          </p>
        )}
      </div>

      {/* ── TICKETS ── */}
      <section aria-label="Support tickets" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <ul aria-busy="true" className="divide-y divide-gray-100" role="status">
            {[0, 1, 2, 3].map(i => (
              <li key={i} className="flex animate-pulse items-center gap-4 px-6 py-5">
                <span className="h-12 w-12 rounded-xl bg-gray-100" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-1/3 rounded bg-gray-100" />
                  <span className="block h-3 w-1/5 rounded bg-gray-100" />
                </span>
              </li>
            ))}
          </ul>
        ) : filteredTickets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
              <TicketIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-gray-900">No tickets found</p>
            <p className="mt-1 text-xs text-gray-500">
              {searchQuery
                ? 'No tickets matched your search or filter.'
                : 'There are no tickets in this queue.'}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={`mt-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 ${FOCUS_RING}`}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Column headers (desktop) */}
            <div aria-hidden="true" className={`hidden border-b border-gray-200 bg-gray-50 px-6 py-3 text-xs font-semibold text-gray-500 ${ROW_GRID}`}>
              <span>Ticket</span>
              <span>Requester</span>
              <span>Assignment</span>
              <span>Created</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {filteredTickets.map(ticket => {
                const ownTicket = ticket.user_id === currentUserId;
                const status = STATUS_META[ticket.status] || STATUS_META.open;
                const isResolved = ticket.status === 'resolved';
                const isMine = Boolean(ticket.assigned_to) && ticket.assigned_to === currentUserId;

                return (
                  <li key={ticket.id} className={`relative flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 ${ownTicket ? 'bg-rose-50/30' : ''} ${ROW_GRID}`}>
                    <span
                      className={`absolute inset-y-0 left-0 w-[3px] ${ownTicket ? 'bg-rose-500' : status.dot}`}
                      aria-hidden="true"
                    />

                    {/* Ticket & subject */}
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
                        <TicketIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p title={ticket.subject} className="truncate text-sm font-semibold text-gray-900">
                          {ticket.subject || 'Untitled request'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-block rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                            Support request
                          </span>
                          <span className="text-xs tabular-nums text-gray-400">#{ticket.id.split('-')[0]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Meta cells: labelled on mobile, columns on desktop */}
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:contents">
                      <div className="min-w-0">
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Requester</dt>
                        <dd className="flex min-w-0 items-center gap-2.5">
                          {ticket.user?.avatar_url
                            ? <img src={ticket.user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                            : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-yellow-200 bg-yellow-100 text-xs font-semibold text-yellow-800">{ticket.user?.full_name?.charAt(0) || 'U'}</span>}
                          <p className="truncate text-[13px] font-medium text-gray-900">{ticket.user?.full_name || 'Unknown user'}</p>
                        </dd>
                      </div>

                      <div className="min-w-0">
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Assignment</dt>
                        <dd>
                          {ownTicket ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800">
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Your ticket
                            </span>
                          ) : ticket.agent ? (
                            isMine ? (
                              <span className="inline-flex items-center rounded-md border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-900">
                                Assigned to You
                              </span>
                            ) : (
                              <span className="block truncate text-[13px] font-medium text-gray-700">
                                {ticket.agent.full_name || 'Agent'}
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Unassigned
                            </span>
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Created</dt>
                        <dd>
                          <p className="text-xs tabular-nums text-gray-500">{formatCreatedAt(ticket.created_at)}</p>
                        </dd>
                      </div>

                      <div>
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Status</dt>
                        <dd>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.style}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                            {status.label}
                          </span>
                        </dd>
                      </div>
                    </dl>

                    {/* Action */}
                    {ownTicket ? (
                      <span className="inline-flex w-full items-center justify-center rounded-lg bg-gray-100 px-3.5 py-2 text-xs font-semibold text-gray-400">
                        Your ticket
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${FOCUS_RING} ${
                          !isResolved
                            ? 'bg-yellow-400 text-gray-900 shadow-sm hover:bg-yellow-500'
                            : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {!isResolved ? 'View ticket' : 'View record'} <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

    </div>
  );
}
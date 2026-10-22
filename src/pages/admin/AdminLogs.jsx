import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../../supabaseClient';
import { ClipboardList, RefreshCw, Search, ShieldCheck } from 'lucide-react';

const formatDate = value => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(date);
};

const actionTone = value => {
  const action = String(value || '').toUpperCase();
  if (action.includes('BAN')) return 'bg-rose-50 text-rose-700 ring-rose-100';
  if (action.includes('CREDIT')) return 'bg-amber-50 text-amber-800 ring-amber-100';
  if (action.includes('ROLE')) return 'bg-blue-50 text-blue-700 ring-blue-100';
  if (action.includes('RESOLVE')) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
};

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setErrorMessage('Could not load audit logs. Please try again.');
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter(log =>
      String(log.action_type || '').toLowerCase().includes(query)
      || String(log.details || '').toLowerCase().includes(query)
      || String(log.id || '').toLowerCase().includes(query),
    );
  }, [logs, searchQuery]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Admin workspace</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            <ClipboardList className="h-6 w-6 shrink-0 text-slate-800" aria-hidden="true" /> Audit logs
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Review administrative actions, role changes, and credit adjustments.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {loading ? 'Loading logs' : 'Refresh logs'}
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Activity history</h2>
            <p className="mt-1 text-xs text-slate-500">{loading ? 'Loading audit records…' : `${filteredLogs.length.toLocaleString()} records shown`}</p>
          </div>
          <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100 sm:w-[min(100%,360px)]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Search audit logs</span>
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search action or details"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        {errorMessage && (
          <div role="alert" className="m-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={fetchLogs} className="min-h-9 rounded-lg bg-rose-700 px-3 text-xs font-bold text-white hover:bg-rose-800">Try again</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3 p-4" aria-label="Loading audit logs">
            {[1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-6 w-6" /></span>
            <h3 className="mt-3 text-sm font-bold text-slate-900">{logs.length ? 'No matching logs' : 'No audit logs recorded'}</h3>
            <p className="mt-1 text-xs text-slate-500">{logs.length ? 'Try another search term.' : 'Administrative actions will appear here.'}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {filteredLogs.map(log => (
                <li key={log.id} className="space-y-3 p-4 transition hover:bg-slate-50/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex max-w-full break-all rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${actionTone(log.action_type)}`}>
                      {log.action_type || 'Unknown action'}
                    </span>
                    <time className="text-[11px] font-medium text-slate-500">{formatDate(log.created_at)}</time>
                  </div>
                  <p className="break-words text-sm leading-relaxed text-slate-800">{log.details || 'No details provided.'}</p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Timestamp</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Action type</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Log details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="align-top transition hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatDate(log.created_at)}</td>
                      <td className="px-5 py-4"><span className={`inline-flex max-w-[220px] break-all rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${actionTone(log.action_type)}`}>{log.action_type || 'Unknown action'}</span></td>
                      <td className="px-5 py-4 text-sm leading-relaxed text-slate-800">{log.details || 'No details provided.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-slate-400">Audit records are displayed newest first.</p>
    </main>
  );
}

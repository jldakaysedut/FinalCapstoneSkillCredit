import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../../supabaseClient';
import {
  AlertOctagon,
  Ban,
  CalendarDays,
  CheckCircle2,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react';

const relation = value => Array.isArray(value) ? value[0] : value;

const formatDate = value => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
};

// ── NEW HELPER FOR CLUSTERED REPORTERS ──
const formatReporters = (reporters) => {
  if (!reporters || !reporters.length) return 'Unknown reporter';
  if (reporters.length === 1) return reporters[0];
  
  // Kapag 2 pataas ang nag-report, ito na ang lalabas:
  return `Multiple users (${reporters.length})`; 
};

function StatusBadge({ banned, unknown = false }) {
  if (unknown) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200">Unlinked</span>;
  }
  return banned ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700 ring-1 ring-inset ring-rose-100"><Ban className="h-3 w-3" /> Banned</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-100"><ShieldAlert className="h-3 w-3" /> At risk</span>
  );
}

function EscalationModal({ issue, action, saving, error, onClose, onConfirm, onRequestAction }) {
  const reportedUser = relation(issue.reported_user);
  const isBanAction = action === 'ban';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = event => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, saving]);

  const isDetails = action === 'details';
  const title = isDetails ? 'Escalation details' : isBanAction ? 'Enforce account ban?' : 'Resolve this escalation?';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="escalation-modal-title" className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-lg sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isBanAction ? 'text-rose-700' : 'text-emerald-700'}`}>{isDetails ? 'Priority review' : 'Confirmation required'}</p>
            <h2 id="escalation-modal-title" className="mt-1 text-lg font-bold tracking-tight text-slate-950">{title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close dialog" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-4 p-5 sm:p-6">
          {isDetails ? (
            <>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">Report reason</p>
                <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-slate-900">{issue.reason || 'Reason not provided'}</p>
              </div>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3"><dt className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Escalated</dt><dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(issue.created_at)}</dd></div>
                
                {/* ── UPDATED REPORTER DISPLAY ── */}
                <div className="rounded-xl border border-slate-200 p-3">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><UserRound className="h-3.5 w-3.5" /> Reported by</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-900">{formatReporters(issue.all_reporters)}</dd>
                </div>
                
                <div className="rounded-xl border border-slate-200 p-3 sm:col-span-2"><dt className="text-[11px] font-semibold text-slate-500">Reported account</dt><dd className="mt-1 flex flex-wrap items-center justify-between gap-2"><span className="break-words text-sm font-bold text-slate-900">{reportedUser?.full_name || 'Unknown user'}</span><StatusBadge banned={reportedUser?.is_banned} unknown={typeof reportedUser?.is_banned !== 'boolean'} /></dd></div>
                <div className="min-w-0 rounded-xl border border-slate-200 p-3 sm:col-span-2"><dt className="text-[11px] font-semibold text-slate-500">Cluster ID (Reference)</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{issue.reference_id || issue.id}</dd></div>
              </dl>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
                <button type="button" onClick={() => onRequestAction('resolve')} className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-700">Dismiss / Resolve</button>
                {!reportedUser?.is_banned && reportedUser?.id && <button type="button" onClick={() => onRequestAction('ban')} className="min-h-11 rounded-xl bg-rose-700 px-5 text-sm font-bold text-white hover:bg-rose-800">Enforce ban</button>}
              </div>
            </>
          ) : (
            <>
              <div className={`rounded-2xl border p-4 ${isBanAction ? 'border-rose-100 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-sm leading-relaxed text-slate-800">
                  {isBanAction
                    ? <>This will set the account for <span className="font-bold">{reportedUser?.full_name || 'this user'}</span> to banned and resolve {issue.clustered_ids.length > 1 ? `all ${issue.clustered_ids.length} related reports` : 'this report'}.</>
                    : <>Mark {issue.clustered_ids.length > 1 ? `all ${issue.clustered_ids.length} related reports` : 'the report'} about <span className="font-bold">{reportedUser?.full_name || 'this user'}</span> as resolved?</>}
                </p>
                <p className="mt-2 break-words text-xs text-slate-500">{issue.reason || 'Reason not provided'}</p>
              </div>
              {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => onConfirm(action)} disabled={saving} className={`min-h-11 rounded-xl px-5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${isBanAction ? 'bg-rose-700 hover:bg-rose-800' : 'bg-slate-900 hover:bg-slate-700'}`}>
                  {saving ? 'Working…' : isBanAction ? 'Confirm ban' : 'Confirm resolution'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Escalations() {
  const [escalated, setEscalated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [activeIssue, setActiveIssue] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    // Added reference_id to select query for clustering
    const { data, error } = await supabase
      .from('reports')
      .select('id, status, reason, created_at, reference_id, reporter:user_profiles!reports_reporter_id_fkey(full_name), reported_user:user_profiles!reports_reported_user_id_fkey(id, full_name, is_banned)')
      .eq('status', 'escalated')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching escalations:", error);
    } else if (data) {
      // ── CLUSTERING LOGIC ──
      const grouped = {};
      data.forEach(report => {
        // Group by reference_id (or its own ID if none exists)
        const key = report.reference_id || report.id;
        
        if (!grouped[key]) {
          grouped[key] = { 
            ...report, 
            clustered_ids: [report.id], 
            all_reporters: [relation(report.reporter)?.full_name].filter(Boolean) 
          };
        } else {
          // Push to cluster IDs
          grouped[key].clustered_ids.push(report.id);
          
          // Push unique reporter names
          const rName = relation(report.reporter)?.full_name;
          if (rName && !grouped[key].all_reporters.includes(rName)) {
             grouped[key].all_reporters.push(rName);
          }
        }
      });
      setEscalated(Object.values(grouped));
    }
    setLoading(false);
    return error;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      const { data } = await supabase.auth.getUser();
      if (isMounted) setAdminUser(data?.user || null);
      await fetchEscalations();
    };
    initialize();
    return () => { isMounted = false; };
  }, [fetchEscalations]);

  const logAction = async (targetUserId, type, details) => {
    if (!adminUser) return;
    await supabase.from('admin_logs').insert({
      admin_id: adminUser.id,
      target_user_id: targetUserId,
      action_type: type,
      details,
    });
  };

  const closeIssueModal = useCallback(() => {
    if (saving) return;
    setActiveIssue(null);
    setActionError('');
  }, [saving]);

  const handleConfirmAction = async action => {
    const issue = activeIssue?.issue;
    if (!issue || saving) return;
    const reportedUser = relation(issue.reported_user);
    setSaving(true);
    setActionError('');
    setNotice('');

    if (action === 'ban') {
      if (!reportedUser?.id) {
        setActionError('This report has no linked user account, so a ban cannot be applied.');
        setSaving(false);
        return;
      }
      const { error: banError } = await supabase.from('user_profiles').update({ is_banned: true }).eq('id', reportedUser.id);
      if (banError) {
        setActionError('The account could not be banned. Please try again.');
        setSaving(false);
        return;
      }
      
      // Update ALL clustered reports to resolved
      const { error: reportError } = await supabase.from('reports').update({ status: 'resolved' }).in('id', issue.clustered_ids);
      
      await logAction(reportedUser.id, 'ENFORCE_BAN', `Admin enforced permanent ban on ${reportedUser.full_name || 'user'} from escalation.`);
      
      if (reportError) {
        setEscalated(current => current.map(item => item.id === issue.id ? { ...item, reported_user: { ...reportedUser, is_banned: true } } : item));
        setNotice('The account was banned, but the reports could not be marked resolved. Refresh and review again.');
      } else {
        setEscalated(current => current.filter(item => item.id !== issue.id));
        setNotice(`${reportedUser.full_name || 'The user'} was banned and ${issue.clustered_ids.length} linked reports were resolved.`);
      }
      setActiveIssue(null);
      setSaving(false);
      return;
    }

    // Update ALL clustered reports to resolved
    const { error } = await supabase.from('reports').update({ status: 'resolved' }).in('id', issue.clustered_ids);
    if (error) {
      setActionError('The escalation could not be resolved. Please try again.');
      setSaving(false);
      return;
    }
    setEscalated(current => current.filter(item => item.id !== issue.id));
    await logAction(reportedUser?.id, 'RESOLVE_ESCALATION', `Admin resolved escalation regarding ${reportedUser?.full_name || 'user'}.`);
    setActiveIssue(null);
    setSaving(false);
    setNotice(`Escalation marked as resolved (${issue.clustered_ids.length} linked tickets closed).`);
  };

  const filteredEscalations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return escalated;
    return escalated.filter(issue => {
      const reportedUser = relation(issue.reported_user);
      return String(issue.reason || '').toLowerCase().includes(query)
        || String(reportedUser?.full_name || '').toLowerCase().includes(query)
        || issue.all_reporters?.some(r => r.toLowerCase().includes(query));
    });
  }, [escalated, searchQuery]);

  const renderActions = issue => {
    const reportedUser = relation(issue.reported_user);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setActionError(''); setActiveIssue({ issue, action: 'details' }); }} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none">Details</button>
        <button type="button" onClick={() => { setActionError(''); setActiveIssue({ issue, action: 'resolve' }); }} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-900 hover:text-white sm:flex-none">Resolve</button>
        <button type="button" disabled={Boolean(reportedUser?.is_banned) || !reportedUser?.id} onClick={() => { setActionError(''); setActiveIssue({ issue, action: 'ban' }); }} className="min-h-10 flex-1 rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">{reportedUser?.is_banned ? 'Already banned' : 'Enforce ban'}</button>
      </div>
    );
  };

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700">Admin workspace</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"><AlertOctagon className="h-6 w-6 shrink-0 text-rose-600" aria-hidden="true" /> Escalations</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Review high-priority issues and disputes escalated by moderators.</p>
        </div>
        <button type="button" onClick={fetchEscalations} disabled={loading} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {loading ? 'Refreshing' : 'Refresh queue'}
        </button>
      </header>

      {notice && <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message" className="shrink-0 rounded-md p-0.5 hover:bg-emerald-100"><X className="h-4 w-4" /></button></div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><ShieldAlert className="h-5 w-5" /></span>
            <div><h2 className="text-sm font-bold text-slate-950">Priority review queue</h2><p className="mt-0.5 text-xs text-slate-500">{loading ? 'Loading escalations…' : `${filteredEscalations.length} case${filteredEscalations.length !== 1 ? 's' : ''} pending review`}</p></div>
          </div>
          <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100 sm:w-[min(100%,360px)]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><span className="sr-only">Search escalations</span>
            <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search reason or user" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
        </div>

        {loading ? (
          <div className="space-y-3 p-4" aria-label="Loading escalations">{[1, 2, 3].map(item => <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : filteredEscalations.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-6 w-6" /></span>
            <h3 className="mt-3 text-sm font-bold text-slate-900">{escalated.length ? 'No matching escalations' : 'No pending escalations'}</h3>
            <p className="mt-1 text-xs text-slate-500">{escalated.length ? 'Try another search term.' : 'There are no escalated reports to review right now.'}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {filteredEscalations.map(issue => {
                const reportedUser = relation(issue.reported_user);
                return (
                  <li key={issue.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="break-words text-sm font-bold leading-snug text-slate-900">{issue.reason || 'Reason not provided'}</p>
                          {issue.clustered_ids.length > 1 && <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{issue.clustered_ids.length} linked</span>}
                        </div>
                        <p className="text-xs text-slate-500">Reported by {formatReporters(issue.all_reporters)}</p>
                      </div>
                      <StatusBadge banned={reportedUser?.is_banned} unknown={typeof reportedUser?.is_banned !== 'boolean'} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-700"><UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{reportedUser?.full_name || 'Unknown user'}</span></span>
                      <time className="flex shrink-0 items-center gap-1.5 text-[11px] text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(issue.created_at)}</time>
                    </div>
                    {renderActions(issue)}
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead><tr className="border-b border-slate-100 bg-slate-50/70"><th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Date escalated</th><th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Report details</th><th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Target user</th><th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Admin actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEscalations.map(issue => {
                    const reportedUser = relation(issue.reported_user);
                    return (
                      <tr key={issue.id} className="align-top transition hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatDate(issue.created_at)}</td>
                        <td className="max-w-[420px] px-5 py-4">
                          <div className="flex items-start gap-2.5">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-slate-800">{issue.reason || 'Reason not provided'}</p>
                                {issue.clustered_ids.length > 1 && <span className="shrink-0 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{issue.clustered_ids.length} linked</span>}
                              </div>
                              <p className="text-xs text-slate-500">Reported by {formatReporters(issue.all_reporters)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4"><p className="text-sm font-bold text-slate-900">{reportedUser?.full_name || 'Unknown user'}</p><div className="mt-2"><StatusBadge banned={reportedUser?.is_banned} unknown={typeof reportedUser?.is_banned !== 'boolean'} /></div></td>
                        <td className="px-5 py-4"><div className="flex justify-end">{renderActions(issue)}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {activeIssue && (
        <EscalationModal
          issue={activeIssue.issue}
          action={activeIssue.action}
          saving={saving}
          error={actionError}
          onClose={closeIssueModal}
          onConfirm={() => handleConfirmAction(activeIssue.action)}
          onRequestAction={action => { setActiveIssue(current => current ? { ...current, action } : current); setActionError(''); }}
        />
      )}
    </main>
  );
}
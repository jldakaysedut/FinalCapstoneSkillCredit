import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../../supabaseClient';
import {
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Coins,
  Eye,
  Hash,
  RefreshCw,
  Search,
  Shield,
  Users,
  UserX,
  X,
} from 'lucide-react';

const ROLE_OPTIONS = ['User', 'Moderator', 'Admin'];

const formatNumber = value => Number(value || 0).toLocaleString();

const formatDate = value => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const userName = user => user?.full_name?.trim() || 'Unnamed user';

function UserAvatar({ user, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';
  const initial = userName(user).charAt(0).toUpperCase();
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-800 ring-1 ring-emerald-100 ${sizeClass}`}>
      {initial}
    </span>
  );
}

function StatusBadge({ isBanned, isDeleted }) {
  if (isDeleted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200">
        <UserX className="h-3 w-3" aria-hidden="true" /> Deleted
      </span>
    );
  }
  return isBanned ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700 ring-1 ring-inset ring-rose-100">
      <Ban className="h-3 w-3" aria-hidden="true" /> Banned
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-100">
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Active
    </span>
  );
}

function ModalShell({ title, eyebrow, children, onClose, wide = false }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-management-modal-title"
        className={`max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>}
            <h2 id="user-management-modal-title" className="mt-1 text-lg font-bold tracking-tight text-slate-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function UserDetails({ user, onClose }) {
  return (
    <ModalShell title="User profile" eyebrow="Account details" onClose={onClose}>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-5 text-center">
          <UserAvatar user={user} size="lg" />
          <h3 className="mt-3 max-w-full break-words text-lg font-bold text-slate-950">{userName(user)}</h3>
          <p className="mt-1 max-w-full break-all text-sm text-slate-500">{user.email || 'Email not provided'}</p>
          <div className="mt-3"><StatusBadge isBanned={user.is_banned} isDeleted={user.is_deleted} /></div>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Shield className="h-3.5 w-3.5" /> System role</dt>
            <dd className="mt-1 text-sm font-bold text-slate-900">{user.role || 'User'}</dd>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <dt className="flex items-center gap-2 text-[11px] font-semibold text-amber-700"><Coins className="h-3.5 w-3.5" /> Credit balance</dt>
            <dd className="mt-1 text-sm font-bold text-amber-900">{formatNumber(user.credits_balance)} CR</dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 sm:col-span-2">
            <dt className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Calendar className="h-3.5 w-3.5" /> Date joined</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(user.created_at)}</dd>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 p-3 sm:col-span-2">
            <dt className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Hash className="h-3.5 w-3.5" /> User ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-700">{user.id}</dd>
          </div>
        </dl>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto">
            Close profile
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditError, setCreditError] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setPageError('');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setPageError('Could not load users. Please try again.');
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      const { data } = await supabase.auth.getUser();
      if (isMounted) setAdminUser(data?.user || null);
      await fetchUsers();
    };
    initialize();
    return () => { isMounted = false; };
  }, [fetchUsers]);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setCreditAmount('');
    setCreditError('');
  }, []);

  const logAdminAction = async (targetUserId, actionType, details) => {
    if (!adminUser) return;
    await supabase.from('admin_logs').insert({
      admin_id: adminUser.id,
      target_user_id: targetUserId,
      action_type: actionType,
      details,
    });
  };

  const updateLocalUser = (userId, updates) => {
    setUsers(current => current.map(user => user.id === userId ? { ...user, ...updates } : user));
  };

  const handleRoleChange = async (user, newRole) => {
    setSavingUserId(user.id);
    setNotice('');
    const { error } = await supabase.from('user_profiles').update({ role: newRole }).eq('id', user.id);
    if (error) {
      setNotice('The role could not be updated. Please try again.');
      setSavingUserId(null);
      return;
    }
    updateLocalUser(user.id, { role: newRole });
    await logAdminAction(user.id, 'ROLE_CHANGE', `Promoted/Demoted ${userName(user)} to ${newRole}`);
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      content: `Your account role has been updated to ${newRole} by an Admin.`,
    });
    setNotice(`Role updated to ${newRole} for ${userName(user)}.`);
    setSavingUserId(null);
    closeModal();
  };

  const handleCreditAdjust = async user => {
    const parsedAmount = Number.parseInt(creditAmount, 10);
    if (!creditAmount.trim() || !Number.isFinite(parsedAmount) || parsedAmount === 0) {
      setCreditError('Enter a whole number other than zero. Use a negative number to deduct credits.');
      return;
    }

    const currentCredits = Number(user.credits_balance) || 0;
    const newBalance = currentCredits + parsedAmount;
    setSavingUserId(user.id);
    setCreditError('');
    setNotice('');
    const { error } = await supabase.from('user_profiles').update({ credits_balance: newBalance }).eq('id', user.id);
    if (error) {
      setCreditError('Credits could not be updated. Please try again.');
      setSavingUserId(null);
      return;
    }

    updateLocalUser(user.id, { credits_balance: newBalance });
    await logAdminAction(user.id, 'CREDIT_ADJUST', `Adjusted credits for ${userName(user)} by ${parsedAmount}. New balance: ${newBalance}`);
    const actionWord = parsedAmount >= 0 ? 'added to' : 'deducted from';
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system_alert',
      content: `Admin has ${actionWord} your account by ${Math.abs(parsedAmount)} credits. Your new balance is ${newBalance} CR.`,
    });
    setNotice(`Credits updated for ${userName(user)}. New balance: ${formatNumber(newBalance)} CR.`);
    setSavingUserId(null);
    closeModal();
  };

  const handleBanToggle = async user => {
    const currentBanStatus = Boolean(user.is_banned);
    const action = currentBanStatus ? 'UNBAN' : 'BAN';
    setSavingUserId(user.id);
    setNotice('');
    const { error } = await supabase.from('user_profiles').update({ is_banned: !currentBanStatus }).eq('id', user.id);
    if (error) {
      setNotice(`Could not ${currentBanStatus ? 'unban' : 'ban'} ${userName(user)}. Please try again.`);
      setSavingUserId(null);
      return;
    }

    updateLocalUser(user.id, { is_banned: !currentBanStatus });
    await logAdminAction(user.id, 'ACCOUNT_STATUS', `${action}NED user: ${userName(user)}`);
    if (currentBanStatus) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'system',
        content: 'Good news! Your account ban has been lifted by an Admin.',
      });
    }
    setNotice(`${userName(user)} is now ${currentBanStatus ? 'active' : 'banned'}.`);
    setSavingUserId(null);
    closeModal();
  };

  const handleConfirmAction = async () => {
    if (!activeModal) return;
    if (activeModal.type === 'role') await handleRoleChange(activeModal.user, activeModal.newRole);
    if (activeModal.type === 'ban') await handleBanToggle(activeModal.user);
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter(user => {
      const matchesQuery = !query
        || userName(user).toLowerCase().includes(query)
        || (user.email || '').toLowerCase().includes(query)
        || (user.id || '').toLowerCase().includes(query);
      
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = !user.is_banned && !user.is_deleted;
      else if (statusFilter === 'banned') matchesStatus = Boolean(user.is_banned) && !user.is_deleted;
      else if (statusFilter === 'deleted') matchesStatus = Boolean(user.is_deleted);

      const matchesRole = roleFilter === 'all' || (user.role || 'User') === roleFilter;
      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const activeCount = users.filter(user => !user.is_banned && !user.is_deleted).length;
  const bannedCount = users.filter(user => user.is_banned && !user.is_deleted).length;
  const deletedCount = users.filter(user => user.is_deleted).length;

  const openCreditModal = user => {
    setCreditAmount('');
    setCreditError('');
    setActiveModal({ type: 'credits', user });
  };

  const openRoleConfirm = (user, newRole) => {
    if (newRole === user.role) return;
    setActiveModal({ type: 'role', user, newRole });
  };

  const openBanConfirm = user => setActiveModal({ type: 'ban', user });

  const renderRoleSelect = user => (
    <label className="relative inline-flex w-full sm:w-auto">
      <span className="sr-only">System role for {userName(user)}</span>
      <select
        value={user.role || 'User'}
        disabled={savingUserId === user.id || user.is_deleted}
        onChange={event => openRoleConfirm(user, event.target.value)}
        className="min-h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60 sm:w-auto"
      >
        {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </label>
  );

  const renderActions = user => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setActiveModal({ type: 'details', user })}
        aria-label={`View ${userName(user)} profile`}
        className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:flex-none"
      >
        <Eye className="h-4 w-4 text-slate-500" aria-hidden="true" /> <span>View</span>
      </button>
      {!user.is_deleted ? (
        <>
          <button
            type="button"
            onClick={() => openCreditModal(user)}
            aria-label={`Adjust credits for ${userName(user)}`}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:flex-none"
          >
            <Coins className="h-4 w-4" aria-hidden="true" /> <span>Credits</span>
          </button>
          <button
            type="button"
            onClick={() => openBanConfirm(user)}
            aria-label={`${user.is_banned ? 'Unban' : 'Ban'} ${userName(user)}`}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${user.is_banned ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400' : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-400'} sm:flex-none`}
          >
            <Ban className="h-4 w-4" aria-hidden="true" /> <span>{user.is_banned ? 'Unban' : 'Ban'}</span>
          </button>
        </>
      ) : (
        <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-slate-50 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:flex-none">
          Locked
        </span>
      )}
    </div>
  );

  const renderUserCard = user => (
    <article key={user.id} className={`rounded-2xl border ${user.is_deleted ? 'border-slate-100 bg-slate-50/50 opacity-80' : 'border-slate-200/80 bg-white'} p-4 shadow-sm`}>
      <div className="flex items-start gap-3">
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="max-w-full break-words text-sm font-bold text-slate-900">{userName(user)}</h2>
            <StatusBadge isBanned={user.is_banned} isDeleted={user.is_deleted} />
          </div>
          <p className="mt-1 break-all text-xs text-slate-500">{user.email || 'Email not provided'}</p>
        </div>
      </div>
      <div className="my-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credits</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{formatNumber(user.credits_balance)} CR</p>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">System role</p>
          {renderRoleSelect(user)}
        </div>
      </div>
      {renderActions(user)}
    </article>
  );

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Admin workspace</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            <Shield className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" /> User management
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Manage roles, account credits, and access status for platform members.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {loading ? 'Loading users' : 'Refresh list'}
        </button>
      </header>

      <section aria-label="User account summary" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-5 w-5" aria-hidden="true" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total users</p><p className="mt-1 text-xl font-bold text-slate-950">{loading ? '—' : formatNumber(users.length)}</p></div>
        </article>
        <article className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active accounts</p><p className="mt-1 text-xl font-bold text-slate-950">{loading ? '—' : formatNumber(activeCount)}</p></div>
        </article>
        <article className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><Ban className="h-5 w-5" aria-hidden="true" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Banned accounts</p><p className="mt-1 text-xl font-bold text-slate-950">{loading ? '—' : formatNumber(bannedCount)}</p></div>
        </article>
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><UserX className="h-5 w-5" aria-hidden="true" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Deleted accounts</p><p className="mt-1 text-xl font-bold text-slate-950">{loading ? '—' : formatNumber(deletedCount)}</p></div>
        </article>
      </section>

      {notice && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message" className="shrink-0 rounded-md p-0.5 text-emerald-700 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
        </div>
      )}
      {pageError && (
        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{pageError}</span>
          <button type="button" onClick={fetchUsers} className="min-h-9 rounded-lg bg-rose-700 px-3 text-xs font-bold text-white hover:bg-rose-800">Try again</button>
        </div>
      )}

      <section aria-label="Manage platform users" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-950">All users</h2>
              <p className="mt-1 text-xs text-slate-500">Search, filter, and manage member accounts.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:min-w-[560px]">
              <label className="col-span-2 flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100 sm:col-span-1">
                <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="sr-only">Search users</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search name, email, or ID"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>
              <label className="relative flex min-h-11 min-w-0 items-center">
                <span className="sr-only">Filter by account status</span>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-32">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                  <option value="deleted">Deleted</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              </label>
              <label className="relative flex min-h-11 min-w-0 items-center">
                <span className="sr-only">Filter by system role</span>
                <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-32">
                  <option value="all">All roles</option>
                  {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold text-slate-600">{loading ? 'Loading accounts…' : `${formatNumber(filteredUsers.length)} ${filteredUsers.length === 1 ? 'user' : 'users'} shown`}</p>
          {(searchQuery || statusFilter !== 'all' || roleFilter !== 'all') && (
            <button type="button" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setRoleFilter('all'); }} className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900">Clear filters</button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 p-4 sm:hidden" aria-label="Loading users">
            {[1, 2, 3].map(item => <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Users className="h-5 w-5" /></span>
            <h3 className="mt-3 text-sm font-bold text-slate-900">No users found</h3>
            <p className="mt-1 text-xs text-slate-500">Try changing your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 lg:hidden">
              {filteredUsers.map(renderUserCard)}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">User</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Credits</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">System role</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className={`transition hover:bg-slate-50/60 ${user.is_deleted ? 'bg-slate-50/40 opacity-80' : ''}`}>
                      <td className="px-5 py-4">
                        <button type="button" onClick={() => setActiveModal({ type: 'details', user })} className="flex min-w-0 items-center gap-3 text-left">
                          <UserAvatar user={user} size="sm" />
                          <span className="min-w-0">
                            <span className="block max-w-[240px] truncate text-sm font-bold text-slate-900">{userName(user)}</span>
                            <span className="mt-0.5 block max-w-[240px] truncate text-xs text-slate-500">{user.email || 'Email not provided'}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4"><StatusBadge isBanned={user.is_banned} isDeleted={user.is_deleted} /></td>
                      <td className="px-4 py-4"><span className="text-sm font-bold text-slate-800">{formatNumber(user.credits_balance)} CR</span></td>
                      <td className="px-4 py-4">{renderRoleSelect(user)}</td>
                      <td className="px-5 py-4"><div className="flex justify-end">{renderActions(user)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {activeModal?.type === 'details' && <UserDetails user={activeModal.user} onClose={closeModal} />}

      {activeModal?.type === 'credits' && (
        <ModalShell title="Adjust credits" eyebrow="Account action" onClose={closeModal}>
          <form
            onSubmit={event => { event.preventDefault(); handleCreditAdjust(activeModal.user); }}
            className="space-y-5 p-5 sm:p-6"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <UserAvatar user={activeModal.user} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{userName(activeModal.user)}</p>
                <p className="mt-0.5 text-xs text-slate-500">Current balance: {formatNumber(activeModal.user.credits_balance)} CR</p>
              </div>
            </div>
            <div>
              <label htmlFor="credit-adjustment" className="mb-2 block text-xs font-bold text-slate-700">Credit adjustment</label>
              <div className="relative">
                <Coins className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600" aria-hidden="true" />
                <input
                  id="credit-adjustment"
                  type="number"
                  step="1"
                  value={creditAmount}
                  onChange={event => { setCreditAmount(event.target.value); setCreditError(''); }}
                  placeholder="e.g. 10 or -5"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  autoFocus
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Use a positive number to add credits or a negative number to deduct them.</p>
              {creditError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{creditError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} disabled={savingUserId === activeModal.user.id} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={savingUserId === activeModal.user.id} className="min-h-11 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60">{savingUserId === activeModal.user.id ? 'Applying…' : 'Apply adjustment'}</button>
            </div>
          </form>
        </ModalShell>
      )}

      {(activeModal?.type === 'role' || activeModal?.type === 'ban') && (
        <ModalShell
          title={activeModal.type === 'role' ? 'Confirm role change' : (activeModal.user.is_banned ? 'Restore account access?' : 'Ban this account?')}
          eyebrow="Please confirm"
          onClose={closeModal}
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className={`rounded-2xl border p-4 ${activeModal.type === 'ban' && !activeModal.user.is_banned ? 'border-rose-100 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-sm font-semibold leading-relaxed text-slate-800">
                {activeModal.type === 'role'
                  ? <>Change <span className="font-bold">{userName(activeModal.user)}</span> from <span className="font-bold">{activeModal.user.role || 'User'}</span> to <span className="font-bold">{activeModal.newRole}</span>?</>
                  : activeModal.user.is_banned
                    ? <>Restore access for <span className="font-bold">{userName(activeModal.user)}</span>?</>
                    : <>Ban <span className="font-bold">{userName(activeModal.user)}</span>? They will no longer have active account access.</>}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} disabled={savingUserId === activeModal.user.id} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={savingUserId === activeModal.user.id}
                className={`min-h-11 rounded-xl px-5 text-sm font-bold text-white transition disabled:cursor-wait disabled:opacity-60 ${activeModal.type === 'ban' && !activeModal.user.is_banned ? 'bg-rose-700 hover:bg-rose-800' : 'bg-slate-900 hover:bg-slate-700'}`}
              >
                {savingUserId === activeModal.user.id ? 'Saving…' : activeModal.type === 'role' ? 'Confirm role change' : activeModal.user.is_banned ? 'Restore access' : 'Ban account'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </main>
  );
}
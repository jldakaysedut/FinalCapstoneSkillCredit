import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../../supabaseClient';
import {
  Ban,
  Calendar,
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
  Mail,
  BookOpen,
  Clock,
  Phone,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

const ROW_GRID = 'lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_280px] lg:items-center lg:gap-6';

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

const accountAccent = user => {
  if (user.is_deleted) return 'bg-gray-300';
  if (user.is_banned) return 'bg-rose-500';
  return 'bg-emerald-500';
};

function UserAvatar({ user, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-16 w-16 text-xl' : 'h-11 w-11 text-sm';
  const initial = userName(user).charAt(0).toUpperCase();
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-100 font-bold text-emerald-800 ${sizeClass}`}>
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

function StatusBadge({ isBanned, isDeleted }) {
  if (isDeleted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
        <UserX className="h-3 w-3" aria-hidden="true" /> Deleted
      </span>
    );
  }
  return isBanned ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-800">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" /> Banned
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" /> Active
    </span>
  );
}

/* ── CENTERED MODAL SHELL (FOR ACTION MODALS ONLY) ── */
function ModalShell({ title, description, icon: HeaderIcon, iconBg = 'bg-emerald-50 text-emerald-700', children, onClose, maxWidth = 'max-w-md' }) {
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
      className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-management-modal-title"
        className={`relative flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-100 p-5 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            {HeaderIcon && (
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 ${iconBg}`}>
                <HeaderIcon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <h2 id="user-management-modal-title" className="text-base font-bold text-gray-900 leading-tight truncate">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-xs text-gray-500 font-medium truncate">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className={`rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 ${FOCUS_RING}`}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

/* ── EXACTLY MATCHED USER DETAILS MODAL (CENTERED POPUP) ── */
function UserDetails({ user, onClose }) {
  const interests = Array.isArray(user.interests) ? user.interests : [];

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
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden">
          
          {/* Top Profile Header */}
          <div className="mt-4 flex flex-col items-center text-center">
            <UserAvatar user={user} size="lg" />
            <h3 className="mt-3 text-lg font-bold text-gray-900">{userName(user)}</h3>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500">
              <Mail className="h-3.5 w-3.5 text-gray-400" /> {user.email || 'Email not provided'}
            </p>
            <div className="mt-3 flex justify-center">
              <StatusBadge isBanned={user.is_banned} isDeleted={user.is_deleted} />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {/* Bio Section */}
            {user.bio && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">About / Bio</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{user.bio}</p>
              </div>
            )}

            {/* Core Attributes Grid */}
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <dt className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" /> System Role
                </dt>
                <dd className="text-sm font-bold text-gray-900">{user.role || 'User'}</dd>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <dt className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Coins className="h-3.5 w-3.5 text-amber-600" /> Credit Balance
                </dt>
                <dd className="tabular-nums text-sm font-bold text-gray-900">{formatNumber(user.credits_balance)} CR</dd>
              </div>
            </dl>

            {/* Additional Profile Info */}
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-start gap-3 p-3.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Contact Info</p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">{user.contact_info || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Availability Schedule</p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">{user.availability_schedule || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Interests Badges */}
            {interests.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <BookOpen className="h-3.5 w-3.5" /> Interests
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((interest, idx) => (
                    <span key={idx} className="inline-flex items-center rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* System Meta Details */}
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between p-3.5">
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5" /> Date Joined
                </span>
                <span className="text-xs font-semibold text-gray-900">{formatDate(user.created_at)}</span>
              </div>
              <div className="p-3.5">
                <span className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                  <Hash className="h-3.5 w-3.5" /> User ID
                </span>
                <p className="break-all rounded-lg bg-gray-50 p-2 font-mono text-[11px] text-gray-600">{user.id}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex w-full shrink-0 flex-col gap-2 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-xl bg-gray-100 py-3 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-200 ${FOCUS_RING}`}
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
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

  useRealtimeRefresh(fetchUsers, ['user_profiles'], 'web_refresh_admin_users');

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

  const statTabs = [
    { id: 'all', label: 'All users', count: users.length, hint: 'Every account' },
    { id: 'active', label: 'Active', count: activeCount, hint: 'In good standing' },
    { id: 'banned', label: 'Banned', count: bannedCount, hint: 'Access restricted' },
    { id: 'deleted', label: 'Deleted', count: deletedCount, hint: 'Removed accounts' },
  ];

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
    <label className="relative inline-flex w-full">
      <span className="sr-only">System role for {userName(user)}</span>
      <select
        value={user.role || 'User'}
        disabled={savingUserId === user.id || user.is_deleted}
        onChange={event => openRoleConfirm(user, event.target.value)}
        className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-9 text-[13px] font-medium text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
      >
        {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
    </label>
  );

  const renderActions = user => (
    <div className="flex items-center gap-2 lg:justify-end">
      <button
        type="button"
        onClick={() => setActiveModal({ type: 'details', user })}
        aria-label={`View ${userName(user)} profile`}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 lg:flex-none ${FOCUS_RING}`}
      >
        <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" /> <span>View</span>
      </button>
      {!user.is_deleted ? (
        <>
          <button
            type="button"
            onClick={() => openCreditModal(user)}
            aria-label={`Adjust credits for ${userName(user)}`}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 lg:flex-none ${FOCUS_RING}`}
          >
            <Coins className="h-4 w-4" aria-hidden="true" /> <span>Credits</span>
          </button>
          <button
            type="button"
            onClick={() => openBanConfirm(user)}
            aria-label={`${user.is_banned ? 'Unban' : 'Ban'} ${userName(user)}`}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors lg:flex-none ${FOCUS_RING} ${user.is_banned ? 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200' : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
          >
            <Ban className="h-4 w-4" aria-hidden="true" /> <span>{user.is_banned ? 'Unban' : 'Ban'}</span>
          </button>
        </>
      ) : (
        <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-400 lg:flex-none">
          Locked
        </span>
      )}
    </div>
  );

  const hasFilters = Boolean(searchQuery) || statusFilter !== 'all' || roleFilter !== 'all';
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setRoleFilter('all'); };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">User management</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            {loading
              ? 'Loading the latest figures…'
              : `${formatNumber(users.length)} ${users.length === 1 ? 'account' : 'accounts'} on the platform. Manage roles, credits, and access status.`}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 sm:self-auto ${FOCUS_RING}`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {loading ? 'Loading users' : 'Refresh list'}
        </button>
      </div>

      {/* ── MESSAGES ── */}
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message" className="shrink-0 rounded-md p-0.5 text-emerald-700 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
        </div>
      )}
      {pageError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{pageError}</span>
          <button type="button" onClick={fetchUsers} className={`rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-800 ${FOCUS_RING}`}>Try again</button>
        </div>
      )}

      {/* ── STAT TABS ── */}
      <div role="group" aria-label="Filter by account status" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statTabs.map(tab => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              aria-pressed={isActive}
              className={`rounded-2xl border p-4 text-left transition-colors ${FOCUS_RING} ${
                isActive
                  ? 'border-emerald-600 bg-emerald-50 shadow-sm ring-1 ring-emerald-600'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className={`block text-[13px] font-medium ${isActive ? 'text-emerald-900' : 'text-gray-600'}`}>{tab.label}</span>
              <span className={`mt-2 block text-2xl font-semibold leading-none tabular-nums transition-opacity ${isActive ? 'text-emerald-900' : 'text-gray-900'} ${loading ? 'opacity-30' : ''}`}>{formatNumber(tab.count)}</span>
              <span className={`mt-1.5 block text-xs ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>{tab.hint}</span>
            </button>
          );
        })}
      </div>

      {/* ── SEARCH ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:max-w-md">
            <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <span className="sr-only">Search users</span>
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search name, email, or ID"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="rounded p-0.5 text-gray-300 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <label className="relative inline-flex w-full sm:w-auto">
            <span className="sr-only">Filter by system role</span>
            <select
              value={roleFilter}
              onChange={event => setRoleFilter(event.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:w-auto"
            >
              <option value="all">All roles</option>
              {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          </label>
        </div>
        {!loading && (
          <p className="shrink-0 text-xs text-gray-500" role="status">
            Showing <span className="font-semibold tabular-nums text-gray-900">{formatNumber(filteredUsers.length)}</span> of <span className="tabular-nums">{formatNumber(users.length)}</span> users
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={`ml-2 rounded font-medium text-emerald-700 hover:text-emerald-900 ${FOCUS_RING}`}>Clear filters</button>
            )}
          </p>
        )}
      </div>

      {/* ── USERS TABLE ── */}
      <section aria-label="Manage platform users" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <ul aria-busy="true" className="divide-y divide-gray-100" role="status">
            {[0, 1, 2, 3].map(i => (
              <li key={i} className="flex animate-pulse items-center gap-4 px-6 py-5">
                <span className="h-11 w-11 rounded-full bg-gray-100" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-1/3 rounded bg-gray-100" />
                  <span className="block h-3 w-1/5 rounded bg-gray-100" />
                </span>
              </li>
            ))}
          </ul>
        ) : filteredUsers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-gray-900">No users found</p>
            <p className="mt-1 text-xs text-gray-500">Try changing your search or filters.</p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={`mt-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 ${FOCUS_RING}`}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div aria-hidden="true" className={`hidden border-b border-gray-200 bg-gray-50 px-6 py-3 text-xs font-semibold text-gray-500 ${ROW_GRID}`}>
              <span>User</span>
              <span>Status</span>
              <span>Credits</span>
              <span>System role</span>
              <span className="text-right">Actions</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {filteredUsers.map(user => (
                <li
                  key={user.id}
                  className={`relative flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 ${user.is_deleted ? 'bg-gray-50/40 opacity-80' : ''} ${ROW_GRID}`}
                >
                  <span className={`absolute inset-y-0 left-0 w-[3px] ${accountAccent(user)}`} aria-hidden="true" />

                  <div className="flex min-w-0 items-start gap-3.5">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900" title={userName(user)}>{userName(user)}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500" title={user.email || undefined}>{user.email || 'Email not provided'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs tabular-nums text-gray-400 font-mono">#{String(user.id).slice(0, 8)}</span>
                        <span className="text-xs text-gray-400">• Joined {formatDate(user.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:contents">
                    <div>
                      <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Status</dt>
                      <dd><StatusBadge isBanned={user.is_banned} isDeleted={user.is_deleted} /></dd>
                    </div>

                    <div>
                      <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Credits</dt>
                      <dd className="text-sm font-semibold tabular-nums text-gray-900">{formatNumber(user.credits_balance)} CR</dd>
                    </div>

                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">System role</dt>
                      <dd>{renderRoleSelect(user)}</dd>
                    </div>
                  </dl>

                  {renderActions(user)}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── MODALS (STYLED TO MATCH ESCALATIONS.JSX) ── */}
      
      {/* 1. EXACT CENTERED PROFILE DETAILS MODAL */}
      {activeModal?.type === 'details' && <UserDetails user={activeModal.user} onClose={closeModal} />}

      {/* 2. CREDIT ADJUSTMENT MODAL */}
      {activeModal?.type === 'credits' && (
        <ModalShell
          title="Adjust credits"
          description="Add or deduct credits for this account"
          icon={Coins}
          iconBg="bg-amber-50 text-amber-700"
          onClose={closeModal}
        >
          <form
            onSubmit={event => { event.preventDefault(); handleCreditAdjust(activeModal.user); }}
            className="space-y-4 p-6"
          >
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
              <UserAvatar user={activeModal.user} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{userName(activeModal.user)}</p>
                <p className="mt-0.5 text-xs tabular-nums text-gray-500 font-medium">Current balance: {formatNumber(activeModal.user.credits_balance)} CR</p>
              </div>
            </div>

            <div>
              <label htmlFor="credit-adjustment" className="mb-1.5 block text-xs font-semibold text-gray-700">Credit adjustment amount</label>
              <div className="relative">
                <Coins className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600" aria-hidden="true" />
                <input
                  id="credit-adjustment"
                  type="number"
                  step="1"
                  value={creditAmount}
                  onChange={event => { setCreditAmount(event.target.value); setCreditError(''); }}
                  placeholder="e.g. 10 or -5"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoFocus
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">Use positive numbers to add credits or negative numbers to deduct them.</p>
              {creditError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{creditError}</p>}
            </div>

            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={savingUserId === activeModal.user.id}
                className={`flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingUserId === activeModal.user.id}
                className={`flex-[1.5] rounded-lg bg-emerald-700 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {savingUserId === activeModal.user.id ? 'Applying…' : 'Apply adjustment'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* 3. ROLE / BAN CONFIRMATION MODAL */}
      {(activeModal?.type === 'role' || activeModal?.type === 'ban') && (() => {
        const isBan = activeModal.type === 'ban';
        const isRestoring = isBan && activeModal.user.is_banned;

        let icon = Shield;
        let iconBg = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        if (isBan && !isRestoring) {
          icon = Ban;
          iconBg = 'bg-rose-50 text-rose-700 border border-rose-100';
        } else if (isRestoring) {
          icon = UserCheck;
          iconBg = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        }

        const modalTitle = activeModal.type === 'role' 
          ? 'Confirm role change' 
          : isRestoring 
            ? 'Restore account access' 
            : 'Ban this account';

        const modalSub = activeModal.type === 'role'
          ? 'System role assignment'
          : 'Account status modification';

        return (
          <ModalShell
            title={modalTitle}
            description={modalSub}
            icon={icon}
            iconBg={iconBg}
            onClose={closeModal}
          >
            <div className="space-y-4 p-6">
              <div className={`rounded-xl border p-4 ${isBan && !isRestoring ? 'border-rose-100 bg-rose-50/70 text-rose-900' : 'border-gray-100 bg-gray-50/80 text-gray-800'}`}>
                <p className="text-xs leading-relaxed">
                  {activeModal.type === 'role' ? (
                    <>Change role for <span className="font-bold text-gray-900">{userName(activeModal.user)}</span> from <span className="font-bold text-gray-900">{activeModal.user.role || 'User'}</span> to <span className="font-bold text-gray-900">{activeModal.newRole}</span>?</>
                  ) : isRestoring ? (
                    <>Restore full access for <span className="font-bold text-gray-900">{userName(activeModal.user)}</span>? Their account will be reactivated.</>
                  ) : (
                    <>Ban <span className="font-bold text-gray-900">{userName(activeModal.user)}</span>? This will restrict active account access across the platform.</>
                  )}
                </p>
              </div>

              {isBan && !isRestoring && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs leading-5 text-rose-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                  <p>This action will be logged in system audit logs and sent as a notification to the user.</p>
                </div>
              )}

              <div className="flex gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={savingUserId === activeModal.user.id}
                  className={`flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={savingUserId === activeModal.user.id}
                  className={`flex-[1.5] rounded-lg py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${
                    isBan && !isRestoring ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {savingUserId === activeModal.user.id
                    ? 'Saving…'
                    : activeModal.type === 'role'
                      ? 'Confirm role change'
                      : isRestoring
                        ? 'Restore access'
                        : 'Ban account'}
                </button>
              </div>
            </div>
          </ModalShell>
        );
      })()}
    </div>
  );
}
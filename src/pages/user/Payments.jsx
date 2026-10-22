import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { 
  Coins, 
  CreditCard, 
  History, 
  ArrowRight, 
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

const TOPUP_PACKAGES = [
  { phpAmount: 100,  bonusCredits: 0 },
  { phpAmount: 500,  bonusCredits: 5 },
  { phpAmount: 1000, bonusCredits: 15 },
  { phpAmount: 2000, bonusCredits: 40 },
];

export default function Payments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState([]);
  
  // Stats State
  const [stats, setStats] = useState({
    earned: 0,
    spent: 0,
    totalTransactions: 0
  });
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [activePaymentTab, setActivePaymentTab] = useState('overview');
  
  const [selectedPackage, setSelectedPackage] = useState(TOPUP_PACKAGES[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchPaymentData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);

      // 1. Fetch Balance
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('credits_balance')
        .eq('id', user.id)
        .single();
      
      if (profile) setBalance(profile.credits_balance || 0);

      // 2. Fetch Top-up History
      const { data: topups } = await supabase
        .from('topup_transactions')
        .select('*')
        .eq('user_id', user.id);

      // 3. Fetch Sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`id, status, credit_amount, created_at, student_id, instructor_id, skill:skills(title)`)
        .or(`student_id.eq.${user.id},instructor_id.eq.${user.id}`);

      let combinedLedger = [];
      let totalEarned = 0;
      let totalSpent = 0;

      // A. Process Top-ups
      if (topups) {
        topups.forEach(t => {
          combinedLedger.push({
            id: `topup-${t.id}`,
            type: 'TOPUP',
            title: 'PayMongo top-up',
            amount: t.credits_added,
            isPositive: true,
            date: t.created_at,
            status: t.status,
            meta: `₱${t.amount_php}`
          });
        });
      }

      // B. Process Sessions
      if (sessions) {
        sessions.forEach(s => {
          // As Student (Spent/Refunds)
          if (s.student_id === user.id) {
            combinedLedger.push({
              id: `book-${s.id}`,
              type: 'SPENT',
              title: `Session booking: ${s.skill?.title || 'Session'}`,
              amount: s.credit_amount,
              isPositive: false,
              date: s.created_at,
              status: 'paid',
              meta: 'Payment for session'
            });

            // Calculate active spending (money currently held or completed)
            if (['active', 'completed', 'upcoming', 'reschedule_proposed'].includes(s.status)) {
              totalSpent += s.credit_amount;
            }

            if (s.status === 'cancelled') {
              combinedLedger.push({
                id: `refund-${s.id}`,
                type: 'REFUND',
                title: `Refund: ${s.skill?.title || 'Session'}`,
                amount: s.credit_amount,
                isPositive: true,
                date: s.created_at,
                status: 'paid',
                meta: 'Cancelled booking'
              });
            }
          }

          // As Instructor (Earned)
          if (s.instructor_id === user.id && s.status === 'completed') {
            combinedLedger.push({
              id: `earn-${s.id}`,
              type: 'EARNED',
              title: `Session earnings: ${s.skill?.title || 'Session'}`,
              amount: s.credit_amount,
              isPositive: true,
              date: s.created_at,
              status: 'paid',
              meta: 'Completed session'
            });
            totalEarned += s.credit_amount;
          }
        });
      }

      combinedLedger.sort((a, b) => {
        // 1. Sort by Date first (Latest at the top)
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        
        // 2. If the dates/timestamps are exactly the same, force Refunds to show above Spent.
        if (dateDiff === 0) {
           if (a.type === 'REFUND' && b.type === 'SPENT') return -1;
           if (a.type === 'SPENT' && b.type === 'REFUND') return 1;
        }
        
        return dateDiff;
      });
      setLedger(combinedLedger);
      setStats({
        earned: totalEarned,
        spent: totalSpent,
        totalTransactions: combinedLedger.length
      });
      setLoading(false);
    };

    fetchPaymentData();
  }, [navigate]);

  const getActiveAmountPHP = () => {
    if (customAmount) return Number(customAmount);
    return selectedPackage ? selectedPackage.phpAmount : 0;
  };

  const getCalculatedCredits = () => {
    const phpAmount = getActiveAmountPHP();
    const baseCredits = Math.floor(phpAmount / 10);
    
    if (customAmount) {
      if (phpAmount >= 2000) return baseCredits + 40;
      if (phpAmount >= 1000) return baseCredits + 15;
      if (phpAmount >= 500)  return baseCredits + 5;
      return baseCredits;
    }
    return selectedPackage ? (baseCredits + selectedPackage.bonusCredits) : 0;
  };

  const handleCheckout = async () => {
    const amountPHP = getActiveAmountPHP();
    if (amountPHP < 50) {
      alert("Minimum top-up amount is ₱50.");
      return;
    }
    if (amountPHP % 10 !== 0) {
      alert("Top-up amount must be a multiple of ₱10.");
      return;
    }

    setIsProcessing(true);

    try {
      const credits = getCalculatedCredits();
      
      // 1. Insert pending transaction in DB[cite: 16]
      const { data: tx, error: txError } = await supabase
        .from('topup_transactions')
        .insert({
          user_id: currentUser.id,
          amount_php: amountPHP,
          credits_added: credits,
          status: 'pending',
          payment_method: 'paymongo_checkout'
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Call Supabase Edge Function to get PayMongo Checkout URL
      const { data: paymongoData, error: functionError } = await supabase.functions.invoke('create-paymongo-checkout', {
        body: { 
          transaction_id: tx.id,
          amount: amountPHP,
          description: `SkillCredit Top-up: ${credits} credits`
        }
      });

      if (functionError) throw functionError;
      if (!paymongoData || !paymongoData.checkout_url) {
        throw new Error("Invalid response from payment gateway.");
      }

      // 3. Redirect user to PayMongo Link
      window.location.href = paymongoData.checkout_url;
      
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("Something went wrong preparing your checkout. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading payments" className="min-h-[calc(100vh-64px)] bg-[#faf9f6] text-[#202522]">
      <main className="mx-auto max-w-[1000px] animate-pulse space-y-3.5 px-6 py-6 md:px-8">
        <header
          className="relative mx-auto w-full max-w-[920px] overflow-hidden rounded-2xl shadow-md"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 100%)' }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="h-3 w-28 rounded bg-emerald-300/40" />
              <div className="h-6 w-48 rounded bg-white/20" />
              <div className="h-3 w-56 max-w-full rounded bg-emerald-200/40" />
            </div>
          </div>
        </header>
      </main>
    </div>
  );

  const renderTransactions = (items) => {
    if (items.length === 0) {
      return (
        <div className="flex min-h-[210px] flex-col items-center justify-center px-5 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
            <History className="h-5 w-5" />
          </span>
          <p className="text-[13px] font-bold text-gray-900">No transactions yet</p>
          <p className="mt-1 text-[11px] text-gray-500">Your transactions will appear here.</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-100">
        {items.map((tx) => {
          let iconRender;
          let bgClass;
          let textClass;
          if (tx.status === 'pending') {
            bgClass = 'bg-amber-50 border-amber-100';
            textClass = 'text-amber-600';
            iconRender = <Clock className="h-4 w-4" />;
          } else if (tx.status === 'failed') {
            bgClass = 'bg-rose-50 border-rose-100';
            textClass = 'text-rose-600';
            iconRender = <XCircle className="h-4 w-4" />;
          } else if (tx.type === 'EARNED' || tx.type === 'TOPUP') {
            bgClass = 'bg-emerald-50 border-emerald-100';
            textClass = 'text-emerald-600';
            iconRender = <ArrowDownRight className="h-4 w-4" />;
          } else if (tx.type === 'SPENT') {
            bgClass = 'bg-rose-50 border-rose-100';
            textClass = 'text-rose-600';
            iconRender = <ArrowUpRight className="h-4 w-4" />;
          } else if (tx.type === 'REFUND') {
            bgClass = 'bg-sky-50 border-sky-100';
            textClass = 'text-sky-600';
            iconRender = <RefreshCcw className="h-4 w-4" />;
          }

          return (
            <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-gray-50 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${bgClass} ${textClass}`}>
                  {iconRender}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-gray-900" title={tx.title}>{tx.title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-gray-500">{new Date(tx.date).toLocaleDateString()} · {tx.meta}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-[12px] font-bold ${tx.isPositive ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {tx.isPositive ? '+' : '-'}{tx.amount} credits
                </p>
                {tx.status === 'pending' && <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">Pending</span>}
                {tx.status === 'failed' && <span className="text-[9px] font-semibold uppercase tracking-wider text-rose-600">Failed</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'topup', label: 'Add credits', icon: CreditCard },
    { key: 'history', label: 'Transactions', icon: History },
  ];
  const cardClass = 'rounded-2xl border border-gray-200 bg-white shadow-sm';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#faf9f6] text-[#202522]">
      <main className="mx-auto max-w-[1000px] space-y-3.5 px-6 py-6 md:px-8">
        
        <header
          className="relative mx-auto w-full max-w-[920px] overflow-hidden rounded-2xl shadow-md"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 100%)' }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
          <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">ACCOUNT</p>
              <h1 className="mt-0.5 text-[20px] font-bold leading-tight tracking-tight text-white">Wallet &amp; Payments</h1>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-200">Check your balance, add credits, and track transactions.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center"><p className="text-[14px] font-bold leading-none text-white">+{stats.earned.toLocaleString()}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-emerald-200">Earned</p></div>
                <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center"><p className="text-[14px] font-bold leading-none text-white">-{stats.spent.toLocaleString()}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-emerald-200">Spent</p></div>
                <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center"><p className="text-[14px] font-bold leading-none text-white">{stats.totalTransactions.toLocaleString()}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-emerald-200">Transactions</p></div>
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Payments sections" className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-gray-100 bg-gray-100/80 p-1">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = activePaymentTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActivePaymentTab(key)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-bold transition ${isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-white/70 hover:text-gray-900'}`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-700' : ''}`} />{label}
                {key === 'history' && <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-white/80 text-gray-500'}`}>{stats.totalTransactions}</span>}
              </button>
            );
          })}
        </nav>

        {activePaymentTab === 'overview' && (
          <section className="grid items-start gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <div className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Wallet className="h-4 w-4" /></span>
                  <div>
                    <h2 className="text-[15px] font-bold text-gray-900">Your balance</h2>
                    <p className="mt-0.5 text-[10px] text-gray-500">Current balance and peso equivalent.</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="rounded-xl bg-emerald-50/80 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-800/65">Available</p>
                  <p className="mt-1 text-[27px] font-bold leading-none tracking-tight text-emerald-800">{balance.toLocaleString()} <span className="text-[13px]">credits</span></p>
                  <p className="mt-2 text-[10px] text-emerald-800/65">Equivalent to approximately ₱{(balance * 10).toLocaleString()}.</p>
                </div>
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-gray-100 p-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><Coins className="h-3.5 w-3.5" /></span>
                  <div><p className="text-[11px] font-bold text-gray-800">Conversion rate</p><p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">₱10 = 1 credit. Eligible packages include bonus credits.</p></div>
                </div>
              </div>
            </div>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500"><History className="h-4 w-4" /></span>
                  <div><h2 className="text-[15px] font-bold text-gray-900">Recent transactions</h2><p className="mt-0.5 text-[10px] text-gray-400">Latest 5</p></div>
                </div>
                <button type="button" onClick={() => { setShowAllTransactions(true); setActivePaymentTab('history'); }} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-50">
                  View all transactions <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {renderTransactions(ledger.slice(0, 5))}
            </section>
          </section>
        )}

        {activePaymentTab === 'topup' && (
          <section className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className={`${cardClass} p-5 sm:p-6`}>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CreditCard className="h-4 w-4" /></span>
                  <div><h2 className="text-[15px] font-bold text-gray-900">Add credits</h2><p className="mt-0.5 text-[10px] text-gray-500">Choose a package or enter a custom amount.</p></div>
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Select a package</p>
              <div className="mb-5 grid grid-cols-2 gap-2.5">
                {TOPUP_PACKAGES.map((pkg, idx) => {
                  const isSelected = selectedPackage === pkg && !customAmount;
                  const baseCredits = Math.floor(pkg.phpAmount / 10);
                  return (
                    <button key={idx} type="button" onClick={() => { setSelectedPackage(pkg); setCustomAmount(''); }} className={`relative flex min-h-[82px] flex-col items-center justify-center rounded-xl border p-3 transition ${isSelected ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/15' : 'border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50/40'}`}>
                      {pkg.bonusCredits > 0 && <span className="absolute -top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold text-white">+{pkg.bonusCredits} bonus</span>}
                      <span className={`text-[15px] font-bold ${isSelected ? 'text-emerald-800' : 'text-gray-800'}`}>₱{pkg.phpAmount.toLocaleString()}</span>
                      <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">{baseCredits} credits</span>
                    </button>
                  );
                })}
              </div>
              <label htmlFor="custom-topup-amount" className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Custom amount (₱)</label>
              <input id="custom-topup-amount" type="number" min="50" step="10" placeholder="Minimum ₱50" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setSelectedPackage(null); }} className="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              <p className="flex items-center gap-1.5 text-[10px] text-gray-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Payments are securely prepared through PayMongo.</p>
            </div>

            <aside className={`${cardClass} p-5 sm:p-6`}>
              <h2 className="text-[15px] font-bold text-gray-900">Payment summary</h2>
              <p className="mt-1 text-[10px] text-gray-500">Review your payment and credits before continuing.</p>
              <div className="mt-5 space-y-3 rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-gray-500">You'll receive</span><span className="text-[13px] font-bold text-emerald-800">{getCalculatedCredits().toLocaleString()} credits</span></div>
                <div className="h-px bg-gray-200" />
                <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-gray-500">Total payment</span><span className="text-[16px] font-bold text-gray-900">₱{getActiveAmountPHP().toLocaleString()}</span></div>
              </div>
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
                <p className="text-[10px] font-bold text-emerald-900">Credit conversion</p>
                <p className="mt-1 text-[10px] leading-relaxed text-emerald-800/75">₱10 = 1 credit. Any package bonus is included in the total above.</p>
              </div>

              <button 
                type="button" 
                onClick={handleCheckout} 
                disabled={isProcessing} 
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-[12px] font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Preparing Payment...' : `Continue to payment · ₱${getActiveAmountPHP().toLocaleString()}`}
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-[9px] text-gray-400">Minimum ₱50 · Amount must be in multiples of ₱10</p>
            </aside>
          </section>
        )}

        {activePaymentTab === 'history' && (
          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500"><History className="h-4 w-4" /></span>
                <div><h2 className="text-[15px] font-bold text-gray-900">Transaction history</h2><p className="mt-0.5 text-[10px] text-gray-400">{showAllTransactions ? 'All transactions' : 'Latest 5'}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">{ledger.length}</span>
                {ledger.length > 5 && <button type="button" onClick={() => setShowAllTransactions((value) => !value)} aria-expanded={showAllTransactions} className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-50">{showAllTransactions ? 'Show recent' : 'Show all'}</button>}
              </div>
            </div>
            {renderTransactions(showAllTransactions ? ledger : ledger.slice(0, 5))}
          </section>
        )}
      </main>
    </div>
  );
}
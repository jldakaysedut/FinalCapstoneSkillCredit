import { useCallback, useEffect, useState } from 'react';
import { Coins, Flame, Gift, Check, PartyPopper } from 'lucide-react';
import supabase from '../supabaseClient';

// Display dates must use the same timezone as the claim_daily_reward() SQL function.
const manilaDate = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (key) => parts.find((p) => p.type === key)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const manilaDateFor = (timestamp) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const value = (key) => parts.find((p) => p.type === key)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const consecutiveCalendarDays = (previous, current) => {
  if (!previous) return false;
  const dayNumber = (iso) => Date.parse(`${iso}T00:00:00Z`) / 86400000;
  return dayNumber(current) - dayNumber(previous) === 1;
};

const REWARDS = [1, 1, 1, 1, 2, 2, 5];

/**
 * Dashboard-only daily login reward popup.
 * Database is the authority for eligibility, streak and credit balance.
 * This component never writes credits_balance directly.
 */
export default function DailyRewardModal({ userId, blocked = false, onClaimed }) {
  const [today, setToday] = useState(manilaDate);
  const [eligible, setEligible] = useState(false);
  const [nextDay, setNextDay] = useState(1);
  const [checking, setChecking] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [success, setSuccess] = useState(null);

  const checkEligibility = useCallback(async () => {
    if (!userId) {
      setEligible(false);
      setChecking(false);
      return;
    }

    const currentDay = manilaDate();
    setToday(currentDay);
    setChecking(true);
    try {
      // The primary key (user_id, claim_date) enforces one claim per calendar day.
      // Reading only our latest record keeps the interface in sync across devices.
      const { data, error } = await supabase
        .from('daily_reward_claims')
        .select('claim_date, streak_day')
        .eq('user_id', userId)
        .order('claim_date', { ascending: false })
        .limit(1);
      if (error) throw error;

      // Signup day is reserved for the existing 20 CR welcome bonus.
      // Match the server's Asia/Manila calendar-date rule.
      const { data: account, error: accountError } = await supabase
        .from('user_profiles')
        .select('created_at')
        .eq('id', userId)
        .single();
      if (accountError) throw accountError;
      if (!account?.created_at) throw new Error('Account creation date is unavailable.');
      const registrationDay = manilaDateFor(account.created_at);
      const latest = data?.[0];
      setEligible(registrationDay < currentDay && latest?.claim_date !== currentDay);
      setNextDay(consecutiveCalendarDays(latest?.claim_date, currentDay)
        ? ((Number(latest.streak_day) % 7) + 1) : 1);
      setErrorText('');
    } catch (error) {
      // If the new DB migration hasn't been applied, don't show a broken popup.
      console.error('Daily reward eligibility check failed:', error);
      setEligible(false);
    } finally {
      setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    checkEligibility();
    const recheckOnReturn = () => {
      if (document.visibilityState === 'visible') checkEligibility();
    };
    document.addEventListener('visibilitychange', recheckOnReturn);
    window.addEventListener('focus', recheckOnReturn);
    return () => {
      document.removeEventListener('visibilitychange', recheckOnReturn);
      window.removeEventListener('focus', recheckOnReturn);
    };
  }, [checkEligibility]);

  // Brief confirmation, then the modal closes automatically—no second button.
  useEffect(() => {
    if (!success) return undefined;
    const timeout = window.setTimeout(() => setSuccess(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [success]);

  const claim = async () => {
    if (claiming || !userId) return;
    setClaiming(true);
    setErrorText('');
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward');
      if (error) {
        // Multiple tabs/devices may have claimed at the same time.
        if (/already claimed/i.test(error.message || '')) {
          setEligible(false);
          await onClaimed?.();
          return;
        }
        throw error;
      }
      // The reward itself was already granted by the secure database RPC.
      // Only the notification record is created in frontend code.
      // Do not retry the credit claim if notification delivery fails.
      try {
        const { error: notificationError } = await supabase.from('notifications').insert({
          user_id: userId,
          type: 'daily_reward',
          content: `Daily Login Bonus claimed! Day ${data.day} of 7: +${data.reward} CR added to your SkillCredit wallet.`,
          link_url: '/notifications',
        });
        if (notificationError) {
          console.error('Daily reward granted, but notification creation failed:', notificationError);
        }
      } catch (notificationError) {
        console.error('Daily reward granted, but notification creation failed:', notificationError);
      }
      setSuccess(data);
      setEligible(false);
      await onClaimed?.();
    } catch (error) {
      console.error('Daily reward claim failed:', error);
      setErrorText(error?.message || 'Could not claim right now. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  // The existing 20 CR welcome popup takes priority for newly registered users.
  if (blocked || checking || !userId || (!eligible && !success)) return null;

  const displayDay = success?.day || nextDay;
  const displayAmount = success?.reward || REWARDS[displayDay - 1];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="daily-reward-title"
        className="relative my-auto w-full max-w-[350px] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        <div className="relative flex h-[78px] items-center justify-center bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/75 bg-white shadow-md">
            {success ? <Check size={25} className="text-amber-500" /> : <PartyPopper size={25} className="text-amber-500" />}
          </div>
        </div>
        <div className="px-4 pb-4 pt-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
            {success ? 'Reward claimed' : 'SkillCredit Daily Rewards'}
          </p>
          <h2 id="daily-reward-title" className="mt-1 text-xl font-extrabold tracking-tight text-gray-900">
            {success ? 'Credits added!' : 'Daily Login Bonus!'}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {success ? 'Come back tomorrow to continue your streak.' : 'Claim today’s reward and keep your streak alive.'}
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {REWARDS.map((amount, i) => (
              <div key={i} className={`min-w-0 rounded-lg border py-1.5 text-center ${i + 1 === displayDay ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
                <span className="block text-[9px] font-bold">D{i + 1}</span>
                <span className="block text-[10px] font-extrabold">+{amount}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-amber-100 bg-amber-50 py-2">
            <Gift size={19} className="text-amber-500" />
            <span className="text-[27px] font-black leading-none text-amber-500">+{displayAmount}</span>
            <span className="text-sm font-bold text-amber-600">CR</span>
            <span className="text-[11px] font-semibold text-amber-800">· Day {displayDay} of 7</span>
          </div>
          {errorText && <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{errorText}</p>}
          {!success && (
            <button type="button" disabled={claiming} onClick={claim}
              className="mt-3 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60">
              {claiming ? 'Claiming…' : 'Claim Reward'}
            </button>
          )}
          <p className="mt-2 text-[10px] text-gray-400">13 CR per completed 7-day streak</p>
        </div>
      </div>
    </div>
  );
}

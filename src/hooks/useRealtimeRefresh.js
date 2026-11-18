import { useEffect, useRef } from 'react';
import supabase from '../supabaseClient';

/** Refresh existing read-only page loaders when watched tables change.
 * No database writes or changes to the screen's business logic.
 */
export default function useRealtimeRefresh(load, tables, channelName) {
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    let timer;
    let disposed = false;
    const refresh = () => {
      if (disposed || document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      timer = setTimeout(() => { if (!disposed) Promise.resolve(loader.current()).catch(console.error); }, 300);
    };
    const channel = supabase.channel(channelName);
    for (const entry of tables) {
      const { table, filter } = typeof entry === 'string' ? { table: entry } : entry;
      if (!table) continue;
      channel.on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, refresh);
      // Supabase DELETE payloads may carry only the primary key, so row filters
      // cannot reliably match deletes. Listen unfiltered for those changes.
      if (filter) channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, refresh);
    }
    channel.subscribe();
    const onFocus = () => refresh();
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      supabase.removeChannel(channel);
    };
  // A route-specific channel name allows safely resubscribing when its record ID changes.
  }, [channelName]);
}

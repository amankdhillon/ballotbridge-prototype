// Live updates. Subscribes to the change log for one measure and calls onChange, merged and jittered.
// Returns a function that stops the subscription.
import { sb } from '../lib/supabase.js';

export function watchMeasure(measureId, onChange) {
  let timer = null;
  const fire = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 300 + Math.random() * 500);
  };
  const channel = sb()
    .channel(`measure-${measureId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'measure_events', filter: `measure_id=eq.${measureId}` },
      fire)
    .subscribe();
  // Safety net in case a live event is missed, for example after a dropped connection.
  const safety = setInterval(fire, 60000);
  return () => {
    clearTimeout(timer);
    clearInterval(safety);
    sb().removeChannel(channel);
  };
}

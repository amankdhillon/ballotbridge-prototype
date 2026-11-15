import { sb, unwrap } from '../lib/supabase.js';

export async function createSource({ userId, measureId, claim, url, sourceType }) {
  const link = String(url ?? '').trim();
  if (!/^https:\/\/\S+$/.test(link)) throw new Error('Enter a full link starting with https://');
  if (!String(claim ?? '').trim()) throw new Error('Say which claim this source supports.');
  unwrap(await sb().from('sources').insert({
    measure_id: measureId,
    claim: String(claim).trim(),
    url: link,
    source_type: sourceType,
    submitted_by: userId,
  }));
}

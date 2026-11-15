// The reviewer queue and review submissions. The database enforces who may review what.
import { sb, unwrap } from '../lib/supabase.js';

const toQueue = r => ({
  id: r.id,
  measureTitle: r.measure_title,
  officialText: r.official_text,
  body: r.body,
  category: r.category,
  readingLevel: r.reading_level,
  approvals: Number(r.approvals),
  changes: Number(r.changes_count),
  createdAt: r.created_at,
});

export async function fetchQueue() {
  return unwrap(await sb().from('review_queue').select('*').order('approvals').order('created_at')).map(toQueue);
}

export async function addReview({ userId, postId, verdict, checks, note }) {
  unwrap(await sb().from('reviews').insert({
    post_id: postId,
    reviewer_id: userId,
    verdict,
    checks,
    note: String(note ?? '').trim(),
  }));
}

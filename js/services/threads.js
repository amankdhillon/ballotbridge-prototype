// Posts and their threads. Reads go through views that hide authors on anonymous posts.
import { sb, unwrap } from '../lib/supabase.js';

const toPost = r => ({
  id: r.id,
  type: r.type,
  parentId: r.parent_id ?? '',
  category: r.category,
  readingLevel: r.reading_level,
  body: r.body,
  status: r.status,
  createdAt: r.created_at,
  authorName: r.author_name,
  authorIcon: r.author_icon,
  authorVerified: r.author_verified,
  isOwn: r.is_own,
  approvals: Number(r.approvals),
  changesCount: Number(r.changes_count),
  reviewedByMe: r.reviewed_by_me,
  replies: [],
});

const toSource = r => ({ id: r.id, claim: r.claim, url: r.url, sourceType: r.source_type, status: r.status });

// Everything a measure page needs, with replies nested under the post they answer.
export async function fetchThread(measureId) {
  const [posts, sources] = await Promise.all([
    sb().from('post_view').select('*').eq('measure_id', measureId).order('created_at'),
    sb().from('source_view').select('*').eq('measure_id', measureId).order('created_at'),
  ]);
  const flat = unwrap(posts).map(toPost);
  const byId = new Map(flat.map(p => [p.id, p]));
  const roots = [];
  for (const post of flat) {
    if (!post.parentId) roots.push(post);
    else byId.get(post.parentId)?.replies.push(post);
  }
  return {
    explanations: roots.filter(p => p.type === 'explanation'),
    questions: roots.filter(p => p.type === 'question'),
    sources: unwrap(sources).map(toSource),
  };
}

export async function createPost({ userId, type, measureId, parentId = null, category = '', readingLevel = '', body, anonymous = false }) {
  const text = String(body ?? '').trim();
  if (!text) throw new Error('Write something first.');
  unwrap(await sb().from('posts').insert({
    author_id: userId,
    measure_id: measureId,
    type: parentId ? 'reply' : type,
    parent_id: parentId,
    category,
    reading_level: type === 'explanation' ? readingLevel : '',
    body: text,
    anonymous,
  }));
}

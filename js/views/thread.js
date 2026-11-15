// Renders threads: explanations and questions, with replies nested underneath.
// Also holds the UI state that must survive repaints (open reply boxes, drafts).
import { esc } from '../lib/dom.js';
import { badge, tag, empty } from '../components/ui.js';

export const ui = {
  openReplies: new Set(),
  drafts: new Map(),
};

export function draftFor(id) {
  if (!ui.drafts.has(id)) ui.drafts.set(id, { text: '', anon: false });
  return ui.drafts.get(id);
}

export function threadHtml(post, depth, ctx) {
  const kids = post.replies.map(r => threadHtml(r, depth + 1, ctx)).join('');
  return `
    <div class="thread" style="--depth:${Math.min(depth, 3)}">
      ${postHtml(post, ctx)}
      ${ui.openReplies.has(post.id) ? replyBoxHtml(post) : ''}
      ${kids ? `<div class="thread__replies">${kids}</div>` : ''}
    </div>`;
}

function postHtml(post, ctx) {
  const isExplanation = post.type === 'explanation';
  const canReview = isExplanation && post.status === 'pending' && !post.isOwn && !post.reviewedByMe && ctx.me.verified;
  return `
    <article class="post">
      <header class="post__meta">
        <span class="avatar" aria-hidden="true">${esc(post.authorIcon) || '👤'}</span>
        <span class="post__author">${esc(post.authorName)}</span>
        ${post.authorVerified ? badge('Verified', 'ok') : ''}
        ${post.category ? tag(post.category) : ''}
        ${post.readingLevel ? tag(post.readingLevel) : ''}
      </header>
      <p class="post__body">${esc(post.body)}</p>
      <footer class="post__actions">
        ${isExplanation ? statusBadges(post, ctx) : ''}
        <button class="link" data-action="toggle-reply" data-id="${esc(post.id)}">Reply</button>
        ${canReview ? `<button class="btn btn--ghost btn--sm" data-action="review" data-id="${esc(post.id)}">Review</button>` : ''}
      </footer>
    </article>`;
}

function statusBadges(post, ctx) {
  const status = post.status === 'reviewed'
    ? badge(`Reviewed · ${post.approvals} approval${post.approvals === 1 ? '' : 's'}`, 'ok')
    : badge(`Pending review · ${post.approvals}/${ctx.reviewsRequired}`);
  const changes = post.changesCount ? badge(`Changes requested ×${post.changesCount}`, 'warn') : '';
  return status + changes;
}

function replyBoxHtml(post) {
  const d = draftFor(post.id);
  return `
    <div class="reply-box">
      <label class="field"><span>Your reply</span>
        <textarea class="input" rows="2" data-draft="${esc(post.id)}">${esc(d.text)}</textarea>
      </label>
      <label class="checkbox"><input type="checkbox" data-anon="${esc(post.id)}" ${d.anon ? 'checked' : ''}> Reply anonymously</label>
      <div class="row">
        <button class="btn btn--primary btn--sm" data-action="send-reply" data-id="${esc(post.id)}">Post reply</button>
        <button class="link" data-action="toggle-reply" data-id="${esc(post.id)}">Cancel</button>
      </div>
      <p class="form-error" data-error="${esc(post.id)}"></p>
    </div>`;
}

export function sourcesHtml(sources) {
  if (!sources.length) return empty('No sources yet. Add the first one.');
  return `<ul class="sources">
    ${sources.map(s => `
      <li>
        <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.claim)}</a>
        <div class="row">
          ${tag(s.sourceType)}
          ${s.status === 'verified' ? badge('Verified', 'ok') : badge('Pending')}
        </div>
      </li>`).join('')}
  </ul>`;
}

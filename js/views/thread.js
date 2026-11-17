// Renders threads. Top-level posts show first; the discussion under them opens on request.
// Holds the UI state that must survive repaints: open reply boxes, drafts, expanded threads.
import { esc } from '../lib/dom.js';
import { badge, tag, empty, roleBadge, thumbIcon, initialOf } from '../components/ui.js';
import { REACTION } from '../config.js';

export const ui = {
  openReplies: new Set(),
  drafts: new Map(),
  expanded: new Set(),
};

export function draftFor(id) {
  if (!ui.drafts.has(id)) ui.drafts.set(id, { text: '', anon: false });
  return ui.drafts.get(id);
}

// Top-level posts are always shown. Their replies appear only when the discussion is open.
export function threadHtml(post, depth, ctx) {
  const isRoot = depth === 0;
  const open = !isRoot || ui.expanded.has(post.id);
  const kids = open ? post.replies.map(r => threadHtml(r, depth + 1, ctx)).join('') : '';
  return `
    <div class="thread" style="--depth:${Math.min(depth, 3)}">
      ${postHtml(post, ctx, { isRoot, open })}
      ${open && ui.openReplies.has(post.id) ? replyBoxHtml(post) : ''}
      ${kids ? `<div class="thread__replies">${kids}</div>` : ''}
    </div>`;
}

function countReplies(post) {
  return post.replies.reduce((n, r) => n + 1 + countReplies(r), 0);
}

function postHtml(post, ctx, { isRoot, open }) {
  const isExplanation = post.type === 'explanation';
  const canReview = isExplanation && post.status === 'pending' && !post.isOwn && !post.reviewedByMe && ctx.me.verified;
  const replies = countReplies(post);
  const showToggle = isRoot && replies > 0
    ? `<button type="button" class="btn btn--ghost btn--sm" data-action="toggle-thread" data-id="${esc(post.id)}" aria-expanded="${open}">${open ? 'Hide discussion' : `Show discussion (${replies})`}</button>`
    : '';
  const anonymous = post.authorName === 'Anonymous';
  const tags = [post.category, post.readingLevel].filter(Boolean).map(esc).join(' · ');

  return `
    <article class="post">
      <header class="post__meta">
        <span class="avatar" aria-hidden="true">${esc(initialOf(post.authorName))}</span>
        <span class="post__author">${esc(post.authorName)}</span>
        ${anonymous ? '' : roleBadge(post.authorVerified)}
        ${tags ? `<span class="post__tags">${tags}</span>` : ''}
      </header>
      <p class="post__body">${esc(post.body)}</p>
      <footer class="post__actions">
        ${isExplanation ? `<span class="post__status">${esc(statusText(post, ctx))}</span>` : ''}
        ${thumbButton(post)}
        <button class="link" data-action="toggle-reply" data-id="${esc(post.id)}" aria-label="Reply to ${esc(post.authorName)}">Reply</button>
        ${canReview ? `<button class="btn btn--ghost btn--sm" data-action="review" data-id="${esc(post.id)}" aria-label="Review this explanation">Review</button>` : ''}
        ${showToggle}
      </footer>
    </article>`;
}

// The single reaction: a thumbs-up toggle with a count.
function thumbButton(post) {
  const count = Number(post.reactions[REACTION.key] || 0);
  const pressed = post.myReactions.includes(REACTION.key);
  const spoken = `${REACTION.label}, ${count} ${count === 1 ? 'person' : 'people'}${pressed ? ', you chose it' : ''}`;
  return `
    <button type="button" class="thumb" aria-pressed="${pressed}" data-action="react"
      data-id="${esc(post.id)}" data-emoji="${esc(REACTION.key)}" aria-label="${esc(spoken)}">
      ${thumbIcon()}<span aria-hidden="true">${count}</span>
    </button>`;
}

// Plain text, not colored pills.
function statusText(post, ctx) {
  const left = Math.max(ctx.reviewsRequired - post.approvals, 0);
  const text = post.status === 'reviewed'
    ? `Approved by ${post.approvals} reviewer${post.approvals === 1 ? '' : 's'}`
    : `Waiting for ${left} more approval${left === 1 ? '' : 's'}`;
  return post.changesCount ? `${text} · Changes requested (${post.changesCount})` : text;
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

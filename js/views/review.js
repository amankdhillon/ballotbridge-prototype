// Reviewer prototype: the queue of explanations waiting for review, and the review screen.
import { state } from '../state/store.js';
import { OPTIONS } from '../config.js';
import { fetchQueue, addReview } from '../services/reviews.js';
import { loadMe } from '../services/auth.js';
import { go } from '../lib/nav.js';
import { esc } from '../lib/dom.js';
import { toast } from '../components/toast.js';
import { badge, card, empty, skeleton } from '../components/ui.js';

const plural = n => (n === 1 ? '' : 's');

export async function renderQueue(root) {
  root.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Reviewer</p>
        <h1>Review queue</h1>
        <p class="lead">Check explanations against the official text. Authors stay hidden. You can't review your own, or the same one twice.</p>
      </div>
    </header>
    <p class="stats">You have given ${state.me.reviewsGiven} review${plural(state.me.reviewsGiven)} and written ${state.me.explanationsWritten} explanation${plural(state.me.explanationsWritten)}.</p>
    <div id="queue" class="stack">${skeleton(2)}</div>`;

  const queue = await fetchQueue();
  const list = root.querySelector('#queue');
  const need = state.settings.reviewsRequired;
  list.innerHTML = queue.length
    ? queue.map(q => `
        <article class="card queue-card">
          <p class="meta">${esc(q.measureTitle)} · ${esc(q.category)} · ${esc(q.readingLevel)}</p>
          <p class="post__body">${esc(q.body)}</p>
          <div class="row">
            ${badge(`Approvals: ${q.approvals} of ${need}`)}
            ${q.changes ? badge(`Changes requested ×${q.changes}`, 'warn') : ''}
            <button class="btn btn--primary btn--sm" data-review="${esc(q.id)}">Start review</button>
          </div>
        </article>`).join('')
    : empty('Nothing is waiting for review right now. Check back in a few minutes.');

  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-review]');
    if (btn) go(`/review/${btn.dataset.review}`);
  });
}

export async function renderReview(postId, root) {
  root.innerHTML = skeleton(3);
  const queue = await fetchQueue();
  const item = queue.find(q => q.id === postId);

  if (!item) {
    root.innerHTML = card({
      title: 'Nothing to review here',
      body: `<p>This explanation is no longer waiting for your review.</p>
             <a class="btn btn--ghost" href="#/review">Back to the queue</a>`,
    });
    return;
  }

  const need = state.settings.reviewsRequired;
  root.innerHTML = `
    <a class="back" href="#/review">← Review queue</a>
    <header class="page-head">
      <div>
        <p class="eyebrow">${esc(item.measureTitle)}</p>
        <h1>Review explanation</h1>
        <p class="lead">${item.approvals} of ${need} approval${plural(need)} so far.</p>
      </div>
    </header>
    <div class="grid-2">
      ${card({ title: 'Official ballot language', body: `<p class="official">${esc(item.officialText)}</p>` })}
      ${card({
        title: 'Explanation',
        body: `<p class="meta">${esc(item.category)} · ${esc(item.readingLevel)} · Author hidden</p>
               <p class="post__body">${esc(item.body)}</p>`,
      })}
    </div>
    <form id="review-form" class="card stack">
      <fieldset class="checklist">
        <legend>Checklist (all required to approve)</legend>
        ${OPTIONS.reviewChecks.map(c => `
          <label class="checkbox"><input type="checkbox" name="${esc(c.id)}"> ${esc(c.label)}</label>`).join('')}
      </fieldset>
      <div class="field">
        <label for="r-note">Note <span class="muted">(required to request changes)</span></label>
        <textarea id="r-note" name="note" class="input" rows="3"></textarea>
      </div>
      <div class="row">
        <button class="btn btn--primary" type="submit" value="approve">Approve</button>
        <button class="btn btn--ghost" type="submit" value="changes">Request changes</button>
      </div>
      <p class="form-error" id="review-error" role="alert"></p>
    </form>`;

  root.querySelector('#review-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const verdict = e.submitter?.value ?? 'approve';
    const data = new FormData(form);
    const checks = Object.fromEntries(OPTIONS.reviewChecks.map(c => [c.id, data.get(c.id) === 'on']));
    const errorEl = form.querySelector('#review-error');
    errorEl.textContent = '';
    try {
      await addReview({
        userId: state.me.id, postId, verdict, checks, note: data.get('note') ?? '',
      });
      state.me = await loadMe();
      toast(verdict === 'approve' ? 'Approved. Thanks for reviewing.' : 'Changes requested and saved.');
      go('/review');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

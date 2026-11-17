// One measure: ballot language, legislation links, explanations, questions, and sources.
// Uses event delegation so the page adds one listener per action type, not one per button.
import { state } from '../state/store.js';
import { OPTIONS } from '../config.js';
import { esc, $ } from '../lib/dom.js';
import { go } from '../lib/nav.js';
import { getMeasure } from '../services/catalog.js';
import { fetchThread, createPost, toggleReaction } from '../services/threads.js';
import { createSource } from '../services/sources.js';
import { watchMeasure } from '../services/realtime.js';
import { card, button, field, select, skeleton, openModal, closeModal } from '../components/ui.js';
import { toast, announce } from '../components/toast.js';
import { threadHtml, sourcesHtml, draftFor, ui } from './thread.js';

function legislationHtml(links) {
  if (!links.length) return '<p class="note">Links to the legislation will appear here.</p>';
  return `
    <h3 class="sub">Read the legislation</h3>
    <ul class="legislation">
      ${links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a></li>`).join('')}
    </ul>`;
}

export async function renderMeasure(id, root) {
  root.innerHTML = skeleton(4);
  const [measure, thread] = await Promise.all([getMeasure(id), fetchThread(id)]);
  const me = state.me;
  const ctx = { me, reviewsRequired: state.settings.reviewsRequired };
  const view = { thread, json: JSON.stringify(thread), pending: false };

  root.innerHTML = `
    <a class="back" href="#/directory">← All measures</a>
    <header class="page-head">
      <div>
        <p class="eyebrow">${esc(measure.scope === 'Local' ? measure.district : 'Statewide')}</p>
        <h1>${esc(measure.shortTitle)}</h1>
        <p class="lead">${esc(measure.title)}</p>
      </div>
      <a class="btn btn--primary" href="#/measure/${esc(id)}/contribute">Add contribution</a>
    </header>
    <div class="grid-2">
      ${card({
        title: 'Ballot language',
        body: `<div class="official">${esc(measure.officialText)}</div>
               ${legislationHtml(measure.legislation)}`,
      })}
      ${card({
        title: 'AI summary',
        body: `<p>${esc(measure.aiSummary)}</p>
               <p class="note">Written by the facilitator for this prototype. Not produced by software.</p>`,
      })}
    </div>
    ${card({ title: 'Community explanations', body: '<div id="explanations"></div>' })}
    <div class="grid-2">
      ${card({
        title: 'Questions',
        body: `<div id="questions"></div>${questionFormHtml()}`,
      })}
      ${card({
        title: 'Sources',
        actions: button({ label: 'Add source', variant: 'ghost', attrs: 'data-action="add-source"' }),
        body: '<div id="sources"></div>',
      })}
    </div>`;

  function paint() {
    // Don't repaint while someone is typing a reply; repaint once they leave the box.
    const active = document.activeElement;
    if (active && active.matches('[data-draft]')) { view.pending = true; return; }
    view.pending = false;
    const { explanations, questions, sources } = view.thread;
    $('#explanations', root).innerHTML = explanations.length
      ? explanations.map(p => threadHtml(p, 0, ctx)).join('')
      : '<p class="empty">No explanations yet. Verified contributors can start the first one.</p>';
    $('#questions', root).innerHTML = questions.length
      ? questions.map(p => threadHtml(p, 0, ctx)).join('')
      : '<p class="empty">No questions yet. Ask the first one below.</p>';
    $('#sources', root).innerHTML = sourcesHtml(sources);
  }

  async function refresh() {
    view.thread = await fetchThread(id);
    view.json = JSON.stringify(view.thread);
    paint();
  }

  paint();

  root.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id: target } = btn.dataset;

    if (action === 'toggle-thread') {
      ui.expanded.has(target) ? ui.expanded.delete(target) : ui.expanded.add(target);
      return paint();
    }
    if (action === 'toggle-reply') {
      if (ui.openReplies.has(target)) ui.openReplies.delete(target);
      else { ui.openReplies.add(target); ui.expanded.add(target); }
      return paint();
    }
    if (action === 'send-reply') return sendReply(target);
    if (action === 'react') {
      try {
        await toggleReaction(target, btn.dataset.emoji);
        await refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }
    if (action === 'review') return go(`/review/${target}`);
    if (action === 'add-source') return openSourceModal();
  });

  root.addEventListener('input', e => {
    if (e.target.matches('[data-draft]')) draftFor(e.target.dataset.draft).text = e.target.value;
  });
  root.addEventListener('change', e => {
    if (e.target.matches('[data-anon]')) draftFor(e.target.dataset.anon).anon = e.target.checked;
  });
  root.addEventListener('focusout', () => {
    if (view.pending) paint();
  });

  root.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    if (form.id !== 'question-form') return;
    const data = new FormData(form);
    try {
      await createPost({
        userId: me.id,
        type: 'question',
        measureId: id,
        category: data.get('category'),
        body: data.get('body'),
        anonymous: data.get('anon') === 'on',
      });
      form.reset();
      toast('Question posted');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  async function sendReply(parentId) {
    const d = draftFor(parentId);
    try {
      await createPost({
        userId: me.id, type: 'reply', parentId, measureId: id, body: d.text, anonymous: d.anon,
      });
      ui.drafts.delete(parentId);
      ui.openReplies.delete(parentId);
      toast('Reply posted');
      await refresh();
    } catch (err) {
      const errorEl = root.querySelector(`[data-error="${parentId}"]`);
      if (errorEl) errorEl.textContent = err.message;
    }
  }

  function openSourceModal() {
    openModal(`
      <h2>Add a source</h2>
      <form id="source-form" class="stack">
        ${field({
          id: 'src-claim', label: 'Claim this source supports',
          control: '<textarea id="src-claim" name="claim" class="input" rows="2" required></textarea>',
        })}
        ${field({
          id: 'src-url', label: 'Link', hint: 'Must start with https://',
          control: '<input id="src-url" name="url" class="input" type="url" placeholder="https://" required>',
        })}
        ${field({
          id: 'src-type', label: 'Source type',
          control: select({ id: 'src-type', name: 'sourceType', options: OPTIONS.sourceTypes }),
        })}
        <label class="checkbox"><input type="checkbox" name="confirm" required> This link opens without a login.</label>
        <div class="row">
          <button class="btn btn--primary" type="submit">Add source</button>
          <button class="btn btn--ghost" type="button" data-close>Cancel</button>
        </div>
      </form>`);
    document.getElementById('source-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const data = new FormData(ev.target);
      try {
        await createSource({
          userId: me.id, measureId: id,
          claim: data.get('claim'), url: data.get('url'), sourceType: data.get('sourceType'),
        });
        closeModal();
        toast('Source added');
        await refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  // Live updates. Announce new posts to screen-reader users. Repaint only when the thread changed.
  return watchMeasure(id, async () => {
    const fresh = await fetchThread(id);
    const json = JSON.stringify(fresh);
    if (json === view.json) return;
    if (countPosts(fresh) > countPosts(view.thread)) announce('New post added to this measure.');
    view.thread = fresh;
    view.json = json;
    paint();
  });
}

function questionFormHtml() {
  return `
    <form id="question-form" class="stack">
      ${field({
        id: 'q-topic', label: 'Topic',
        control: select({ id: 'q-topic', name: 'category', options: OPTIONS.categories }),
      })}
      <div class="field">
        <label for="q-body">Your question</label>
        <textarea id="q-body" name="body" class="input" rows="2" required></textarea>
      </div>
      <label class="checkbox"><input type="checkbox" name="anon"> Post anonymously</label>
      <div class="row"><button class="btn btn--primary btn--sm" type="submit">Post question</button></div>
    </form>`;
}

// Counts every post in a thread, including nested replies.
function countPosts(thread) {
  const walk = posts => posts.reduce((n, p) => n + 1 + walk(p.replies), 0);
  return walk([...thread.explanations, ...thread.questions]);
}

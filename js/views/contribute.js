// Add an explanation (verified contributors, subject to the unlock rule) or a question.
import { state } from '../state/store.js';
import { OPTIONS } from '../config.js';
import { getMeasure } from '../services/catalog.js';
import { createPost } from '../services/threads.js';
import { createSource } from '../services/sources.js';
import { loadMe } from '../services/auth.js';
import { go } from '../lib/nav.js';
import { esc } from '../lib/dom.js';
import { toast } from '../components/toast.js';
import { field, select, skeleton } from '../components/ui.js';

export async function renderContribute(id, root) {
  root.innerHTML = skeleton(3);
  const [measure, me] = await Promise.all([getMeasure(id), loadMe()]);
  state.me = me;

  root.innerHTML = `
    <a class="back" href="#/measure/${esc(id)}">← ${esc(measure.shortTitle)}</a>
    <header class="page-head">
      <div>
        <p class="eyebrow">Add to the discussion</p>
        <h1>New contribution</h1>
      </div>
    </header>
    <div class="narrow-col">
      <form id="contribute" class="card stack">
        <div class="segmented" role="group" aria-label="Type">
          <button type="button" data-kind="explanation" aria-pressed="true">Explanation</button>
          <button type="button" data-kind="question" aria-pressed="false">Question</button>
        </div>
        <p id="gate" class="note"></p>
        <div id="quote-box"></div>
        ${field({ id: 'c-cat', label: 'Topic', control: select({ id: 'c-cat', name: 'category', options: OPTIONS.categories }) })}
        <div id="level-field">
          ${field({ id: 'c-level', label: 'Reading level', control: select({ id: 'c-level', name: 'readingLevel', options: OPTIONS.readingLevels, value: OPTIONS.defaultLevel }) })}
        </div>
        <div class="field">
          <label for="c-body">Text</label>
          <textarea id="c-body" name="body" class="input" rows="7" required></textarea>
        </div>
        <div class="field">
          <label for="c-src">Supporting source <span class="muted">(optional)</span></label>
          <input id="c-src" name="url" class="input" type="url" placeholder="https://">
          <p class="hint">Must start with https://</p>
        </div>
        ${field({ id: 'c-srctype', label: 'Source type', control: select({ id: 'c-srctype', name: 'sourceType', options: OPTIONS.sourceTypes }) })}
        <label class="checkbox" id="anon-row" hidden><input type="checkbox" name="anon"> Post anonymously (questions only)</label>
        <div class="row">
          <button class="btn btn--primary" type="submit" id="submit">Post</button>
          <a class="btn btn--ghost" href="#/measure/${esc(id)}">Cancel</a>
        </div>
        <p class="form-error" id="form-error" role="alert"></p>
      </form>
    </div>`;

  const form = root.querySelector('#contribute');
  let kind = 'explanation';

  function updateGate() {
    const isExplanation = kind === 'explanation';
    const locked = isExplanation && state.me.reviewsGiven < state.me.explanationsWritten;
    let message = "Explanations go to review before they're marked reviewed. You can't review your own.";
    if (isExplanation && !state.me.verified) message = 'Explanations are for verified contributors. Ask the facilitator for the code.';
    else if (locked) message = 'Review one explanation by someone else to unlock your next one.';
    root.querySelector('#gate').textContent = message;
    root.querySelector('#level-field').hidden = !isExplanation;
    root.querySelector('#anon-row').hidden = isExplanation;
  }

  root.querySelectorAll('[data-kind]').forEach(btn => btn.addEventListener('click', () => {
    kind = btn.dataset.kind;
    root.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    updateGate();
  }));
  updateGate();

  // Shows the passage linked from the official text, with a way to remove it.
  const paintQuote = () => {
    const box = root.querySelector('#quote-box');
    box.innerHTML = state.pendingQuote
      ? `<div class="quote-box"><p class="meta">Referenced text from the official text</p>
           <blockquote><p>${esc(state.pendingQuote)}</p></blockquote>
           <button type="button" class="link" id="drop-quote">Remove reference</button></div>`
      : '';
    box.querySelector('#drop-quote')?.addEventListener('click', () => { state.pendingQuote = ''; paintQuote(); });
  };
  paintQuote();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = root.querySelector('#form-error');
    const submit = root.querySelector('#submit');
    const data = new FormData(form);
    const link = String(data.get('url') || '').trim();
    errorEl.textContent = '';
    const blocked = kind === 'explanation' && (!state.me.verified || state.me.reviewsGiven < state.me.explanationsWritten);
    if (blocked) { errorEl.textContent = root.querySelector('#gate').textContent; return; }
    if (link && !/^https:\/\/\S+$/.test(link)) {
      errorEl.textContent = 'A source link must start with https://';
      return;
    }
    submit.disabled = true;
    try {
      await createPost({
        userId: state.me.id,
        type: kind,
        measureId: id,
        category: data.get('category'),
        readingLevel: data.get('readingLevel'),
        body: data.get('body'),
        anonymous: data.get('anon') === 'on',
        quote: state.pendingQuote,
      });
      if (link) {
        await createSource({
          userId: state.me.id,
          measureId: id,
          claim: String(data.get('body')).slice(0, 160),
          url: link,
          sourceType: data.get('sourceType'),
        });
      }
      state.pendingQuote = '';
      toast(kind === 'explanation' ? 'Explanation submitted for review' : 'Question posted');
      go(`/measure/${id}`);
    } catch (err) {
      errorEl.textContent = err.message;
      submit.disabled = false;
    }
  });
}

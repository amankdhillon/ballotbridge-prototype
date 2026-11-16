// Step 1: nickname, icon, and optional contributor code.
import { state } from '../state/store.js';
import { OPTIONS } from '../config.js';
import { createProfile, redeemCode, loadMe } from '../services/auth.js';
import { go } from '../lib/nav.js';
import { esc } from '../lib/dom.js';

export function renderWelcome(root) {
  if (state.me) return go(state.me.state ? '/directory' : '/setup');

  root.innerHTML = `
    <section class="hero">
      <div class="narrow-col">
        <p class="eyebrow">Civic education, together</p>
        <h1>Understand ballot measures with your community</h1>
        <p class="lead">Read plain-language explanations, check them against the official text, and ask questions. For this prototype there's no password, just a nickname.</p>
      </div>
    </section>
    <section class="card narrow-col">
      <form id="join" class="stack" novalidate>
        <div class="field">
          <label for="nick">Nickname</label>
          <input id="nick" name="nickname" class="input" maxlength="30" autocomplete="off" required aria-describedby="nick-hint">
          <p id="nick-hint" class="hint">Other people see this. Use a name you're comfortable sharing.</p>
        </div>
        <div class="field">
          <span class="field__label" id="icon-label">Pick an icon</span>
          <div class="icon-grid" role="radiogroup" aria-labelledby="icon-label">
            ${OPTIONS.icons.map((ic, i) => `
              <button type="button" class="icon-btn" role="radio" aria-checked="${i === 0}"
                tabindex="${i === 0 ? 0 : -1}" aria-label="${esc(OPTIONS.iconLabels[ic])}" data-icon="${esc(ic)}">
                <span aria-hidden="true">${ic}</span>
              </button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label for="code">Contributor code (optional)</label>
          <input id="code" name="code" class="input" autocomplete="off" aria-describedby="code-hint">
          <p id="code-hint" class="hint">Only if your facilitator gave you one. Leave blank to visit.</p>
        </div>
        <button class="btn btn--primary btn--block" type="submit">Join</button>
        <p class="form-error" id="join-error" role="alert"></p>
      </form>
    </section>`;

  let icon = OPTIONS.icons[0];
  const grid = root.querySelector('.icon-grid');
  const buttons = [...grid.querySelectorAll('[data-icon]')];

  // Roving tabindex: one tab stop for the group, arrow keys move between icons.
  const choose = btn => {
    icon = btn.dataset.icon;
    buttons.forEach(b => {
      const on = b === btn;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  };

  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-icon]');
    if (btn) { choose(btn); btn.focus(); }
  });

  grid.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const current = buttons.findIndex(b => b.getAttribute('aria-checked') === 'true');
    const next = buttons[(current + step + buttons.length) % buttons.length];
    choose(next);
    next.focus();
  });

  const form = root.querySelector('#join');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = form.querySelector('#join-error');
    const submit = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const nickname = String(data.get('nickname') || '').trim();
    const code = String(data.get('code') || '').trim();
    errorEl.textContent = '';
    if (!nickname) { errorEl.textContent = 'Pick a nickname to continue.'; form.querySelector('#nick').focus(); return; }

    submit.disabled = true;
    try {
      // A retry after a bad code shouldn't create a second profile.
      if (!state.me) {
        await createProfile(nickname, icon);
        state.me = await loadMe();
      }
      if (code) await redeemCode(code);
      state.me = await loadMe();
      go(state.me.state ? '/directory' : '/setup');
    } catch (err) {
      errorEl.textContent = err.message;
      submit.disabled = false;
    }
  });
}

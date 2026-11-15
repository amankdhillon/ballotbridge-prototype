// Step 1: nickname, icon, and optional facilitator code.
import { state } from '../state/store.js';
import { OPTIONS } from '../config.js';
import { createProfile, redeemCode, loadMe } from '../services/auth.js';
import { go } from '../lib/nav.js';
import { esc } from '../lib/dom.js';

export function renderWelcome(root) {
  if (state.me) return go(state.me.state ? '/directory' : '/setup');
  let icon = OPTIONS.icons[0];

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
          <input id="nick" name="nickname" class="input" maxlength="30" autocomplete="off" required>
        </div>
        <div class="field">
          <span class="field__label">Pick an icon</span>
          <div class="icon-grid" role="radiogroup" aria-label="Icon">
            ${OPTIONS.icons.map((ic, i) =>
              `<button type="button" class="icon-btn" role="radio" aria-checked="${i === 0}" data-icon="${esc(ic)}">${ic}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label for="code">Facilitator code <span class="muted">(contributors only, optional)</span></label>
          <input id="code" name="code" class="input" autocomplete="off">
        </div>
        <button class="btn btn--primary btn--block" type="submit">Join</button>
        <p class="form-error" id="join-error" role="alert"></p>
      </form>
    </section>`;

  const form = root.querySelector('#join');
  form.querySelector('.icon-grid').addEventListener('click', e => {
    const btn = e.target.closest('[data-icon]');
    if (!btn) return;
    icon = btn.dataset.icon;
    form.querySelectorAll('[data-icon]').forEach(b => b.setAttribute('aria-checked', String(b === btn)));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = form.querySelector('#join-error');
    const submit = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const nickname = String(data.get('nickname') || '').trim();
    const code = String(data.get('code') || '').trim();
    errorEl.textContent = '';
    if (!nickname) { errorEl.textContent = 'Pick a nickname.'; return; }

    submit.disabled = true;
    try {
      // Retrying after a failed code shouldn't create a second profile.
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

// Step 2: state, district, and topics of interest.
import { state } from '../state/store.js';
import { OPTIONS } from '../config.js';
import { saveSetup, loadMe } from '../services/auth.js';
import { go } from '../lib/nav.js';
import { esc } from '../lib/dom.js';
import { field, select } from '../components/ui.js';

export function renderSetup(root) {
  const me = state.me;
  const picked = new Set(me.topics);

  root.innerHTML = `
    <section class="card narrow-col">
      <p class="eyebrow">Step 2 of 2</p>
      <h1>Where do you vote?</h1>
      <p class="lead">We use this to show measures on your ballot and to label local measures.</p>
      <form id="setup" class="stack">
        ${field({ id: 's-state', label: 'State', control: select({ id: 's-state', name: 'state', options: OPTIONS.states, value: me.state || OPTIONS.states[0] }) })}
        ${field({ id: 's-district', label: 'District', control: select({ id: 's-district', name: 'district', options: OPTIONS.districts, value: me.district || OPTIONS.districts[0] }) })}
        <fieldset>
          <legend>Topics you care about</legend>
          <div class="chips">
            ${OPTIONS.categories.map(t => `
              <label class="chip">
                <input type="checkbox" name="topics" value="${esc(t)}" ${picked.has(t) ? 'checked' : ''}>
                <span>${esc(t)}</span>
              </label>`).join('')}
          </div>
        </fieldset>
        <button class="btn btn--primary btn--block" type="submit">Continue</button>
        <p class="form-error" id="setup-error" role="alert"></p>
      </form>
    </section>`;

  const form = root.querySelector('#setup');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);
    try {
      await saveSetup(me.id, {
        state: data.get('state'),
        district: data.get('district'),
        topics: data.getAll('topics'),
      });
      state.me = await loadMe();
      go('/directory');
    } catch (err) {
      form.querySelector('#setup-error').textContent = err.message;
    }
  });
}

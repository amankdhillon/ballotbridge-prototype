// Browse measures, filtered by Statewide or the user's district, and by search text.
import { state } from '../state/store.js';
import { listMeasures } from '../services/catalog.js';
import { esc } from '../lib/dom.js';
import { skeleton, empty } from '../components/ui.js';

const measureCard = m => `
  <a class="measure-card" href="#/measure/${esc(m.id)}">
    <span class="measure-card__meta">${esc(m.scope === 'Local' ? m.district : 'Statewide')}</span>
    <strong>${esc(m.shortTitle)}</strong>
    <span class="muted">${esc(m.title)}</span>
  </a>`;

export async function renderDirectory(root) {
  root.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Directory</p>
        <h1>Ballot measures</h1>
        <p class="lead">Compare the official text with the community's plain-language explanations and sources.</p>
      </div>
    </header>
    <div class="toolbar">
      <div class="segmented" role="group" aria-label="Region">
        <button type="button" data-scope="Statewide" aria-pressed="true">Statewide</button>
        <button type="button" data-scope="Local" aria-pressed="false">My district</button>
      </div>
      <input class="input search" type="search" placeholder="Search measures" aria-label="Search measures">
    </div>
    <div id="grid" class="card-grid">${skeleton(3)}</div>`;

  const measures = await listMeasures();
  const grid = root.querySelector('#grid');
  let scope = 'Statewide';
  let query = '';

  const paint = () => {
    const q = query.trim().toLowerCase();
    const list = measures
      .filter(m => scope === 'Statewide'
        ? m.scope === 'Statewide'
        : m.scope === 'Local' && m.district === state.me.district)
      .filter(m => !q || `${m.shortTitle} ${m.title}`.toLowerCase().includes(q));
    grid.innerHTML = list.length ? list.map(measureCard).join('') : empty('No measures match.');
  };

  root.querySelector('.segmented').addEventListener('click', e => {
    const btn = e.target.closest('[data-scope]');
    if (!btn) return;
    scope = btn.dataset.scope;
    root.querySelectorAll('[data-scope]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    paint();
  });
  root.querySelector('.search').addEventListener('input', e => {
    query = e.target.value;
    paint();
  });
  paint();
}

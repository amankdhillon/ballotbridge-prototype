// Presentational helpers that return HTML strings. Text passed in is escaped.
import { esc } from '../lib/dom.js';

export const card = ({ title = '', actions = '', body = '', tone = '' } = {}) => `
  <section class="card ${tone}">
    ${title || actions ? `<header class="card__head">${title ? `<h2>${esc(title)}</h2>` : ''}${actions}</header>` : ''}
    <div class="card__body">${body}</div>
  </section>`;

export const badge = (label, tone = 'neutral') => `<span class="badge badge--${tone}">${esc(label)}</span>`;
export const tag = label => `<span class="tag">${esc(label)}</span>`;

export const button = ({ label, variant = 'primary', attrs = '', type = 'button', disabled = false }) =>
  `<button type="${type}" class="btn btn--${variant}" ${attrs} ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;

export const field = ({ id, label, control, hint = '' }) => `
  <div class="field">
    <label for="${esc(id)}">${esc(label)}</label>
    ${control}
    ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
  </div>`;

export const select = ({ id, name = id, options, value }) => `
  <select id="${esc(id)}" name="${esc(name)}" class="input">
    ${options.map(o => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}
  </select>`;

export const empty = message => `<p class="empty">${esc(message)}</p>`;

export const skeleton = (count = 1) => Array.from({ length: count }, () => '<div class="skeleton"></div>').join('');

export function openModal(html) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<section class="card" role="dialog" aria-modal="true">${html}</section>`;
  modal.hidden = false;
  modal.querySelector('input, textarea, select')?.focus();
}

export function closeModal() {
  const modal = document.getElementById('modal');
  modal.hidden = true;
  modal.innerHTML = '';
}

// Close on backdrop click or any element with data-close.
document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal();
});

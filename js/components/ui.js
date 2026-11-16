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

export const skeleton = (count = 1) => Array.from({ length: count }, () => '<div class="skeleton" aria-hidden="true"></div>').join('');

// Dialog behavior: focus moves in, Tab stays inside, Escape closes, and focus returns to the trigger.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const modalEl = document.getElementById('modal');
let returnFocus = null;

// Keep the page behind the dialog out of the tab order and out of screen-reader browsing.
function setBackgroundInert(on) {
  ['.topbar', '#app'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.inert = on;
  });
}

export function openModal(html) {
  returnFocus = document.activeElement;
  modalEl.innerHTML = `<section class="card" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</section>`;
  const heading = modalEl.querySelector('h2');
  if (heading) heading.id = 'modal-title';
  modalEl.hidden = false;
  setBackgroundInert(true);
  modalEl.querySelector(FOCUSABLE)?.focus();
}

export function closeModal() {
  if (modalEl.hidden) return;
  modalEl.hidden = true;
  modalEl.innerHTML = '';
  setBackgroundInert(false);
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  returnFocus = null;
}

// Close on backdrop click or any element with data-close.
modalEl.addEventListener('click', e => {
  if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal();
});

// Keep Tab inside the dialog.
modalEl.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const items = [...modalEl.querySelectorAll(FOCUSABLE)];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// Escape closes the dialog from anywhere.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalEl.hidden) closeModal();
});

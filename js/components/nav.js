// Top navigation and the signed-in profile in the corner.
// Shows the review queue only to verified participants.
import { state } from '../state/store.js';
import { currentPath } from '../lib/nav.js';
import { esc } from '../lib/dom.js';
import { roleBadge } from './ui.js';

export function renderNav() {
  const nav = document.getElementById('nav');
  const corner = document.getElementById('me');
  const path = currentPath();
  const link = (href, label, active) =>
    `<a href="#${href}" ${active ? 'aria-current="page"' : ''}>${label}</a>`;

  nav.innerHTML = state.me?.state
    ? link('/directory', 'Directory', path.startsWith('/directory') || path.startsWith('/measure'))
      + (state.me.verified ? link('/review', 'Review queue', path.startsWith('/review')) : '')
    : '';

  corner.innerHTML = state.me?.state
    ? `<span class="sr-only">Signed in as</span>
       <span class="me__icon" aria-hidden="true">${esc(state.me.icon)}</span>
       <span class="me__name">${esc(state.me.nickname)}</span>
       ${roleBadge(state.me.verified)}`
    : '';
}

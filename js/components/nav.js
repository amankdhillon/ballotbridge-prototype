// Top navigation and the signed-in profile in the corner.
// The review queue appears only for verified participants.
import { state } from '../state/store.js';
import { currentPath } from '../lib/nav.js';
import { esc } from '../lib/dom.js';
import { roleBadge, initialOf } from './ui.js';

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
       <span class="avatar" aria-hidden="true">${esc(initialOf(state.me.nickname))}</span>
       <span class="me__name">${esc(state.me.nickname)}</span>
       ${roleBadge(state.me.verified)}`
    : '';
}

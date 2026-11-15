// Top navigation. Shows the review queue only to verified participants.
import { state } from '../state/store.js';
import { currentPath } from '../lib/nav.js';

export function renderNav() {
  const nav = document.getElementById('nav');
  const path = currentPath();
  const link = (href, label, active) =>
    `<a href="#${href}" ${active ? 'aria-current="page"' : ''}>${label}</a>`;
  nav.innerHTML = state.me?.state
    ? link('/directory', 'Directory', path.startsWith('/directory') || path.startsWith('/measure'))
      + (state.me.verified ? link('/review', 'Review queue', path.startsWith('/review')) : '')
    : '';
}

// Top navigation and the signed-in profile in the corner.
// Contributors get a menu button; viewers get a plain label. The review queue appears only for verified participants.
import { state } from '../state/store.js';
import { currentPath } from '../lib/nav.js';
import { esc } from '../lib/dom.js';
import { roleBadge, initialOf } from './ui.js';

let menuOpen = false;

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

  const me = state.me;
  if (!me?.state) {
    corner.innerHTML = '';
    return;
  }

  const identity = `
    <span class="avatar" aria-hidden="true">${esc(initialOf(me.nickname))}</span>
    <span class="me__name">${esc(me.nickname)}</span>
    ${roleBadge(me.verified)}`;

  if (!me.verified) {
    corner.innerHTML = `<span class="sr-only">Signed in as</span><span class="me__static">${identity}</span>`;
    return;
  }

  corner.innerHTML = `
    <div class="me__wrap">
      <button type="button" class="me__button" id="me-button" aria-expanded="${menuOpen}" aria-controls="me-menu">
        <span class="sr-only">Signed in as</span>${identity}<span class="sr-only">, open account menu</span>
      </button>
      <ul class="me__menu" id="me-menu" ${menuOpen ? '' : 'hidden'}>
        <li class="me__label">My contributions</li>
        <li><a href="#/review">Review queue</a></li>
      </ul>
    </div>`;
}

function syncMenu() {
  const button = document.getElementById('me-button');
  const menu = document.getElementById('me-menu');
  if (!button || !menu) return;
  button.setAttribute('aria-expanded', String(menuOpen));
  menu.hidden = !menuOpen;
}

// Listeners are attached once. The corner element itself persists across screens.
const corner = document.getElementById('me');

corner.addEventListener('click', e => {
  if (e.target.closest('#me-button')) {
    menuOpen = !menuOpen;
    syncMenu();
  } else if (e.target.closest('#me-menu a')) {
    menuOpen = false;
    syncMenu();
  }
});

// Clicking anywhere outside the menu closes it.
document.addEventListener('click', e => {
  if (menuOpen && !e.target.closest('.me__wrap')) {
    menuOpen = false;
    syncMenu();
  }
});

// Escape closes the menu and returns focus to its button.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menuOpen) {
    menuOpen = false;
    syncMenu();
    document.getElementById('me-button')?.focus();
  }
});

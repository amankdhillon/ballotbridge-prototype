// The top bar holds only the account menu. Everyone who is signed in opens it from their name.
// Contributors also see their contributions and the review queue.
import { state } from '../state/store.js';
import { esc } from '../lib/dom.js';
import { roleBadge, initialOf } from './ui.js';

let menuOpen = false;

// Menu items. Labels marked "note" are placeholders and aren't links yet.
function menuItems(me) {
  const items = [
    { href: '#/directory', label: 'Home' },
    { note: true, label: 'Question history (coming soon)' },
  ];
  if (me.verified) {
    items.push({ note: true, label: 'My contributions (coming soon)' });
    items.push({ href: '#/review', label: 'Review queue' });
  }
  return items;
}

export function renderNav() {
  // The header nav is not used: links live in the account menu.
  document.getElementById('nav').hidden = true;
  const corner = document.getElementById('me');
  const me = state.me;

  if (!me?.state) {
    corner.innerHTML = '';
    return;
  }

  const items = menuItems(me).map(item => item.note
    ? `<li class="me__note">${esc(item.label)}</li>`
    : `<li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`).join('');

  corner.innerHTML = `
    <div class="me__wrap">
      <button type="button" class="me__button" id="me-button" aria-expanded="${menuOpen}" aria-controls="me-menu">
        <span class="sr-only">Account, signed in as</span>
        <span class="avatar" aria-hidden="true">${esc(initialOf(me.nickname))}</span>
        <span class="me__name">${esc(me.nickname)}</span>
        ${roleBadge(me.verified)}
        <span class="sr-only">, open menu</span>
      </button>
      <ul class="me__menu" id="me-menu" ${menuOpen ? '' : 'hidden'}>${items}</ul>
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

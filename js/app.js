// Entry point. Connects, loads shared settings and the signed-in profile,
// then routes each hash change to a view and renders the top navigation.
import { state } from './state/store.js';
import { routes } from './routes.js';
import { ensureSession, loadMe } from './services/auth.js';
import { loadSettings } from './services/catalog.js';
import { renderNav } from './components/nav.js';
import { toast } from './components/toast.js';
import { card } from './components/ui.js';
import { currentPath, go } from './lib/nav.js';
import { esc } from './lib/dom.js';
import { friendly } from './lib/supabase.js';

const app = document.getElementById('app');
let stopLive = null;   // cleanup returned by the current view (for example, the live subscription)
let renderId = 0;      // guards against an older render finishing after a newer one started

function findRoute(path) {
  for (const route of routes) {
    const match = route.pattern.exec(path);
    if (match) return { route, params: match.slice(1) };
  }
  return { route: routes.find(r => r.name === 'directory'), params: [] };
}

// Returns true if the route may open for the current user. Otherwise it redirects.
function allowed(route) {
  if (route.need === 'none') return true;
  if (!state.me) { go('/welcome'); return false; }
  if (route.need === 'profile') return true;
  if (!state.me.state) { go('/setup'); return false; }
  if (route.need === 'verified' && !state.me.verified) {
    toast('Reviewing is for verified participants.', 'error');
    go('/directory');
    return false;
  }
  return true;
}

async function render() {
  const token = ++renderId;
  if (stopLive) { stopLive(); stopLive = null; }

  const { route, params } = findRoute(currentPath());
  renderNav();

  // A fresh container each time, so listeners from the previous view disappear with it.
  const container = document.createElement('div');
  container.className = 'view';
  app.replaceChildren(container);

  if (route.name !== 'debug' && state.bootError) {
    container.innerHTML = card({
      title: 'The page could not connect',
      body: `<p>${esc(friendly(state.bootError.message))}</p>
             <a class="btn btn--ghost" href="#/debug">Open the connection check</a>`,
    });
    return;
  }

  if (!allowed(route)) return;

  try {
    const stop = await route.view(params, container);
    if (token !== renderId) {
      if (typeof stop === 'function') stop();
      return;
    }
    if (typeof stop === 'function') stopLive = stop;
  } catch (e) {
    container.innerHTML = card({
      title: 'Something went wrong',
      body: `<p>${esc(friendly(e.message))}</p>
             <a class="btn btn--ghost" href="#/directory">Back to the directory</a>`,
    });
  }
}

async function boot() {
  window.addEventListener('hashchange', render);
  window.addEventListener('route:refresh', render);
  if (!location.hash) history.replaceState(null, '', '#/directory');

  try {
    await ensureSession();
    state.settings = await loadSettings();
    state.me = await loadMe();
  } catch (e) {
    state.bootError = e;
  }
  render();
}

boot();

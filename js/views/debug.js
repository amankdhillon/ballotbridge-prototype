// Connection check. Runs each step in order and stops at the first failure with a fix.
// Open it at #/debug on your site.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { sb, friendly } from '../lib/supabase.js';
import { ensureSession, loadMe } from '../services/auth.js';
import { loadSettings, listMeasures } from '../services/catalog.js';
import { esc } from '../lib/dom.js';
import { card } from '../components/ui.js';

const FIXES = [
  [/Invalid API key|apikey|JWT/i, 'The publishable key is wrong. Copy it again from Settings > API Keys and check for spaces.'],
  [/Failed to fetch|NetworkError|Cannot reach/i, 'The page cannot reach Supabase. Check that the project URL in js/config.js is exactly https://your-project.supabase.co with nothing after it.'],
  [/does not exist|schema cache|Could not find the table|permission denied/i, 'The database tables are missing or locked. Run supabase/schema.sql in the SQL Editor, then reload.'],
  [/anonymous/i, 'Anonymous sign-ins are off. Turn them on in Authentication > Sign In / Providers.'],
];

const STEPS = [
  {
    label: 'Project URL and key are set in js/config.js',
    run: async () => {
      if (!SUPABASE_URL.startsWith('https://') || SUPABASE_URL.includes('YOUR-')) throw new Error('The URL is still a placeholder.');
      if (!SUPABASE_KEY || SUPABASE_KEY.includes('YOUR-')) throw new Error('The key is still a placeholder.');
      return SUPABASE_URL;
    },
  },
  {
    label: 'Client library loads',
    run: async () => { sb(); return 'Loaded'; },
  },
  {
    label: 'Anonymous session starts',
    run: async () => { await ensureSession(); return 'Signed in anonymously'; },
  },
  {
    label: 'Settings readable (app_public)',
    run: async () => {
      const s = await loadSettings();
      return `Approvals required: ${s.reviewsRequired}`;
    },
  },
  {
    label: 'Measures readable',
    run: async () => {
      const list = await listMeasures();
      if (!list.length) throw new Error('No measures found. The seed rows in schema.sql did not run.');
      return `${list.length} measures found`;
    },
  },
  {
    label: 'Profile check',
    run: async () => {
      const me = await loadMe();
      return me ? `Profile found: ${me.nickname}` : 'No profile yet. That is normal before someone joins.';
    },
  },
];

export async function renderDebug(root) {
  const rows = [];
  let stopped = false;

  const paint = () => {
    root.innerHTML = card({
      title: 'Connection check',
      body: `
        <ul class="checks">
          ${rows.map(r => `
            <li class="check ${r.ok ? 'check--ok' : 'check--fail'}">
              <strong>${r.ok ? '✓' : '✗'} ${esc(r.label)}</strong>
              <span>${esc(r.detail)}</span>
              ${r.fix ? `<span>${esc(r.fix)}</span>` : ''}
            </li>`).join('')}
        </ul>
        <p class="note">${stopped ? 'Fix the first failing step, then reload. The check stops there because later steps depend on it.' : 'Checking…'}</p>`,
    });
  };

  paint();
  for (const step of STEPS) {
    try {
      const detail = await step.run();
      rows.push({ label: step.label, ok: true, detail: String(detail) });
    } catch (e) {
      const raw = e?.message ?? String(e);
      const fix = FIXES.find(([re]) => re.test(raw))?.[1] ?? friendly(raw);
      rows.push({ label: step.label, ok: false, detail: raw, fix });
      stopped = true;
      paint();
      return;
    }
    paint();
  }
  stopped = true;
  paint();
}

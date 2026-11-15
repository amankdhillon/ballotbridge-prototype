// Route table. Add a screen by adding one entry here.
// need: 'none' (anyone), 'profile' (joined), 'ready' (joined and set up), 'verified' (verified participant).
import { renderWelcome } from './views/welcome.js';
import { renderSetup } from './views/setup.js';
import { renderDirectory } from './views/directory.js';
import { renderMeasure } from './views/measure.js';
import { renderContribute } from './views/contribute.js';
import { renderQueue, renderReview } from './views/review.js';
import { renderDebug } from './views/debug.js';

export const routes = [
  { name: 'debug', pattern: /^\/debug$/, need: 'none', view: (_, root) => renderDebug(root) },
  { name: 'welcome', pattern: /^\/welcome$/, need: 'none', view: (_, root) => renderWelcome(root) },
  { name: 'setup', pattern: /^\/setup$/, need: 'profile', view: (_, root) => renderSetup(root) },
  { name: 'directory', pattern: /^\/directory$/, need: 'ready', view: (_, root) => renderDirectory(root) },
  { name: 'measure', pattern: /^\/measure\/([\w-]+)$/, need: 'ready', view: ([id], root) => renderMeasure(id, root) },
  { name: 'contribute', pattern: /^\/measure\/([\w-]+)\/contribute$/, need: 'ready', view: ([id], root) => renderContribute(id, root) },
  { name: 'review-queue', pattern: /^\/review$/, need: 'verified', view: (_, root) => renderQueue(root) },
  { name: 'review', pattern: /^\/review\/([\w-]+)$/, need: 'verified', view: ([id], root) => renderReview(id, root) },
];

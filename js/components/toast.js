// Short messages that appear at the bottom of the screen and fade away.
export function toast(message, tone = 'info') {
  const host = document.getElementById('toasts');
  const node = document.createElement('div');
  node.className = `toast${tone === 'error' ? ' toast--error' : ''}`;
  node.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  node.textContent = message;
  host.append(node);
  setTimeout(() => node.remove(), 3800);
}

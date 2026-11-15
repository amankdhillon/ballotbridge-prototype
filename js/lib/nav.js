// Route helpers. Routes are hash paths such as #/measure/prop-40.
export const currentPath = () => location.hash.replace(/^#/, '') || '/directory';

// Navigate to a path. If we're already there, ask the app to re-render.
export function go(path) {
  if (currentPath() === path) window.dispatchEvent(new Event('route:refresh'));
  else location.hash = path;
}

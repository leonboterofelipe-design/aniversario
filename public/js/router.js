// Máquina de estados de pantallas: lock → intro → quiz → final.
// Cada vista es una función ({ el, go, ctx }) que pinta dentro de `el`
// y puede devolver una función de limpieza.

import { h, prefersReducedMotion, wait } from './dom.js';

export function createRouter(outlet, views, ctx) {
  let current = null;
  let queue = Promise.resolve();

  async function render(name) {
    const view = views[name];
    if (!view) throw new Error(`Vista desconocida: ${name}`);

    if (current) {
      current.cleanup?.();
      current.el.classList.add('is-leaving');
      await wait(prefersReducedMotion() ? 0 : 220);
      current.el.remove();
    }

    const el = h('section', { class: 'screen', 'data-view': name });
    outlet.append(el);
    window.scrollTo(0, 0);
    current = { name, el, cleanup: null };
    current.cleanup = (await view({ el, go, ctx })) ?? null;

    el.querySelector('h1, h2')?.focus({ preventScroll: true });
  }

  /** Encola la navegación para que nunca se pisen dos transiciones. */
  function go(name) {
    queue = queue.then(() => render(name)).catch((err) => console.error(err));
    return queue;
  }

  return {
    go,
    get current() {
      return current?.name ?? null;
    },
  };
}

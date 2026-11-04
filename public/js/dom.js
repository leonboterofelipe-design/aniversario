// Helpers para crear nodos sin innerHTML.

const SVG_NS = 'http://www.w3.org/2000/svg';

function create(ns, tag, props, children) {
  const el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;

    if (key === 'class') {
      el.setAttribute('class', Array.isArray(value) ? value.filter(Boolean).join(' ') : value);
    } else if (key === 'style' && typeof value === 'object') {
      for (const [prop, val] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, String(val));
        else el.style[prop] = val;
      }
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'ref') {
      value(el);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }

  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of [children].flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Crea un elemento HTML: h('p', { class: 'x', onClick }, 'texto', otroNodo) */
export const h = (tag, props, ...children) => create(null, tag, props, children);

/** Igual que h() pero para SVG. */
export const s = (tag, props, ...children) => create(SVG_NS, tag, props, children);

/** Convierte "Texto con *énfasis*" en nodos, con <em> en la parte marcada. */
export function rich(text = '') {
  return String(text)
    .split(/\*(.+?)\*/g)
    .map((part, i) => (i % 2 ? h('em', null, part) : part))
    .filter((part) => part !== '');
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Reinicia una animación CSS quitando y volviendo a poner la clase. */
export function retrigger(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

export const pad = (n) => String(n).padStart(2, '0');

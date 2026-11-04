// Pantalla de bloqueo (cuenta regresiva → sello roto) e intro del protocolo.

import { h, pad, retrigger, rich } from './dom.js';
import { confetti, sound, vibrate } from './effects.js';
import { loadProgress, saveProgress } from './store.js';

const UNITS = ['Días', 'Horas', 'Min', 'Seg'];

export function lockView({ el, go, ctx }) {
  const { clock, config } = ctx;
  const copy = config.lock;

  const cells = UNITS.map((label) => {
    const value = h('span', { class: 'count__value' }, '00');
    return { value, el: h('div', { class: 'count__cell' }, value, h('span', { class: 'count__label' }, label)) };
  });

  const stampWord = h('span', { class: 'stamp__word' }, 'Sellado');
  const stamp = h('div', { class: 'stamp', 'aria-hidden': 'true' },
    stampWord,
    h('span', { class: 'stamp__meta' }, config.stampDate),
  );

  const eyebrow = h('p', { class: 'eyebrow reveal', style: { '--i': 0 } }, copy.eyebrow);
  const title = h('h1', { class: 'display reveal', style: { '--i': 1 }, tabindex: '-1' }, rich(copy.title));
  const lede = h('p', { class: 'lede reveal', style: { '--i': 2 } }, copy.lede);
  const countdown = h('div', {
    class: 'count reveal',
    style: { '--i': 3 },
    role: 'timer',
    'aria-label': `Cuenta regresiva hasta el ${config.stampDate.replaceAll(' · ', '/')}`,
  }, cells.map((c) => c.el));
  const note = h('p', { class: 'eyebrow lock__note reveal', style: { '--i': 4 } },
    clock.synced ? 'Hora verificada por el servidor' : 'Sin conexión · usando la hora del teléfono',
  );
  const cta = h('button', {
    class: 'btn btn--primary btn--block lock__cta',
    type: 'button',
    hidden: true,
    onClick: () => {
      sound('tap');
      go('intro');
    },
  }, copy.cta, h('span', { class: 'btn__arrow', 'aria-hidden': 'true' }, '→'));

  // Foto de apertura: solo aparece cuando se rompe el sello.
  const photo = copy.openImage && h('figure', { class: 'evidence-slot lock__photo', hidden: true },
    h('div', { class: 'evidence' },
      h('div', { class: 'evidence__photo' }, h('img', { src: copy.openImage, alt: 'Nosotros', decoding: 'async' })),
    ),
  );

  el.append(stamp, eyebrow, title, lede, countdown, photo, h('div', { class: 'spacer' }), note, cta);

  const shown = [];
  let timer = 0;

  function render() {
    const ms = clock.unlockAt - clock.now();
    if (ms <= 0) return open(true);

    const total = Math.floor(ms / 1000);
    const parts = [
      Math.floor(total / 86400),
      Math.floor((total % 86400) / 3600),
      Math.floor((total % 3600) / 60),
      total % 60,
    ];
    parts.forEach((n, i) => {
      const text = pad(n);
      if (shown[i] === text) return;
      shown[i] = text;
      cells[i].value.textContent = text;
      if (i === 3 || n !== 0) retrigger(cells[i].value, 'is-tick');
    });
  }

  function open(live) {
    clearInterval(timer);
    ctx.setStatus('Desclasificado', 'accent');

    stamp.classList.add('stamp--open');
    stampWord.textContent = 'Abierto';
    eyebrow.textContent = copy.openEyebrow;
    title.replaceChildren(...rich(copy.openTitle));
    lede.textContent = copy.openLede;
    note.textContent = `Sello roto · ${config.stampDate}`;
    cta.hidden = false;
    if (photo) photo.hidden = false;

    if (live) {
      cells.forEach((c) => (c.value.textContent = '00'));
      countdown.classList.add('is-done');
      retrigger(stamp, 'is-restamping');
      sound('open');
      vibrate([40, 60, 120]);
      const r = stamp.getBoundingClientRect();
      confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 70 });
    } else {
      countdown.remove();
    }
  }

  if (clock.now() >= clock.unlockAt) {
    open(false);
  } else {
    ctx.setStatus('Sellado', 'accent');
    render();
    timer = setInterval(render, 250);
  }

  return () => clearInterval(timer);
}

export function introView({ el, go, ctx }) {
  const { config } = ctx;
  const copy = config.intro;
  const total = config.questions.length;

  ctx.setStatus('Protocolo activo', 'accent');

  const row = (key, value) =>
    h('li', null, h('span', null, key), h('span', { class: 'ledger__dots', 'aria-hidden': 'true' }), h('strong', null, value));

  el.append(
    h('p', { class: 'eyebrow reveal', style: { '--i': 0 } }, copy.eyebrow),
    h('h1', { class: 'display reveal', style: { '--i': 1 }, tabindex: '-1' }, rich(copy.title)),
    h('p', { class: 'lede reveal', style: { '--i': 2 } }, copy.lede),
    h('ul', { class: 'ledger intro__ledger reveal', style: { '--i': 3 } },
      row('Preguntas', pad(total)),
      row('Intentos', 'Ilimitados'),
      row('Alarmas', 'Activadas'),
      row('Sonido', 'Recomendado'),
    ),
    h('div', { class: 'spacer' }),
    h('button', {
      class: 'btn btn--primary btn--block reveal',
      style: { '--i': 4 },
      type: 'button',
      onClick: () => {
        sound('tap');
        const progress = loadProgress();
        progress.started = true;
        saveProgress(progress);
        go('quiz');
      },
    }, copy.cta, h('span', { class: 'btn__arrow', 'aria-hidden': 'true' }, '→')),
  );
}

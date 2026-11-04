// Arranque: barra de sistema, reloj sincronizado con el servidor y primera pantalla.

import { getServerTime } from './api.js';
import { config } from './config.js';
import { h } from './dom.js';
import { initEffects, isMuted, setMuted, sound } from './effects.js';
import { introView, lockView } from './lock.js';
import { finalView, quizView } from './quiz.js';
import { createRouter } from './router.js';
import { loadProgress, resetProgress, saveProgress } from './store.js';

async function createClock() {
  try {
    const { offset, unlockAt } = await getServerTime();
    return { synced: true, unlockAt, now: () => Date.now() + offset };
  } catch {
    // Sin servidor (p. ej. abriendo el HTML suelto): se usa la hora del teléfono.
    // Igual, /api/check no responde antes de tiempo, así que el test sigue protegido.
    return { synced: false, unlockAt: Date.parse(config.unlockAt), now: () => Date.now() };
  }
}

function buildTopbar() {
  const statusText = h('span', null, 'Conectando');
  const status = h('span', { class: 'status', 'data-tone': 'muted' },
    h('span', { class: 'status__dot', 'aria-hidden': 'true' }),
    statusText,
  );

  const soundLabel = () => `Sonido ${isMuted() ? 'off' : 'on'}`;
  const soundButton = h('button', {
    class: 'sound-toggle',
    type: 'button',
    'aria-pressed': String(!isMuted()),
    onClick: () => {
      setMuted(!isMuted());
      soundButton.textContent = soundLabel();
      soundButton.setAttribute('aria-pressed', String(!isMuted()));
      sound('tap');
    },
  }, soundLabel());

  const topbar = h('header', { class: 'topbar' },
    h('span', null, config.caseCode),
    status,
    soundButton,
  );

  const setStatus = (text, tone = 'accent') => {
    statusText.textContent = text;
    status.dataset.tone = tone;
  };

  return { topbar, setStatus };
}

async function boot() {
  const app = document.getElementById('app');

  initEffects({
    overlayRoot: document.getElementById('overlay-root'),
    canvas: document.getElementById('confetti'),
    live: document.getElementById('sr-status'),
  });

  // ?reiniciar en la URL borra el progreso (útil para probar).
  const params = new URLSearchParams(location.search);
  if (params.has('reiniciar')) {
    resetProgress();
    history.replaceState(null, '', location.pathname);
  }

  const clock = await createClock();
  const { topbar, setStatus } = buildTopbar();
  const outlet = h('main', { class: 'outlet' });
  app.replaceChildren(topbar, outlet);

  const router = createRouter(
    outlet,
    { lock: lockView, intro: introView, quiz: quizView, final: finalView },
    { config, clock, setStatus },
  );

  const progress = loadProgress();
  const unlocked = clock.now() >= clock.unlockAt;
  const first = !unlocked || !progress.started ? 'lock' : progress.done ? 'final' : 'quiz';
  router.go(devShortcut(params) ?? first);
}

// Solo en desarrollo local: ?ver=lock | intro | quiz | final salta directo a esa pantalla.
function devShortcut(params) {
  const isLocal = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname);
  const view = params.get('ver');
  if (!isLocal || !['lock', 'intro', 'quiz', 'final'].includes(view)) return null;
  if (view === 'quiz') {
    const progress = loadProgress();
    progress.started = true;
    if (progress.done) Object.assign(progress, { index: 0, done: false, wrong: {} });
    saveProgress(progress);
  }
  return view;
}

boot();

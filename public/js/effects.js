// Sonido (Web Audio sintetizado, sin archivos), vibración, confeti, overlays y sacudida.

import { h, rich, s, prefersReducedMotion } from './dom.js';
import { store } from './store.js';

let overlayRoot = null;
let liveRegion = null;

export function initEffects({ overlayRoot: root, canvas, live }) {
  overlayRoot = root;
  liveRegion = live;
  initConfetti(canvas);
  ['pointerdown', 'touchend', 'keydown'].forEach((type) =>
    document.addEventListener(type, unlockAudio, { passive: true, capture: true }),
  );
}

/** Anuncia un texto a lectores de pantalla. */
export function announce(text) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  requestAnimationFrame(() => (liveRegion.textContent = text));
}

// ---------------------------------------------------------------------------
// Sonido
// ---------------------------------------------------------------------------

let audio = null;
let muted = store.get('muted', false);

export const isMuted = () => muted;

export function setMuted(value) {
  muted = value;
  store.set('muted', value);
}

function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audio) audio = new AC();
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  if (audio.state === 'running') {
    // iOS: un buffer silencioso deja el contexto desbloqueado para siempre.
    const src = audio.createBufferSource();
    src.buffer = audio.createBuffer(1, 1, 22050);
    src.connect(audio.destination);
    src.start(0);
    ['pointerdown', 'touchend', 'keydown'].forEach((type) =>
      document.removeEventListener(type, unlockAudio, { capture: true }),
    );
  }
}

function tone(freq, start, duration, { type = 'sine', gain = 0.15, slideTo, attack = 0.012 } = {}) {
  const t0 = audio.currentTime + start;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const filter = audio.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);

  filter.type = 'lowpass';
  filter.frequency.value = type === 'sawtooth' || type === 'square' ? 2400 : 8000;

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(filter).connect(amp).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const SOUNDS = {
  tap() {
    tone(720, 0, 0.07, { type: 'triangle', gain: 0.05 });
  },
  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, i * 0.085, 0.55, { type: 'triangle', gain: 0.13 }),
    );
    tone(2093, 0.36, 0.5, { gain: 0.04 });
  },
  alarm() {
    for (let i = 0; i < 3; i++) {
      tone(880, i * 0.34, 0.17, { type: 'sawtooth', gain: 0.06 });
      tone(622, i * 0.34 + 0.17, 0.17, { type: 'sawtooth', gain: 0.06 });
    }
    tone(110, 0, 0.9, { type: 'square', gain: 0.03 });
  },
  open() {
    tone(220, 0, 0.6, { type: 'triangle', gain: 0.08, slideTo: 440 });
    [392, 493.88, 587.33].forEach((f) => tone(f, 0.45, 1.1, { type: 'sine', gain: 0.07 }));
  },
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((f, i) => tone(f, i * 0.12, i === notes.length - 1 ? 1.2 : 0.3, { type: 'triangle', gain: 0.12 }));
    [261.63, 329.63, 392].forEach((f) => tone(f, 0.6, 1.4, { gain: 0.06 }));
  },
};

export function sound(name) {
  if (muted || !audio || audio.state !== 'running') return;
  try {
    SOUNDS[name]?.();
  } catch {
    /* el audio nunca debe romper la experiencia */
  }
}

// ---------------------------------------------------------------------------
// Vibración (Android; iOS la ignora silenciosamente)
// ---------------------------------------------------------------------------

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// Confeti en canvas
// ---------------------------------------------------------------------------

const COLORS = ['#FF6B5B', '#F3E7DA', '#F6C453', '#FF9A8C', '#C9B6A8'];
let canvas = null;
let ctx2d = null;
let particles = [];
let raf = 0;
let last = 0;
let dpr = 1;

function initConfetti(el) {
  canvas = el;
  ctx2d = canvas.getContext('2d');
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
}

function spawn({ x, y, angle, spread, power }) {
  const a = angle + (Math.random() - 0.5) * spread;
  const v = power * (0.45 + Math.random() * 0.75);
  particles.push({
    x,
    y,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    w: 6 + Math.random() * 6,
    h: 3 + Math.random() * 5,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    tilt: Math.random() * Math.PI * 2,
    vt: 0.05 + Math.random() * 0.08,
    color: COLORS[(Math.random() * COLORS.length) | 0],
    round: Math.random() < 0.25,
    life: 0,
    ttl: 150 + Math.random() * 90,
  });
}

function step(now) {
  const dt = Math.min(2, (now - (last || now)) / 16.67 || 1);
  last = now;

  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx2d.clearRect(0, 0, innerWidth, innerHeight);

  particles = particles.filter((p) => p.life < p.ttl && p.y < innerHeight + 40);

  for (const p of particles) {
    p.vx *= 0.985 ** dt;
    p.vy = p.vy * 0.985 ** dt + 0.26 * dt;
    p.x += (p.vx + Math.sin(p.tilt) * 0.6) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    p.tilt += p.vt * dt;
    p.life += dt;

    ctx2d.save();
    ctx2d.globalAlpha = Math.min(1, (p.ttl - p.life) / 30);
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rot);
    ctx2d.scale(1, Math.cos(p.tilt));
    ctx2d.fillStyle = p.color;
    if (p.round) {
      ctx2d.beginPath();
      ctx2d.arc(0, 0, p.h * 0.8, 0, Math.PI * 2);
      ctx2d.fill();
    } else {
      ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx2d.restore();
  }

  if (particles.length) {
    raf = requestAnimationFrame(step);
  } else {
    raf = 0;
    last = 0;
    ctx2d.clearRect(0, 0, innerWidth, innerHeight);
  }
}

function run() {
  if (!raf) raf = requestAnimationFrame(step);
}

/** Explosión desde un punto. */
export function confetti({
  x = innerWidth / 2,
  y = innerHeight / 3,
  count = 80,
  angle = -Math.PI / 2,
  spread = Math.PI * 0.9,
  power = 13,
} = {}) {
  if (!ctx2d) return;
  const n = prefersReducedMotion() ? Math.min(count, 16) : count;
  for (let i = 0; i < n; i++) spawn({ x, y, angle, spread, power });
  run();
}

/** Lluvia desde arriba durante `duration` ms. */
export function confettiRain(duration = 2600) {
  if (!ctx2d) return;
  if (prefersReducedMotion()) {
    confetti({ count: 24 });
    return;
  }
  const end = performance.now() + duration;
  const tick = () => {
    for (let i = 0; i < 4; i++) {
      spawn({ x: Math.random() * innerWidth, y: -16, angle: Math.PI / 2, spread: 0.8, power: 3 });
    }
    run();
    if (performance.now() < end) requestAnimationFrame(tick);
  };
  tick();
}

// ---------------------------------------------------------------------------
// Recuerdo de fondo (borroso para no soplar la respuesta)
// ---------------------------------------------------------------------------

export function setMemory(src) {
  const root = document.getElementById('memory-bg');
  if (!root) return;
  if (src && root.lastElementChild?.dataset.src === src) return;

  for (const layer of root.children) {
    layer.classList.remove('is-visible');
    setTimeout(() => layer.remove(), 900);
  }
  if (!src) return;

  const img = h('img', { class: 'memory', src, alt: '', decoding: 'async', 'data-src': src });
  const show = () => requestAnimationFrame(() => img.classList.add('is-visible'));
  img.addEventListener('load', show, { once: true });
  img.addEventListener('error', () => img.remove(), { once: true });
  root.append(img);
  if (img.complete && img.naturalWidth) show();
}

export function preload(src) {
  if (src) new Image().src = src;
}

// ---------------------------------------------------------------------------
// YouTube (reproductor oficial embebido)
// ---------------------------------------------------------------------------

let youtubeApi = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  youtubeApi ??= new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = reject;
    document.head.append(script);
  });
  return youtubeApi;
}

/** Monta el video en `target`. Devuelve { play, destroy } (o null si cae al iframe simple). */
export async function mountYouTube(target, videoId) {
  try {
    const YT = await loadYouTubeApi();
    return await new Promise((resolve) => {
      const player = new YT.Player(target, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => resolve({
            play: () => player.playVideo(),
            destroy: () => player.destroy(),
          }),
        },
      });
    });
  } catch {
    target.replaceWith(h('iframe', {
      src: `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`,
      loading: 'lazy',
      allow: 'autoplay; encrypted-media; picture-in-picture',
      allowfullscreen: true,
      title: 'Reproductor de YouTube',
    }));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Visor de fotos a pantalla completa (deslizar o flechas para pasar)
// ---------------------------------------------------------------------------

export function openLightbox(items, start = 0) {
  if (!items.length) return;
  let index = start;
  const previousFocus = document.activeElement;
  const app = document.getElementById('app');

  const img = h('img', { class: 'lightbox__img', alt: '', decoding: 'async' });
  const counter = h('span', { class: 'lightbox__counter' });
  const caption = h('p', { class: 'lightbox__caption' });

  const navButton = (dir, label, glyph) =>
    h('button', {
      class: 'lightbox__btn',
      type: 'button',
      'aria-label': label,
      onClick: () => show(index + dir),
    }, glyph);

  const closeButton = h('button', { class: 'lightbox__btn lightbox__close', type: 'button', onClick: () => close() }, 'Cerrar');
  const stage = h('figure', { class: 'lightbox__stage' }, img);

  const root = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Álbum de fotos' },
    h('div', { class: 'lightbox__bar' }, counter, closeButton),
    stage,
    h('div', { class: 'lightbox__foot' },
      navButton(-1, 'Foto anterior', '←'),
      caption,
      navButton(1, 'Foto siguiente', '→'),
    ),
  );

  function show(n) {
    index = (n + items.length) % items.length;
    const item = items[index];
    img.classList.remove('is-in');
    img.src = item.src;
    img.alt = item.caption;
    caption.textContent = item.caption;
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    const reveal = () => requestAnimationFrame(() => img.classList.add('is-in'));
    (img.decode ? img.decode() : Promise.resolve()).then(reveal, reveal);
    preload(items[(index + 1) % items.length].src);
    preload(items[(index - 1 + items.length) % items.length].src);
  }

  // Deslizar con el dedo
  let startX = null;
  stage.addEventListener('pointerdown', (e) => (startX = e.clientX));
  stage.addEventListener('pointerup', (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
  });

  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
  };

  function close() {
    document.removeEventListener('keydown', onKey);
    root.classList.remove('is-open');
    app?.removeAttribute('inert');
    setTimeout(() => {
      root.remove();
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    }, prefersReducedMotion() ? 0 : 240);
  }

  show(index);
  app?.setAttribute('inert', '');
  overlayRoot.append(root);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
  closeButton.focus({ preventScroll: true });
  document.addEventListener('keydown', onKey);
}

// ---------------------------------------------------------------------------
// Sacudida
// ---------------------------------------------------------------------------

export function shake() {
  document.documentElement.classList.remove('is-shaking');
  void document.documentElement.offsetWidth;
  document.documentElement.classList.add('is-shaking');
  setTimeout(() => document.documentElement.classList.remove('is-shaking'), 520);
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

const successIcon = () =>
  s('svg', { class: 'overlay__icon', viewBox: '0 0 56 56', 'aria-hidden': 'true' },
    s('circle', { class: 'check-ring', cx: 28, cy: 28, r: 25 }),
    s('path', { class: 'check-mark', d: 'M17 29 l7 7 l15 -16' }),
  );

const alarmIcon = () =>
  s('svg', { class: 'overlay__icon alarm-icon', viewBox: '0 0 56 56', 'aria-hidden': 'true' },
    s('path', { d: 'M28 6 L52 49 H4 Z' }),
    s('path', { class: 'alarm-icon__mark', d: 'M28 22 V34 M28 41 V41.5' }),
  );

let overlaySeq = 0;

/**
 * Muestra un overlay tipo hoja inferior y resuelve al cerrarse.
 * variant: 'success' | 'alarm' | 'info'
 */
export function showOverlay({ variant = 'info', eyebrow, title, subtitle, body, image, action = 'Continuar' }) {
  return new Promise((resolve) => {
    const id = `ov-${++overlaySeq}`;
    const previousFocus = document.activeElement;

    const button = h('button', {
      class: ['btn btn--block', variant === 'alarm' ? 'btn--ghost' : 'btn--primary'],
      type: 'button',
      disabled: true,
    }, action);

    const panel = h('div', {
      class: 'overlay__panel',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': `${id}-title`,
      'aria-describedby': body ? `${id}-body` : null,
      tabindex: '-1',
    },
      variant === 'success' && successIcon(),
      variant === 'alarm' && alarmIcon(),
      eyebrow && h('p', { class: 'eyebrow overlay__eyebrow' }, eyebrow),
      h('h2', { class: 'overlay__title title', id: `${id}-title` }, rich(title)),
      subtitle && h('p', { class: 'overlay__subtitle' }, subtitle),
      body && h('p', { class: 'overlay__body', id: `${id}-body` }, body),
      h('div', { class: 'overlay__actions' }, button),
    );

    const root = h('div', { class: ['overlay', `overlay--${variant}`, image && 'overlay--with-image'] },
      variant === 'alarm' && h('div', { class: 'hazard hazard--top', 'aria-hidden': 'true' }),
      variant === 'alarm' && h('div', { class: 'hazard hazard--bottom', 'aria-hidden': 'true' }),
      image && h('figure', { class: 'overlay__print' }, h('img', { src: image, alt: 'Recuerdo desclasificado', decoding: 'async' })),
      panel,
    );

    const app = document.getElementById('app');
    app?.setAttribute('inert', '');
    overlayRoot.append(root);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
    panel.focus({ preventScroll: true });

    // Evita que un doble toque cierre el overlay sin haberlo leído.
    setTimeout(() => {
      button.disabled = false;
      button.focus({ preventScroll: true });
    }, prefersReducedMotion() ? 150 : 550);

    const close = () => {
      if (button.disabled) return;
      button.disabled = true;
      document.removeEventListener('keydown', onKey);
      root.classList.remove('is-open');
      root.classList.add('is-closing');
      app?.removeAttribute('inert');
      setTimeout(() => {
        root.remove();
        if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
        resolve();
      }, prefersReducedMotion() ? 0 : 240);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };

    button.addEventListener('click', () => {
      sound('tap');
      close();
    });
    document.addEventListener('keydown', onKey);
  });
}

// Pantalla de bloqueo (cuenta regresiva → sello roto) e intro del protocolo.

import { h, pad, retrigger, rich } from './dom.js';
import { confetti, isMuted, mountYouTube, showOverlay, sound, vibrate } from './effects.js';
import { loadProgress, saveProgress } from './store.js';

const UNITS = ['Días', 'Horas', 'Min', 'Seg'];

/**
 * Música de espera. Usa el MP3 si existe (sin anuncios); si no, YouTube.
 * Intenta sonar sola al abrir la página. Si el navegador lo bloquea (en celulares
 * casi siempre), muestra una ventana "Identificarme": ese toque arranca la música.
 */
function waitingMusic(music) {
  let player = null; // { play, pause, destroy }
  let playing = false;
  let userPaused = false;
  let alive = true;

  const toggle = h('button', { class: 'music__toggle', type: 'button', 'aria-pressed': 'false' }, '▶');
  const slot = h('div', { class: 'music__video', hidden: true }, h('div'));
  const card = h('section', { class: 'music reveal', style: { '--i': 4 } },
    h('div', { class: 'music__row' },
      toggle,
      h('div', { class: 'music__meta' },
        h('p', { class: 'eyebrow' }, music.eyebrow),
        h('p', { class: 'music__title' }, h('em', null, music.title), ` · ${music.artist}`),
      ),
      h('span', { class: 'music__eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    ),
    slot,
    h('p', { class: 'music__hint' }, music.hint),
  );

  const setPlaying = (value) => {
    playing = value;
    card.classList.toggle('is-playing', value);
    toggle.textContent = value ? '❚❚' : '▶';
    toggle.setAttribute('aria-pressed', String(value));
    toggle.setAttribute('aria-label', value ? 'Pausar música' : 'Reproducir música');
  };
  setPlaying(false);

  const start = () => {
    if (!player || playing || userPaused || isMuted()) return Promise.resolve(false);
    return Promise.resolve(player.play()).then(
      () => {
        setPlaying(true);
        document.removeEventListener('pointerdown', firstTap, { capture: true });
        return true;
      },
      () => false,
    );
  };

  toggle.addEventListener('click', () => {
    if (!player) return;
    if (playing) {
      userPaused = true;
      player.pause();
      setPlaying(false);
    } else {
      userPaused = false;
      start();
    }
  });

  // Cualquier toque en la pantalla (menos el propio botón) arranca la música.
  const firstTap = (e) => {
    if (!toggle.contains(e.target)) start();
  };
  document.addEventListener('pointerdown', firstTap, { capture: true });

  async function useFile() {
    const res = await fetch(music.file, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
    if (!res?.ok) return false;
    const audio = new Audio(music.file);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.7;
    player = {
      play: () => audio.play(),
      pause: () => audio.pause(),
      destroy: () => {
        audio.pause();
        audio.src = '';
      },
    };
    return true;
  }

  async function useYouTube() {
    slot.hidden = false;
    const controller = await mountYouTube(slot.firstElementChild, music.youtubeId, { loop: true });
    if (!controller) return;
    player = {
      play: () => controller.play(),
      pause: () => controller.pause(),
      destroy: () => controller.destroy(),
    };
  }

  (async () => {
    if (!(music.file && (await useFile()))) await useYouTube();
    if (!alive) return player?.destroy();
    if (await start()) return; // El navegador sí la dejó sonar sola.
    if (!alive || isMuted() || playing) return;
    // Bloqueado: pedir un toque. El toque sobre la ventana dispara firstTap.
    await showOverlay({
      variant: 'gate',
      tapAnywhere: true,
      eyebrow: music.gateEyebrow,
      title: music.gateTitle,
      body: music.gateBody,
      action: music.gateAction,
    });
    if (alive) start();
  })();

  return {
    el: card,
    stop() {
      if (!alive) return;
      alive = false;
      document.removeEventListener('pointerdown', firstTap, { capture: true });
      player?.destroy();
      card.remove();
    },
  };
}

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

  // Música solo mientras está sellada.
  const music = copy.music && clock.now() < clock.unlockAt ? waitingMusic(copy.music) : null;

  // Imágenes programadas: se muestra la más reciente cuya hora ya llegó, mientras está sellada.
  const apparitions = (copy.apparitions ?? [])
    .map((item) => ({ ...item, at: Date.parse(item.from) }))
    .sort((a, b) => a.at - b.at);
  const ghost = apparitions.length ? h('figure', { class: 'ghost', hidden: true }) : null;
  let ghostShown = null;

  const updateGhost = () => {
    if (!ghost) return;
    const now = clock.now();
    const current = now < clock.unlockAt ? apparitions.filter((a) => now >= a.at).at(-1) : null;
    if (current === ghostShown) return;
    ghostShown = current;
    ghost.hidden = !current;
    if (!current) return ghost.replaceChildren();
    ghost.replaceChildren(
      h('img', { src: current.src, alt: current.alt, decoding: 'async' }),
      current.message && h('figcaption', { class: 'ghost__message' },
        current.eyebrow && h('span', { class: 'eyebrow' }, current.eyebrow),
        h('span', { class: 'ghost__text' }, rich(current.message)),
      ),
    );
    if (live) {
      sound('open');
      vibrate([30, 60, 30]);
    }
  };
  let live = false; // false en la primera pintada: no suena si ya estaba visible al abrir

  el.append(stamp, eyebrow, title, lede, countdown, music?.el, ghost, photo, h('div', { class: 'spacer' }), note, cta);

  const shown = [];
  let timer = 0;

  function render() {
    const ms = clock.unlockAt - clock.now();
    if (ms <= 0) return open(true);
    updateGhost();
    live = true;

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
    music?.stop();
    ghost?.remove();
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

  return () => {
    clearInterval(timer);
    music?.stop();
  };
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

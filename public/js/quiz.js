// Test de identidad ("preguntas de seguridad") y pantalla final.

import { checkAnswer } from './api.js';
import { h, pad, prefersReducedMotion, retrigger, rich, s, wait } from './dom.js';
import {
  announce, confetti, confettiRain, mountYouTube, openLightbox, preload, setMemory, shake, showOverlay, sound, vibrate,
} from './effects.js';
import { loadProgress, resetProgress, saveProgress } from './store.js';

const MIN_CHECK_MS = 900; // suspenso mínimo de "verificando…"

export function quizView({ el, go, ctx }) {
  const { config } = ctx;
  const questions = config.questions;
  const total = questions.length;
  const progress = loadProgress();

  if (progress.index >= total) {
    progress.done = true;
    saveProgress(progress);
    go('final');
    return;
  }

  ctx.setStatus('Verificando', 'accent');

  const segments = questions.map(() => h('span', { class: 'progress__seg' }));
  const progressBar = h('div', {
    class: 'progress',
    role: 'progressbar',
    'aria-label': 'Preguntas verificadas',
    'aria-valuemin': 0,
    'aria-valuemax': total,
  }, segments);
  const counter = h('span', { class: 'quiz__counter' });
  const intruders = h('span', { class: 'quiz__intruders' }, pad(progress.intruders));
  const stage = h('div', { class: 'quiz__stage' });

  el.append(
    h('div', { class: 'quiz__head reveal', style: { '--i': 0 } },
      h('div', { class: 'quiz__meta' }, h('span', { class: 'eyebrow' }, 'Pregunta de seguridad'), counter),
      progressBar,
    ),
    stage,
    h('p', { class: 'eyebrow quiz__foot reveal', style: { '--i': 5 } }, 'Intentos de intrusión: ', intruders),
  );

  let busy = false;
  let alive = true;

  function updateHead() {
    counter.textContent = `${pad(Math.min(progress.index + 1, total))} / ${pad(total)}`;
    progressBar.setAttribute('aria-valuenow', progress.index);
    segments.forEach((seg, i) => {
      seg.classList.toggle('is-done', i < progress.index);
      seg.classList.toggle('is-current', i === progress.index);
    });
  }

  function renderQuestion() {
    const q = questions[progress.index];
    const wrong = new Set(progress.wrong[q.id] ?? []);
    updateHead();
    setMemory(q.image ?? null);
    preload(questions[progress.index + 1]?.image);

    const options = q.options.map((option, i) => {
      const button = h('button', {
        class: ['option', wrong.has(option.id) && 'is-wrong'],
        type: 'button',
        disabled: wrong.has(option.id),
        onClick: () => pick(q, option, button),
      },
        h('span', { class: 'option__key', 'aria-hidden': 'true' }, String.fromCharCode(65 + i)),
        h('span', { class: 'option__label' }, option.label),
      );
      return button;
    });

    const block = h('div', { class: 'question' },
      q.image && evidence(q),
      h('h2', { class: 'question__prompt reveal', style: { '--i': 2 }, tabindex: '-1' }, rich(q.prompt)),
      q.hint && h('p', { class: 'question__hint reveal', style: { '--i': 3 } }, q.hint),
      h('div', { class: 'options reveal', style: { '--i': 4 }, role: 'group', 'aria-label': 'Opciones' }, options),
    );
    stage.replaceChildren(block);
    return block;
  }

  async function nextQuestion() {
    const old = stage.firstElementChild;
    if (old) {
      old.classList.add('is-leaving');
      await wait(prefersReducedMotion() ? 0 : 240);
    }
    if (!alive) return;
    window.scrollTo(0, 0);
    renderQuestion().querySelector('.question__prompt').focus({ preventScroll: true });
  }

  function setChecking(button, on) {
    stage.classList.toggle('is-checking', on);
    button.classList.toggle('is-checking', on);
    if (on) button.setAttribute('aria-busy', 'true');
    else button.removeAttribute('aria-busy');
  }

  async function pick(q, option, button) {
    if (busy) return;
    busy = true;
    sound('tap');
    setChecking(button, true);

    let result;
    try {
      [result] = await Promise.all([checkAnswer(q.id, option.id), wait(MIN_CHECK_MS)]);
    } catch (err) {
      if (!alive) return;
      setChecking(button, false);
      if (err.status === 423) {
        await showOverlay({
          eyebrow: 'Acceso denegado',
          title: 'Aún está *sellado*.',
          body: 'La central dice que todavía no es el día. Paciencia, que ya casi.',
          action: 'Volver',
        });
        go('lock');
        return;
      }
      await showOverlay({
        eyebrow: 'Error de conexión',
        title: 'Sin señal con la *central*.',
        body: 'No pude verificar tu respuesta. Revisa tu conexión e inténtalo otra vez.',
        action: 'Reintentar',
      });
      busy = false;
      return;
    }

    if (!alive) return;
    setChecking(button, false);

    if (result.correct) await onCorrect(q, button, result.note);
    else await onWrong(q, option, button);
  }

  async function onCorrect(q, button, note) {
    stage.querySelectorAll('.option').forEach((b) => (b.disabled = true));
    button.classList.add('is-correct');

    sound('success');
    vibrate([24, 40, 24]);
    const r = button.getBoundingClientRect();
    confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 60, power: 11 });

    progress.index += 1;
    const isLast = progress.index >= total;
    if (isLast) progress.done = true;
    saveProgress(progress);
    segments[progress.index - 1].classList.add('is-done');
    announce('Respuesta correcta. Identidad confirmada.');

    // El recuerdo se desclasifica en su sitio antes de abrir el "¡Aleluya!".
    const photo = stage.querySelector('.evidence');
    if (photo?.classList.contains('is-classified')) {
      photo.classList.remove('is-classified');
      await wait(prefersReducedMotion() ? 0 : 900);
    }

    await showOverlay({
      variant: 'success',
      eyebrow: `Verificación ${pad(progress.index)}/${pad(total)} · OK`,
      title: '¡Aleluya!',
      subtitle: 'Identidad confirmada.',
      body: note,
      image: q.image,
      action: isLast ? 'Ver el expediente' : 'Siguiente pregunta',
    });
    if (!alive) return;

    if (isLast) {
      go('final');
    } else {
      await nextQuestion();
      busy = false;
    }
  }

  async function onWrong(q, option, button) {
    button.classList.add('is-wrong');
    button.disabled = true;

    (progress.wrong[q.id] ??= []).push(option.id);
    progress.intruders += 1;
    saveProgress(progress);
    intruders.textContent = pad(progress.intruders);
    retrigger(intruders, 'is-bumped');

    ctx.setStatus('Intruso detectado', 'alarm');
    sound('alarm');
    vibrate([180, 80, 180, 80, 360]);
    shake();
    announce('Respuesta incorrecta. Alerta de intruso.');

    const lines = config.alarmLines;
    await showOverlay({
      variant: 'alarm',
      eyebrow: `Código ${String(Math.floor(Math.random() * 900) + 100)} · Acceso denegado`,
      title: 'Alerta intruso',
      body: lines[(progress.intruders - 1) % lines.length],
      action: 'Soy yo, lo juro',
    });
    if (!alive) return;
    ctx.setStatus('Verificando', 'accent');
    busy = false;
  }

  renderQuestion();
  return () => {
    alive = false;
    setMemory(null);
  };
}

/** Foto tipo evidencia impresa. Si está clasificada, se ve borrosa con sello. */
function evidence(q) {
  return h('figure', { class: 'evidence-slot reveal', style: { '--i': 1 } },
    h('div', { class: ['evidence', q.classified && 'is-classified'] },
      h('div', { class: 'evidence__photo' },
        h('img', { src: q.image, alt: q.classified ? 'Recuerdo clasificado' : 'Recuerdo', decoding: 'async' }),
      ),
      q.classified && h('span', { class: 'evidence__stamp', 'aria-hidden': 'true' }, 'Clasificado'),
    ),
  );
}

// ---------------------------------------------------------------------------
// Final
// ---------------------------------------------------------------------------

function drawnGift() {
  const spark = (x, y, size) =>
    s('path', {
      class: 'gift__spark',
      fill: '#F6C453',
      transform: `translate(${x} ${y}) scale(${size})`,
      d: 'M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z',
    });

  return s('svg', { class: 'gift', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'Un regalo para ti' },
    s('ellipse', { cx: 100, cy: 188, rx: 72, ry: 8, fill: 'rgba(0,0,0,.35)' }),
    s('rect', { x: 36, y: 96, width: 128, height: 88, rx: 8, fill: '#FF6B5B' }),
    s('rect', { x: 36, y: 96, width: 128, height: 12, fill: '#C84A3E', opacity: 0.55 }),
    s('rect', { x: 90, y: 96, width: 20, height: 88, fill: '#F3E7DA' }),
    s('g', { class: 'gift__lid' },
      s('rect', { x: 28, y: 72, width: 144, height: 28, rx: 8, fill: '#FF8476' }),
      s('rect', { x: 90, y: 72, width: 20, height: 28, fill: '#F3E7DA' }),
      s('path', {
        d: 'M100 72 C 80 42, 52 50, 64 66 C 72 76, 92 74, 100 72 Z',
        fill: 'none', stroke: '#F3E7DA', 'stroke-width': 7, 'stroke-linejoin': 'round',
      }),
      s('path', {
        d: 'M100 72 C 120 42, 148 50, 136 66 C 128 76, 108 74, 100 72 Z',
        fill: 'none', stroke: '#F3E7DA', 'stroke-width': 7, 'stroke-linejoin': 'round',
      }),
      s('circle', { cx: 100, cy: 72, r: 7, fill: '#F3E7DA' }),
    ),
    spark(30, 46, 1),
    spark(170, 36, 1.3),
    spark(178, 118, 0.8),
  );
}

const dayFormat = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Álbum agrupado por mes; cada foto abre el visor a pantalla completa. */
function albumSection(album) {
  const items = album.photos.map((photo) => {
    const date = photo.date ? new Date(`${photo.date}T00:00:00Z`) : null;
    return {
      date,
      thumb: `${album.base}${photo.file}-mini.jpg`,
      src: `${album.base}${photo.file}.jpg`,
      caption: photo.caption ?? (date ? dayFormat.format(date) : 'Un día cualquiera, contigo'),
      month: date ? monthFormat.format(date) : 'Sin fecha',
    };
  });

  const groups = [];
  items.forEach((item, i) => {
    if (groups.at(-1)?.month !== item.month) groups.push({ month: item.month, entries: [] });
    groups.at(-1).entries.push({ item, i });
  });

  return h('section', { class: 'album reveal', style: { '--i': 7 } },
    h('div', { class: 'album__head' },
      h('p', { class: 'eyebrow' }, `${album.eyebrow} · ${pad(items.length)} momentos`),
      h('p', { class: 'album__hint' }, album.hint),
    ),
    groups.map((group) =>
      h('div', { class: 'album__month' },
        h('h3', { class: 'album__label' }, group.month, h('span', null, pad(group.entries.length))),
        h('div', { class: 'album__grid' },
          group.entries.map(({ item, i }) =>
            h('button', {
              class: 'album__item',
              type: 'button',
              'aria-label': `Ver foto: ${item.caption}`,
              onClick: () => {
                sound('tap');
                openLightbox(items, i);
              },
            }, h('img', { src: item.thumb, alt: '', loading: 'lazy', decoding: 'async' })),
          ),
        ),
      ),
    ),
  );
}

export function finalView({ el, go, ctx }) {
  const { config } = ctx;
  const copy = config.final;
  const progress = loadProgress();
  const total = config.questions.length;

  ctx.setStatus('Acceso concedido', 'gold');

  const giftButton = h('button', {
    class: 'gift-btn reveal',
    style: { '--i': 3 },
    type: 'button',
    'aria-label': `${copy.giftAlt}. ${copy.giftHint}`,
    onClick: () => {
      retrigger(giftButton, 'is-wiggling');
      player?.play?.();
      sound('success');
      vibrate(30);
      const r = giftButton.getBoundingClientRect();
      confetti({ x: r.left + r.width / 2, y: r.top + r.height / 3, count: 90 });
    },
  });

  // Si no existe regalo.gif, se reemplaza por el regalo dibujado.
  const img = h('img', { src: copy.gif, alt: '', width: 240, height: 240, decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(drawnGift()), { once: true });
  giftButton.append(img);

  // Canción: reproductor de YouTube. Se intenta arrancar sola; si el navegador
  // lo bloquea, ella le da play (o toca el regalo).
  let player = null;
  let alive = true;
  const playerSlot = h('div');
  const songCard = copy.song && h('section', { class: 'song reveal', style: { '--i': 4 } },
    h('div', { class: 'song__head' },
      h('p', { class: 'eyebrow' }, copy.song.eyebrow),
      h('p', { class: 'song__title' }, h('em', null, copy.song.title), ` · ${copy.song.artist}`),
    ),
    h('div', { class: 'song__player' }, playerSlot),
    h('p', { class: 'song__hint' }, copy.song.hint),
  );
  if (copy.song) {
    mountYouTube(playerSlot, copy.song.youtubeId).then((controller) => {
      if (!alive) return controller?.destroy?.();
      player = controller;
      setTimeout(() => alive && player?.play?.(), 1600);
    });
  }

  const row = (key, value, gold) =>
    h('li', null,
      h('span', null, key),
      h('span', { class: 'ledger__dots', 'aria-hidden': 'true' }),
      h('strong', { class: gold && 'is-gold' }, value),
    );

  const [lead, ...rest] = copy.letter;

  el.append(
    h('div', { class: 'stamp stamp--verified', 'aria-hidden': 'true' },
      h('span', { class: 'stamp__word' }, 'Verificada'),
      h('span', { class: 'stamp__meta' }, config.stampDate),
    ),
    h('p', { class: 'eyebrow final__eyebrow reveal', style: { '--i': 0 } }, copy.eyebrow),
    h('h1', { class: 'display reveal', style: { '--i': 1 }, tabindex: '-1' }, rich(copy.title)),
    giftButton,
    h('p', { class: 'eyebrow gift-hint reveal', style: { '--i': 4 }, 'aria-hidden': 'true' }, copy.giftHint),
    copy.song && songCard,
    h('article', { class: 'letter reveal', style: { '--i': 5 } },
      h('p', { class: 'eyebrow' }, copy.letterEyebrow),
      lead && h('p', { class: 'letter__lead' }, lead),
      rest.map((text) => h('p', null, text)),
      h('dl', { class: 'letter__sign' },
        h('div', null, h('dt', null, 'De'), h('dd', null, copy.from)),
        h('div', null, h('dt', null, 'Para'), h('dd', null, copy.to)),
      ),
    ),
    copy.gallery?.length > 0 && h('section', { class: 'wall reveal', style: { '--i': 6 } },
      h('p', { class: 'eyebrow wall__eyebrow' }, copy.galleryEyebrow),
      h('div', { class: 'wall__grid' },
        copy.gallery.map((item) =>
          h('figure', { class: ['wall__item', item.wide && 'is-wide'] },
            h('div', { class: 'evidence' },
              h('div', { class: 'evidence__photo' }, h('img', { src: item.src, alt: item.caption, loading: 'lazy', decoding: 'async' })),
              h('figcaption', { class: 'evidence__caption' }, item.caption),
            ),
          ),
        ),
      ),
    ),
    copy.album?.photos?.length > 0 && albumSection(copy.album),
    h('ul', { class: 'ledger final__ledger reveal', style: { '--i': 7 } },
      row('Preguntas superadas', `${pad(total)}/${pad(total)}`),
      row('Alertas de intruso', pad(progress.intruders)),
      row('Estado', copy.statusLabel, true),
    ),
    h('button', {
      class: 'btn btn--ghost btn--block final__reset reveal',
      style: { '--i': 8 },
      type: 'button',
      onClick: () => {
        resetProgress();
        go('intro');
      },
    }, copy.resetLabel),
  );

  const timers = [
    setTimeout(() => {
      sound('fanfare');
      vibrate([30, 50, 30, 50, 90]);
      confettiRain(2800);
    }, 350),
  ];

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    player?.destroy?.();
  };
}

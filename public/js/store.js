// localStorage tolerante a fallos (modo privado, cuota llena, etc.).

const PREFIX = 'capsula:v1:';

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* sin almacenamiento: la sesión sigue funcionando en memoria */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* noop */
    }
  },
};

const DEFAULT_PROGRESS = {
  started: false,
  index: 0,
  intruders: 0,
  wrong: {},
  done: false,
};

export function loadProgress() {
  const saved = store.get('progress');
  const safe = saved && typeof saved === 'object' ? saved : {};
  return {
    ...DEFAULT_PROGRESS,
    ...safe,
    wrong: { ...(safe.wrong && typeof safe.wrong === 'object' ? safe.wrong : {}) },
  };
}

export const saveProgress = (progress) => store.set('progress', progress);
export const resetProgress = () => store.remove('progress');

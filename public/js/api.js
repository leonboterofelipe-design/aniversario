// Comunicación con las funciones serverless de /api.

async function request(path, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(path, {
      cache: 'no-store',
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Devuelve el desfase entre el reloj del servidor y el del teléfono, y la hora de apertura. */
export async function getServerTime() {
  const sentAt = Date.now();
  const data = await request('/api/time');
  const receivedAt = Date.now();
  const serverNow = data.now + (receivedAt - sentAt) / 2;
  return {
    offset: serverNow - receivedAt,
    unlockAt: data.unlockAt,
  };
}

/** { correct: boolean, note?: string } */
export const checkAnswer = (questionId, optionId) =>
  request('/api/check', {
    method: 'POST',
    body: JSON.stringify({ questionId, optionId }),
  });

import { send, unlockTime } from './_lib.js';

// Hora del servidor: así cambiar la hora del celular no abre la cápsula antes de tiempo.
export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'Método no permitido' });
  }
  const now = Date.now();
  const unlockAt = unlockTime();
  send(res, 200, { now, unlockAt, unlocked: now >= unlockAt });
}

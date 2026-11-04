import { ANSWERS } from './_answers.js';
import { readJson, send, unlockTime } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Método no permitido' });
  }
  if (Date.now() < unlockTime()) {
    return send(res, 423, { error: 'Expediente sellado' });
  }

  const body = await readJson(req);
  const questionId = body?.questionId;
  const optionId = body?.optionId;
  if (typeof questionId !== 'string' || typeof optionId !== 'string') {
    return send(res, 400, { error: 'Solicitud inválida' });
  }
  if (!Object.hasOwn(ANSWERS, questionId)) {
    return send(res, 404, { error: 'Pregunta desconocida' });
  }

  const entry = ANSWERS[questionId];
  if (optionId === entry.answer) {
    return send(res, 200, { correct: true, note: entry.note ?? null });
  }
  send(res, 200, { correct: false });
}

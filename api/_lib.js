// Utilidades compartidas por las funciones serverless.
// Los archivos que empiezan con "_" no se publican como endpoints en Vercel.

const DEFAULT_UNLOCK = '2026-11-08T00:00:00-05:00'; // 8 nov 2026, medianoche hora Colombia

/** Momento de apertura en ms. Se puede sobrescribir con la variable de entorno UNLOCK_AT. */
export function unlockTime() {
  const t = Date.parse(process.env.UNLOCK_AT || DEFAULT_UNLOCK);
  return Number.isNaN(t) ? Date.parse(DEFAULT_UNLOCK) : t;
}

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

/** Lee el cuerpo JSON tanto en Vercel (req.body ya parseado) como en Node puro. */
export async function readJson(req) {
  try {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return JSON.parse(req.body);
  } catch {
    return null;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 10_000) return null;
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return null;
  }
}

const { neon } = require('@neondatabase/serverless');
let initialized;
const meals = new Set(['breakfast', 'lunch', 'snack', 'dinner']);
const letters = new Set(['A', 'B', 'C', 'D']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validText = text => typeof text === 'string' && text.trim().length > 0 && text.length <= 240;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const method = req.method;
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({error: 'Método não permitido.'});
  }
  if (method !== 'GET' && req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) {
        return res.status(403).json({error: 'Origem não permitida.'});
      }
    } catch { return res.status(403).json({error: 'Origem inválida.'}); }
  }
  const connection = process.env.DATABASE_URL;
  if (!connection) return res.status(503).json({error: 'O armazenamento compartilhado ainda não está configurado.'});
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({error: 'Dados inválidos.'}); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({error: 'Dados inválidos.'});
  if (method === 'POST' && (!Array.isArray(body.items) || !body.items.length || body.items.length > 500 || body.items.some(item =>
    !item || !uuid.test(item.id) || !meals.has(item.meal) || !letters.has(item.letter) || !validText(item.text)
  ))) return res.status(400).json({error: 'Tópicos inválidos.'});
  if (['PATCH', 'DELETE'].includes(method) && (!uuid.test(body.id) || !validText(body.expectedText) || (method === 'PATCH' && !validText(body.text)))) {
    return res.status(400).json({error: 'Tópico inválido.'});
  }
  try {
    const sql = neon(connection);
    if (!initialized) initialized = sql`CREATE TABLE IF NOT EXISTS filipe_notes (
      id uuid PRIMARY KEY,
      meal text NOT NULL CHECK (meal IN ('breakfast','lunch','snack','dinner')),
      letter text NOT NULL CHECK (letter IN ('A','B','C','D')),
      text text NOT NULL CHECK (length(text) BETWEEN 1 AND 240),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      deleted boolean NOT NULL DEFAULT false
    )`.catch(error => { initialized = undefined; throw error; });
    await initialized;
    if (method === 'GET') {
      const notes = await sql`SELECT id, meal, letter, text FROM filipe_notes WHERE deleted = false ORDER BY created_at, id`;
      return res.status(200).json({notes});
    }
    if (method === 'POST') {
      await sql.transaction(body.items.map(item => sql`INSERT INTO filipe_notes (id, meal, letter, text)
        VALUES (${item.id}, ${item.meal}, ${item.letter}, ${item.text.trim()}) ON CONFLICT (id) DO NOTHING`));
      return res.status(200).json({ok: true});
    }
    const changed = method === 'PATCH'
      ? await sql`UPDATE filipe_notes SET text = ${body.text.trim()}, updated_at = clock_timestamp()
          WHERE id = ${body.id} AND text = ${body.expectedText} AND deleted = false RETURNING id`
      : await sql`UPDATE filipe_notes SET deleted = true, updated_at = clock_timestamp()
          WHERE id = ${body.id} AND text = ${body.expectedText} AND deleted = false RETURNING id`;
    if (!changed.length) return res.status(409).json({error: 'Outra pessoa alterou este tópico. Atualize e tente novamente.'});
    return res.status(200).json({ok: true});
  } catch {
    return res.status(503).json({error: 'Não foi possível acessar as anotações. Tente novamente.'});
  }
};

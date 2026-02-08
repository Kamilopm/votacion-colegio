export default async function handler(req, res) {
  const url = req.url || '';
  const path = url.replace(/^\/api\/?/, '');

  // ===== HEALTH CHECK =====
  if (path === 'health' || path === '') {
    return res.status(200).json({ ok: true });
  }

  return res.status(404).json({ error: 'Not found', path });
}

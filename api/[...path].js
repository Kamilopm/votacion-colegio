import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-code');
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.replace('/api/', '').split('/').filter(Boolean);
  const endpoint = parts[0];
  const sub = parts[1];

  try {
    switch (endpoint) {
      case 'check-status': return checkStatus(req, res);
      case 'verify-code': return verifyCode(req, res);
      case 'cast-vote': return castVote(req, res);
      case 'get-candidates': return getCandidates(req, res);
      case 'admin': return handleAdmin(req, res, sub);
      case 'stats': return getStats(req, res);
      case 'monitor': return getMonitor(req, res);
      default: return res.status(404).json({ error: 'Endpoint no encontrado' });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/* ─────────── PUBLIC ─────────── */

async function checkStatus(req, res) {
  const { data } = await supabase.from('config').select('*').eq('id', 1).single();
  res.json({ open: data.election_status === 'open', ...data });
}

async function verifyCode(req, res) {
  const { access_code } = req.body;
  const { data } = await supabase.from('students').select('*').eq('access_code', access_code).single();
  if (!data) return res.status(404).json({ error: 'Código inválido' });
  if (data.has_voted) return res.status(403).json({ error: 'Ya votó' });
  res.json({ valid: true, student: data });
}

async function castVote(req, res) {
  const { access_code, candidate_id } = req.body;
  const { data } = await supabase.rpc('cast_vote', {
    p_access_code: access_code,
    p_candidate_id: candidate_id
  });
  if (!data.success) return res.status(400).json({ error: data.error });
  res.json(data);
}

async function getCandidates(req, res) {
  const { data } = await supabase.from('candidates').select('*').order('name');
  res.json({ candidates: data });
}

/* ─────────── ADMIN ─────────── */

async function handleAdmin(req, res, action) {
  const adminCode = req.headers['x-admin-code'] || req.body?.admin_code;
  const { data: config } = await supabase.from('config').select('admin_code').eq('id', 1).single();
  if (adminCode !== config.admin_code) return res.status(401).json({ error: 'Código incorrecto' });

  switch (action) {
    case 'login': return res.json({ success: true });
    case 'students': return adminStudents(req, res);
    case 'candidates': return adminCandidates(req, res);
    case 'import': return importStudents(req, res);
    case 'clear-students': return clearStudents(req, res);
    case 'reset-election': return resetElection(req, res);
    case 'election': return toggleElection(req, res);
    default: return res.status(404).json({ error: 'Acción admin inválida' });
  }
}

async function adminStudents(req, res) {
  const { data } = await supabase.from('students').select('*').order('grade').order('course');
  res.json({ students: data });
}

async function adminCandidates(req, res) {
  const { data } = await supabase.from('candidates').select('*');
  res.json({ candidates: data });
}

async function clearStudents(req, res) {
  await supabase.from('students').delete().neq('id', '0');
  res.json({ success: true });
}

async function resetElection(req, res) {
  await supabase.from('votes').delete().neq('id', '0');
  await supabase.from('students').update({ has_voted: false });
  await supabase.from('candidates').update({ votes: 0 });
  await supabase.from('config').update({ election_status: 'closed' }).eq('id', 1);
  res.json({ success: true });
}

async function toggleElection(req, res) {
  const { action } = req.body;
  await supabase.from('config')
    .update({ election_status: action === 'open' ? 'open' : 'closed' })
    .eq('id', 1);
  res.json({ success: true });
}

async function importStudents(req, res) {
  const { students } = req.body;
  await supabase.from('students').insert(students);
  res.json({ success: true });
}

async function getStats(req, res) {
  const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
  res.json({ totalStudents: count });
}

async function getMonitor(req, res) {
  const { data } = await supabase.from('students').select('*');
  res.json({ students: data });
}

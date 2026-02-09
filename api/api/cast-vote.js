import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { accessCode, candidateId } = req.body;

    if (!accessCode || !candidateId) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const { data, error } = await supabase.rpc('cast_vote', {
      p_access_code: accessCode,
      p_candidate_id: candidateId
    });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al procesar voto' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

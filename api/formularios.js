// pages/api/formularios.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --------------------------------------------------
// AUTH
// --------------------------------------------------
async function requireUser(request) {
  const token = request.headers.authorization?.split('Bearer ')?.[1];
  if (!token) {
    const err = new Error('Não autorizado');
    err.status = 401;
    throw err;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    const err = new Error('Token inválido');
    err.status = 403;
    throw err;
  }

  return user;
}

// --------------------------------------------------
// HANDLER
// --------------------------------------------------
export default async function handler(request, response) {
  try {
    await requireUser(request);
  } catch (err) {
    return response.status(err.status || 401).json({ error: err.message });
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', ['GET']);
    return response.status(405).end();
  }

  try {
    const { type } = request.query;

    if (!type) {
      return response.status(400).json({ error: 'Tipo de formulário é obrigatório' });
    }

    let table;

    switch (type) {
      case 'cotacoes':
        table = 'cotacoes';
        break;
      case 'candidaturas':
        table = 'candidaturas';
        break;
      case 'agregados':
        table = 'agregados';
        break;
      default:
        return response.status(400).json({ error: 'Tipo inválido' });
    }

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return response.status(200).json(data || []);

  } catch (error) {
    console.error('Erro GET /formularios:', error);
    return response.status(500).json({ error: error.message });
  }
}

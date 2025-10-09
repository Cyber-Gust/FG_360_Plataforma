// pages/api/custos.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function requireUser(request) {
  const token = request.headers.authorization?.split('Bearer ')?.[1];
  if (!token) {
    const err = new Error('Não autorizado: Nenhum token fornecido.');
    err.status = 401;
    throw err;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    const err = new Error('Não autorizado: Token inválido ou expirado.');
    err.status = 403;
    throw err;
  }
  return user;
}

export default async function handler(request, response) {
  try {
    await requireUser(request);
  } catch (err) {
    return response.status(err.status || 401).json({ error: err.message });
  }

  // --- GET (Listar todos os custos ou um específico) ---
  if (request.method === 'GET') {
    try {
      const { id } = request.query;
      let query = supabase.from('custos')
        .select(`
          *,
          motoristas ( nome_completo, cpf )
        `)
        .order('data_custo', { ascending: false });

      if (id) {
        const { data, error } = await query.eq('id', id).single();
        if (error) throw error;
        return response.status(200).json(data);
      } else {
        const { data, error } = await query;
        if (error) throw error;
        return response.status(200).json(data || []);
      }
    } catch (error) {
      return response.status(500).json({ error: 'Erro ao buscar custos: ' + error.message });
    }
  }

  // --- POST (Criar um novo custo) ---
  if (request.method === 'POST') {
    try {
      const { error } = await supabase.from('custos').insert([request.body]);
      if (error) throw error;
      return response.status(201).json({ message: 'Custo criado com sucesso!' });
    } catch (error) {
      return response.status(500).json({ error: 'Erro ao criar custo: ' + error.message });
    }
  }

  // --- PUT (Atualizar um custo existente) ---
  if (request.method === 'PUT') {
    try {
      const { id, ...custoData } = request.body;
      if (!id) return response.status(400).json({ error: 'ID do custo é obrigatório.' });

      const { error } = await supabase.from('custos').update(custoData).match({ id });
      if (error) throw error;
      return response.status(200).json({ message: 'Custo atualizado com sucesso!' });
    } catch (error) {
      return response.status(500).json({ error: 'Erro ao atualizar custo: ' + error.message });
    }
  }

  // --- DELETE (Excluir um custo e seus anexos) ---
  if (request.method === 'DELETE') {
    try {
      const { id } = request.query;
      if (!id) return response.status(400).json({ error: 'ID do custo é obrigatório.' });

      // 1. Buscar o custo para pegar as URLs dos anexos
      const { data: custo, error: fetchError } = await supabase.from('custos').select('anexo1_url, anexo2_url').eq('id', id).single();
      if (fetchError) throw fetchError;

      // 2. Montar a lista de arquivos para deletar do Storage
      const filesToDelete = [];
      if (custo.anexo1_url) {
        const filePath = new URL(custo.anexo1_url).pathname.split('/comprovantes_custos/')[1];
        filesToDelete.push(filePath);
      }
      if (custo.anexo2_url) {
        const filePath = new URL(custo.anexo2_url).pathname.split('/comprovantes_custos/')[1];
        filesToDelete.push(filePath);
      }

      // 3. Deletar os arquivos do Storage, se existirem
      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage.from('comprovantes_custos').remove(filesToDelete);
        if (storageError) {
          console.error("Aviso: Falha ao deletar anexo do storage, mas o registro do DB será excluído:", storageError.message);
        }
      }

      // 4. Deletar o registro do custo no banco de dados
      const { error: dbError } = await supabase.from('custos').delete().match({ id });
      if (dbError) throw dbError;

      return response.status(200).json({ message: 'Custo e anexos excluídos com sucesso!' });
    } catch (error) {
      return response.status(500).json({ error: 'Erro ao excluir custo: ' + error.message });
    }
  }

  response.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return response.status(405).end(`Método ${request.method} não permitido.`);
}
// pages/api/custos.js

import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --------------------------------------------------
// AUTH
// --------------------------------------------------
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

// --------------------------------------------------
// HANDLER
// --------------------------------------------------
export default async function handler(request, response) {
  try {
    await requireUser(request);
  } catch (err) {
    return response.status(err.status || 401).json({ error: err.message });
  }

  // --------------------------------------------------
  // GET
  // --------------------------------------------------
  if (request.method === 'GET') {
    try {
      const { id } = request.query;

      if (id) {
        const { data, error } = await supabase
          .from('custos')
          .select(`*, motoristas!motorista_id ( nome_completo )`)
          .eq('id', id)
          .single();

        if (error) throw error;
        return response.status(200).json(data);
      }

      const { data, error } = await supabase
        .from('custos')
        .select(`*, motoristas!motorista_id ( nome_completo )`)
        .order('data_custo', { ascending: false });

      if (error) throw error;
      return response.status(200).json(data || []);
    } catch (error) {
      console.error('Erro GET /custos:', error);
      return response.status(500).json({ error: error.message });
    }
  }

  // --------------------------------------------------
  // POST / PUT  (com upload)
  // --------------------------------------------------
  if (request.method === 'POST' || request.method === 'PUT') {
    try {
      const form = formidable();
      const [fields, files] = await form.parse(request);

      const isEdit = request.method === 'PUT';
      const id = fields.id?.[0];

      if (isEdit && !id) {
        return response.status(400).json({ error: 'ID do custo é obrigatório.' });
      }

      // ---------- UPLOAD ----------
      const uploadFile = async (fieldName) => {
        const f = files[fieldName]?.[0];
        if (!f) return null;

        const motoristaId = fields.motorista_id?.[0];
        if (!motoristaId) {
          throw new Error('motorista_id é obrigatório para upload');
        }

        const buffer = fs.readFileSync(f.filepath);
        const fileName = `${motoristaId}/${Date.now()}-${f.originalFilename}`;

        const { error } = await supabase.storage
          .from('comprovantes_custos')
          .upload(fileName, buffer, {
            contentType: f.mimetype,
            upsert: true,
          });

        if (error) throw error;

        const { data } = supabase.storage
          .from('comprovantes_custos')
          .getPublicUrl(fileName);

        return data.publicUrl;
      };

      const anexo1Url = await uploadFile('anexo1');
      const anexo2Url = await uploadFile('anexo2');

      // ---------- PAYLOAD ----------
      const payload = {
        motorista_id: fields.motorista_id?.[0],
        data_custo: fields.data_custo?.[0],
        chave_pix: fields.chave_pix?.[0] || null,
        valor_adiantamento: fields.valor_adiantamento?.[0]
          ? Number(fields.valor_adiantamento[0])
          : null,
        valor_saldo: fields.valor_saldo?.[0]
          ? Number(fields.valor_saldo[0])
          : null,
      };

      if (anexo1Url) payload.anexo1_url = anexo1Url;
      if (anexo2Url) payload.anexo2_url = anexo2Url;

      if (isEdit) {
        const { error } = await supabase
          .from('custos')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
        return response.status(200).json({ message: 'Custo atualizado com sucesso!' });
      }

      const { error } = await supabase.from('custos').insert([payload]);
      if (error) throw error;

      return response.status(201).json({ message: 'Custo criado com sucesso!' });

    } catch (error) {
      console.error('Erro POST/PUT /custos:', error);
      return response.status(500).json({ error: error.message });
    }
  }

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------
  if (request.method === 'DELETE') {
    try {
      const { id } = request.query;
      if (!id) {
        return response.status(400).json({ error: 'ID do custo é obrigatório.' });
      }

      const { data: custo, error } = await supabase
        .from('custos')
        .select('anexo1_url, anexo2_url')
        .eq('id', id)
        .single();

      if (error) throw error;

      const filesToDelete = [];
      if (custo?.anexo1_url) {
        filesToDelete.push(new URL(custo.anexo1_url).pathname.split('/comprovantes_custos/')[1]);
      }
      if (custo?.anexo2_url) {
        filesToDelete.push(new URL(custo.anexo2_url).pathname.split('/comprovantes_custos/')[1]);
      }

      if (filesToDelete.length) {
        await supabase.storage.from('comprovantes_custos').remove(filesToDelete);
      }

      const { error: dbError } = await supabase.from('custos').delete().eq('id', id);
      if (dbError) throw dbError;

      return response.status(200).json({ message: 'Custo e anexos excluídos com sucesso!' });
    } catch (error) {
      console.error('Erro DELETE /custos:', error);
      return response.status(500).json({ error: error.message });
    }
  }

  response.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return response.status(405).end(`Método ${request.method} não permitido.`);
}

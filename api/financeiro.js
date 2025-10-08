// pages/api/financeiro.js

import { createClient } from '@supabase/supabase-js';

/**
 * ⚙️ ENV & Client (server-only)
 * - Use SEMPRE a service role no server.
 * - NUNCA exponha essa chave no front.
 */
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Env do Supabase ausente. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * 🧮 Agregado para cards do dashboard
 * - PostgREST já ignora NULL em sum(), então não precisa de or/not.is.null.
 * - Retorna custo_total e lucro_liquido prontos.
 */
async function fetchAggregatedData(startDate, endDate) {
  let query = supabase
    .from('movimentacoes_financeiras')
    .select(`
      receita_total:sum(valor_pedido),
      custo_motorista_total:sum(custo_motorista),
      custo_veiculo_total:sum(custo_veiculo),
      total_entradas:count(id)
    `);

  if (startDate && endDate) {
    // filtro inclusivo de data simples; se quiser incluir “final do dia”, trate no front (endDate + 1)
    query = query.gte('data_lancamento', startDate).lte('data_lancamento', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const agg = (data && data[0]) || {};

  const receita        = Number(agg.receita_total) || 0;
  const custoMotorista = Number(agg.custo_motorista_total) || 0;
  const custoVeiculo   = Number(agg.custo_veiculo_total) || 0;
  const custoTotal     = custoMotorista + custoVeiculo;
  const lucroLiquido   = receita - custoMotorista - custoVeiculo;

  return {
    total_entradas: Number(agg.total_entradas) || 0,
    receita_total: receita,
    custo_motorista_total: custoMotorista,
    custo_veiculo_total: custoVeiculo,
    custo_total: custoTotal,
    lucro_liquido: lucroLiquido,
  };
}

/**
 * 🔐 Guard de segurança
 * - Exige Authorization: Bearer <access_token> do usuário logado (front).
 * - Valida o token contra o Auth do Supabase.
 */
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

/**
 * 🧵 Handler principal
 */
export default async function handler(request, response) {
  try {
    await requireUser(request);
  } catch (err) {
    return response.status(err.status || 401).json({ error: err.message });
  }

  // ------ GET (lista, item, agregado) ------
  if (request.method === 'GET') {
    const { id, relatorio, startDate, endDate } = request.query;

    try {
      if (relatorio === 'agregado') {
        const data = await fetchAggregatedData(startDate, endDate);
        return response.status(200).json(data);
      }

      // Lista/Item com relações (FKs precisam existir no schema)
      let query = supabase
        .from('movimentacoes_financeiras')
        .select(`
          *,
          pacotes(codigo_rastreio),
          clientes(nome_completo),
          motoristas(nome_completo),
          veiculos(placa, modelo)
        `)
        .order('data_lancamento', { ascending: false });

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
      return response.status(500).json({ error: 'Erro ao buscar dados financeiros: ' + error.message });
    }
  }

  // ------ POST (criar lançamento) ------
  if (request.method === 'POST') {
    try {
      // Next.js já parseia JSON quando Content-Type: application/json
      const payload = request.body || {};
      // Higieniza números (evita string numérica estourar RLS/constraints)
      const data = {
        ...payload,
        valor_pedido: payload.valor_pedido != null ? Number(payload.valor_pedido) : null,
        custo_motorista: payload.custo_motorista != null ? Number(payload.custo_motorista) : null,
        custo_veiculo: payload.custo_veiculo != null ? Number(payload.custo_veiculo) : null,
      };

      const { error } = await supabase.from('movimentacoes_financeiras').insert([data]);
      if (error) throw error;
      return response.status(201).json({ message: 'Lançamento criado com sucesso!' });
    } catch (error) {
      return response.status(500).json({ error: 'Erro ao criar lançamento: ' + error.message });
    }
  }

  // ------ PUT (atualizar lançamento) ------
  if (request.method === 'PUT') {
    try {
      const { id, ...rest } = request.body || {};
      if (!id) return response.status(400).json({ error: 'ID da movimentação é obrigatório.' });

      const data = {
        ...rest,
        valor_pedido: rest.valor_pedido != null ? Number(rest.valor_pedido) : null,
        custo_motorista: rest.custo_motorista != null ? Number(rest.custo_motorista) : null,
        custo_veiculo: rest.custo_veiculo != null ? Number(rest.custo_veiculo) : null,
      };

      const { error } = await supabase.from('movimentacoes_financeiras').update(data).match({ id });
      if (error) throw error;
      return response.status(200).json({ message: 'Lançamento atualizado com sucesso!' });
    } catch (error) {
      return response.status(500).json({ error: 'Erro ao atualizar lançamento: ' + error.message });
    }
  }

  // ------ DELETE (excluir lançamento) ------
  if (request.method === 'DELETE') {
    try {
      const { id } = request.query;
      if (!id) return response.status(400).json({ error: 'ID da movimentação é obrigatório.' });

      const { error } = await supabase.from('movimentacoes_financeiras').delete().match({ id });
      if (error) throw error;
      return response.status(200).json({ message: 'Lançamento excluído com sucesso!' });
    } catch (error) {
      return response.status(500).json({ error: 'Erro ao excluir lançamento: ' + error.message });
    }
  }

  response.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return response.status(405).end(`Método ${request.method} não permitido.`);
}

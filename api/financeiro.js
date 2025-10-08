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

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function fetchAggregatedData(startDate, endDate) {
  const sd = typeof startDate === 'string' ? startDate : null;
  const ed = typeof endDate === 'string' ? endDate : null;

  // 1) tenta via SQL (rápido)
  try {
    let q = supabase
      .from('movimentacoes_financeiras')
      .select(`
        receita_total:sum(valor_pedido),
        custo_motorista_total:sum(custo_motorista),
        custo_veiculo_total:sum(custo_veiculo),
        imposto_total:sum(imposto),
        operacao_total:sum(custo_operacao),
        descarga_total:sum(custo_descarga),
        seguro_total:sum(custo_seguro),
        total_entradas:count(id)
      `);
    if (sd && ed) q = q.gte('data_lancamento', sd).lte('data_lancamento', ed);

    const { data, error } = await q;
    if (error) throw error;

    const a = data?.[0] || {};
    const receita = toNum(a.receita_total);
    const cm = toNum(a.custo_motorista_total);
    const cv = toNum(a.custo_veiculo_total);
    const imp = toNum(a.imposto_total);
    const op  = toNum(a.operacao_total);
    const des = toNum(a.descarga_total);
    const seg = toNum(a.seguro_total);

    const custo_total = cm + cv + imp + op + des + seg;

    return {
      total_entradas: toNum(a.total_entradas),
      receita_total: receita,
      custo_motorista_total: cm,
      custo_veiculo_total: cv,
      imposto_total: imp,
      operacao_total: op,
      descarga_total: des,
      seguro_total: seg,
      custo_total,
      lucro_liquido: receita - custo_total,
    };
  } catch (e) {
    // 2) fallback: soma no server (resiliente a colunas TEXT)
    let q = supabase
      .from('movimentacoes_financeiras')
      .select(
        'valor_pedido,custo_motorista,custo_veiculo,imposto,custo_operacao,custo_descarga,custo_seguro',
        { count: 'exact' }
      );
    if (sd && ed) q = q.gte('data_lancamento', sd).lte('data_lancamento', ed);

    const { data: rows, count, error } = await q;
    if (error) throw error;

    let receita = 0, cm = 0, cv = 0, imp = 0, op = 0, des = 0, seg = 0;
    for (const r of (rows || [])) {
      receita += toNum(r.valor_pedido);
      cm      += toNum(r.custo_motorista);
      cv      += toNum(r.custo_veiculo);
      imp     += toNum(r.imposto);
      op      += toNum(r.custo_operacao);
      des     += toNum(r.custo_descarga);
      seg     += toNum(r.custo_seguro);
    }
    const custo_total = cm + cv + imp + op + des + seg;

    return {
      total_entradas: count || 0,
      receita_total: receita,
      custo_motorista_total: cm,
      custo_veiculo_total: cv,
      imposto_total: imp,
      operacao_total: op,
      descarga_total: des,
      seguro_total: seg,
      custo_total,
      lucro_liquido: receita - custo_total,
    };
  }
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
        imposto: payload.imposto != null ? Number(payload.imposto) : null,
        custo_operacao: payload.custo_operacao != null ? Number(payload.custo_operacao) : null,
        custo_descarga: payload.custo_descarga != null ? Number(payload.custo_descarga) : null,
        custo_seguro: payload.custo_seguro != null ? Number(payload.custo_seguro) : null,
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
        imposto: rest.imposto != null ? Number(rest.imposto) : null,
        custo_operacao: rest.custo_operacao != null ? Number(rest.custo_operacao) : null,
        custo_descarga: rest.custo_descarga != null ? Number(rest.custo_descarga) : null,
        custo_seguro: rest.custo_seguro != null ? Number(rest.custo_seguro) : null,
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

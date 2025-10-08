// pages/api/financeiro.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- FUNÇÃO AUXILIAR DE AGREGAÇÃO PARA RELATÓRIOS ---
async function fetchAggregatedData(startDate, endDate) {
    let query = supabase
        .from('movimentacoes_financeiras')
        .select(
            // Utilizamos a sintaxe de agregação do PostgREST
            `
            receita_total:sum(valor_pedido),
            custo_motorista_total:sum(custo_motorista),
            custo_veiculo_total:sum(custo_veiculo),
            total_entradas:count(id)
            `
        );

    // Filtra pelo campo data_lancamento
    if (startDate && endDate) {
        query = query.gte('data_lancamento', startDate).lte('data_lancamento', endDate);
    }
    
    // O filtro 'not' garante que a agregação não considere linhas que são APENAS nulas
    query = query.or('valor_pedido.not.is.null,custo_motorista.not.is.null,custo_veiculo.not.is.null');

    const { data, error } = await query;
    if (error) throw error;
    
    // O Supabase retorna um array com um único objeto de agregações
    const results = data[0] || {};
    
    // Calcula o lucro e garante que todos os valores sejam números (ou zero)
    const receita = results.receita_total || 0;
    const custoMotorista = results.custo_motorista_total || 0;
    const custoVeiculo = results.custo_veiculo_total || 0;
    
    return {
        ...results,
        lucro_liquido: receita - custoMotorista - custoVeiculo,
        receita_total: receita,
        custo_motorista_total: custoMotorista + custoVeiculo,
    };
}


// --- ROTA PRINCIPAL DA API ---
export default async function handler(request, response) {
    
    // --- BLOCO DE SEGURANÇA (Obrigatório) ---
    const token = request.headers.authorization?.split('Bearer ')?.[1];
    if (!token) return response.status(401).json({ error: 'Não autorizado: Nenhum token fornecido.' });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return response.status(403).json({ error: 'Não autorizado: Token inválido ou expirado.' });
    // --- FIM: BLOCO DE SEGURANÇA ---


    // --- LÓGICA DE BUSCA E RELATÓRIO (GET) ---
    if (request.method === 'GET') {
        const { id, relatorio, startDate, endDate } = request.query;

        try {
            // 1. Relatórios Agregados (Painel de Acompanhamento)
            if (relatorio === 'agregado') {
                const data = await fetchAggregatedData(startDate, endDate);
                return response.status(200).json(data);
            }
            
            // 2. Busca de Movimentação Individual ou Lista (Para a tabela de lançamentos)
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
                return response.status(200).json(data);
            }

        } catch (error) {
            return response.status(500).json({ error: 'Erro ao buscar dados financeiros: ' + error.message });
        }
    }

    // --- LÓGICA CRUD (POST, PUT, DELETE) para Lançamentos ---
    
    if (request.method === 'POST') {
        try {
            const { error } = await supabase.from('movimentacoes_financeiras').insert([request.body]);
            if (error) throw error;
            return response.status(201).json({ message: 'Lançamento criado com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao criar lançamento: ' + error.message });
        }
    }
    
    if (request.method === 'PUT') {
        try {
            const { id, ...data } = request.body;
            if (!id) return response.status(400).json({ error: 'ID da movimentação é obrigatório.' });
            
            const { error } = await supabase.from('movimentacoes_financeiras').update(data).match({ id });
            if (error) throw error;
            return response.status(200).json({ message: 'Lançamento atualizado com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao atualizar lançamento: ' + error.message });
        }
    }

    if (request.method === 'DELETE') {
        try {
            const { id } = request.query; // Padrão REST: ID na Query String
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
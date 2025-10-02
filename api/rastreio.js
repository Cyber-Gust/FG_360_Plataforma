// pages/api/rastreio.js

// Importa a biblioteca do Supabase
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a chave de SERVICE_ROLE.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request, response) {
    
    // --- CABEÇALHOS CORS ---
    response.setHeader('Access-Control-Allow-Origin', '*'); // Para produção, troque '*' pela sua URL
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'GET') {
        return response.status(405).end('Método não permitido.');
    }

    const { codigo } = request.query;

    if (!codigo) {
        return response.status(400).json({ error: 'Código de rastreio é obrigatório.' });
    }

    try {
        // --- ETAPA 1: Buscar os dados principais do pacote ---
        const { data: pacote, error: pacoteError } = await supabase
            .from('pacotes')
            .select('id, codigo_rastreio, status, descricao, origem, destino_endereco, data_postagem, data_atualizacao, prova_entrega_url')
            .eq('codigo_rastreio', codigo)
            .single();

        if (pacoteError) {
            if (pacoteError.code === 'PGRST116') {
                return response.status(404).json({ error: 'Nenhum pacote encontrado com este código.' });
            }
            throw pacoteError;
        }
        
        // --- ETAPA 2: Buscar o histórico de rastreio do pacote ---
        const { data: historico, error: historicoError } = await supabase
            .from('historico_rastreio')
            .select('status_novo, data_atualizacao, observacao')
            .eq('pacote_id', pacote.id)
            .order('data_atualizacao', { ascending: true }); // Ordena do mais antigo para o mais novo

        if (historicoError) {
            // Se houver erro ao buscar o histórico, não quebra a requisição,
            // apenas loga o erro e continua com o histórico vazio.
            console.error('Erro ao buscar histórico do pacote:', historicoError);
        }

        // --- ETAPA 3: Combinar os dados para a resposta final ---
        const responseData = {
            ...pacote,
            historico: historico || [], // Garante que historico seja sempre um array
        };
        
        // Renomeia 'data_atualizacao' para 'atualizado_em' para manter compatibilidade com o front-end
        responseData.atualizado_em = responseData.data_atualizacao || responseData.data_postagem;
        delete responseData.data_atualizacao;
        
        return response.status(200).json(responseData);

    } catch (error) {
        console.error('Erro na API de rastreio:', error);
        return response.status(500).json({ error: 'Ocorreu um erro interno. Por favor, tente novamente mais tarde.' });
    }
}
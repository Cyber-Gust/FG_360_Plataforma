// pages/api/dashboard.js

// Importa a biblioteca do Supabase
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase usando as variáveis de ambiente do servidor.
// Lembre-se de configurar SUPABASE_SERVICE_KEY nas suas Environment Variables.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request, response) {

    if (request.method !== 'GET') {
        response.setHeader('Allow', ['GET']);
        return response.status(405).end(`Método ${request.method} não permitido.`);
    }

    // --- INÍCIO: BLOCO DE SEGURANÇA ---
    // Garante que apenas usuários autenticados possam acessar os dados do dashboard.
    const token = request.headers.authorization?.split('Bearer ')?.[1];

    if (!token) {
        return response.status(401).json({ error: 'Não autorizado: Nenhum token fornecido.' });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
        return response.status(403).json({ error: 'Não autorizado: Token inválido ou expirado.' });
    }
    // --- FIM: BLOCO DE SEGURANÇA ---
    // Se o código chegou aqui, o usuário é válido e pode ver o dashboard.

    const { startDate, endDate } = request.query;

    // Se as datas forem fornecidas, retorna os dados para o gráfico
    if (startDate && endDate) {
        try {
            const { data, error } = await supabase.from('pacotes')
                .select('status, data_postagem') // Adicionado data_postagem para possível agrupamento no front-end
                .gte('data_postagem', new Date(startDate).toISOString())
                .lte('data_postagem', new Date(endDate).toISOString());
            
            if (error) throw error;
            return response.status(200).json(data);

        } catch (error) {
            return response.status(500).json({ error: 'Erro ao buscar dados para o gráfico: ' + error.message });
        }
    } else {
        // Caso contrário, retorna os dados principais do dashboard
        try {
            const [
                { count: totalClientes, error: clientesError },
                { count: pacotesEmTransito, error: transitoError },
                { count: pacotesEntregues, error: entreguesError },
                { data: ultimosPacotes, error: pacotesError }
            ] = await Promise.all([
                supabase.from('clientes').select('*', { count: 'exact', head: true }),
                // Corrigido para "Em Transito" para corresponder ao status que você usa
                supabase.from('pacotes').select('*', { count: 'exact', head: true }).eq('status', 'Em Transito'),
                supabase.from('pacotes').select('*', { count: 'exact', head: true }).eq('status', 'Entregue'),
                supabase.from('pacotes').select('*, clientes(nome_completo)').order('data_postagem', { ascending: false }).limit(5)
            ]);

            if (clientesError || transitoError || entreguesError || pacotesError) {
                // Log do erro no servidor para depuração
                console.error("Erro em uma das queries do dashboard:", clientesError || transitoError || entreguesError || pacotesError);
                throw new Error('Erro ao buscar uma ou mais métricas do dashboard.');
            }

            const dashboardData = {
                totalClientes,
                pacotesEmTransito,
                pacotesEntregues,
                ultimosPacotes
            };

            return response.status(200).json(dashboardData);

        } catch (error) {
            return response.status(500).json({ error: 'Erro ao buscar dados do dashboard: ' + error.message });
        }
    }
}
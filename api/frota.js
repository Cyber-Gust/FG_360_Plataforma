// pages/api/frota.js

// Importa a biblioteca do Supabase
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase usando as variáveis de ambiente do servidor.
// Lembre-se de configurar SUPABASE_SERVICE_KEY nas suas Environment Variables.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request, response) {

    // --- INÍCIO: BLOCO DE SEGURANÇA ---
    // Garante que apenas usuários autenticados possam interagir com a frota.
    const token = request.headers.authorization?.split('Bearer ')?.[1];

    if (!token) {
        return response.status(401).json({ error: 'Não autorizado: Nenhum token fornecido.' });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
        return response.status(403).json({ error: 'Não autorizado: Token inválido ou expirado.' });
    }
    // --- FIM: BLOCO DE SEGURANÇA ---
    // Se o código chegou aqui, o usuário é válido e pode gerenciar a frota.


    // --- LÓGICA PARA BUSCAR VEÍCULOS (GET) ---
    if (request.method === 'GET') {
        const { id } = request.query;
        try {
            if (id) {
                // Busca um único veículo pelo ID
                const { data, error } = await supabase.from('veiculos').select('*').eq('id', id).single();
                if (error) throw error;
                return response.status(200).json(data);
            } else {
                // Busca todos os veículos
                const { data, error } = await supabase.from('veiculos').select('*').order('criado_em', { ascending: false });
                if (error) throw error;
                return response.status(200).json(data);
            }
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao buscar veículos: ' + error.message });
        }
    }

    // --- LÓGICA PARA CRIAR VEÍCULO (POST) ---
    if (request.method === 'POST') {
        try {
            const { error } = await supabase.from('veiculos').insert([request.body]);
            if (error) throw error;
            return response.status(201).json({ message: 'Veículo criado com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao criar veículo: ' + error.message });
        }
    }

    // --- LÓGICA PARA ATUALIZAR VEÍCULO (PUT) ---
    if (request.method === 'PUT') {
        try {
            const { id, ...veiculoData } = request.body;
            if (!id) return response.status(400).json({ error: 'ID do veículo é obrigatório.' });
            
            const { error } = await supabase.from('veiculos').update(veiculoData).match({ id });
            if (error) throw error;
            return response.status(200).json({ message: 'Veículo atualizado com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao atualizar veículo: ' + error.message });
        }
    }

    // --- LÓGICA PARA EXCLUIR VEÍCULO (DELETE) ---
    if (request.method === 'DELETE') {
        try {
            const { id } = request.body;
            if (!id) return response.status(400).json({ error: 'ID do veículo é obrigatório.' });

            const { error } = await supabase.from('veiculos').delete().match({ id });
            if (error) throw error;
            return response.status(200).json({ message: 'Veículo excluído com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao excluir veículo: ' + error.message });
        }
    }
    
    // Se o método não for nenhum dos anteriores, retorna erro
    response.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return response.status(405).end(`Método ${request.method} não permitido.`);
}
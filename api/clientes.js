// pages/api/clientes.js

// Importa a biblioteca do Supabase
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase usando as variáveis de ambiente do servidor.
// Lembre-se de configurar SUPABASE_SERVICE_KEY nas suas Environment Variables (Vercel, Netlify, etc.)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Esta é a nossa Serverless Function.
export default async function handler(request, response) {

    // --- INÍCIO: BLOCO DE SEGURANÇA ---
    // Este bloco é executado para todos os métodos (GET, POST, PUT, DELETE)
    // para garantir que apenas usuários logados possam prosseguir.
    const token = request.headers.authorization?.split('Bearer ')?.[1];

    if (!token) {
        return response.status(401).json({ error: 'Não autorizado: Nenhum token fornecido.' });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
        return response.status(403).json({ error: 'Não autorizado: Token inválido ou expirado.' });
    }
    // --- FIM: BLOCO DE SEGURANÇA ---
    // Se o código chegou até aqui, significa que o usuário é válido e autenticado.


    // --- LÓGICA PARA BUSCAR CLIENTES (GET) ---
    if (request.method === 'GET') {
        const { id } = request.query;

        if (id) {
            // Busca um único cliente pelo ID
            try {
                const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
                if (error) throw error;
                return response.status(200).json(data);
            } catch (error) {
                return response.status(500).json({ error: 'Erro ao buscar cliente: ' + error.message });
            }
        } else {
            // Busca todos os clientes
            try {
                const { data, error } = await supabase.from('clientes').select('*').order('criado_em', { ascending: false });
                if (error) throw error;
                return response.status(200).json(data);
            } catch (error) {
                return response.status(500).json({ error: 'Erro ao buscar clientes: ' + error.message });
            }
        }
    }

    // --- LÓGICA PARA CRIAR CLIENTE (POST) ---
    if (request.method === 'POST') {
        try {
            // SEGURO: Extrai apenas os campos necessários do corpo da requisição.
            const { nome_completo, email, telefone, empresa } = request.body;
            const clienteData = { nome_completo, email, telefone, empresa };

            const { error } = await supabase.from('clientes').insert([clienteData]);
            
            if (error) {
                // Se o erro ainda for sobre UUID, pode ser em um trigger.
                // Mas o mais provável é que o erro original seja resolvido aqui.
                console.error('Erro no Supabase ao criar cliente:', error);
                throw error;
            }

            return response.status(201).json({ message: 'Cliente criado com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao criar cliente: ' + error.message });
        }
    }

    // --- LÓGICA PARA ATUALIZAR CLIENTE (PUT) ---
    if (request.method === 'PUT') {
        try {
            const { id, ...clienteData } = request.body;
            if (!id) return response.status(400).json({ error: 'ID do cliente é obrigatório.' });
            
            const { error } = await supabase.from('clientes').update(clienteData).match({ id });
            if (error) throw error;
            return response.status(200).json({ message: 'Cliente atualizado com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao atualizar cliente: ' + error.message });
        }
    }

    // --- LÓGICA PARA EXCLUIR CLIENTE (DELETE) ---
    if (request.method === 'DELETE') {
        try {
            const { id } = request.body;
            if (!id) return response.status(400).json({ error: 'ID do cliente é obrigatório.' });

            const { error } = await supabase.from('clientes').delete().match({ id });
            if (error) throw error;
            return response.status(200).json({ message: 'Cliente excluído com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao excluir cliente: ' + error.message });
        }
    }
    
    // Se o método não for nenhum dos anteriores, retorna erro
    response.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return response.status(405).end(`Método ${request.method} não permitido.`);
}
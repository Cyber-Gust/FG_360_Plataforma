// pages/api/pacotes.js

// Importa as bibliotecas do Supabase e do Resend
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Inicializa os clientes usando as chaves de SERVIDOR.
// Lembre-se de configurar SUPABASE_SERVICE_KEY e RESEND_API_KEY nas suas Environment Variables.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(process.env.RESEND_API_KEY);

// --- FUNÇÃO AUXILIAR PARA ENVIAR E-MAIL ---
// Esta função é chamada pelo servidor, então ela já opera em um ambiente seguro.
async function sendStatusEmail(pacoteId) {
    try {
        // 1. Busca os dados completos do pacote usando o cliente Supabase com a service_key
        const { data: pacote, error: fetchError } = await supabase
            .from('pacotes')
            .select('*, clientes(nome_completo, email), motoristas(nome_completo), veiculos(modelo, placa)')
            .eq('id', pacoteId)
            .single();

        if (fetchError || !pacote || !pacote.clientes || !pacote.clientes.email) {
            console.error('Erro ao buscar dados para e-mail, cliente não encontrado ou sem e-mail:', fetchError);
            return; // Sai silenciosamente para não quebrar a operação principal
        }

        const { codigo_rastreio, status, descricao, origem, destino_endereco, clientes, motoristas, veiculos } = pacote;
        const { nome_completo: nomeCliente, email: emailCliente } = clientes;
        
        // Mapeia os status que devem disparar e-mails
        const statusMap = {
            'Aguardando Coleta': {
                subject: `Seu pedido foi recebido! Código: ${codigo_rastreio}`,
                message: `Olá, <b>${nomeCliente}</b>, seu pedido <b>foi Recebido</b>!`,
                image: '/images/mail_recebido.png'
            },
            'Em Transito': {
                subject: `Seu pedido está a caminho! Código: ${codigo_rastreio}`,
                message: `Olá, <b>${nomeCliente}</b>, seu pedido <b>está em Transporte</b>!`,
                image: '/images/mail_transporte.png'
            },
            'Entregue': {
                subject: `Seu pedido foi entregue! Código: ${codigo_rastreio}`,
                message: `Olá, <b>${nomeCliente}</b>, seu pedido <b>foi entregue</b>!`,
                image: '/images/mail_entregue.png'
            }
        };

        if (!statusMap[status]) {
            console.log(`Status "${status}" não dispara e-mail.`);
            return;
        }

        const emailData = statusMap[status];
        const siteUrl = 'https://portal.fg360transportes.com.br';
        
        // Constrói o corpo do e-mail em HTML
        const htmlBody = `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { margin: 0; padding: 0; background-color: #f4f4f4; }
                table { border-spacing: 0; }
                td { padding: 0; }
                img { border: 0; }
            </style>
        </head>
        <body style="width: 100%; background-color: #f4f4f4; font-family: Arial, sans-serif;">
            <center style="width: 100%; table-layout: fixed; background-color: #f4f4f4; padding-top: 20px; padding-bottom: 20px;">
                <table style="width: 100%; max-width: 600px; background-color: #ffffff; border-spacing: 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <tr>
                        <td style="padding: 20px 0; text-align: center;">
                            <img src="${siteUrl}/images/logo.png" style="max-width: 180px;" alt="Logo FG360">
                        </td>
                    </tr>

                    <tr>
                        <td>
                            <img src="${siteUrl}${emailData.image}" style="max-width: 100%;" alt="Status da entrega">
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 30px 40px;">
                            <h1 style="text-align: center; color:#333; font-size: 24px; margin-top: 0; margin-bottom: 20px;">${emailData.message}</h1>
                            <p style="font-size: 16px; color: #555; line-height: 1.5;">
                                Abaixo estão os detalhes do seu pedido para referência. Você pode acompanhar o progresso a qualquer momento clicando no botão de rastreamento.
                            </p>

                            <table style="width: 100%; margin-top: 25px; margin-bottom: 25px;">
                                <tr>
                                    <td align="center">
                                        <a href="${siteUrl}/rastreio/${codigo_rastreio}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: bold; color: #ffffff; background-color: #e7a540; text-decoration: none; border-radius: 5px;">
                                            Acompanhar Entrega
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <table style="width: 100%; border-top: 1px solid #eeeeee; padding-top: 20px; font-size: 14px; color: #333;">
                                <tr><td style="padding-bottom: 10px;"><strong>Cód. Rastreio:</strong> ${codigo_rastreio}</td></tr>
                                <tr><td style="padding-bottom: 10px;"><strong>Produto:</strong> ${descricao}</td></tr>
                                <tr><td style="padding-bottom: 10px;"><strong>Origem:</strong> ${origem}</td></tr>
                                <tr><td style="padding-bottom: 10px;"><strong>Destino:</strong> ${destino_endereco}</td></tr>
                                <tr><td style="padding-bottom: 10px;"><strong>Motorista:</strong> ${motoristas ? motoristas.nome_completo : 'Não definido'}</td></tr>
                                <tr><td><strong>Veículo:</strong> ${veiculos ? `${veiculos.modelo} (${veiculos.placa})` : 'Não definido'}</td></tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 20px 40px; background-color: #f7f7f7; text-align: center; font-size: 12px; color: #888;">
                            <p style="margin: 0;">Ficou alguma dúvida? Entre em contato:</p>
                            <p style="margin: 5px 0;"><a href="mailto:contato@fg360transportes.com.br" style="color: #888;">contato@fg360transportes.com.br</a></p>
                        </td>
                    </tr>
                </table>
            </center>
        </body>
        </html>
        `;

        await resend.emails.send({
            from: 'FG360 Transportes <contato@fg360transportes.com.br>',
            to: [emailCliente],
            subject: emailData.subject,
            html: htmlBody,
        });
        console.log(`E-mail de status "${status}" enviado para ${emailCliente}`);

    } catch (error) {
        console.error("Falha ao processar ou enviar e-mail de status:", error);
    }
}

// --- ROTA PRINCIPAL DA API ---
export default async function handler(request, response) {
    
    // --- INÍCIO: BLOCO DE SEGURANÇA ---
    const token = request.headers.authorization?.split('Bearer ')?.[1];
    if (!token) {
        return response.status(401).json({ error: 'Não autorizado: Nenhum token fornecido.' });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return response.status(403).json({ error: 'Não autorizado: Token inválido ou expirado.' });
    }
    // --- FIM: BLOCO DE SEGURANÇA ---

    // --- LÓGICA PARA ATUALIZAR PACOTE (PUT) ---
    if (request.method === 'PUT') {
        try {
            const { id, ...pacoteData } = request.body;
            if (!id) return response.status(400).json({ error: 'ID do pacote é obrigatório.' });
            
            if (pacoteData.status === 'Entregue' && !pacoteData.data_entregue) {
                pacoteData.data_entregue = new Date().toISOString();
            }
            
            const { error } = await supabase.from('pacotes').update(pacoteData).match({ id });
            if (error) throw error;

            await sendStatusEmail(id);

            return response.status(200).json({ message: 'Pacote atualizado com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao atualizar pacote: ' + error.message });
        }
    }

    // --- LÓGICA PARA CRIAR PACOTE (POST) ---
    if (request.method === 'POST') {
        try {
            const { data, error } = await supabase.from('pacotes').insert([request.body]).select().single();
            if (error) throw error;
            
            await sendStatusEmail(data.id);

            return response.status(201).json({ message: 'Pacote criado com sucesso!', data });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao criar pacote: ' + error.message });
        }
    }
    
    // --- LÓGICA PARA BUSCAR PACOTES (GET) ---
    if (request.method === 'GET') {
        const { id } = request.query;
        try {
            if (id) {
                const { data, error } = await supabase.from('pacotes').select('*, clientes(*), motoristas(*), veiculos(*)').eq('id', id).single();
                if (error) throw error;
                return response.status(200).json(data);
            } else {
                const { data, error } = await supabase.from('pacotes').select(`*, clientes(nome_completo), motoristas(nome_completo), veiculos(modelo, placa)`).order('data_postagem', { ascending: false });
                if (error) throw error;
                return response.status(200).json(data);
            }
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao buscar pacotes: ' + error.message });
        }
    }

    // --- LÓGICA PARA EXCLUIR PACOTE (DELETE) ---
    if (request.method === 'DELETE') {
        try {
            const { id } = request.body;
            if (!id) return response.status(400).json({ error: 'ID do pacote é obrigatório.' });
            const { error } = await supabase.from('pacotes').delete().match({ id });
            if (error) throw error;
            return response.status(200).json({ message: 'Pacote excluído com sucesso!' });
        } catch (error) {
            return response.status(500).json({ error: 'Erro ao excluir pacote: ' + error.message });
        }
    }
    
    response.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return response.status(405).end(`Método ${request.method} não permitido.`);
}
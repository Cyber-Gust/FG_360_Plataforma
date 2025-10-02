// api/upload-proof.js
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Previne o Next.js/Vercel de fazer o parse do body, pois o formidable fará isso.
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    // --- INÍCIO DA CORREÇÃO ---

    // 1. Inicializa o cliente com a CHAVE DE SERVIÇO (service_role)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Adiciona o bloco de segurança para validar o usuário
    const token = request.headers.authorization?.split('Bearer ')?.[1];
    if (!token) {
        return response.status(401).json({ error: 'Não autorizado: Nenhum token fornecido.' });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return response.status(403).json({ error: 'Não autorizado: Token inválido ou expirado.' });
    }
    // Se chegou aqui, o usuário está logado e podemos prosseguir.

    // --- FIM DA CORREÇÃO ---


    const form = formidable({});

    try {
        const [fields, files] = await form.parse(request);
        
        const pacoteId = fields.pacoteId?.[0];
        const proofImage = files.proofImage?.[0];

        if (!proofImage || !pacoteId) {
            return response.status(400).json({ error: 'Faltando imagem ou ID do pacote.' });
        }

        // Lê o arquivo do caminho temporário
        const fileContent = fs.readFileSync(proofImage.filepath);
        
        // Define um nome de arquivo único no Supabase Storage
        const fileName = `proofs/${pacoteId}-${Date.now()}${path.extname(proofImage.originalFilename)}`;
        
        // Faz o upload para o bucket 'pacotes'
        // Como estamos usando a service_key, a RLS de Storage é bypassada, mas já validamos o usuário.
        const { error: uploadError } = await supabase.storage
            .from('pacotes')
            .upload(fileName, fileContent, {
                contentType: proofImage.mimetype,
                upsert: false,
            });

        if (uploadError) {
            throw uploadError;
        }

        // Obtém a URL pública do arquivo que acabamos de enviar
        const { data: urlData } = supabase.storage
            .from('pacotes')
            .getPublicUrl(fileName);

        if (!urlData || !urlData.publicUrl) {
            throw new Error('Não foi possível obter a URL pública da imagem.');
        }
        
        // Retorna a URL para o front-end
        return response.status(200).json({
            success: true,
            publicUrl: urlData.publicUrl
        });

    } catch (error) {
        console.error('Erro no upload da imagem:', error);
        return response.status(500).json({ error: 'Erro interno ao processar a imagem: ' + error.message });
    }
}
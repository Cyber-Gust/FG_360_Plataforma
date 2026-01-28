// js/formularios.js

// Função principal que renderiza a página de formulários
async function renderFormulariosPage() {
    const pageContent = document.getElementById('page-content');
    // 1. Cria a estrutura HTML da página com as abas
    pageContent.innerHTML = `
        <div class="tabs-container">
            <button class="tab-link active" data-form-type="cotacoes">Cotações</button>
            <button class="tab-link" data-form-type="candidaturas">Trabalhe Conosco</button>
            <button class="tab-link" data-form-type="agregados">Seja Agregado</button>
        </div>
        <div id="forms-table-container">
            </div>
    `;

    // 2. Adiciona a lógica para trocar de aba
    const tabs = document.querySelectorAll('.tab-link');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove a classe 'active' de todas as abas
            tabs.forEach(t => t.classList.remove('active'));
            // Adiciona a classe 'active' na aba clicada
            tab.classList.add('active');
            
            // Carrega os dados correspondentes à aba clicada
            const formType = tab.dataset.formType;
            loadFormData(formType);
        });
    });

    // 3. Carrega os dados da primeira aba ("Cotações") por padrão
    await loadFormData('cotacoes');
}

// Função que decide qual tabela carregar com base na aba selecionada
function loadFormData(formType) {
    const container = document.getElementById('forms-table-container');
    container.innerHTML = '<p>Carregando dados...</p>';

    switch (formType) {
        case 'cotacoes':
            fetchAndRenderCotacoes(container);
            break;
        case 'candidaturas':
            fetchAndRenderCandidaturas(container);
            break;
        case 'agregados':
            fetchAndRenderAgregados(container);
            break;
    }
}

// ==========================================================
// FUNÇÕES PARA BUSCAR E RENDERIZAR DADOS DE CADA TABELA
// ==========================================================

// --- Função para buscar e renderizar as COTAÇÕES ---
async function fetchAndRenderCotacoes(container) {
    try {
        const response = await fetchAuthenticated('/api/formularios?type=cotacoes');
        if (!response.ok) throw new Error('Falha ao buscar cotações');

        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = '<p>Nenhuma cotação recebida.</p>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Recebido em</th>
                        <th>Nome</th>
                        <th>Contato</th>
                        <th>Serviço</th>
                        <th>Origem/Destino</th>
                        <th>Carga</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${new Date(item.created_at).toLocaleString('pt-BR')}</td>
                            <td>${item.nome || '-'}</td>
                            <td>${item.email}<br>${item.telefone}</td>
                            <td>${item.servico || '-'}</td>
                            <td><strong>De:</strong> ${item.origem}<br><strong>Para:</strong> ${item.destino}</td>
                            <td>${item.material} (${item.quantidade} un, ${item.peso} kg)</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        container.innerHTML = `<p class="error-message">Erro ao buscar cotações: ${error.message}</p>`;
    }
}

// --- Função para buscar e renderizar as CANDIDATURAS (Trabalhe Conosco) ---
async function fetchAndRenderCandidaturas(container) {
    try {
        const response = await fetchAuthenticated('/api/formularios?type=candidaturas');
        if (!response.ok) throw new Error('Falha ao buscar candidaturas');

        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = '<p>Nenhuma candidatura recebida.</p>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Recebido em</th>
                        <th>Nome</th>
                        <th>Contato</th>
                        <th>Localização</th>
                        <th>Área</th>
                        <th>Currículo</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${new Date(item.created_at).toLocaleString('pt-BR')}</td>
                            <td>${item.nome || '-'}</td>
                            <td>${item.email}<br>${item.telefone}</td>
                            <td>${item.cidade_estado || '-'}</td>
                            <td>${item.area_interesse || '-'}</td>
                            <td>
                                ${item.curriculo_url ? `
                                    <a href="${item.curriculo_url}" target="_blank" class="attachment-link">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        Ver Anexo
                                    </a>` : 'N/A'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        container.innerHTML = `<p class="error-message">Erro ao buscar candidaturas: ${error.message}</p>`;
    }
}

// --- Função para buscar e renderizar os AGREGADOS ---
async function fetchAndRenderAgregados(container) {
    try {
        const response = await fetchAuthenticated('/api/formularios?type=agregados');
        if (!response.ok) throw new Error('Falha ao buscar agregados');

        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = '<p>Nenhum cadastro de agregado recebido.</p>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Recebido em</th>
                        <th>Responsável</th>
                        <th>Contato</th>
                        <th>Veículo</th>
                        <th>Documento</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${new Date(item.created_at).toLocaleString('pt-BR')}</td>
                            <td>${item.nome_responsavel || '-'}<br><small>${item.cpf_cnpj || ''}</small></td>
                            <td>${item.email}<br>${item.telefone}</td>
                            <td>${item.tipo_veiculo || '-'}<br><small>${item.placa_veiculo || ''}</small></td>
                            <td>
                                ${item.documento_url ? `
                                    <a href="${item.documento_url}" target="_blank" class="attachment-link">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        Ver CRLV
                                    </a>` : 'N/A'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        container.innerHTML = `<p class="error-message">Erro ao buscar agregados: ${error.message}</p>`;
    }
}

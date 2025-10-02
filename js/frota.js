// js/frota.js

// ===================================================================
// FUNÇÃO AUXILIAR PARA REQUISIÇÕES AUTENTICADAS
// (Copie esta função para cá ou importe de um arquivo comum)
// ===================================================================

async function fetchAuthenticated(url, options = {}) {
    // 1. Pega a sessão atual para obter o token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        console.error('Nenhuma sessão ativa encontrada.');
        throw new Error('Usuário não autenticado.');
    }

    // 2. Inicia os cabeçalhos apenas com a autorização (token)
    const headers = {
        'Authorization': `Bearer ${session.access_token}`,
    };

    // 3. Lógica inteligente:
    // SÓ define 'Content-Type: application/json' se o corpo NÃO for um FormData (arquivo).
    // Se for um arquivo, o navegador vai cuidar do Content-Type correto ('multipart/form-data').
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    // 4. Combina os cabeçalhos e faz a requisição
    options.headers = { ...headers, ...options.headers };
    return await fetch(url, options);
}

// ===================================================================
// LÓGICA DA PÁGINA DE FROTA (VEÍCULOS)
// ===================================================================

async function renderVeiculosPage() {
    pageContent.innerHTML = `
        <div class="page-header">
            <input type="search" id="search-veiculos" class="search-input" placeholder="Buscar veículo por placa...">
            <button id="add-veiculo-btn" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Adicionar Veículo</span>
            </button>
        </div>
        <div id="veiculos-table-container">
            <p>Carregando frota...</p>
        </div>
    `;
    document.getElementById('add-veiculo-btn').addEventListener('click', () => openVeiculoModal());
    document.getElementById('search-veiculos').addEventListener('input', (e) => fetchAndRenderVeiculos(e.target.value));
    await fetchAndRenderVeiculos();
}

async function fetchAndRenderVeiculos(searchTerm = '') {
    const container = document.getElementById('veiculos-table-container');
    container.innerHTML = `<p>Carregando frota...</p>`;

    try {
        // **MODIFICADO**: Usa fetchAuthenticated
        const response = await fetchAuthenticated('/api/frota');
        if (!response.ok) throw new Error('Erro ao buscar veículos da API.');
        
        let veiculos = await response.json();

        if (searchTerm) {
            veiculos = veiculos.filter(v => v.placa.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (veiculos.length === 0) {
            container.innerHTML = '<p>Nenhum veículo encontrado.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Modelo</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Ano</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${veiculos.map(v => `
                    <tr data-id="${v.id}">
                        <td>${v.modelo}</td>
                        <td><strong>${v.placa}</strong></td>
                        <td>${v.tipo}</td>
                        <td>${v.ano}</td>
                        <td class="actions">
                            <button class="btn-icon btn-edit-veiculo" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                            <button class="btn-icon btn-danger btn-delete-veiculo" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.innerHTML = '';
        container.appendChild(table);

        // **MODIFICADO**: Adiciona o uso de fetchAuthenticated aos botões de ação
        document.querySelectorAll('.btn-edit-veiculo').forEach(b => b.addEventListener('click', async (e) => {
            const id = e.currentTarget.closest('tr').dataset.id;
            const response = await fetchAuthenticated(`/api/frota?id=${id}`);
            const data = await response.json();
            if (data) openVeiculoModal(data);
        }));
        document.querySelectorAll('.btn-delete-veiculo').forEach(b => b.addEventListener('click', async (e) => {
            const id = e.currentTarget.closest('tr').dataset.id;
            if (confirm('Tem certeza que deseja excluir este veículo?')) {
                await fetchAuthenticated('/api/frota', {
                    method: 'DELETE',
                    body: JSON.stringify({ id })
                });
                fetchAndRenderVeiculos();
            }
        }));
    } catch (error) {
        container.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

function openVeiculoModal(veiculo = null) {
    const isEditing = !!veiculo;
    const modalHtml = `
        <div class="modal-overlay" id="veiculo-modal">
            <div class="modal-content">
                <header class="modal-header"><h2>${isEditing ? 'Editar Veículo' : 'Adicionar Veículo'}</h2><button class="close-button">&times;</button></header>
                <form id="veiculo-form" class="modal-form" data-id="${isEditing ? veiculo.id : ''}">
                    <div class="form-group"><label>Modelo*</label><input id="modelo" value="${isEditing ? veiculo.modelo : ''}" required></div>
                    <div class="form-group"><label>Placa*</label><input id="placa" value="${isEditing ? veiculo.placa : ''}" required></div>
                    <div class="form-row">
                        <div class="form-group"><label>Tipo</label><input id="tipo" value="${isEditing ? veiculo.tipo || '' : ''}"></div>
                        <div class="form-group"><label>Ano</label><input type="number" id="ano" value="${isEditing ? veiculo.ano || '' : ''}"></div>
                    </div>
                    <footer class="modal-footer">
                        <button type="button" class="btn btn-secondary close-btn">Cancelar</button>
                        <button type="submit" class="btn btn-primary">${isEditing ? 'Salvar' : 'Adicionar'}</button>
                    </footer>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('veiculo-modal');
    modal.querySelector('.close-button').onclick = () => modal.remove();
    modal.querySelector('.close-btn').onclick = () => modal.remove();
    modal.querySelector('#veiculo-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            modelo: document.getElementById('modelo').value,
            placa: document.getElementById('placa').value,
            tipo: document.getElementById('tipo').value,
            ano: document.getElementById('ano').value,
        };
        
        let url = '/api/frota';
        let method = 'POST';

        if (isEditing) {
            method = 'PUT';
            data.id = veiculo.id;
        }

        // **MODIFICADO**: Usa fetchAuthenticated
        await fetchAuthenticated(url, {
            method: method,
            body: JSON.stringify(data)
        });
        
        modal.remove();
        fetchAndRenderVeiculos();
    };
}
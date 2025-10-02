// js/motoristas.js

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
// LÓGICA DA PÁGINA DE MOTORISTAS
// ===================================================================

async function renderMotoristasPage() {
    pageContent.innerHTML = `
        <div class="page-header">
            <input type="search" id="search-motoristas" class="search-input" placeholder="Buscar motorista por nome...">
            <button id="add-motorista-btn" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Adicionar Motorista</span>
            </button>
        </div>
        <div id="motoristas-table-container">
            <p>Carregando motoristas...</p>
        </div>
    `;
    document.getElementById('add-motorista-btn').addEventListener('click', () => openMotoristaModal());
    document.getElementById('search-motoristas').addEventListener('input', (e) => fetchAndRenderMotoristas(e.target.value));
    await fetchAndRenderMotoristas();
}

async function fetchAndRenderMotoristas(searchTerm = '') {
    const container = document.getElementById('motoristas-table-container');
    container.innerHTML = `<p>Carregando motoristas...</p>`;

    try {
        // **MODIFICADO**: Usa fetchAuthenticated
        const response = await fetchAuthenticated('/api/motoristas');
        if (!response.ok) throw new Error('Erro ao buscar motoristas da API.');
        
        let motoristas = await response.json();

        if (searchTerm) {
            motoristas = motoristas.filter(m => m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (motoristas.length === 0) {
            container.innerHTML = '<p>Nenhum motorista encontrado.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Nome Completo</th>
                    <th>Telefone</th>
                    <th>CNH</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${motoristas.map(m => `
                    <tr data-id="${m.id}">
                        <td>${m.nome_completo}</td>
                        <td>${m.telefone}</td>
                        <td>${m.cnh}</td>
                        <td class="actions">
                            <button class="btn-icon btn-edit-motorista" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                            <button class="btn-icon btn-danger btn-delete-motorista" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.innerHTML = '';
        container.appendChild(table);

        // **MODIFICADO**: Usa fetchAuthenticated para os botões de ação
        document.querySelectorAll('.btn-edit-motorista').forEach(b => b.addEventListener('click', async (e) => {
            const id = e.currentTarget.closest('tr').dataset.id;
            const response = await fetchAuthenticated(`/api/motoristas?id=${id}`);
            const data = await response.json();
            if (data) openMotoristaModal(data);
        }));
        document.querySelectorAll('.btn-delete-motorista').forEach(b => b.addEventListener('click', async (e) => {
            const id = e.currentTarget.closest('tr').dataset.id;
            if (confirm('Tem certeza que deseja excluir este motorista?')) {
                await fetchAuthenticated('/api/motoristas', {
                    method: 'DELETE',
                    body: JSON.stringify({ id })
                });
                fetchAndRenderMotoristas();
            }
        }));
    } catch (error) {
        container.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

function openMotoristaModal(motorista = null) {
    const isEditing = !!motorista;
    const modalHtml = `
        <div class="modal-overlay" id="motorista-modal">
            <div class="modal-content">
                <header class="modal-header"><h2>${isEditing ? 'Editar Motorista' : 'Adicionar Motorista'}</h2><button class="close-button">&times;</button></header>
                <form id="motorista-form" class="modal-form" data-id="${isEditing ? motorista.id : ''}">
                    <div class="form-group"><label>Nome Completo*</label><input id="nome_completo" value="${isEditing ? motorista.nome_completo : ''}" required></div>
                    <div class="form-row">
                        <div class="form-group"><label>Telefone</label><input id="telefone" value="${isEditing ? motorista.telefone || '' : ''}"></div>
                        <div class="form-group"><label>CNH*</label><input id="cnh" value="${isEditing ? motorista.cnh : ''}" required></div>
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
    const modal = document.getElementById('motorista-modal');
    modal.querySelector('.close-button').onclick = () => modal.remove();
    modal.querySelector('.close-btn').onclick = () => modal.remove();
    modal.querySelector('#motorista-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            nome_completo: document.getElementById('nome_completo').value,
            telefone: document.getElementById('telefone').value,
            cnh: document.getElementById('cnh').value,
        };
        
        let url = '/api/motoristas';
        let method = 'POST';

        if (isEditing) {
            method = 'PUT';
            data.id = motorista.id;
        }

        // **MODIFICADO**: Usa fetchAuthenticated
        await fetchAuthenticated(url, {
            method: method,
            body: JSON.stringify(data)
        });
        
        modal.remove();
        fetchAndRenderMotoristas();
    };
}
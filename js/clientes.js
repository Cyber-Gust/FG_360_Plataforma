// js/clientes.js

// ===================================================================
// NOVA FUNÇÃO AUXILIAR PARA REQUISIÇÕES AUTENTICADAS
// ===================================================================

/**
 * Realiza uma chamada fetch para a nossa API, adicionando automaticamente o token de autenticação.
 * @param {string} url - A URL da API para a qual fazer a requisição.
 * @param {object} options - As opções padrão da função fetch (method, headers, body, etc.).
 * @returns {Promise<Response>} - A resposta da chamada fetch.
 */
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
// LÓGICA DA PÁGINA DE CLIENTES (AGORA USANDO A FUNÇÃO AUXILIAR)
// ===================================================================

async function renderClientesPage() {
    pageContent.innerHTML = `
        <div class="page-header">
            <input type="search" id="search-clientes" class="search-input" placeholder="Buscar cliente por nome...">
            <button id="add-cliente-btn" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Adicionar Cliente</span>
            </button>
        </div>
        <div id="clientes-table-container">
            <p>Carregando clientes...</p>
        </div>
    `;

    document.getElementById('add-cliente-btn').addEventListener('click', () => openClienteModal());
    document.getElementById('search-clientes').addEventListener('input', (e) => fetchAndRenderClientes(e.target.value));
    await fetchAndRenderClientes();
}

// **MODIFICADO**: Usa fetchAuthenticated para buscar os clientes
async function fetchAndRenderClientes(searchTerm = '') {
    const container = document.getElementById('clientes-table-container');
    container.innerHTML = '<p>Carregando clientes...</p>'; 

    try {
        // ANTES: const response = await fetch('/api/clientes');
        const response = await fetchAuthenticated('/api/clientes'); // AGORA AUTENTICADO
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro na API: ${response.statusText}`);
        }
        let clientes = await response.json();

        // O resto da função continua igual...
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            clientes = clientes.filter(cliente => cliente.nome_completo.toLowerCase().includes(lowerCaseSearchTerm));
        }

        if (clientes.length === 0) {
            container.innerHTML = '<p>Nenhum cliente encontrado.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Nome Completo</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Empresa</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${clientes.map(cliente => `
                    <tr data-id="${cliente.id}">
                        <td>${cliente.nome_completo}</td>
                        <td>${cliente.email}</td>
                        <td>${cliente.telefone || '-'}</td>
                        <td>${cliente.empresa || '-'}</td>
                        <td class="actions">
                            <button class="btn-icon btn-edit" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                            <button class="btn-icon btn-danger btn-delete" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.innerHTML = '';
        container.appendChild(table);
        addTableActionListeners();
    } catch (error) {
        container.innerHTML = `<p class="error-message">Erro ao buscar clientes: ${error.message}</p>`;
    }
}

function addTableActionListeners() {
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', handleEditCliente);
    });
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', handleDeleteCliente);
    });
}

// **MODIFICADO**: Usa fetchAuthenticated para buscar um cliente específico
async function handleEditCliente(e) {
    const clienteId = e.currentTarget.closest('tr').dataset.id;
    try {
        // ANTES: const response = await fetch(`/api/clientes?id=${clienteId}`);
        const response = await fetchAuthenticated(`/api/clientes?id=${clienteId}`); // AGORA AUTENTICADO
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }
        const cliente = await response.json();
        openClienteModal(cliente);
    } catch (error) {
        alert('Erro ao buscar dados do cliente: ' + error.message);
    }
}

// **MODIFICADO**: Usa fetchAuthenticated para excluir um cliente
async function handleDeleteCliente(e) {
    const clienteId = e.currentTarget.closest('tr').dataset.id;
    
    if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
        try {
            const options = {
                method: 'DELETE',
                body: JSON.stringify({ id: clienteId }),
            };
            // ANTES: const response = await fetch('/api/clientes', options);
            const response = await fetchAuthenticated('/api/clientes', options); // AGORA AUTENTICADO

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }
            await fetchAndRenderClientes();
        } catch (error) {
            alert('Erro ao excluir cliente: ' + error.message);
        }
    }
}

function openClienteModal(cliente = null) {
    // ... (nenhuma mudança necessária dentro desta função)
    const isEditing = cliente !== null;
    const modalTitle = isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente';
    const buttonText = isEditing ? 'Salvar Alterações' : 'Salvar Cliente';

    const modalHtml = `
        <div class="modal-overlay" id="cliente-modal">
            <div class="modal-content">
                <header class="modal-header">
                    <h2>${modalTitle}</h2>
                    <button class="close-button" id="close-modal-btn">&times;</button>
                </header>
                <form id="cliente-form" class="modal-form" data-editing-id="${isEditing ? cliente.id : ''}">
                    <div class="form-group">
                        <label for="nome_completo">Nome Completo *</label>
                        <input type="text" id="nome_completo" value="${isEditing ? cliente.nome_completo : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email *</label>
                        <input type="email" id="email" value="${isEditing ? cliente.email : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="telefone">Telefone</label>
                        <input type="tel" id="telefone" value="${isEditing ? cliente.telefone || '' : ''}">
                    </div>
                    <div class="form-group">
                        <label for="empresa">Empresa</label>
                        <input type="text" id="empresa" value="${isEditing ? cliente.empresa || '' : ''}">
                    </div>
                    <footer class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancelar</button>
                        <button type="submit" class="btn btn-primary">${buttonText}</button>
                    </footer>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('close-modal-btn').addEventListener('click', closeClienteModal);
    document.getElementById('cancel-btn').addEventListener('click', closeClienteModal);
    document.getElementById('cliente-modal').addEventListener('click', (e) => {
        if (e.target.id === 'cliente-modal') {
            closeClienteModal();
        }
    });
    document.getElementById('cliente-form').addEventListener('submit', handleClienteFormSubmit);
}

function closeClienteModal() {
    const modal = document.getElementById('cliente-modal');
    if (modal) {
        modal.remove();
    }
}

// **MODIFICADO**: Usa fetchAuthenticated para criar ou atualizar um cliente
async function handleClienteFormSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const editingId = form.dataset.editingId;

    const clienteData = {
        nome_completo: document.getElementById('nome_completo').value,
        email: document.getElementById('email').value,
        telefone: document.getElementById('telefone').value,
        empresa: document.getElementById('empresa').value,
    };

    let url = '/api/clientes';
    let method = 'POST';

    if (editingId) {
        method = 'PUT';
        clienteData.id = editingId;
    }
    
    try {
        const options = {
            method: method,
            body: JSON.stringify(clienteData),
        };
        // ANTES: const response = await fetch(url, options);
        const response = await fetchAuthenticated(url, options); // AGORA AUTENTICADO

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }

        closeClienteModal();
        await fetchAndRenderClientes();

    } catch (error) {
        alert('Erro ao salvar cliente: ' + error.message);
    }
}
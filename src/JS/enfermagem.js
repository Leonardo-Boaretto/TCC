// Elementos da interface
let tabelaCorpo;
let dataExameInput;
let btnAtualizar;
let botoesFiltro;

// Funções auxiliares
function showNotification(message, type = 'info', duration = 5000) {
    try {
        // Validar parâmetros
        if (typeof message !== 'string' || message.trim() === '') {
            console.warn('[showNotification] Mensagem inválida fornecida');
            return null;
        }
        
        // Mapear tipos para ícones e classes do Bootstrap
        const typeConfig = {
            success: {
                icon: 'check-circle',
                class: 'success',
                ariaLive: 'polite'
            },
            danger: {
                icon: 'exclamation-circle',
                class: 'danger',
                ariaLive: 'assertive'
            },
            warning: {
                icon: 'exclamation-triangle',
                class: 'warning',
                ariaLive: 'assertive'
            },
            info: {
                icon: 'info-circle',
                class: 'info',
                ariaLive: 'polite'
            }
        };
        
        // Obter configuração do tipo ou usar padrão
        const config = typeConfig[type] || typeConfig.info;
        const notificationId = `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Verificar se já existe um container de notificações
        let container = document.getElementById('notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }

        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `alert alert-${config.class} alert-dismissible fade show d-flex align-items-center`;
        notification.role = 'alert';
        notification.style.width = '350px';
        notification.style.marginBottom = '10px';
        notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        notification.setAttribute('aria-live', config.ariaLive);
        notification.setAttribute('aria-atomic', 'true');
        
        // Criar conteúdo da notificação
        const icon = document.createElement('i');
        icon.className = `fas fa-${config.icon} me-2`;
        icon.setAttribute('aria-hidden', 'true');
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close ms-auto';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Fechar notificação');
        
        // Montar a estrutura
        notification.appendChild(icon);
        notification.appendChild(messageSpan);
        notification.appendChild(closeButton);
        
        // Adicionar ao container 
        container.insertBefore(notification, container.firstChild);
        
        // Forçar repintura para garantir a animação
        void notification.offsetWidth;
        
        // Adicionar classe de animação
        notification.classList.add('show');
        
        // Configurar timeout para remoção automática
        let timeoutId;
        const removeNotification = () => {
            if (timeoutId) clearTimeout(timeoutId);
            
            notification.classList.remove('show');
            notification.classList.add('fade');
            
            setTimeout(() => {
                if (container && notification.parentNode === container) {
                    container.removeChild(notification);
                    
                    // Remover container se não houver mais notificações
                    if (container.children.length === 0 && container.parentNode) {
                        document.body.removeChild(container);
                    }
                }
            }, 150);
        };
        
        // Configurar timeout para remoção automática
        if (duration > 0) {
            timeoutId = setTimeout(removeNotification, duration);
        }
        
        // Pausar timeout quando o mouse estiver sobre a notificação
        notification.addEventListener('mouseenter', () => {
            if (timeoutId) clearTimeout(timeoutId);
        });
        
        // Retomar timeout quando o mouse sair da notificação
        notification.addEventListener('mouseleave', () => {
            if (duration > 0) {
                timeoutId = setTimeout(removeNotification, duration);
            }
        });
        
        // Retornar objeto com métodos para controle da notificação
        return {
            element: notification,
            close: () => {
                removeNotification();
            },
            updateMessage: (newMessage) => {
                if (typeof newMessage === 'string' && newMessage.trim() !== '') {
                    messageSpan.textContent = newMessage;
                }
            },
            updateType: (newType) => {
                const newConfig = typeConfig[newType] || typeConfig.info;
                if (newConfig) {
                    // Remover classes de tipo antigas
                    Object.values(typeConfig).forEach(t => {
                        notification.classList.remove(`alert-${t.class}`);
                    });
                    // Adicionar nova classe de tipo
                    notification.classList.add(`alert-${newConfig.class}`);
                    // Atualizar ícone
                    icon.className = `fas fa-${newConfig.icon} me-2`;
                    // Atualizar aria-live
                    notification.setAttribute('aria-live', newConfig.ariaLive);
                }
            }
        };
        
    } catch (error) {
        console.error('Erro ao exibir notificação:', error);
        return null;
    }
}

function formatarData(data) {
    if (!data) return 'N/A';
    try {
        const date = new Date(data);
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        console.error('Erro ao formatar data:', e);
        return 'Data inválida';
    }
}

function formatarHora(horario) {
    if (!horario) return 'N/A';
    try {
        if (typeof horario === 'string') {
            // Extrair apenas a parte da hora (HH:MM)
            const match = horario.match(/^(\d{1,2}:\d{2})/);
            return match ? match[0] : String(horario).substring(0, 5);
        }
        return String(horario).substring(0, 5);
    } catch (e) {
        console.error('Erro ao formatar horário:', e);
        return 'Horário inválido';
    }
}

// Inicializar a aplicação
function initApp() {
    // Verificar se o usuário está autenticado
    if (!localStorage.getItem('token') && !sessionStorage.getItem('token')) {
        console.warn('Usuário não autenticado. Redirecionando para a página de login...');
        window.location.href = '../HTML/login.html';
        return;
    }
    
    try {
        // Inicializar elementos da interface
        tabelaCorpo = document.getElementById('tabela-corpo');
        dataExameInput = document.getElementById('data-exame');
        btnAtualizar = document.getElementById('btn-atualizar');
        botoesFiltro = document.querySelectorAll('.btn-filtro');

        // Definir a data atual como padrão
        const hoje = new Date().toISOString().split('T')[0];
        dataExameInput.value = hoje;

        // Configurar eventos
        setupEventListeners();
        
        // Carregar exames iniciais
        carregarExames();
    } catch (error) {
        showError('Erro ao inicializar a aplicação', error);
    }
}

// Configurar os event listeners
function setupEventListeners() {
    // Evento de mudança de data
    dataExameInput.addEventListener('change', carregarExames);
    
    // Evento de clique no botão de atualizar
    btnAtualizar.addEventListener('click', carregarExames);
    
    // Eventos dos botões de filtro
    botoesFiltro.forEach(botao => {
        botao.addEventListener('click', function() {
            // Remover a classe 'ativo' de todos os botões
            botoesFiltro.forEach(btn => btn.classList.remove('ativo'));
            // Adicionar a classe 'ativo' apenas ao botão clicado
            this.classList.add('ativo');
            // Recarregar os exames com o filtro selecionado
            carregarExames();
        });
    });
}

// Função para obter os headers de autenticação
function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('[DEBUG] Token encontrado no storage:', token);
    
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('[DEBUG] Adicionando token ao cabeçalho:', headers['Authorization']);
    } else {
        console.warn('[DEBUG] Nenhum token encontrado no localStorage ou sessionStorage');
    }
    
    return headers;
}

// Função para carregar os exames
async function carregarExames() {
    try {
        const dataSelecionada = dataExameInput.value;
        const tipoFiltro = document.querySelector('.btn-filtro.ativo')?.dataset.tipo || 'todos';

        console.log(`[DEBUG] Buscando exames para a data: ${dataSelecionada}, filtro: ${tipoFiltro}`);
        
        // Mostrar estado de carregamento
        tabelaCorpo.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-2 mb-0">Carregando exames...</p>
                </td>
            </tr>`;
            
        // Atualizar o horário de atualização
        atualizarHorarioAtualizacao();
        
        // Buscar todos os exames da data selecionada
        const response = await fetch(`/api/exames?data=${dataSelecionada}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include' 
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.erro || `Erro ao carregar exames: ${response.statusText}`);
        }

        let exames = await response.json();
        console.log(`[DEBUG] Exames recebidos:`, exames);
        
        // Limpar a tabela
        tabelaCorpo.innerHTML = '';

        if (!exames || exames.length === 0) {
            tabelaCorpo.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Nenhum exame encontrado para a data selecionada</p>
                        <button class="btn btn-outline-primary mt-3" onclick="document.getElementById('data-exame').valueAsDate = new Date(); carregarExames();">
                            <i class="fas fa-calendar-day me-1"></i> Ver exames de hoje
                        </button>
                    </td>
                </tr>`;
            return;
        }
        
        // Filtrar apenas exames de sangue, urina e fezes
        exames = exames.filter(exame => {
            if (!exame) return false;
            const tipoExame = (exame.tipo_exame || '').toLowerCase();
            return tipoExame.includes('sangue') || 
                   tipoExame.includes('urina') || 
                   tipoExame.includes('fezes');
        });

        if (exames.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="5" class="text-center">Nenhum exame de rotina (sangue, urina ou fezes) encontrado</td>';
            tabelaCorpo.appendChild(tr);
            return;
        }

        // Ordenar exames: primeiro por status (Agendado > Realizado > Cancelado) e depois por horário
        exames.sort((a, b) => {
            // Ordem dos status
            const statusOrder = { 'Agendado': 1, 'Realizado': 2, 'Cancelado': 3 };
            const statusA = a.status || 'Agendado';
            const statusB = b.status || 'Agendado';
            
            // Se os status forem diferentes, ordena pelo status
            if (statusA !== statusB) {
                return statusOrder[statusA] - statusOrder[statusB];
            }
            
            // Se os status forem iguais, ordena pelo horário
            const horaA = a.horario || '';
            const horaB = b.horario || '';
            return horaA.localeCompare(horaB);
        });

        // Preencher a tabela com os exames
        exames.forEach(exame => {
            if (!exame) return;
            
            const tipoExame = (exame.tipo_exame || '').toLowerCase();
            let tipoFiltroExame = '';
            
            // Determinar o tipo de exame para filtro
            if (tipoExame.includes('sangue')) {
                tipoFiltroExame = 'sangue';
            } else if (tipoExame.includes('urina')) {
                tipoFiltroExame = 'urina';
            } else if (tipoExame.includes('fezes')) {
                tipoFiltroExame = 'fezes';
            } else {
                return; // Pular exames que não se encaixam nos tipos desejados
            }

            // Aplicar filtro por tipo de exame
            if (tipoFiltro !== 'todos' && tipoFiltroExame !== tipoFiltro) {
                return;
            }

            // Formatar a hora para exibição
            const horaFormatada = formatarHora(exame.horario);

            const tr = document.createElement('tr');
            tr.setAttribute('data-exame-id', exame.id);
            
            // Adicionar classe com base no status
            if (exame.status === 'Cancelado') {
                tr.classList.add('table-secondary');
            } else if (exame.status === 'Realizado') {
                tr.classList.add('table-success');
            }
            
            tr.innerHTML = `
                <td class="align-middle">${exame.nome_paciente || 'N/A'}</td>
                <td class="align-middle">${exame.tipo_exame || 'N/A'}</td>
                <td class="align-middle">${horaFormatada}</td>
                <td class="align-middle">
                    <span class="badge status-badge bg-${getStatusBadgeClass(exame.status)}">
                        ${exame.status || 'Agendado'}
                    </span>
                </td>
                <td class="align-middle acoes-exame">
                    <div class="d-flex flex-wrap gap-1">
                        <button class="btn btn-sm btn-primary btn-acao" 
                                onclick="visualizarExame(${exame.id})" 
                                title="Visualizar detalhes">
                            <i class="fas fa-eye me-1"></i> Visualizar
                        </button>
                        ${exame.status === 'Agendado' ? `
                        <button class="btn btn-sm btn-success btn-acao" 
                                onclick="marcarExameRealizado(${exame.id}, false, this)" 
                                title="Marcar como realizado">
                            <i class="fas fa-check me-1"></i> Realizar
                        </button>
                        <button class="btn btn-sm btn-danger btn-acao" 
                                onclick="cancelarExame(${exame.id}, this.closest('tr'))" 
                                title="Cancelar exame">
                            <i class="fas fa-times me-1"></i> Cancelar
                        </button>
                        ` : ''}
                        ${exame.status === 'Realizado' ? `
                        <span class="badge bg-success">
                            <i class="fas fa-check-circle me-1"></i> Realizado
                        </span>
                        ` : ''}
                        ${exame.status === 'Cancelado' ? `
                        <span class="badge bg-secondary">
                            <i class="fas fa-ban me-1"></i> Cancelado
                        </span>
                        ` : ''}
                    </div>
                </td>
            `;
            tabelaCorpo.appendChild(tr);
        });

    } catch (error) {
        console.error('Erro ao carregar exames:', error);
        showNotification('Erro ao carregar exames. Por favor, tente novamente.', 'danger');
    }
}


// Função auxiliar para determinar a classe do badge de status
function getStatusBadgeClass(status) {
    if (!status) return 'info';
    
    switch (status.toLowerCase()) {
        case 'realizado':
            return 'success';
        case 'cancelado':
            return 'danger';
        case 'pendente':
            return 'warning';
        default:
            return 'info';
    }
}

// Função para visualizar detalhes do exame
async function visualizarExame(id) {
    try {
        console.log(`[DEBUG] Visualizando exame ID: ${id}`);
        
        // Buscar detalhes do exame
        const response = await fetch(`/api/exames/${id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.erro || 'Erro ao carregar detalhes do exame');
        }
        
        const exame = await response.json();
        console.log('[DEBUG] Detalhes do exame:', exame);
        
        // Formatar a data e hora para exibição
        const dataExame = formatarData(exame.data_exame) || 'Não informada';
        const horario = formatarHora(exame.horario) || 'Não informado';
        
        // Criar o modal de detalhes
        const modalHTML = `
            <div class="modal fade" id="detalhesExameModal" tabindex="-1" aria-labelledby="detalhesExameModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="detalhesExameModalLabel">Detalhes do Exame</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <h6 class="text-muted">Paciente</h6>
                                    <p>${exame.nome_paciente || 'Não informado'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-muted">Médico</h6>
                                    <p>${exame.nome_medico || 'Não informado'} ${exame.crm ? `(CRM: ${exame.crm})` : ''}</p>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <h6 class="text-muted">Tipo de Exame</h6>
                                    <p>${exame.tipo_exame || 'Não informado'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-muted">Status</h6>
                                    <p><span class="badge bg-${getStatusBadgeClass(exame.status)}">${exame.status || 'Agendado'}</span></p>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <h6 class="text-muted">Data do Exame</h6>
                                    <p>${dataExame}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-muted">Horário</h6>
                                    <p>${horario}</p>
                                </div>
                            </div>
                            <div class="mb-3">
                                <h6 class="text-muted">Especificação</h6>
                                <p>${exame.especificacao || 'Não há especificações adicionais'}</p>
                            </div>
                            ${exame.preparacao ? `
                            <div class="mb-3">
                                <h6 class="text-muted">Preparo</h6>
                                <p>${exame.preparacao}</p>
                            </div>
                            ` : ''}
                            ${exame.observacoes ? `
                            <div class="mb-3">
                                <h6 class="text-muted">Observações</h6>
                                <p>${exame.observacoes}</p>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            ${exame.status === 'Agendado' ? `
                            <button type="button" class="btn btn-success" onclick="marcarExameRealizado(${exame.id}, true)">
                                <i class="fas fa-check"></i> Marcar como Realizado
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar o modal ao corpo do documento
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        // Mostrar o modal
        const modal = new bootstrap.Modal(document.getElementById('detalhesExameModal'));
        modal.show();
        
        // Remover o modal do DOM quando for fechado
        document.getElementById('detalhesExameModal').addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modalContainer);
        });
        
    } catch (error) {
        console.error('Erro ao carregar detalhes do exame:', error);
        showNotification(`Erro ao carregar detalhes do exame: ${error.message}`, 'danger');
    }
}

// Função para marcar um exame como realizado
async function marcarExameRealizado(exameId, fromModal = false) {
    try {
        // Usar um modal de confirmação personalizado
        const modalElement = document.getElementById('confirmModal');
        if (!modalElement) {
            throw new Error('Elemento do modal não encontrado');
        }
        
        const modal = new bootstrap.Modal(modalElement);
        const confirmTitle = document.getElementById('confirmModalLabel');
        const confirmBody = document.getElementById('confirmModalBody');
        const confirmBtn = document.getElementById('confirmModalBtn');
        
        if (!confirmTitle || !confirmBody || !confirmBtn) {
            throw new Error('Elementos do modal não encontrados');
        }
        
        // Configurar o modal de confirmação
        confirmTitle.textContent = 'Confirmar Realização de Exame';
        confirmBody.innerHTML = `
            <p>Tem certeza que deseja marcar este exame como realizado?</p>
            <div class="mb-3">
                <label for="observacoesExame" class="form-label">Observações (opcional):</label>
                <textarea class="form-control" id="observacoesExame" rows="3" placeholder="Informe alguma observação sobre o exame, se necessário"></textarea>
            </div>
        `;
        
        // Mostrar o modal e esperar pela resposta do usuário
        const userResponse = await new Promise((resolve) => {
            // Configurar o botão de confirmação
            const confirmHandler = () => {
                // Capturar as observações do campo de texto
                const observacoesInput = document.getElementById('observacoesExame');
                const observacoes = observacoesInput ? observacoesInput.value : '';
                
                modal.hide();
                resolve({ confirmed: true, observacoes });
            };
            
            // Configurar o botão de cancelamento
            const cancelHandler = () => {
                modal.hide();
                resolve({ confirmed: false, observacoes: '' });
            };
            
            // Configurar os botões do modal
            confirmBtn.onclick = confirmHandler;
            modalElement.querySelector('.btn-secondary').onclick = cancelHandler;
            
            // Adicionar evento para quando o modal for fechado
            const handleHidden = () => {
                modalElement.removeEventListener('hidden.bs.modal', handleHidden);
                confirmBtn.onclick = null;
                modalElement.querySelector('.btn-secondary').onclick = null;
                
                // Se ainda não houve resposta, rejeitar a promessa
                if (!userResponse) {
                    resolve({ confirmed: false, observacoes: '' });
                }
            };
            
            modalElement.addEventListener('hidden.bs.modal', handleHidden);
            
            // Mostrar o modal
            modal.show();
        });
        
        // Se o usuário cancelou, não fazer nada
        if (!userResponse || !userResponse.confirmed) {
            return;
        }
        
        // Obter as observações fornecidas pelo usuário
        const observacoes = userResponse.observacoes || '';
        
        showNotification('Processando...', 'info');
        console.log(`[DEBUG] Marcando exame ID ${exameId} como realizado`);
        
        try {
            // Obter os headers de autenticação
            const headers = getAuthHeaders();
            
            // Garantir que o Content-Type está definido corretamente
            headers['Content-Type'] = 'application/json';
            
            console.log('[DEBUG] Headers da requisição:', headers);
            console.log('[DEBUG] Corpo da requisição:', { observacoes });
            
            // Preparar os dados para envio
            const dadosRequisicao = {
                observacoes: observacoes || ''
            };
            
            console.log('[DEBUG] Dados da requisição:', dadosRequisicao);
            
            // Fazer a requisição para marcar o exame como realizado
            const response = await fetch(`/api/exames/${exameId}/finalizar`, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(dadosRequisicao)
            });
            
            console.log('[DEBUG] Resposta da API:', response);
            
            // Verificar se a resposta é JSON
            const contentType = response.headers.get('content-type');
            let result;
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || 'Resposta inválida do servidor');
            }
            
            if (!response.ok) {
                throw new Error(result.erro || 'Erro ao marcar exame como realizado');
            }
            
            // Mostrar mensagem de sucesso
            showNotification('Exame marcado como realizado com sucesso!', 'success');
            
            // Atualizar a interface
            if (fromModal) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('detalhesExameModal'));
                if (modal) modal.hide();
                
                // Atualizar o status na lista após um pequeno atraso para o modal fechar
                setTimeout(() => {
                    const statusElement = document.querySelector(`tr[data-exame-id="${exameId}"] .status-badge`);
                    if (statusElement) {
                        statusElement.className = 'badge bg-success';
                        statusElement.textContent = 'Realizado';
                    }
                }, 300);
            } else {
                // Recarregar a lista de exames
                carregarExames();
            }
            
        } catch (error) {
            console.error('Erro ao marcar exame como realizado:', error);
            showNotification(`Erro ao marcar exame como realizado: ${error.message}`, 'danger');
        }
        
    } catch (error) {
        console.error('Erro ao marcar exame como realizado:', error);
        showNotification(`Erro ao marcar exame como realizado: ${error.message}`, 'danger');
    }
}

// Função para cancelar um exame
async function cancelarExame(exameId, exameElement) {
    console.log(`[DEBUG] Iniciando cancelarExame para o exame ID: ${exameId}`);
    console.log(`[DEBUG] Elemento do exame:`, exameElement);
    
    try {
        console.log('[DEBUG] Verificando se o Bootstrap está disponível...');
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
            console.error('[ERRO] Bootstrap Modal não está disponível');
            throw new Error('Bootstrap Modal não está disponível');
        }
        
        console.log('[DEBUG] Obtendo elementos do modal...');
        // Usar o modal de cancelamento personalizado
        const modalEl = document.getElementById('cancelarExameModal');
        if (!modalEl) {
            console.error('[ERRO] Elemento do modal não encontrado');
            throw new Error('Elemento do modal não encontrado');
        }
        
        console.log('[DEBUG] Criando instância do modal...');
        let modal;
        try {
            modal = new bootstrap.Modal(modalEl, {
                backdrop: 'static',
                keyboard: false
            });
            console.log('[DEBUG] Instância do modal criada com sucesso');
        } catch (error) {
            console.error('[ERRO] Erro ao criar instância do modal:', error);
            throw new Error('Erro ao inicializar o modal de confirmação');
        }
        
        console.log('[DEBUG] Obtendo elementos do formulário...');
        const motivoInput = document.getElementById('motivoCancelamento');
        const confirmBtn = document.getElementById('confirmarCancelamentoBtn');
        const cancelBtn = document.querySelector('#cancelarExameModal .btn-secondary');
        
        if (!motivoInput || !confirmBtn || !cancelBtn) {
            console.error('[ERRO] Elementos do formulário não encontrados:', { 
                motivoInput: !!motivoInput, 
                confirmBtn: !!confirmBtn,
                cancelBtn: !!cancelBtn
            });
            throw new Error('Elementos do formulário não encontrados');
        }
        
        // Resetar o formulário
        console.log('[DEBUG] Resetando o formulário...');
        motivoInput.value = '';
        motivoInput.classList.remove('is-invalid');

        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Atualizar referências
        const confirmBtnRef = newConfirmBtn;
        const cancelBtnRef = newCancelBtn;
        
        // Mostrar o modal e esperar pela resposta do usuário
        console.log('[DEBUG] Iniciando o fluxo de exibição do modal...');
        const userConfirmed = await new Promise((resolve) => {
            let resolved = false;
            
            // Configurar o botão de confirmação
            const confirmHandler = () => {
                if (resolved) return;
                console.log('[DEBUG] Botão de confirmação clicado');
                const motivo = motivoInput.value.trim();
                console.log(`[DEBUG] Motivo informado: '${motivo}'`);
                
                // Validar o motivo
                if (!motivo) {
                    console.log('[DEBUG] Motivo não informado, exibindo erro de validação');
                    motivoInput.classList.add('is-invalid');
                    return;
                }
                
                console.log('[DEBUG] Fechando o modal e resolvendo a Promise com sucesso');
                resolved = true;
                modal.hide();
                resolve({ confirmed: true, motivo });
            };
            
            // Configurar o botão de cancelamento
            const cancelHandler = () => {
                if (resolved) return;
                console.log('[DEBUG] Cancelamento solicitado pelo usuário');
                resolved = true;
                modal.hide();
                resolve({ confirmed: false });
            };
            
            // Adicionar listeners para os eventos
            console.log('[DEBUG] Adicionando event listeners aos botões...');
            confirmBtnRef.onclick = confirmHandler;
            cancelBtnRef.onclick = cancelHandler;
            
            // Configurar evento para fechar o modal com a tecla ESC
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    console.log('[DEBUG] Tecla ESC pressionada');
                    e.preventDefault();
                    if (!resolved) {
                        cancelHandler();
                    }
                }
            };
            
            // Adicionar evento quando o modal for mostrado
            const onShown = () => {
                console.log('[DEBUG] Evento shown.bs.modal disparado');
                try {
                    console.log('[DEBUG] Definindo foco no campo de motivo...');
                    motivoInput.focus();
                    document.addEventListener('keydown', handleKeyDown);
                } catch (error) {
                    console.error('[ERRO] Erro ao configurar foco no campo de motivo:', error);
                }
            };
            
            // Adicionar evento quando o modal for escondido
            const onHidden = () => {
                console.log('[DEBUG] Evento hidden.bs.modal disparado');
                try {
                    // Remover todos os event listeners
                    modalEl.removeEventListener('shown.bs.modal', onShown);
                    modalEl.removeEventListener('hidden.bs.modal', onHidden);
                    document.removeEventListener('keydown', handleKeyDown);
                    
                    if (!resolved) {
                        console.log('[DEBUG] Resolvendo como cancelado após fechamento do modal');
                        resolved = true;
                        resolve({ confirmed: false });
                    }
                } catch (error) {
                    console.error('[ERRO] Erro ao limpar event listeners:', error);
                }
            };
            
            try {
                console.log('[DEBUG] Adicionando event listeners do modal...');
                modalEl.addEventListener('shown.bs.modal', onShown);
                modalEl.addEventListener('hidden.bs.modal', onHidden);
                
                // Mostrar o modal
                console.log('[DEBUG] Mostrando o modal...');
                modal.show();
                
                // Verificar se o modal foi mostrado corretamente
                setTimeout(() => {
                    if (!resolved && !modalEl.classList.contains('show')) {
                        console.error('[ERRO] Falha ao mostrar o modal. Tentando novamente...');
                        modal.hide();
                        modal.show();
                    }
                }, 500);
                
            } catch (error) {
                console.error('[ERRO] Erro ao exibir o modal:', error);
                if (!resolved) {
                    resolved = true;
                    resolve({ confirmed: false });
                }
            }
        });
        
        // Se o usuário cancelou, não fazer nada
        if (!userConfirmed || !userConfirmed.confirmed) {
            return;
        }
        
        try {
            // Mostrar notificação de processamento e armazenar referência
            const notificacao = showNotification('Processando cancelamento do exame...', 'info');
            console.log(`[DEBUG] Cancelando exame ID: ${exameId}`);
            
            const motivo = userConfirmed.motivo;
            const headers = getAuthHeaders();
            
            console.log(`[DEBUG] Enviando requisição para cancelar exame ${exameId}`, { 
                motivo: motivo,
                headers: headers
            });
            
            const response = await fetch(`/api/exames/${exameId}/cancelar`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ motivo: motivo })
            });
            
            console.log(`[DEBUG] Resposta do servidor:`, response);
            
            let result;
            try {
                result = await response.json();
                console.log('[DEBUG] Resposta JSON:', result);
            } catch (e) {
                console.error('[ERRO] Erro ao processar resposta JSON:', e);
                throw new Error('Resposta inválida do servidor');
            }
            
            if (!response.ok) {
                console.error('[ERRO] Erro na resposta:', result);
                throw new Error(result.erro || `Erro ${response.status} ao cancelar o exame`);
            }
            
            // Se tivermos o elemento, atualizamos diretamente
            if (exameElement) {
                // Atualizar o status
                const statusBadge = exameElement.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = 'badge bg-danger';
                    statusBadge.textContent = 'Cancelado';
                }

                // Desabilitar botões de ação
                const botoesAcao = exameElement.querySelectorAll('.btn-acao');
                botoesAcao.forEach(botao => {
                    botao.disabled = true;
                });

                // Adicionar classe de linha desabilitada
                exameElement.classList.add('table-secondary');
            } else {
                carregarExames();
            }
            
            showNotification('Exame cancelado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao cancelar exame:', error);
            
            // Fechar notificação de processamento se existir
            if (typeof notificacao !== 'undefined' && notificacao && typeof notificacao.close === 'function') {
                notificacao.close();
            }
            
            // Tratar diferentes tipos de erros
            let errorMessage = 'Erro ao cancelar o exame';
            
            if (error.name === 'AbortError') {
                errorMessage = 'A requisição demorou muito para ser processada. Verifique sua conexão e tente novamente.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Erro de conexão. Verifique sua conexão com a internet e tente novamente.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Mostrar mensagem de erro detalhada
            showNotification(errorMessage, 'danger');
            
            // Se o erro for de autenticação, redirecionar para a página de login
            if (error.message && (error.message.includes('401') || error.message.toLowerCase().includes('não autorizado'))) {
                console.warn('[AUTH] Redirecionando para a página de login...');
                setTimeout(() => {
                    window.location.href = '../HTML/login.html?session_expired=1';
                }, 2000);
            }
        }
        
    } catch (error) {
        console.error('Erro ao cancelar exame:', error);
        showNotification(`Erro ao cancelar exame: ${error.message}`, 'danger');
    }
}

// Adicionar função getStatusBadgeClass ao escopo global
window.getStatusBadgeClass = function(status) {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
        case 'realizado':
            return 'success';
        case 'cancelado':
            return 'danger';
        case 'agendado':
            return 'info';
        case 'pendente':
            return 'warning';
        default:
            return 'secondary';
    }
};

// Função para atualizar o horário de atualização
function atualizarHorarioAtualizacao() {
    const now = new Date();
    const horaFormatada = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const elementoHora = document.getElementById('hora-atualizacao');
    if (elementoHora) {
        elementoHora.textContent = horaFormatada;
    }
}

// Adicionar funções ao escopo global
window.visualizarExame = visualizarExame;
window.marcarExameRealizado = marcarExameRealizado;
window.cancelarExame = cancelarExame;

// Função para exibir mensagens de erro de forma amigável
function showError(message, error = null) {
    console.error(message, error);
    
    // Verificar se há uma mensagem de erro do servidor
    let errorMessage = message;
    if (error) {
        if (error.response) {
            console.error('Detalhes do erro:', error.response.data);
            errorMessage = error.response.data.erro || message;
        } else if (error.request) {
            console.error('Sem resposta do servidor:', error.request);
            errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
        } else {
            console.error('Erro ao configurar a requisição:', error.message);
        }
    }
    
    showNotification(errorMessage, 'danger');
}

// Manipulador de erros global
window.onerror = function(message, source, lineno, colno, error) {
    const errorMsg = `Erro não tratado: ${message}\nArquivo: ${source}\nLinha: ${lineno}:${colno}`;
    console.error(errorMsg, error);
    
    showError('Ocorreu um erro inesperado. Por favor, recarregue a página e tente novamente.');
    
    return true;
};

// Adicionar listener para erros não capturados em Promises
window.addEventListener('unhandledrejection', function(event) {
    console.error('Erro não tratado em Promise:', event.reason);
    showError('Ocorreu um erro inesperado. Por favor, tente novamente.', event.reason);
    
    // Impedir que o manipulador de erro padrão do navegador seja acionado
    event.preventDefault();
});

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);
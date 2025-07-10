// Função para mascarar CPF (mantém apenas os 3 primeiros e 2 últimos dígitos)
function mascararCPF(cpf) {
    if (!cpf || cpf === 'N/A') return 'N/A';
    // Remove caracteres não numéricos
    const numeros = cpf.replace(/\D/g, '');
    // Mantém apenas os 3 primeiros e 2 últimos dígitos
    return numeros.substring(0, 3) + '.***.***' + (numeros.length > 5 ? '-' + numeros.slice(-2) : '');
}

document.addEventListener('DOMContentLoaded', async () => {
    const funcionarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!funcionarioLogado) {
        alert('Usuário não autenticado!');
        window.location.href = 'login.html';
        return;
    }

    // Elementos da navegação
    const btnConsultas = document.getElementById('btnConsultas');
    const btnExames = document.getElementById('btnExames');
    const btnMedicos = document.getElementById('btnMedicos');
    const btnUsuarios = document.getElementById('btnUsuarios');
    const btnLogout = document.getElementById('btnLogout');
    const btnRelatorios = document.getElementById('btnRelatorios');

    // Seções
    const secaoConsultas = document.getElementById('secaoConsultas');
    const secaoExames = document.getElementById('secaoExames');
    const secaoMedicos = document.getElementById('secaoMedicos');
    const secaoUsuarios = document.getElementById('secaoUsuarios');

    // Funções de navegação
    function mostrarSecao(secao) {
        document.querySelectorAll('.secao').forEach(s => s.classList.add('d-none'));
        if (secao) secao.classList.remove('d-none');
    }

    // Event Listeners para navegação
    if (btnConsultas) {
        btnConsultas.addEventListener('click', async () => {
            mostrarSecao(secaoConsultas);
            await carregarConsultas();
        });
    }
    if (btnExames) {
        btnExames.addEventListener('click', () => mostrarSecao(secaoExames));
    }
    if (btnMedicos) {
        btnMedicos.addEventListener('click', async () => {
            mostrarSecao(secaoMedicos);
            await carregarMedicos();
        });
    }
    if (btnUsuarios) {
        btnUsuarios.addEventListener('click', async () => {
            // Exibir a seção de usuários e ocultar as outras
            document.querySelectorAll('.secao').forEach(secao => secao.classList.add('d-none'));
            secaoUsuarios.classList.remove('d-none');

            try {
                console.log('Iniciando busca de usuários...');
                const response = await fetch('/api/usuarios');
                console.log('Status da resposta:', response.status);
                console.log('Headers da resposta:', response.headers);
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }

                const usuarios = await response.json();
                console.log('Dados recebidos da API:', usuarios); // Log para depuração
                
                const tabelaUsuarios = document.getElementById('tabelaUsuarios');
                if (tabelaUsuarios) {
                    // Limpar completamente a tabela
                    while (tabelaUsuarios.firstChild) {
                        tabelaUsuarios.removeChild(tabelaUsuarios.firstChild);
                    }

                    if (Array.isArray(usuarios) && usuarios.length > 0) {
                        console.log('Encontrados', usuarios.length, 'usuários');
                        usuarios.forEach(usuario => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${usuario.nome || 'N/A'}</td>
                                <td>${mascararCPF(usuario.cpf)}</td>
                                <td>${usuario.email || 'N/A'}</td>
                                <td>${usuario.telefone || 'N/A'}</td>
                                <td>${formatarData(usuario.data_nascimento) || 'N/A'}</td>
                                <td>${usuario.cep || 'N/A'}</td>
                                <td>${usuario.ultimo_acesso ? new Date(usuario.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca acessou'}</td>
                                <td>
                                    <a href="editar_usuario.html?id=${usuario.id}" class="btn btn-sm btn-primary">Editar</a>
                                    <button class="btn btn-sm btn-danger" onclick="cancelarUsuario(${usuario.id})">Inativar</button>
                                </td>
                            `;
                            tabelaUsuarios.appendChild(row);
                        });
                    } else {
                        console.log('Nenhum usuário encontrado');
                        const row = document.createElement('tr');
                        row.innerHTML = '<td colspan="9" class="text-center">Nenhum paciente encontrado</td>';
                        tabelaUsuarios.appendChild(row);
                    }

                    // Garantir que a tabela está visível
                    const tabelaUsuariosParent = tabelaUsuarios.closest('.table-responsive');
                    if (tabelaUsuariosParent) {
                        tabelaUsuariosParent.style.display = 'block';
                    }
                    
                }
            } catch (error) {
                console.error('Erro ao carregar usuários:', error);
                alert('Erro ao carregar usuários. Por favor, tente novamente mais tarde.');
            }
        });
    }

    // Adicionar evento de logout se o botão existir
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Tem certeza que deseja sair?')) {
                localStorage.removeItem('usuarioLogado');
                window.location.href = 'login.html';
            }
        });
    }

    // Adicionar evento para abrir relatórios se o botão existir
    if (btnRelatorios) {
        btnRelatorios.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'relatorios.html';
        });
    }

    // Funções para carregar médicos
    async function carregarMedicos() {
        try {
            const tbody = document.getElementById('tabelaMedicos');
            if (tbody) {
                tbody.innerHTML = ''; 

                const response = await fetch('/api/medicos');
                const medicos = await response.json();

                medicos.forEach(medico => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${medico.nome}</td>
                        <td>${medico.crm}</td>
                        <td>${medico.especialidade}</td>
                        <td>${medico.email}</td>
                        <td>${medico.telefone}</td>
                        <td>
                            <button class="btn btn-sm btn-danger btn-action btn-inativar-medico" data-id="${medico.id}">
                                Inativar
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Adicionar eventos aos botões de inativar após carregar a tabela
                const btnInativarMedicos = document.querySelectorAll('.btn-inativar-medico');
                if (btnInativarMedicos) {
                    btnInativarMedicos.forEach(button => {
                        button.addEventListener('click', function() {
                            const medicoId = this.dataset.id;
                            console.log('Botão de inativar clicado para médico ID:', medicoId);
                            inativarMedico(medicoId);
                        });
                    });
                }

                // Mostrar a seção de médicos
                const secaoMedicos = document.getElementById('secaoMedicos');
                if (secaoMedicos) {
                    secaoMedicos.classList.remove('d-none');
                }

            }
        } catch (error) {
            console.error('Erro ao carregar médicos:', error);
            alert('Erro ao carregar médicos. Por favor, tente novamente.');
        }
    }

    // Função para inativar médico
    async function inativarMedico(medicoId) {
        console.log('Iniciando inativação do médico com ID:', medicoId);
        try {
            // Primeiro verificar se pode inativar
            const response = await fetch(`/api/medicos/${medicoId}/verificar-agendamentos`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Resposta da verificação:', response.status, response.statusText);
            
            if (!response.ok) {
                const error = await response.json();
                console.error('Erro na verificação:', error);
                throw new Error(error.erro || 'Erro ao verificar agendamentos');
            }
            
            const data = await response.json();
            console.log('Dados da verificação:', data);
            
            if (!data.pode_inativar) {
                console.log('Não pode inativar:', data);
                alert(`Não é possível inativar este médico pois ele tem:\n\n${data.total_consultas} consultas marcadas\n${data.total_exames} exames marcados`);
                return;
            }
            
            console.log('Pode inativar:', data);
            

            if (!confirm('Tem certeza que deseja inativar este médico?')) {
                return;
            }
            
            // Inativar médico
            const responseInativar = await fetch(`/api/medicos/${medicoId}/inativar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Resposta da inativação:', responseInativar.status, responseInativar.statusText);
            
            if (!responseInativar.ok) {
                const error = await responseInativar.json();
                console.error('Erro na inativação:', error);
                throw new Error(error.erro || 'Erro ao inativar médico');
            }
            
            const result = await responseInativar.json();
            
            if (responseInativar.ok) {
                console.log('Médico inativado com sucesso:', result);
                alert('Médico inativado com sucesso!');
                // Atualizar a tabela
                carregarMedicos();
            } else {
                console.error('Erro na resposta:', result);
                alert(result.erro || 'Erro ao inativar médico');
            }
            
        } catch (error) {
            console.error('Erro ao inativar médico:', error);
            alert(`Erro ao inativar médico: ${error.message}`);
        }
    }

    async function carregarExames() {
        try {
            console.log('Iniciando carregamento de exames...');
            const response = await fetch('/api/exames', {
                credentials: 'include' 
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro na resposta da API:', response.status, errorData);
                throw new Error(errorData.erro || 'Erro ao buscar exames');
            }


            const exames = await response.json();
            console.log('Exames recebidos:', exames); 
            
            const tabelaExames = document.getElementById('tabelaExames');
            if (tabelaExames) {
                // Limpar a tabela antes de preenchê-la
                tabelaExames.innerHTML = '';

                // Preencher a tabela com os dados dos exames
                exames.forEach(exame => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${exame.nome_paciente || 'N/A'}</td>
                        <td>${exame.tipo_exame || 'N/A'}</td>
                        <td>${exame.nome_medico || 'N/A'}</td>
                        <td>${formatarData(exame.data_exame)}</td>
                        <td>${exame.horario || ''}</td>
                        <td>${exame.status || 'N/A'}</td>
                        <td>
                            <a href="editar-exame.html?id=${exame.id}" class="btn btn-sm btn-primary">Editar</a>
                            <button class="btn btn-sm btn-danger" onclick="cancelarItem('exame', ${exame.id})">Cancelar</button>
                        </td>
                    `;
                    tabelaExames.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar exames:', error);
            alert(`Erro ao carregar exames: ${error.message}`);
        }
    }

    window.cancelarItem = function(tipo, id) {
        // Mostrar o modal de cancelamento
        mostrarModalMotivoCancelamento(id, tipo);
        
        // Configurar o botão de confirmação
        const modal = document.getElementById('modalMotivoCancelamento');
        const confirmarBtn = modal.querySelector('#confirmarCancelamento');
        
        // Remover event listeners anteriores para evitar duplicação
        const newConfirmarBtn = confirmarBtn.cloneNode(true);
        confirmarBtn.parentNode.replaceChild(newConfirmarBtn, confirmarBtn);
        
        newConfirmarBtn.addEventListener('click', async function() {
            const motivoSelect = modal.querySelector('#motivoCancelamento');
            let motivo = motivoSelect.value;
            const tipo = modal.dataset.tipo || 'consulta';
            const id = modal.dataset.id;
            
            if (motivo === 'Outro') {
                motivo = document.getElementById('outroMotivo').value.trim();
                if (!motivo) {
                    alert('Por favor, especifique o motivo do cancelamento.');
                    return;
                }
            }
            
            try {
                console.log(`Enviando requisição para cancelar ${tipo}...`);
                console.log('ID:', id);
                console.log('Motivo:', motivo);
                
                const response = await fetch(`/api/${tipo}s/${id}/cancelar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ motivo })
                });
                
                console.log('Resposta recebida:', response.status, response.statusText);
    
                if (response.ok) {
                    const data = await response.json();
                    alert(`${tipo === 'consulta' ? 'Consulta' : 'Exame'} cancelado com sucesso!`);
                    
                    // Fechar o modal
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    bsModal.hide();
                    
                    // Recarregar a lista apropriada
                    if (tipo === 'consulta') {
                        location.reload();
                    } else {
                        carregarExames();
                    }
                } else {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.erro || `Erro ao cancelar ${tipo}.`);
                }
            } catch (error) {
                console.error(`Erro ao cancelar ${tipo}:`, error);
                alert(`Erro ao cancelar ${tipo}: ${error.message}`);
            }
        });
    }


    // Função para carregar as consultas
    async function carregarConsultas() {
        try {
            console.log('Iniciando carregamento de consultas...');
            const response = await fetch('/api/consultas', {
                credentials: 'include' // Importante para enviar os cookies de sessão
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro na resposta da API:', response.status, errorData);
                throw new Error(errorData.erro || 'Erro ao buscar consultas');
            }

            const consultas = await response.json();
            console.log('Consultas recebidas:', consultas);
            
            const tabelaConsultas = document.getElementById('tabelaConsultas');
            if (tabelaConsultas) {
                // Limpar a tabela antes de preenchê-la
                tabelaConsultas.innerHTML = '';

                // Preencher a tabela com os dados das consultas
                if (consultas.length === 0) {
                    const row = document.createElement('tr');
                    row.innerHTML = '<td colspan="8" class="text-center">Nenhuma consulta agendada</td>';
                    tabelaConsultas.appendChild(row);
                    return;
                }

                consultas.forEach(consulta => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${consulta.nome_paciente || 'N/A'}</td>
                        <td>${consulta.nome_medico || 'N/A'}</td>
                        <td>${consulta.especialidade || 'N/A'}</td>
                        <td>${formatarData(consulta.data_consulta)}</td>
                        <td>${consulta.horario || ''}</td>
                        <td>${consulta.tipo_consulta || 'N/A'}</td>
                        <td><span class="badge bg-${consulta.status === 'Agendado' ? 'success' : 'danger'}">${consulta.status || 'N/A'}</span></td>
                        <td>
                            <a href="editar_consulta.html?id=${consulta.id}" class="btn btn-sm btn-primary">Editar</a>
                            <button class="btn btn-sm btn-danger" onclick="cancelarConsulta(${consulta.id})">Cancelar</button>
                        </td>
                    `;
                    tabelaConsultas.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar consultas:', error);
            alert(`Erro ao carregar consultas: ${error.message}`);
        }
    }


    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        
        try {
            const data = new Date(dataString);
            if (isNaN(data.getTime())) return 'Data inválida';
            
            // Formata como dd/mm/aaaa
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            
            return `${dia}/${mes}/${ano}`;
        } catch (e) {
            console.error('Erro ao formatar data:', e);
            return 'Data inválida';
        }
    }

    // Função para mostrar o modal de motivo de cancelamento
    function mostrarModalMotivoCancelamento(id, tipo = 'consulta') {
        // Criar o modal se não existir
        let modal = document.getElementById('modalMotivoCancelamento');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalMotivoCancelamento';
            modal.className = 'modal fade';
            modal.tabIndex = '-1';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Motivo do Cancelamento</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="motivoCancelamento" class="form-label">Selecione o motivo do cancelamento:</label>
                                <select class="form-select" id="motivoCancelamento">
                                    <option value="Conflitos de horário">Conflitos de horário</option>
                                    <option value="Problemas familiares urgentes">Problemas familiares urgentes</option>
                                    <option value="Melhora dos sintomas">Melhora dos sintomas</option>
                                    <option value="Médico de licença">Médico de licença</option>
                                    <option value="Paciente desistiu">Paciente desistiu</option>
                                    <option value="Paciente não compareceu">Paciente não compareceu</option>
                                    <option value="Outro">Outro</option>
                                </select>
                                <div id="outroMotivoContainer" class="mt-2 d-none">
                                    <label for="outroMotivo" class="form-label">Especifique o motivo:</label>
                                    <input type="text" class="form-control" id="outroMotivo">
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-danger" id="confirmarCancelamento">Confirmar Cancelamento</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Adicionar evento para mostrar/ocultar campo "Outro"
            const motivoSelect = modal.querySelector('#motivoCancelamento');
            const outroContainer = modal.querySelector('#outroMotivoContainer');
            
            motivoSelect.addEventListener('change', function() {
                outroContainer.classList.toggle('d-none', this.value !== 'Outro');
            });
        }
        
        
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Motivo do Cancelamento do ${tipo === 'consulta' ? 'Agendamento' : 'Exame'}`;
        }
        
        // Configurar o modal
        const bsModal = new bootstrap.Modal(modal);
        modal.dataset.id = id;
        modal.dataset.tipo = tipo;
        
        // Limpar campos
        modal.querySelector('#motivoCancelamento').value = 'Conflitos de horário';
        modal.querySelector('#outroMotivo').value = '';
        modal.querySelector('#outroMotivoContainer').classList.add('d-none');
        
        // Mostrar o modal
        bsModal.show();
    }
    
    // Função para cancelar consulta
    window.cancelarConsulta = async function(consultaId) {
        mostrarModalMotivoCancelamento(consultaId);
        
        // Configurar o botão de confirmação
        const modal = document.getElementById('modalMotivoCancelamento');
        const confirmarBtn = modal.querySelector('#confirmarCancelamento');
        
        
        const newConfirmarBtn = confirmarBtn.cloneNode(true);
        confirmarBtn.parentNode.replaceChild(newConfirmarBtn, confirmarBtn);
        
        newConfirmarBtn.addEventListener('click', async function() {
            const motivoSelect = document.getElementById('motivoCancelamento');
            let motivo = motivoSelect.value;
            
            if (motivo === 'Outro') {
                motivo = document.getElementById('outroMotivo').value.trim();
                if (!motivo) {
                    alert('Por favor, especifique o motivo do cancelamento.');
                    return;
                }
            }
            
            try {
                console.log('Enviando requisição para cancelar consulta...');
                console.log('Motivo:', motivo);
                
                const response = await fetch(`/api/consultas/${consultaId}/cancelar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'include', 
                    body: JSON.stringify({ motivo })
                });
                
                console.log('Resposta recebida:', response.status, response.statusText);
    
                if (response.ok) {
                    const data = await response.json();
                    alert('Consulta cancelada com sucesso!');
                    location.reload();
                } else {
                    const error = await response.json();
                    alert(error.message || 'Erro ao cancelar consulta.');
                }
            } catch (error) {
                console.error('Erro ao cancelar consulta:', error);
                alert('Erro ao cancelar consulta. Por favor, tente novamente.');
            } finally {
                // Fechar o modal após a conclusão
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
        });
    }

    // Função para cancelar usuário
    window.cancelarUsuario = async function(usuarioId) {
        if (!confirm('Tem certeza que deseja cancelar este usuário?')) {
            return;
        }

        try {
            // verificar se pode cancelar
            const verificarResponse = await fetch(`/api/usuarios/${usuarioId}/verificar-agendamentos`, {
                method: 'GET'
            });
            
            const verificarDados = await verificarResponse.json();
            
            if (!verificarDados.pode_cancelar) {
                let mensagemErro = 'Não é possível cancelar este usuário pois ele tem ';
                if (verificarDados.total_consultas > 0 && verificarDados.total_exames > 0) {
                    mensagemErro += `${verificarDados.total_consultas} consulta(s) e ${verificarDados.total_exames} exame(s) agendados.`;
                } else if (verificarDados.total_consultas > 0) {
                    mensagemErro += `${verificarDados.total_consultas} consulta(s) agendada(s).`;
                } else {
                    mensagemErro += `${verificarDados.total_exames} exame(s) agendado(s).`;
                }
                alert(mensagemErro);
                return;
            }

            // pode cancelar o usuário
            const response = await fetch(`/api/usuarios/${usuarioId}/cancelar`, {
                method: 'POST'
            });

            if (response.ok) {
                alert('Usuário cancelado com sucesso!');
                location.reload(); 
            } else {
                const erro = await response.json();
                console.error('Erro na resposta da API:', erro);
                alert(`Erro ao cancelar usuário: ${erro.erro || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao cancelar usuário:', error);
            alert('Erro ao cancelar usuário. Por favor, tente novamente.');
        }
    }

    // Carregar dados iniciais
    carregarExames();
    carregarMedicos();
    carregarConsultas(); 
});
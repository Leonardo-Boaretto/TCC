// Variáveis globais para armazenar o tipo de agendamento e o cliente selecionado
let tipoAgendamento = '';
let clienteSelecionado = null;
let dataAgendamento = '';
let horarioAgendamento = '';
let tipoConsultaExame = '';

let clientes = []; 
let medicos = []; 

document.addEventListener('DOMContentLoaded', async () => {
    console.log('marcar-consulta-exame.js: DOMContentLoaded - Iniciando script.');
    await carregarClientesDaAPI();
    await carregarMedicosDaAPI(); 
    
    init(); 
});

async function carregarClientesDaAPI() {
    console.log('marcar-consulta-exame.js: carregarClientesDaAPI - Buscando clientes da API...');
    try {
        const response = await fetch('/api/usuarios');
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        clientes = await response.json();
        console.log('marcar-consulta-exame.js: carregarClientesDaAPI - Clientes carregados:', clientes);
        if (clientes.length === 0) {
            console.warn('marcar-consulta-exame.js: carregarClientesDaAPI - Nenhum cliente ativo encontrado.');
        }
    } catch (error) {
        console.error('marcar-consulta-exame.js: Erro ao carregar clientes da API:', error);
        alert('Falha ao carregar a lista de pacientes. Por favor, tente recarregar a página.');
    }
}

async function carregarMedicosDaAPI() {
    console.log('marcar-consulta-exame.js: carregarMedicosDaAPI - Buscando médicos da API...');
    try {
        const response = await fetch('/api/medicos'); // Endpoint que lista todos os médicos
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        medicos = await response.json();
        
        // Garantir que cada médico tenha as propriedades necessárias
        medicos = medicos.map(medico => ({
            id: medico.id || medico._id || '',
            nome: medico.nome || medico.name || 'Médico sem nome',
            especialidade: medico.especialidade || 'Sem especialidade',
            ativo: medico.ativo !== undefined ? medico.ativo : true,
            ...medico
        }));
        
        console.log('marcar-consulta-exame.js: carregarMedicosDaAPI - Médicos carregados e formatados:', medicos);
        
        // Popular os selects de médicos para exames
        popularSelectMedicosSolicitantes();
        popularSelectMedicosRealizantes();
        
        if (medicos.length === 0) {
            console.warn('marcar-consulta-exame.js: carregarMedicosDaAPI - Nenhum médico encontrado.');
        } else {
            console.log('marcar-consulta-exame.js: carregarMedicosDaAPI - Total de médicos ativos:', 
                        medicos.filter(m => m.ativo).length);
        }
    } catch (error) {
        console.error('marcar-consulta-exame.js: Erro ao carregar médicos da API:', error);
        alert('Falha ao carregar a lista de médicos. Por favor, tente recarregar a página.');
        // Inicializa como array vazio em caso de erro para evitar erros posteriores
        medicos = [];
    }
}

// Função para controlar a visibilidade do campo de médico realizante
function atualizarVisibilidadeMedicoRealizante() {
    const tipoExameSelect = document.getElementById('tipoExame');
    const medicoRealizanteLabel = document.querySelector('label[for="medicoExame"]');
    const medicoRealizanteSelect = document.getElementById('medicoExame');
    const medicoRealizanteFeedback = document.getElementById('medicoExameFeedback');
    
    if (!tipoExameSelect || !medicoRealizanteLabel || !medicoRealizanteSelect) return;
    
    const tipoExame = tipoExameSelect.value;
    const exigeMedicoRealizante = ['Cardiologico', 'Respiratorio', 'Imagem'].includes(tipoExame);
    
    if (exigeMedicoRealizante) {
        medicoRealizanteLabel.classList.add('required');
        medicoRealizanteSelect.required = true;
        medicoRealizanteSelect.disabled = false;
        if (medicoRealizanteFeedback) medicoRealizanteFeedback.style.display = 'block';
        
      
        if (medicoRealizanteSelect.options.length <= 1) {
            popularSelectMedicosRealizantes();
        }
    } else {
        medicoRealizanteLabel.classList.remove('required');
        medicoRealizanteSelect.required = false;
        medicoRealizanteSelect.disabled = true;
        medicoRealizanteSelect.value = ''; // Limpar seleção
        if (medicoRealizanteFeedback) medicoRealizanteFeedback.style.display = 'none';
    }
}

// Adicionar evento de mudança ao select de tipo de exame
document.addEventListener('DOMContentLoaded', function() {
    const tipoExameSelect = document.getElementById('tipoExame');
    if (tipoExameSelect) {
        tipoExameSelect.addEventListener('change', atualizarVisibilidadeMedicoRealizante);
        // Executar uma vez para configurar o estado inicial
        atualizarVisibilidadeMedicoRealizante();
    }
});

// Função para popular o select de médicos solicitantes (para exames)
function popularSelectMedicosSolicitantes() {
    const selectSolicitante = document.getElementById('medicoSolicitanteExame');
    if (!selectSolicitante) return;
    
    // Limpar opções atuais, exceto a primeira
    while (selectSolicitante.options.length > 1) {
        selectSolicitante.remove(1);
    }
    
    // Adicionar médicos ativos
    const medicosAtivos = medicos.filter(medico => medico.ativo);
    
    if (medicosAtivos.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Nenhum médico disponível';
        selectSolicitante.appendChild(option);
        selectSolicitante.disabled = true;
    } else {
        medicosAtivos.forEach(medico => {
            const option = document.createElement('option');
            option.value = medico.id;
            option.textContent = medico.nome;
            selectSolicitante.appendChild(option);
        });
        selectSolicitante.disabled = false;
    }
}

// Função para popular o select de médicos realizantes (para exames)
function popularSelectMedicosRealizantes() {
    const selectRealizante = document.getElementById('medicoExame');
    if (!selectRealizante) return;
    
    // Limpar opções atuais, exceto a primeira
    while (selectRealizante.options.length > 1) {
        selectRealizante.remove(1);
    }
    
    // Adicionar médicos ativos
    const medicosAtivos = medicos.filter(medico => medico.ativo);
    
    if (medicosAtivos.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Nenhum médico disponível';
        selectRealizante.appendChild(option);
    } else {
        medicosAtivos.forEach(medico => {
            const option = document.createElement('option');
            option.value = medico.id;
            option.textContent = medico.nome;
            selectRealizante.appendChild(option);
        });
    }
    
    // Verificar se deve habilitar ou desabilitar o select
    atualizarVisibilidadeMedicoRealizante();
}

// Banco de dados temporário de agendamentos
const agendamentos = [];

// Função para selecionar o tipo de agendamento (consulta ou exame)
function selecionarTipo(tipo) {
    console.log(`selecionarTipo - Tipo selecionado: ${tipo}`);
    tipoAgendamento = tipo;
    
    // Atualizar a navegação de passos
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    
    // Limpar e carregar clientes
    carregarClientes(); 
    
    // Obter a especialidade selecionada, se houver
    const especialidadeSelect = document.getElementById('especialidadeConsulta');
    const especialidade = especialidadeSelect ? especialidadeSelect.value : '';
    
    console.log(`selecionarTipo - Especialidade selecionada: ${especialidade}`);
    
    if (tipo === 'consulta') {
        console.log('Mostrando container de consulta');
        document.getElementById('tipoConsultaContainer').style.display = 'block';
        document.getElementById('tipoExameContainer').style.display = 'none';
        
        // Forçar a atualização da lista de médicos
        popularSelectMedicos('medicoConsulta');
        
        console.log("marcar-consulta-exame.js: selecionarTipo - Tipo Consulta selecionado, populando medicoConsulta.");
    } else if (tipo === 'exame') {
        console.log('Mostrando container de exame');
        document.getElementById('tipoConsultaContainer').style.display = 'none';
        document.getElementById('tipoExameContainer').style.display = 'block';
        
        // Para exames, não precisamos filtrar por especialidade
        // Vamos garantir que os selects de médicos estejam corretos
        popularSelectMedicosSolicitantes(); // Atualiza a lista de médicos solicitantes
        popularSelectMedicosRealizantes(); // Atualiza a lista de médicos realizantes
        
        // Desabilita o select de médicos realizantes por padrão
        const medicoRealizanteSelect = document.getElementById('medicoExame');
        if (medicoRealizanteSelect) {
            medicoRealizanteSelect.disabled = true;
        }
        
        console.log("marcar-consulta-exame.js: selecionarTipo - Tipo Exame selecionado, configurando selects de médicos.");
    }

    // Mostrar notificação
    mostrarNotificacao(`Tipo de agendamento selecionado: ${tipo === 'consulta' ? 'Consulta Médica' : 'Exame'}`, 'info');
}

// Função para carregar a lista de clientes
function carregarClientes() {
    const listaClientes = document.getElementById('listaClientes');
    listaClientes.innerHTML = '';
    
    clientes.forEach(cliente => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.dataset.id = cliente.id;
        li.innerHTML = `
            <div class="cliente-info">
                <div class="cliente-details">
                    <span class="cliente-nome">${cliente.nome}</span>
                    <span class="cliente-email">${cliente.email}</span>
                </div>
            </div>
        `;
        li.addEventListener('click', () => selecionarCliente(cliente));
        listaClientes.appendChild(li);
    });
    
    // Adicionar evento de busca
    const searchInput = document.getElementById('searchCliente');
    searchInput.addEventListener('input', filtrarClientes);
}

// Função para filtrar médicos por especialidade
function filtrarMedicosPorEspecialidade(selectId, especialidade) {
    console.log(`filtrarMedicosPorEspecialidade - Iniciando filtro para especialidade: ${especialidade} no select: ${selectId}`);
    console.log('Lista completa de médicos:', medicos);
    
    const medicoSelect = document.getElementById(selectId);
    if (!medicoSelect) {
        console.error(`marcar-consulta-exame.js: filtrarMedicosPorEspecialidade - Elemento select ${selectId} não encontrado.`);
        return;
    }
    
    // Se não houver especialidade selecionada, limpa o select
    if (!especialidade) {
        console.log('Nenhuma especialidade selecionada, limpando select');
        medicoSelect.innerHTML = '<option value="">Selecione um médico</option>';
        medicoSelect.disabled = true;
        return;
    }
    
    // Filtra os médicos ativos da especialidade selecionada
    const medicosFiltrados = medicos.filter(medico => {
        console.log(`Verificando médico: ${medico.nome}, Especialidade: ${medico.especialidade}, Ativo: ${medico.ativo}`);
        return medico.ativo && medico.especialidade === especialidade;
    });
    
    console.log(`Médicos filtrados para ${especialidade}:`, medicosFiltrados);
    
    // Atualiza o select com os médicos filtrados
    medicoSelect.innerHTML = '<option value="">Selecione um médico</option>';
    
    if (medicosFiltrados.length === 0) {
        console.log('Nenhum médico encontrado para a especialidade:', especialidade);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Nenhum médico disponível';
        medicoSelect.appendChild(option);
        medicoSelect.disabled = true;
    } else {
        console.log(`${medicosFiltrados.length} médicos encontrados para a especialidade:`, especialidade);
        medicosFiltrados.forEach(medico => {
            const option = document.createElement('option');
            option.value = medico.id;
            option.textContent = medico.nome;
            option.dataset.especialidade = medico.especialidade;
            medicoSelect.appendChild(option);
        });
        medicoSelect.disabled = false;
    }
    
    console.log(`marcar-consulta-exame.js: filtrarMedicosPorEspecialidade - Médicos filtrados para especialidade ${especialidade}:`, medicosFiltrados);
}

// Função para popular o select de médicos
function popularSelectMedicos(selectId) { 
    console.log(`popularSelectMedicos - Iniciando para select: ${selectId}`);
    
    const especialidadeSelect = document.getElementById('especialidadeConsulta');
    let especialidade = '';
    
    if (especialidadeSelect) {
        especialidade = especialidadeSelect.value;
        console.log(`popularSelectMedicos - Especialidade do select: ${especialidade}`);
    } else {
        console.log('popularSelectMedicos - Select de especialidade não encontrado');
    }
    
    const medicoSelect = document.getElementById(selectId);
    if (!medicoSelect) {
        console.error(`popularSelectMedicos - Select ${selectId} não encontrado`);
        return;
    }
    
    // Limpa o select
    medicoSelect.innerHTML = '<option value="">Selecione um médico</option>';
    
    // Se não houver especialidade selecionada, desabilita o select
    if (!especialidade) {
        console.log('popularSelectMedicos - Nenhuma especialidade selecionada, desabilitando select de médicos');
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Selecione uma especialidade primeiro';
        medicoSelect.appendChild(option);
        medicoSelect.disabled = true;
        return;
    }
    
    // Se houver especialidade selecionada, filtra os médicos
    console.log(`popularSelectMedicos - Filtrando médicos para especialidade: ${especialidade}`);
    filtrarMedicosPorEspecialidade(selectId, especialidade);
}

// Função para filtrar clientes na busca
function filtrarClientes() {
    const searchTerm = document.getElementById('searchCliente').value.toLowerCase();
    const clienteItems = document.querySelectorAll('#listaClientes .list-group-item');
    
    clienteItems.forEach(item => {
        const clienteNome = item.querySelector('.cliente-nome').textContent.toLowerCase();
        const clienteEmail = item.querySelector('.cliente-email').textContent.toLowerCase();
        
        if (clienteNome.includes(searchTerm) || clienteEmail.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Função para selecionar um cliente
function selecionarCliente(cliente) {
    clienteSelecionado = cliente;
    
    // Remover seleção anterior
    document.querySelectorAll('#listaClientes .list-group-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Adicionar seleção ao cliente atual
    document.querySelector(`#listaClientes .list-group-item[data-id="${cliente.id}"]`).classList.add('selected');
    
    // Avançar para a próxima etapa
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step3').classList.add('active');
    
    // Mostrar o campo específico para o tipo de agendamento
    if (tipoAgendamento === 'consulta') {
        document.getElementById('tipoConsultaContainer').style.display = 'block';
        document.getElementById('tipoExameContainer').style.display = 'none';
        
    } else {
        document.getElementById('tipoConsultaContainer').style.display = 'none';
        document.getElementById('tipoExameContainer').style.display = 'block';
    }
    
    // Configurar o campo de data
    const dataInput = document.getElementById('data');
    // Definir a data mínima como o dia atual
    const hoje = new Date();
    const dataMinima = hoje.toISOString().split('T')[0];
    dataInput.min = dataMinima; // Data mínima é o dia atual
    
    // Adicionar evento para atualizar horários disponíveis quando a data mudar
    dataInput.addEventListener('change', atualizarHorariosDisponiveis);
    
    // Mostrar notificação
    mostrarNotificacao(`Cliente selecionado: ${cliente.nome}`, 'info');
}

// Função para voltar para uma etapa anterior
function voltarEtapa(etapa) {
    // Esconder todas as etapas
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Mostrar a etapa desejada
    document.getElementById(`step${etapa}`).classList.add('active');
}

// Função para atualizar os horários disponíveis com base na data selecionada
function atualizarHorariosDisponiveis() {
    const dataInput = document.getElementById('data');
    const horarioSelect = document.getElementById('horario');
    const dataSelecionada = dataInput.value;
    
    // Limpar opções atuais
    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
    
    // Verificar se a data é válida (não é anterior ao dia atual)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataSelecionadaObj = new Date(dataSelecionada);
    
    if (dataSelecionadaObj < hoje) {
        mostrarNotificacao('Por favor, selecione uma data futura.', 'error');
        return;
    }
    
    // Horários disponíveis (pode ser personalizado conforme necessidade)
    const horariosDisponiveis = [
        '08:00', '09:00', '10:00', '11:00', 
        '14:00', '15:00', '16:00', '17:00'
    ];
    
    // Adicionar horários disponíveis
    horariosDisponiveis.forEach(horario => {
        const option = document.createElement('option');
        option.value = horario;
        option.textContent = horario;
        horarioSelect.appendChild(option);
    });
    
    mostrarNotificacao('Horários disponíveis carregados', 'success');
}

// Função para confirmar o agendamento
async function confirmarAgendamento() { 
    // Validar campos
    const dataInput = document.getElementById('data');
    const horarioSelect = document.getElementById('horario');
    let medicoIdSelecionado = null;
    let nomeMedicoSelecionado = '';
    
    if (!dataInput.value) {
        mostrarNotificacao('Por favor, selecione a data.', 'error');
        return;
    }
    const dataAgendamento = dataInput.value; // yyyy-mm-dd
    const horarioAgendamento = horarioSelect.value; // hh:mm

    // Log adicionado para depuração
    console.log('Valores de data e hora capturados:', { dataAgendamento, horarioAgendamento });

    if (!horarioSelect.value) {
        mostrarNotificacao('Por favor, selecione um horário.', 'error');
        return;
    }
    
    // Obter tipo específico de consulta ou exame
    let tipoEspecifico = '';
    if (tipoAgendamento === 'consulta') {
        const tipoConsultaSelect = document.getElementById('tipoConsulta');
        const medicoConsultaSelect = document.getElementById('medicoConsulta');
        if (!tipoConsultaSelect.value) {
            mostrarNotificacao('Por favor, selecione o tipo de consulta.', 'error');
            return;
        }
        if (!medicoConsultaSelect.value) {
            mostrarNotificacao('Por favor, selecione o médico.', 'error');
            return;
        }
        tipoEspecifico = tipoConsultaSelect.value;
        medicoIdSelecionado = medicoConsultaSelect.value;
        const medicoObj = medicos.find(m => m.id == medicoIdSelecionado); 
        if (medicoObj) {
            nomeMedicoSelecionado = medicoObj.nome;
        }

    } else {
        const tipoExameSelect = document.getElementById('tipoExame');
        const especificacaoExameInput = document.getElementById('especificacaoExame');
        const medicoExameSelect = document.getElementById('medicoExame');
        const medicoSolicitanteExameSelect = document.getElementById('medicoSolicitanteExame');
        const preparacaoSelect = document.getElementById('preparacao');

        if (!tipoExameSelect.value) {
            mostrarNotificacao('Por favor, selecione o tipo de exame.', 'error');
            return;
        }
        if (!especificacaoExameInput.value.trim()) {
            mostrarNotificacao('Por favor, informe a especificação do exame.', 'error');
            return;
        }
        if (!medicoSolicitanteExameSelect.value) {
            mostrarNotificacao('Por favor, selecione o médico solicitante do exame.', 'error');
            return;
        }
        
        // Verificar se é um exame que exige médico realizante
        const exigeMedicoRealizante = ['Cardiologico', 'Respiratorio', 'Imagem'].includes(tipoExameSelect.value);
        if (exigeMedicoRealizante && !medicoExameSelect.value) {
            mostrarNotificacao('Por favor, selecione o médico realizante do exame.', 'error');
            return;
        }

        const tipoExameSelecionado = tipoExameSelect.value;
        const especificacaoExameSelecionado = especificacaoExameInput.value.trim();
        const medicoExameIdSelecionado = medicoExameSelect.value;
        const medicoSolicitanteExameIdSelecionado = medicoSolicitanteExameSelect.value;
        
        const medicoExameObj = medicos.find(m => m.id == medicoExameIdSelecionado);
        const nomeMedicoExameSelecionado = medicoExameObj ? medicoExameObj.nome : 'N/A';

        const medicoSolicitanteExameObj = medicos.find(m => m.id == medicoSolicitanteExameIdSelecionado);
        const nomeMedicoSolicitanteExameSelecionado = medicoSolicitanteExameObj ? medicoSolicitanteExameObj.nome : 'N/A';

        const preparacaoText = {
            'jejum-8': 'Jejum de 8 horas',
            'jejum-12': 'Jejum de 12 horas',
            'jejum-4': 'Jejum de 4 horas',
            'sem-jejum': 'Sem jejum'
        }[preparacaoSelect.value] || preparacaoSelect.value;

        // ID do médico padrão (substitua pelo ID de um médico padrão no seu sistema)
        const MEDICO_PADRAO_ID = 1; // TODO: Substitua pelo ID correto do médico padrão
        
        // Criar objeto base do payload
        const payloadExame = {
            tipo_exame: tipoExameSelecionado,
            especificacao: especificacaoExameSelecionado,
            medico_solicitante_id: parseInt(medicoSolicitanteExameIdSelecionado), 
            usuario_id: clienteSelecionado.id,
            data_exame: dataAgendamento, // yyyy-mm-dd
            horario: horarioAgendamento, // hh:mm
            preparacao: preparacaoSelect.value,
            preparacao_texto: preparacaoText,
            // Usar médico padrão quando não for um exame que exige médico específico
            medico_id: exigeMedicoRealizante && medicoExameIdSelecionado 
                ? parseInt(medicoExameIdSelecionado) 
                : MEDICO_PADRAO_ID
        };
        
        console.log('Payload do exame:', payloadExame);

        console.log('marcar-consulta-exame.js: Enviando para /api/agendar-exame:', payloadExame);

        try {
            const response = await fetch('/api/agendar-exame', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payloadExame),
            });

            const resultadoAPI = await response.json();

            if (!response.ok) {
                throw new Error(resultadoAPI.erro || `Erro HTTP: ${response.status}`);
            }

            const confirmationDetails = document.getElementById('confirmationDetails');
            confirmationDetails.innerHTML = `
                <p><strong>Cliente:</strong> ${clienteSelecionado.nome}</p>
                <p><strong>Tipo:</strong> Exame</p>
                <p><strong>Tipo de Exame:</strong> ${tipoExameSelect.options[tipoExameSelect.selectedIndex].text}</p> 
                <p><strong>Especificação:</strong> ${especificacaoExameSelecionado}</p>
                <p><strong>Médico Solicitante:</strong> ${nomeMedicoSolicitanteExameSelecionado}</p>
                <p><strong>Médico Realizante:</strong> ${nomeMedicoExameSelecionado}</p>
                <p><strong>Preparação:</strong> ${preparacaoText}</p>
                <p><strong>Data:</strong> ${formatarData(dataAgendamento)}</p>
                <p><strong>Horário:</strong> ${horarioAgendamento}</p>
                <p><strong>Status:</strong> ${resultadoAPI.mensagem || 'Agendado com sucesso!'}</p>
                ${resultadoAPI.id_exame ? `<p><strong>Código de Agendamento:</strong> #${resultadoAPI.id_exame}</p>` : ''}
            `;
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step4').classList.add('active');
            mostrarNotificacao('Exame agendado com sucesso via API!', 'success');
            console.log('marcar-consulta-exame.js: Agendamento de EXAME realizado via API:', resultadoAPI);

        } catch (error) {
            console.error('marcar-consulta-exame.js: Erro ao agendar exame via API:', error);
            mostrarNotificacao(`Erro ao agendar exame: ${error.message}`, 'error');
            return; // Não prosseguir para a tela de confirmação se der erro
        }

    }
    
    // Salvar dados do agendamento
    tipoConsultaExame = tipoEspecifico;
    
    if (tipoAgendamento === 'consulta') {
        const medicoObj = medicos.find(m => m.id == medicoIdSelecionado);
        if (!medicoObj) {
            mostrarNotificacao('Erro: Médico selecionado não encontrado nos dados carregados.', 'error');
            return;
        }

        const payloadConsulta = {
            especialidade: medicoObj.especialidade, 
            medico_id: parseInt(medicoIdSelecionado), 
            usuario_id: clienteSelecionado.id,
            data_consulta: dataAgendamento,
            horario: horarioAgendamento,
            tipo_consulta: tipoConsultaExame, 
            observacoes: null 
        };

        console.log('marcar-consulta-exame.js: Enviando para /api/agendar-consulta:', payloadConsulta);

        try {
            const response = await fetch('/api/agendar-consulta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payloadConsulta),
            });

            const resultadoAPI = await response.json();

            if (!response.ok) {
                throw new Error(resultadoAPI.erro || `Erro HTTP: ${response.status}`);
            }

            // Mostrar detalhes da confirmação
            const confirmationDetails = document.getElementById('confirmationDetails');
            confirmationDetails.innerHTML = `
                <p><strong>Cliente:</strong> ${clienteSelecionado.nome}</p>
                <p><strong>Tipo:</strong> Consulta Médica</p>
                <p><strong>Tipo de Consulta:</strong> ${getTipoNome(tipoConsultaExame)}</p>
                <p><strong>Médico:</strong> ${nomeMedicoSelecionado}</p>
                <p><strong>Data:</strong> ${formatarData(dataAgendamento)}</p>
                <p><strong>Horário:</strong> ${horarioAgendamento}</p>
                <p><strong>Status:</strong> ${resultadoAPI.mensagem || 'Agendado com sucesso!'}</p>
                ${resultadoAPI.id_agendamento ? `<p><strong>Código de Agendamento:</strong> #${resultadoAPI.id_agendamento}</p>` : ''}
            `;
             // Avançar para a etapa de confirmação
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step4').classList.add('active');
        
            // Mostrar notificação
            mostrarNotificacao('Consulta agendada com sucesso!', 'success');
            console.log('marcar-consulta-exame.js: Agendamento de consulta realizado via API:', resultadoAPI);

        } catch (error) {
            console.error('marcar-consulta-exame.js: Erro ao agendar consulta via API:', error);
            mostrarNotificacao(`Erro ao agendar consulta: ${error.message}`, 'error');
            return; 
        }

    }
    
}

// Função para formatar a data
function formatarData(dataString) {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

// Função para obter o nome do tipo de consulta ou exame
function getTipoNome(tipo) {
    const tiposConsulta = {
        'rotina': 'Consulta de Rotina',
        'retorno': 'Retorno',
        'urgencia': 'Urgência'
    };
    
    const tiposExame = {
        'sangue': 'Exame de Sangue',
        'urina': 'Exame de Urina',
        'imagem': 'Exame de Imagem',
        'eletrocardiograma': 'Eletrocardiograma'
    };
    
    return tiposConsulta[tipo] || tiposExame[tipo] || tipo;
}

// Função para iniciar um novo agendamento
function novoAgendamento() {
    // Limpar dados
    tipoAgendamento = '';
    clienteSelecionado = null;
    dataAgendamento = '';
    horarioAgendamento = '';
    tipoConsultaExame = '';
    
    // Limpar campos
    document.getElementById('data').value = '';
    document.getElementById('horario').innerHTML = '<option value="">Selecione um horário</option>';
    document.getElementById('tipoConsulta').value = '';
    document.getElementById('tipoExame').value = '';
    document.getElementById('searchCliente').value = '';
    
    // Voltar para a primeira etapa
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById('step1').classList.add('active');
    
    // Mostrar notificação
    mostrarNotificacao('Iniciando novo agendamento', 'info');
}

// Função para mostrar notificações
function mostrarNotificacao(mensagem, tipo) {
    // Remover notificações existentes
    const notificacoesExistentes = document.querySelectorAll('.notification');
    notificacoesExistentes.forEach(notificacao => {
        notificacao.remove();
    });
    
    // Criar nova notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notification ${tipo}`;
    notificacao.textContent = mensagem;
    document.body.appendChild(notificacao);
    
    // Remover notificação após 5 segundos
    setTimeout(() => {
        notificacao.classList.add('fade-out');
        setTimeout(() => {
            notificacao.remove();
        }, 500);
    }, 5000);
}

// Função para adicionar estilos de notificação dinamicamente
function adicionarEstilosNotificacao() {
    // Verificar se os estilos já existem
    if (document.getElementById('notificacao-styles')) return;
    
    // Criar elemento de estilo
    const style = document.createElement('style');
    style.id = 'notificacao-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            animation: slide-in 0.5s ease-out;
        }
        
        .notification.success {
            background-color: #2ecc71;
        }
        
        .notification.error {
            background-color: #e74c3c;
        }
        
        .notification.info {
            background-color: #3498db;
        }
        
        .notification.fade-out {
            animation: fade-out 0.5s ease-out forwards;
        }
        
        @keyframes slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    
    // Adicionar ao head do documento
    document.head.appendChild(style);
}

// Função para inicializar a página
function init() {
    console.log('marcar-consulta-exame.js: init - Inicializando página de agendamento.');
    adicionarEstilosNotificacao();
    
    // Configurar data mínima como hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data').min = hoje;
    
    // Adicionar evento de input para busca de clientes
    const searchInput = document.getElementById('searchCliente');
    if (searchInput) {
        searchInput.addEventListener('input', filtrarClientes);
    } else {
        console.error('marcar-consulta-exame.js: init - Campo de busca de cliente não encontrado.');
    }
    
    // Adicionar evento de mudança de data
    const dataInput = document.getElementById('data');
    if (dataInput) {
        dataInput.addEventListener('change', atualizarHorariosDisponiveis);
    }
    
    // Adicionar evento de mudança de especialidade
    const especialidadeSelect = document.getElementById('especialidadeConsulta');
    if (especialidadeSelect) {
        console.log('Adicionando evento de mudança para o select de especialidade');
        especialidadeSelect.addEventListener('change', function() {
            const especialidade = this.value;
            console.log('Mudança detectada no select de especialidade:', especialidade);
            
            // Verifica se o container de consulta está visível
            const containerConsulta = document.getElementById('tipoConsultaContainer');
            const containerVisivel = containerConsulta && containerConsulta.style.display !== 'none';
            
            if (containerVisivel) {
                console.log('Container de consulta visível, atualizando lista de médicos...');
                // Força a atualização do select de médicos
                popularSelectMedicos('medicoConsulta');
            } else {
                console.log('Container de consulta NÃO está visível, ignorando mudança de especialidade');
            }
        });
        
        // Disparar o evento change uma vez para configurar o estado inicial
        const event = new Event('change');
        especialidadeSelect.dispatchEvent(event);
    }
    
    // Adicionar evento de clique no botão de confirmação
    const btnConfirmar = document.getElementById('btnConfirmar');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', confirmarAgendamento);
    }
    
    // Adicionar evento de clique no botão de novo agendamento
    const btnNovoAgendamento = document.getElementById('btnNovoAgendamento');
    if (btnNovoAgendamento) {
        btnNovoAgendamento.addEventListener('click', novoAgendamento);
    }
    
    // Inicializar contador de caracteres para o campo de observações
    const observacoesConsulta = document.getElementById('observacoesConsulta');
    if (observacoesConsulta) {
        observacoesConsulta.addEventListener('input', function() {
            const maxLength = this.getAttribute('maxlength');
            const currentLength = this.value.length;
            const counter = this.nextElementSibling;
            
            if (counter && counter.classList.contains('form-text')) {
                counter.textContent = `${currentLength}/${maxLength} caracteres`;
                
                // Adicionar classe de aviso quando estiver perto do limite
                if (currentLength > maxLength * 0.8) {
                    counter.style.color = '#dc3545';
                } else {
                    counter.style.color = '#6c757d';
                }
            }
        });
        
        // Disparar o evento manualmente para atualizar o contador inicial
        const event = new Event('input');
        observacoesConsulta.dispatchEvent(event);
    }
    
    console.log('marcar-consulta-exame.js: init - Página de agendamento inicializada com sucesso.');
}

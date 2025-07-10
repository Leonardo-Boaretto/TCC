// ================== TEMPO DE ESPERA - GRÁFICO E DADOS SIMULADOS ==================

/**
 * Parâmetros para simulação
 */
const TEMPO_ESPERA_QTD_MEDICOS = 20;
const TEMPO_ESPERA_CONSULTAS_POR_MES = 20;
const TEMPO_ESPERA_ANO_INICIAL = 2023; 
const TEMPO_ESPERA_NIVEIS = [
    { nome: 'Baixo', cor: '#27ae60', min: 0, max: 9 },    // Verde: até 9 min
    { nome: 'Médio', cor: '#f1c40f', min: 10, max: 19 },  // Amarelo: 10-19 min
    { nome: 'Alto', cor: '#e74c3c', min: 20, max: 60 }    // Vermelho: 20+ min
];

/**
 * Gera lista de nomes fictícios de médicos
 */
function gerarNomesMedicos(qtd) {
    const nomes = [
        'Dr. Ana', 'Dr. Bruno', 'Dr. Carla', 'Dr. Daniel', 'Dr. Elisa', 'Dr. Fabio', 'Dr. Gabriela',
        'Dr. Henrique', 'Dr. Isabela', 'Dr. João', 'Dr. Karla', 'Dr. Lucas', 'Dr. Mariana', 'Dr. Natan',
        'Dr. Olivia', 'Dr. Paulo', 'Dr. Queila', 'Dr. Rafael', 'Dr. Silvia', 'Dr. Tiago', 'Dr. Ursula',
        'Dr. Vinicius', 'Dr. Wagner', 'Dr. Xuxa', 'Dr. Yara', 'Dr. Zeca'
    ];
    let lista = [];
    for (let i = 0; i < qtd; i++) {
        lista.push(nomes[i % nomes.length] + ' ' + (i+1));
    }
    return lista;
}


function gerarDadosTempoEspera() {
    // Função para sortear nível de atraso conforme ano
    function sortearNivel(ano, mes) {

        if (ano <= 2023) {
            const p = Math.random();
            if (p < 0.15) return 0; // curto
            if (p < 0.35) return 1; // médio
            return 2; // longo
        }
        
        if (ano === 2024) {
            const fator = mes/12; 
            const p = Math.random();
            if (p < 0.18 + 0.22*fator) return 0; 
            if (p < 0.18 + 0.22*fator + 0.32 + 0.18*fator) return 1; 
            return 2; 
        }
        
        if (ano >= 2025) {
            const mesAtual = (new Date()).getMonth()+1;
            const fator = Math.min(1, mes/mesAtual);
            const p = Math.random();
            if (p < 0.55 + 0.25*fator) return 0; 
            if (p < 0.55 + 0.25*fator + 0.35 - 0.18*fator) return 1; 
            return 2;
        }
        return 1;
    }
    const medicos = gerarNomesMedicos(TEMPO_ESPERA_QTD_MEDICOS);
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-index
    const diaAtual = hoje.getDate();
    let dados = [];
    for (let ano = TEMPO_ESPERA_ANO_INICIAL; ano <= anoAtual; ano++) {
        const ultimoMes = (ano === anoAtual) ? mesAtual : 11;
        for (let mes = 0; mes <= ultimoMes; mes++) {
            const ultimoDia = (ano === anoAtual && mes === mesAtual) ? diaAtual : diasNoMes(mes+1, ano);
            for (let medico of medicos) {
                // 20 consultas por mês por médico
                for (let i = 0; i < TEMPO_ESPERA_CONSULTAS_POR_MES; i++) {
                    // Dia aleatório do mês (até hoje)
                    let dia = Math.floor(Math.random() * ultimoDia) + 1;
                    let dataConsulta = new Date(ano, mes, dia);
                    if (dataConsulta > hoje) continue; // nunca futuro
                    // Horário marcado aleatório entre 7h e 17h
                    let horaMarcada = 7 + Math.floor(Math.random()*11);
                    let minutoMarcado = Math.floor(Math.random()*2) * 30;
                    let horarioMarcado = `${horaMarcada.toString().padStart(2,'0')}:${minutoMarcado.toString().padStart(2,'0')}`;
                    // Nível de atraso conforme ano/mês
                    let nivel = sortearNivel(ano, mes+1);
                    let atraso = TEMPO_ESPERA_NIVEIS[nivel].min + Math.floor(Math.random() * (TEMPO_ESPERA_NIVEIS[nivel].max - TEMPO_ESPERA_NIVEIS[nivel].min + 1));
                    // Horário real
                    let [h, m] = horarioMarcado.split(':').map(Number);
                    let dataReal = new Date(ano, mes, dia, h, m + atraso);
                    let horarioReal = `${dataReal.getHours().toString().padStart(2,'0')}:${dataReal.getMinutes().toString().padStart(2,'0')}`;
                    dados.push({
                        medico,
                        ano,
                        mes: mes+1,
                        dia,
                        data: `${ano}-${(mes+1).toString().padStart(2,'0')}-${dia.toString().padStart(2,'0')}`,
                        horarioMarcado,
                        horarioReal,
                        atraso,
                        nivel
                    });
                }
            }
        }
    }
    return dados;
}

/**
 * Retorna número de dias em um mês
 */
function diasNoMes(mes, ano) {
    return new Date(ano, mes, 0).getDate();
}

/**
 * Busca os dados de tempo de espera da API
 * @returns {Promise<Array>} Dados de tempo de espera
 */
async function buscarDadosTempoEspera() {
    try {
        console.log('Buscando dados de tempo de espera da API...');
        const url = '/api/relatorios/tempo-espera';
        console.log('URL da requisição:', url);
        
        // Obter o token de autenticação
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('Nenhum token de autenticação encontrado');
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            credentials: 'include'
        });
        console.log('Resposta recebida:', response);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta da API:', errorText);
            throw new Error(`Erro ao buscar dados: ${response.status} ${response.statusText}`);
        }
        
        const dados = await response.json();
        console.log(`Dados recebidos da API:`, dados);
        console.log(`Total de registros: ${dados.length}`);
        
        // Processar os dados para garantir compatibilidade com o formato esperado
        const dadosProcessados = dados.map(item => {
            // Converter data para o formato YYYY-MM-DD se não estiver nesse formato
            let dataFormatada = item.data;
            if (typeof dataFormatada === 'string' && dataFormatada.includes('/')) {
                const [dia, mes, ano] = dataFormatada.split('/');
                dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            }
            
            // Extrair data para garantir que temos dia, mês e ano
            const data = new Date(dataFormatada);
            const dataValida = !isNaN(data.getTime());
            
            return {
                id: item.id,
                medico: item.medico || `Médico ${item.id}`,
                paciente: item.paciente || `Paciente ${item.id}`,
                data: dataValida ? dataFormatada : '2000-01-01', // Data padrão se inválida
                ano: dataValida ? data.getFullYear() : 2000,
                mes: dataValida ? data.getMonth() + 1 : 1,
                dia: dataValida ? data.getDate() : 1,
                horarioMarcado: item.horario_marcado || '00:00',
                horarioReal: item.horario_inicio || '00:00',
                atraso: Number(item.atraso) || 0,
                nivel: Number(item.nivel) || 0,
                duracao: Number(item.duracao) || 30,
                especialidade: item.especialidade || 'Não informada'
            };
        });
        
        console.log('Dados processados:', dadosProcessados);
        return dadosProcessados;
    } catch (error) {
        console.error('Erro ao buscar dados de tempo de espera:', error);
        return [];
    }
}

/**
 * Retorna o número da semana para uma data
 * @param {Date} date - Data para obter a semana
 * @returns {number} Número da semana no mês (1-5)
 */
function getWeekNumber(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const dayOfMonth = date.getDate();
    return Math.ceil((dayOfMonth + firstDay) / 7);
}

/**
 * Formata uma data para o formato dd/mm/yyyy
 * @param {string} dateString - Data no formato yyyy-mm-dd
 * @returns {string} Data formatada
 */
function formatarData(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

/**
 * Atualiza todos os gráficos de tempo de espera
 * @param {Array} dados - Dados processados das consultas
 */
function atualizarGraficosTempoEspera(dados) {
    console.log('Atualizando gráficos de tempo de espera...');
    
    // Atualizar o gráfico principal (se existir)
    if (typeof atualizarGraficoTempoEspera === 'function') {
        atualizarGraficoTempoEspera(dados);
    }
}

/**
 * Inicialização da aba Tempo de Espera
 */
async function inicializarTempoEspera() {
    try {
        console.log('Iniciando inicialização da aba de tempo de espera...');
        
        // Mostrar loading
        const containerGrafico = document.getElementById('graficoTempoEspera');
        const containerPai = containerGrafico ? containerGrafico.parentElement : null;
        
        console.log('Container do gráfico:', containerGrafico);
        console.log('Container pai:', containerPai);
        
        if (containerGrafico) {
            console.log('Adicionando spinner de carregamento...');
            containerGrafico.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div><p class="mt-2">Carregando dados de tempo de espera...</p></div>';
        } else {
            console.error('Elemento graficoTempoEspera não encontrado no DOM');
            return; // Encerra a função se o container não for encontrado
        }
        
        // Buscar dados da API
        try {
            window._dadosTempoEspera = await buscarDadosTempoEspera();
            
            // Verificar se os dados foram retornados corretamente
            if (!Array.isArray(window._dadosTempoEspera)) {
                throw new Error('Dados inválidos retornados pela API');
            }
            
            console.log(`Dados recebidos: ${window._dadosTempoEspera.length} registros`);
            
            // Configurar filtros e gráficos
            configurarFiltrosTempoEspera();
            
            // Função para atualizar todos os gráficos
            const atualizarTodosGraficos = () => {
                if (window._dadosTempoEspera) {
                    atualizarGraficosTempoEspera(window._dadosTempoEspera);
                }
            };
            
            // Adicionar event listeners apenas uma vez
            const tipoPeriodo = document.getElementById('filtroTipoPeriodo');
            if (tipoPeriodo && !tipoPeriodo.hasListener) {
                tipoPeriodo.addEventListener('change', () => {
                    atualizarFiltrosTempoEspera();
                    atualizarTodosGraficos();
                });
                tipoPeriodo.hasListener = true;
            }
            
            const filtroAno = document.getElementById('filtroAno');
            if (filtroAno && !filtroAno.hasListener) {
                filtroAno.addEventListener('change', atualizarTodosGraficos);
                filtroAno.hasListener = true;
            }
            
            const filtroMes = document.getElementById('filtroMes');
            if (filtroMes && !filtroMes.hasListener) {
                filtroMes.addEventListener('change', atualizarTodosGraficos);
                filtroMes.hasListener = true;
            }
            
            const filtroSemana = document.getElementById('filtroSemana');
            if (filtroSemana && !filtroSemana.hasListener) {
                filtroSemana.addEventListener('change', atualizarTodosGraficos);
                filtroSemana.hasListener = true;
            }
            
            const filtroDia = document.getElementById('filtroDia');
            if (filtroDia && !filtroDia.hasListener) {
                filtroDia.addEventListener('change', atualizarTodosGraficos);
                filtroDia.addEventListener('change', atualizarGraficoTempoEspera);
                filtroDia.hasListener = true;
            }
            
            // Atualizar ao trocar de aba
            const tabTempoEspera = document.getElementById('tempo-espera-tab');
            if (tabTempoEspera && !tabTempoEspera.hasListener) {
                tabTempoEspera.addEventListener('click', function() {
                    if (!window._dadosTempoEspera || window._dadosTempoEspera.length === 0) {
                        inicializarTempoEspera();
                    }
                });
                tabTempoEspera.hasListener = true;
            }
            
            // Adicionar event listeners para os filtros da tabela
            const buscaAtrasos = document.getElementById('buscaAtrasos');
            const filtroTempoTabela = document.getElementById('filtroTempoTabela');
            
            if (buscaAtrasos && !buscaAtrasos.hasListener) {
                buscaAtrasos.addEventListener('input', atualizarTabelaTempoEspera);
                buscaAtrasos.hasListener = true;
            }
            
            if (filtroTempoTabela && !filtroTempoTabela.hasListener) {
                filtroTempoTabela.addEventListener('change', atualizarTabelaTempoEspera);
                filtroTempoTabela.hasListener = true;
            }
            
            // Renderizar gráfico inicial
            atualizarGraficoTempoEspera();
            
        } catch (apiError) {
            console.error('Erro ao processar dados da API:', apiError);
            throw apiError; 
        }
        
    } catch (error) {
        console.error('Erro ao inicializar tempo de espera:', error);
        const containerGrafico = document.getElementById('graficoTempoEspera');
        const containerPai = containerGrafico ? containerGrafico.parentElement : null;
        
        // Criar mensagem de erro
        const errorHtml = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Erro ao carregar os dados de tempo de espera.</strong><br>
                ${error.message || 'Tente novamente mais tarde.'}
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-danger" onclick="inicializarTempoEspera()">
                        <i class="fas fa-sync-alt me-1"></i> Tentar novamente
                    </button>
                </div>
            </div>
        `;
        
        // Inserir a mensagem de erro
        if (containerGrafico) {
            containerGrafico.innerHTML = errorHtml;
        } else if (containerPai) {
            containerPai.innerHTML = errorHtml;
        } else {
            // Se não encontrar nenhum container, exibe um alerta
            alert('Erro ao carregar os dados de tempo de espera. Por favor, recarregue a página.');
        }
        
        // Limpar dados em caso de erro
        window._dadosTempoEspera = [];
    }
}

/**
 * Configura os selects de filtro conforme tipo de período
 */
function configurarFiltrosTempoEspera() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const anoInicial = TEMPO_ESPERA_ANO_INICIAL;
    let selectAno = document.getElementById('filtroAno');
    selectAno.innerHTML = '';
    for (let ano = anoInicial; ano <= anoAtual; ano++) {
        let opt = document.createElement('option');
        opt.value = ano;
        opt.textContent = ano;
        selectAno.appendChild(opt);
    }
    // Meses
    let selectMes = document.getElementById('filtroMes');
    selectMes.innerHTML = '';
    for (let m = 1; m <= ((anoAtual === parseInt(selectAno.value)) ? hoje.getMonth()+1 : 12); m++) {
        let opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m.toString().padStart(2,'0');
        selectMes.appendChild(opt);
    }
    // Semanas e dias serão atualizados dinamicamente
    atualizarFiltrosTempoEspera();
}

/**
 * Atualiza visibilidade e valores dos filtros conforme tipo de período
 */
function atualizarFiltrosTempoEspera() {
    const tipo = document.getElementById('filtroTipoPeriodo').value;
    document.getElementById('filtroMesContainer').style.display = (tipo !== 'ano') ? '' : 'none';
    document.getElementById('filtroSemanaContainer').style.display = (tipo === 'semana') ? '' : 'none';
    document.getElementById('filtroDiaContainer').style.display = (tipo === 'semana') ? '' : 'none';
    if (tipo === 'ano') {
        atualizarGraficoTempoEspera();
    } else if (tipo === 'mes') {
        atualizarSemanasDiasTempoEspera(false);
        atualizarGraficoTempoEspera();
    } else if (tipo === 'semana') {
        atualizarSemanasDiasTempoEspera(true);
        atualizarGraficoTempoEspera();
    }
}

/**
 * Atualiza selects de semana e dia conforme ano/mês
 * @param {boolean} mostrarDias - Se true, mostra dias da semana selecionada
 */
function atualizarSemanasDiasTempoEspera(mostrarDias) {
    const ano = parseInt(document.getElementById('filtroAno').value);
    const mes = parseInt(document.getElementById('filtroMes').value);
    const hoje = new Date();
    let diasMes = diasNoMes(mes, ano);
    if (ano === hoje.getFullYear() && mes === (hoje.getMonth()+1)) diasMes = hoje.getDate();
    // Semanas
    let selectSemana = document.getElementById('filtroSemana');
    selectSemana.innerHTML = '';
    let semanas = Math.ceil(diasMes/7);
    for (let s = 1; s <= semanas; s++) {
        let opt = document.createElement('option');
        opt.value = s;
        opt.textContent = `Semana ${s}`;
        selectSemana.appendChild(opt);
    }
    // Dias
    let selectDia = document.getElementById('filtroDia');
    selectDia.innerHTML = '';
    if (mostrarDias) {
        let semanaSel = parseInt(selectSemana.value) || 1;
        let inicio = (semanaSel-1)*7+1;
        let fim = Math.min(semanaSel*7, diasMes);
        for (let d = inicio; d <= fim; d++) {
            let opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d.toString().padStart(2,'0');
            selectDia.appendChild(opt);
        }
    }
}

/**
 * Renderiza o gráfico de barras de distribuição de atrasos
 * @param {Array} dados - Dados das consultas
 */
function atualizarGraficoBarrasTempoEspera(dados) {
    console.log('Atualizando gráfico de barras de tempo de espera...');
    
    // Verificar se há dados
    if (!dados || dados.length === 0) {
        console.log('Nenhum dado disponível para o gráfico de barras');
        return;
    }
    
    // Contar ocorrências de cada nível de atraso
    const contagemNiveis = {
        baixo: 0,
        medio: 0,
        alto: 0
    };
    
    dados.forEach(consulta => {
        if (consulta.atraso <= 9) {
            contagemNiveis.baixo++;
        } else if (consulta.atraso <= 19) {
            contagemNiveis.medio++;
        } else {
            contagemNiveis.alto++;
        }
    });
    
    // Obter contexto do canvas
    const ctx = document.getElementById('graficoBarrasTempoEspera').getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (window.graficoBarrasTempoEspera) {
        window.graficoBarrasTempoEspera.destroy();
    }
    
    // Configurações do gráfico
    const config = {
        type: 'bar',
        data: {
            labels: ['Baixo Atraso (0-9min)', 'Médio Atraso (10-19min)', 'Alto Atraso (20min+)'],
            datasets: [{
                label: 'Quantidade de Consultas',
                data: [contagemNiveis.baixo, contagemNiveis.medio, contagemNiveis.alto],
                backgroundColor: [
                    'rgba(78, 115, 223, 0.8)',    // Azul para baixo atraso
                    'rgba(246, 194, 62, 0.8)',    // Amarelo para médio atraso
                    'rgba(231, 74, 59, 0.8)'      // Vermelho para alto atraso
                ],
                borderColor: [
                    'rgba(78, 115, 223, 1)',
                    'rgba(246, 194, 62, 1)',
                    'rgba(231, 74, 59, 1)'
                ],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade de Consultas'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Nível de Atraso'
                    }
                }
            }
        }
    };
    
    // Criar o gráfico
    window.graficoBarrasTempoEspera = new Chart(ctx, config);
}

/**
 * Renderiza o gráfico de tempo de espera conforme filtros
 * @param {Array} dados - Dados a serem exibidos no gráfico (opcional, usa window._dadosTempoEspera se não fornecido)
 */
function atualizarGraficoTempoEspera(dados) {
    console.log('Atualizando gráfico de tempo de espera...');
    
    // Obter elementos dos filtros
    const filtroTipoElement = document.getElementById('filtroTipoPeriodo');
    const filtroAnoElement = document.getElementById('filtroAno');
    const filtroMesElement = document.getElementById('filtroMes');
    const filtroSemanaElement = document.getElementById('filtroSemana');
    const filtroDiaElement = document.getElementById('filtroDia');
    
    console.log('Elementos dos filtros:', {
        filtroTipoElement: !!filtroTipoElement,
        filtroAnoElement: !!filtroAnoElement,
        filtroMesElement: !!filtroMesElement,
        filtroSemanaElement: !!filtroSemanaElement,
        filtroDiaElement: !!filtroDiaElement
    });
    
    // Verificar se os elementos existem
    if (!filtroTipoElement || !filtroAnoElement) {
        console.error('Elementos de filtro não encontrados');
        return;
    }
    
    // Obter valores dos filtros com valores padrão seguros
    const tipo = filtroTipoElement.value || 'ano';
    const ano = parseInt(filtroAnoElement.value) || new Date().getFullYear();
    const mes = (filtroMesElement && parseInt(filtroMesElement.value)) || 1;
    const semana = (filtroSemanaElement && parseInt(filtroSemanaElement.value)) || 1;
    const dia = (filtroDiaElement && parseInt(filtroDiaElement.value)) || 1;
    
    // Obter dados do parâmetro ou da variável global
    dados = Array.isArray(dados) ? dados : (Array.isArray(window._dadosTempoEspera) ? window._dadosTempoEspera : []);
    
    console.log('Dados recebidos para o gráfico:', dados.length);
    
    // Elemento de container do gráfico
    const containerGrafico = document.getElementById('graficoTempoEspera');
    const containerPai = containerGrafico ? containerGrafico.parentElement : null;
    
    // Se não houver dados, exibir mensagem
    if (dados.length === 0) {
        const mensagem = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Nenhum dado de tempo de espera disponível para os filtros selecionados.
            </div>
        `;
        
        if (containerGrafico) {
            containerGrafico.innerHTML = mensagem;
        } else if (containerPai) {
            containerPai.innerHTML = mensagem;
        }
        
        // Limpar tabela
        const tbody = document.querySelector('#tabelaTempoEspera tbody');
        if (tbody) tbody.innerHTML = '';
        
        return;
    }
    // Inicializar variáveis para armazenar os dados filtrados
    let dadosFiltrados = [];
    let dadosParaTabela = [];
    let mediasAtrasos = []; // Para armazenar as médias de atraso por período
    
    // Função auxiliar para calcular a semana do mês
    const getSemanaDoMes = (data) => {
        try {
            const primeiroDia = new Date(data.getFullYear(), data.getMonth(), 1).getDay() || 7;
            return Math.ceil((data.getDate() + primeiroDia - 1) / 7);
        } catch (error) {
            console.error('Erro ao calcular semana do mês:', error);
            return 1; // Retorna primeira semana em caso de erro
        }
    };
    
    // Filtrar por ano
    let dadosAno = [];
    try {
        dadosAno = dados.filter(d => d && d.ano === ano);
    } catch (error) {
        console.error('Erro ao filtrar dados por ano:', error);
        dadosAno = [];
    }
        
    if (tipo === 'ano') {
        // Agrupar por mês
        for (let m = 1; m <= 12; m++) {
            // Não mostrar meses futuros
            if (ano === new Date().getFullYear() && m > new Date().getMonth() + 1) break;
            
            const doMes = dadosAno.filter(d => d.mes === m);
            const pilares = [0, 0, 0];
            
            if (doMes.length > 0) {
                // Calcular média de atraso total
                const mediaAtraso = doMes.length > 0 ? 
                    Math.round(doMes.reduce((s, a) => s + a.atraso, 0) / doMes.length) : 0;
                
                mediasAtrasos.push({
                    label: mesNome(m - 1),
                    valor: mediaAtraso
                });
                
                // Manter compatibilidade com o formato antigo para a tabela
                dadosFiltrados.push({
                    label: mesNome(m - 1),
                    valores: [0, 0, 0], // Não usado no novo gráfico
                    mediaAtraso: mediaAtraso
                });
            }
        }
        
        dadosParaTabela = dadosAno;
            
    } else if (tipo === 'mes') {
        // Filtrar por mês
        const dadosMes = dadosAno.filter(d => d.mes === mes);
        
        // Agrupar por semana do mês
        const semanasNoMes = {};
        
        dadosMes.forEach(item => {
            if (!item.data) return;
            
            const data = new Date(item.data);
            const semana = getSemanaDoMes(data);
            
            if (!semanasNoMes[semana]) {
                semanasNoMes[semana] = [];
            }
            
            semanasNoMes[semana].push(item);
        });
        
        // Ordenar semanas e processar
        Object.keys(semanasNoMes).sort().forEach(semana => {
            const itensSemana = semanasNoMes[semana];
            const pilares = [0, 0, 0];
            
            // Calcular média de atraso total para a semana
            const mediaAtraso = itensSemana.length > 0 ? 
                Math.round(itensSemana.reduce((s, a) => s + a.atraso, 0) / itensSemana.length) : 0;
                
            mediasAtrasos.push({
                label: `Sem ${semana}`,
                valor: mediaAtraso
            });
            
            // Manter compatibilidade com o formato antigo para a tabela
            dadosFiltrados.push({
                label: `Sem ${semana}`,
                valores: [0, 0, 0], // Não usado no novo gráfico
                mediaAtraso: mediaAtraso
            });
        });
        
        dadosParaTabela = dadosMes;
            
    } else if (tipo === 'semana') {
        // Filtrar por semana
        const dadosMes = dadosAno.filter(d => d.mes === mes);
        
        // Encontrar o intervalo de dias da semana selecionada
        const primeiroDia = new Date(ano, mes - 1, 1);
        const ultimoDia = new Date(ano, mes, 0);
        
        const inicio = (semana - 1) * 7 + 1;
        const fim = Math.min(semana * 7, ultimoDia.getDate());
        
        // Agrupar por dia
        for (let d = inicio; d <= fim; d++) {
            const doDia = dadosMes.filter(item => item.dia === d);
            
            // Calcular média de atraso total para o dia
            const mediaAtraso = doDia.length > 0 ? 
                Math.round(doDia.reduce((s, a) => s + a.atraso, 0) / doDia.length) : 0;
            
            mediasAtrasos.push({
                label: d.toString().padStart(2, '0'),
                valor: mediaAtraso
            });
            
            // Manter compatibilidade com o formato antigo para a tabela
            dadosFiltrados.push({
                label: d.toString().padStart(2, '0'),
                valores: [0, 0, 0], // Não usado no novo gráfico
                mediaAtraso: mediaAtraso
            });
            
            // Adicionar à tabela
            dadosParaTabela = [...dadosParaTabela, ...doDia];
        }
    }
    
    // Renderizar gráfico e tabela se houver dados
    if (dadosFiltrados.length > 0) {
        // Renderizar gráfico principal com as médias de atraso
        window.renderizarGraficoTempoEspera(mediasAtrasos.length > 0 ? mediasAtrasos : dadosFiltrados);
        preencherTabelaTempoEspera(dadosParaTabela);
        

        
        // Renderizar o gráfico de linha com as médias de atraso
        console.log('Dados processados para o gráfico de linha:', mediasAtrasos);
        
        // Verificar se a aba está ativa antes de renderizar
        const abaAtiva = document.querySelector('#tempo-espera.tab-pane.active');
        
        // Atualizar a tabela de detalhes
        if (dadosParaTabela && dadosParaTabela.length > 0) {
            // Armazenar dados filtrados para uso na tabela
            window._dadosTempoEsperaFiltrados = dadosParaTabela;
            
            // Atualizar a tabela de detalhes
            if (window.atualizarTabelaTempoEspera) {
                window.atualizarTabelaTempoEspera();
            }
        }
        if (!abaAtiva) {
            console.log('Aba de Tempo de Espera não está ativa, aguardando ativação...');
            return;
        }
        
        if (mediasAtrasos && mediasAtrasos.length > 0) {
            console.log('Chamando renderizarGraficoTempoEspera com dados:', mediasAtrasos);
            renderizarGraficoTempoEspera(mediasAtrasos);
        } else {
            console.log('Nenhum dado disponível para renderizar o gráfico de linha');
            const containerGrafico = document.getElementById('graficoTempoEsperaContainer');
            if (containerGrafico) {
                containerGrafico.innerHTML = `
                    <div class="alert alert-info m-3">
                        <i class="fas fa-info-circle me-2"></i>
                        Nenhum dado disponível para exibir o gráfico.
                    </div>`;
            }
        }
    } else {
        // Exibir mensagem de nenhum dado disponível
        const mensagem = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Nenhum dado disponível para os filtros selecionados.
            </div>
        `;
        
        const containerGrafico = document.getElementById('graficoTempoEspera');
        const containerPai = containerGrafico ? containerGrafico.parentElement : null;
        
        if (containerGrafico) {
            containerGrafico.innerHTML = mensagem;
        } else if (containerPai) {
            containerPai.innerHTML = mensagem;
        }
        
        // Limpar tabela
        const tbody = document.querySelector('#tabelaTempoEspera tbody');
        if (tbody) tbody.innerHTML = '';
    }
}

/**
 * Renderiza o gráfico de linha com a média de atrasos
 * @param {Array} dados - Array de objetos com {label: string, valor: number}
 */
function renderizarGraficoTempoEspera(dados) {
    console.log('=== INÍCIO renderizarGraficoTempoEspera ===');
    console.log('Dados recebidos:', dados);
    console.log('Tipo de dados:', typeof dados);
    console.log('É array?', Array.isArray(dados));
    if (dados && Array.isArray(dados)) {
        console.log('Quantidade de itens:', dados.length);
        console.log('Primeiros itens:', dados.slice(0, 3));
    }
    
    // Verificar se o Chart.js está disponível
    console.log('Verificando se o Chart.js está disponível...');
    console.log('typeof Chart:', typeof Chart);
    console.log('Chart global:', window.Chart);
    
    if (typeof Chart === 'undefined' && window.Chart) {
        console.log('Usando Chart.js da janela global');
        Chart = window.Chart;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não está carregado. Verifique se o script foi incluído corretamente.');
        
        // Tentar carregar o Chart.js dinamicamente
        console.log('Carregando Chart.js...');
        window.onChartLoad = function() {
            console.log('Chart.js carregado com sucesso!', typeof Chart !== 'undefined' ? 'Chart disponível' : 'Chart NÃO disponível');
            window.Chart = Chart; // Garantir que Chart está disponível globalmente
        };
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = window.onChartLoad;
        script.onerror = function() {
            console.error('Falha ao carregar o Chart.js');
        };
        document.head.appendChild(script);
        return;
    }
    
    try {
        // Primeiro, verificar se estamos na aba correta
        const abaTempoEspera = document.querySelector('#tempo-espera.tab-pane');
        if (!abaTempoEspera || !abaTempoEspera.classList.contains('active')) {
            console.log('Aba de Tempo de Espera não está ativa, aguardando ativação...');
            return;
        }
        
        // Localizar o container do gráfico
        const containerGrafico = document.getElementById('graficoTempoEsperaContainer');
        console.log('Elemento container do gráfico:', containerGrafico);
        
        if (!containerGrafico) {
            console.error('Container do gráfico não encontrado');
            return;
        }
        
        // Limpar qualquer conteúdo anterior
        containerGrafico.innerHTML = '';
        
        // Criar novo canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'graficoTempoEspera';
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.boxSizing = 'border-box';
        
        containerGrafico.appendChild(canvas);
        console.log('Novo canvas criado e adicionado ao container');
        
        const ctx = canvas.getContext('2d');
        
        // Destruir gráfico existente se houver
        if (window.graficoTempoEspera && typeof window.graficoTempoEspera.destroy === 'function') {
            window.graficoTempoEspera.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        console.log('Verificando dados para o gráfico:', dados);
        if (!dados || dados.length === 0) {
            const mensagem = 'Nenhum dado disponível para exibir o gráfico.';
            console.log(mensagem);
            container.innerHTML = `
                <div class="alert alert-info m-3">
                    <i class="fas fa-info-circle me-2"></i>
                    ${mensagem}
                </div>
            `;
            return;
        }
        
        // Extrair labels e valores
        const labels = dados.map(item => item.label);
        const valores = dados.map(item => item.valor);
        
        console.log('Labels do gráfico:', labels);
        console.log('Valores do gráfico:', valores);
        
        // Configurações do gráfico
        console.log('Criando configuração do gráfico...');
        
        // Destruir instância anterior do gráfico se existir
        if (window.graficoTempoEspera && typeof window.graficoTempoEspera.destroy === 'function') {
            window.graficoTempoEspera.destroy();
        }
        
        const config = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Média de Atraso (minutos)',
                    data: valores,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Média de Atraso nos Atendimentos',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12
                            }
                        }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 10,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y.toLocaleString('pt-BR');
                                return label;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Atendimentos por Especialidade',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 20
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkipPadding: 10,
                            font: {
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Meses do Ano',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            stepSize: 1,
                            precision: 0,
                            font: {
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Número de Atendimentos',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                layout: {
                    padding: {
                        top: 15,
                        right: 15,
                        bottom: 15,
                        left: 15
                    }
                },
                elements: {
                    bar: {
                        borderSkipped: 'middle'
                    }
                },
                // Adiciona espaço para o título
                plugins: {
                    legend: {
                        position: 'top',
                    },
                }
            }
        };
        
        // Criar o gráfico
        console.log('Criando instância do gráfico...');
        try {
            window.graficoTempoEspera = new Chart(ctx, config);
            console.log('Gráfico criado com sucesso!', window.graficoTempoEspera);
        } catch (error) {
            console.error('Erro ao criar o gráfico:', error);
            throw error; // Re-lança o erro para ser capturado pelo bloco catch externo
        }
    } catch (error) {
        console.error('Erro ao renderizar gráfico de tempo de espera:', error);
        const container = document.getElementById('graficoTempoEspera');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Ocorreu um erro ao renderizar o gráfico: ${error.message}
                </div>
            `;
        }
    }
}

/**
 * Preenche a tabela de detalhes com os dados filtrados
 * @param {Array} dados - Dados a serem exibidos na tabela
 */
function preencherTabelaTempoEspera(dados) {
    const tbody = document.querySelector('#tabelaTempoEspera tbody');
    if (!tbody) {
        console.error('Elemento tbody não encontrado');
        return;
    }
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Verificar se há dados válidos
    if (!Array.isArray(dados) || dados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="9" class="text-center py-4 text-muted">
                <i class="bi bi-search me-2"></i>
                Nenhum registro encontrado com os filtros atuais.
            </td>
        `;
        tbody.appendChild(tr);
        return;
    }
    
    // Obter parâmetros de filtro
    const busca = (document.getElementById('buscaAtrasos') || {}).value?.toLowerCase() || '';
    const filtroTempo = (document.getElementById('filtroTempoTabela') || {}).value || 'todos';
    
    // Aplicar filtros
    let filtrados = [...dados];
    
    // Filtrar por busca
    if (busca) {
        filtrados = filtrados.filter(item => {
            return (
                (item.medico && item.medico.toLowerCase().includes(busca)) ||
                (item.paciente && item.paciente.toLowerCase().includes(busca)) ||
                (item.especialidade && item.especialidade.toLowerCase().includes(busca))
            );
        });
    }
    
    // Filtrar por nível de atraso
    if (filtroTempo !== 'todos') {
        filtrados = filtrados.filter(item => {
            if (filtroTempo === 'curtos') return item.nivel === 0;
            if (filtroTempo === 'medios') return item.nivel === 1;
            if (filtroTempo === 'longos') return item.nivel === 2;
            return true;
        });
    }
    
    // Ordenar por data e horário
    const dadosOrdenados = [...filtrados].sort((a, b) => {
        const dataA = new Date(`${a.data} ${a.horarioMarcado || '00:00'}`);
        const dataB = new Date(`${b.data} ${b.horarioMarcado || '00:00'}`);
        return dataA - dataB;
    });
    
    const dadosLimitados = dadosOrdenados.slice(0, 150);
    
    if (dadosLimitados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="8" class="text-center py-4 text-muted">
                <i class="bi bi-search me-2"></i>
                Nenhum registro encontrado com os filtros atuais.
            </td>
        `;
        tbody.appendChild(tr);
        return;
    }
    
    // Preencher linhas da tabela
    dadosLimitados.forEach(item => {
        const tr = document.createElement('tr');
        
        // Determinar a classe de cor com base no nível de atraso
        let classeNivel = '';
        if (item.nivel === 0) classeNivel = 'table-success';
        else if (item.nivel === 1) classeNivel = 'table-warning';
        else if (item.nivel === 2) classeNivel = 'table-danger';
        
        // Formatar data e horários
        const dataFormatada = item.data ? formatarData(item.data) : '--/--/----';
        const horarioMarcado = item.horarioMarcado && item.horarioMarcado !== '00:00' ? item.horarioMarcado : '--:--';
        const horarioReal = item.horarioReal && item.horarioReal !== '00:00' ? item.horarioReal : '--:--';
        
        // Determinar o texto do nível
        let textoNivel = '';
        if (item.nivel === 0) textoNivel = 'Baixo';
        else if (item.nivel === 1) textoNivel = 'Médio';
        else if (item.nivel === 2) textoNivel = 'Alto';
        
        // Criar linha da tabela
        tr.innerHTML = `
            <td>${item.medico || '--'}</td>
            <td>${item.paciente || '--'}</td>
            <td>${dataFormatada}</td>
            <td>${horarioMarcado}</td>
            <td>${horarioReal}</td>
            <td class="text-center fw-bold ${classeNivel}">
                ${item.atraso !== undefined && item.atraso !== null ? item.atraso + ' min' : '--'}
            </td>
        `;
        
        // Adicionar tooltip com informações adicionais
        tr.setAttribute('data-bs-toggle', 'tooltip');
        tr.setAttribute('data-bs-html', 'true');
        tr.setAttribute('title', `
            <div class="text-start">
                <div class="fw-bold">${item.medico || 'Médico não informado'}</div>
                <div class="small">
                    <div>Paciente: ${item.paciente || 'Não informado'}</div>
                    <div>Especialidade: ${item.especialidade || 'Não informada'}</div>
                    <div>Data: ${dataFormatada || 'Não informada'}</div>
                    <div>Horário Marcado: ${horarioMarcado}</div>
                    <div>Início Real: ${horarioReal}</div>
                    ${item.horario_fim ? `<div>Término: ${item.horario_fim}</div>` : ''}
                    ${item.duracao ? `<div>Duração: ${item.duracao} min</div>` : ''}
                    <div class="mt-1">
                        Nível de Atraso: <span class="badge ${classeNivel.replace('table-', 'bg-')}">
                            ${textoNivel} (${item.atraso || 0} min)
                        </span>
                    </div>
                </div>
            </div>
        `);
        
        tbody.appendChild(tr);
    });
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            html: true,
            boundary: 'window',
            customClass: 'tooltip-custom',
            delay: { show: 500, hide: 100 }
        });
    });
}

// Adicionar estilos CSS personalizados
const estiloTooltip = document.createElement('style');
estiloTooltip.textContent = `
    .tooltip-custom {
        --bs-tooltip-bg: var(--bs-dark);
        --bs-tooltip-color: var(--bs-light);
        --bs-tooltip-padding-x: 0.75rem;
        --bs-tooltip-padding-y: 0.5rem;
        --bs-tooltip-font-size: 0.875rem;
        max-width: 300px;
    }
    
    .tooltip-inner {
        text-align: left;
        padding: 0.75rem;
    }
    
    /* Melhorias na tabela */
    #tabelaTempoEspera {
        font-size: 0.9rem;
    }
    
    #tabelaTempoEspera th {
        white-space: nowrap;
        position: sticky;
        top: 0;
        background: white;
        z-index: 10;
        box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);
    }
    
    #tabelaTempoEspera tbody tr {
        cursor: pointer;
        transition: background-color 0.15s;
    }
    
    #tabelaTempoEspera tbody tr:hover {
        background-color: rgba(0, 0, 0, 0.03);
    }
    
    .badge {
        font-weight: 500;
        padding: 0.35em 0.65em;
    }
    
    @media (max-width: 768px) {
        #tabelaTempoEspera {
            display: block;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }
    }
`;
document.head.appendChild(estiloTooltip);

/**
 * Atualiza a tabela de detalhes com os dados atuais
 */
const atualizarTabelaTempoEspera = () => {
    // Reaproveita último filtro aplicado
    const dadosAtuais = window._dadosTempoEsperaFiltrados || window._dadosTempoEspera || [];
    preencherTabelaTempoEspera(dadosAtuais);
};

// Função para aplicar filtros de período
const aplicarFiltrosPeriodo = (dados, tipo, ano, mes, semana) => {
    if (!dados || !Array.isArray(dados)) return [];
    
    let dadosFiltrados = [...dados];
    
    if (tipo === 'ano') {
        return dadosFiltrados.filter(d => d.ano === ano);
    } else if (tipo === 'mes') {
        return dadosFiltrados.filter(d => d.ano === ano && d.mes === mes);
    } else if (tipo === 'semana') {
        const diasMes = diasNoMes(mes, ano);
        const hoje = new Date();
        const diasMesAtual = (ano === hoje.getFullYear() && mes === (hoje.getMonth() + 1)) 
            ? hoje.getDate() 
            : diasMes;
            
        const inicio = (semana - 1) * 7 + 1;
        const fim = Math.min(semana * 7, diasMesAtual);
        
        return dadosFiltrados.filter(dt => 
            dt.ano === ano && 
            dt.mes === mes && 
            dt.dia >= inicio && 
            dt.dia <= fim
        );
    }
    
    return dadosFiltrados;
};



/**
 * Retorna nome do mês abreviado
 */
function mesNome(m) {
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1];
}

// Torna as funções globais
window.inicializarTempoEspera = inicializarTempoEspera;
window.renderizarGraficoTempoEspera = renderizarGraficoTempoEspera;

// Adicionar event listener para a mudança de abas
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM completamente carregado, configurando listeners de abas...');
    
    // Encontrar todas as abas
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    console.log(`Encontradas ${tabs.length} abas`);
    
    // Adicionar event listener para cada aba
    tabs.forEach(tab => {
        const targetId = tab.getAttribute('data-bs-target');
        console.log(`Configurando listener para aba: ${targetId}`);
        
        tab.addEventListener('shown.bs.tab', function (e) {
            console.log('Evento shown.bs.tab disparado para:', e.target);
            console.log('Target ID:', targetId);
            
            if (targetId === '#tempo-espera') {
                console.log('=== ABA TEMPO DE ESPERA ATIVADA ===');
                console.log('Verificando dados para renderização...');
                console.log('window._dadosTempoEspera:', window._dadosTempoEspera);
                
                // Forçar a atualização do gráfico quando a aba for ativada
                if (window._dadosTempoEspera) {
                    console.log('Dados encontrados, chamando renderizarGraficoTempoEspera...');
                    renderizarGraficoTempoEspera(window._dadosTempoEspera);
                } else if (window.atualizarGraficoTempoEspera) {
                    console.log('Nenhum dado encontrado, chamando atualizarGraficoTempoEspera...');
                    window.atualizarGraficoTempoEspera();
                } else {
                    console.error('Nenhum dado ou função de atualização encontrada para o gráfico');
                }
            }
        });
    });
    
    // Verificar se já estamos na aba de tempo de espera ao carregar a página
    const abaAtiva = document.querySelector('#tempo-espera.tab-pane.active');
    if (abaAtiva) {
        console.log('Página carregada com a aba de Tempo de Espera já ativa');
        if (window._dadosTempoEspera) {
            console.log('Dados já disponíveis, renderizando gráfico...');
            renderizarGraficoTempoEspera(window._dadosTempoEspera);
        } else if (window.atualizarGraficoTempoEspera) {
            console.log('Buscando dados para o gráfico...');
            window.atualizarGraficoTempoEspera();
        }
    }
});

// Verificar se o Chart.js está disponível
console.log('Chart.js disponível?', typeof Chart !== 'undefined');

// Inicializar a aba de Tempo de Espera quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Código de inicialização do gráfico de barras removido
    // Inicializar a aba de Tempo de Espera
    if (typeof inicializarTempoEspera === 'function') {
        inicializarTempoEspera();
    }
    
    // Inicializa os tooltips do Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Adiciona evento para a aba de tempo de espera
    const tempoEsperaTab = document.getElementById('tempo-espera-tab');
    if (tempoEsperaTab) {
        tempoEsperaTab.addEventListener('shown.bs.tab', function (e) {
            // Verifica se já inicializou os dados
            if (!window._dadosTempoEsperaInicializado) {
                inicializarTempoEspera();
                window._dadosTempoEsperaInicializado = true;
            } else if (window._dadosTempoEspera) {
                // Se os dados já foram carregados, apenas atualiza os gráficos
                atualizarGraficosTempoEspera(window._dadosTempoEspera);
            }
        });
    }

    // Inicializa a aba ativa
    const tabAtiva = document.querySelector('.nav-tabs .nav-link.active');
    if (tabAtiva && tabAtiva.id === 'tempo-espera-tab') {
        if (!window._dadosTempoEsperaInicializado) {
            inicializarTempoEspera();
            window._dadosTempoEsperaInicializado = true;
        } else if (window._dadosTempoEspera) {
            // Se os dados já foram carregados, apenas atualiza os gráficos
            atualizarGraficosTempoEspera(window._dadosTempoEspera);
        }
    }

    // Carrega os dados iniciais
    carregarDadosRelatorios();
});

/**
 * Função principal que carrega os dados iniciais dos relatórios
 * @async
 */
async function carregarDadosRelatorios() {
    try {
        // Carrega os dados iniciais do relatório de especialidades apenas se estiver na aba correta
        const tabAtiva = document.querySelector('.nav-tabs .nav-link.active');
        if (tabAtiva && tabAtiva.id !== 'tempo-espera-tab') {
            await carregarDadosEspecialidades();
        }
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        alert('Erro ao carregar os dados iniciais. Por favor, tente novamente.');
    }
}

/**
 * Carrega e exibe a lista de agendamentos
 * @todo Implementar chamada AJAX real
 */
function carregarAgendamentos() {
    const dados = [
        { id: 1, paciente: 'João Silva', medico: 'Dr. Carlos', data: '2025-05-26 14:30', tipo: 'Consulta', status: 'Agendado' },
        { id: 2, paciente: 'Maria Santos', medico: 'Dra. Ana', data: '2025-05-25 10:15', tipo: 'Retorno', status: 'Realizado' },
        { id: 3, paciente: 'Pedro Oliveira', medico: 'Dr. Roberto', data: '2025-05-24 16:45', tipo: 'Exame', status: 'Cancelado' }
    ];
    
    const tbody = document.getElementById('tabelaAgendamentos');
    tbody.innerHTML = '';
    
    dados.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => mostrarDetalhes('Agendamento', item);
        tr.innerHTML = `
            <td>${item.id}</td>
            <td>${item.paciente}</td>
            <td>${item.medico}</td>
            <td>${item.data}</td>
            <td>${item.tipo}</td>
            <td><span class="badge ${getStatusBadgeClass(item.status)}">${item.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Carrega e exibe a lista de exames
 * @todo Implementar chamada AJAX real
 */
function carregarExames() {
    // Simulação de dados - substituir por chamada AJAX real
    const dados = [
        { id: 1, paciente: 'João Silva', tipo: 'Exame de Sangue', data: '2025-05-20', medico: 'Dr. Carlos', status: 'Concluído', resultado: 'Normal' },
        { id: 2, paciente: 'Maria Santos', tipo: 'Raio-X', data: '2025-05-18', medico: 'Dr. Roberto', status: 'Pendente', resultado: 'Aguardando' },
        { id: 3, paciente: 'Pedro Oliveira', tipo: 'Ultrassom', data: '2025-05-15', medico: 'Dra. Ana', status: 'Concluído', resultado: 'Anormal' }
    ];
    
    const tbody = document.getElementById('tabelaExames');
    tbody.innerHTML = '';
    
    dados.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => mostrarDetalhes('Exame', item);
        tr.innerHTML = `
            <td>${item.id}</td>
            <td>${item.paciente}</td>
            <td>${item.tipo}</td>
            <td>${item.data}</td>
            <td>${item.medico}</td>
            <td><span class="badge ${getStatusBadgeClass(item.status)}">${item.status}</span></td>
            <td>${item.resultado}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarAgendamentos() {
    alert('Filtrando agendamentos...');
}

/**
 * Filtra os exames com base nos critérios selecionados
 * @todo Implementar lógica de filtro
 */
function filtrarExames() {
    alert('Filtrando exames...');
}

/**
 * Busca pacientes com base no termo de busca
 * @todo Implementar busca de pacientes
 */
function buscarPacientes() {
    const termo = document.getElementById('buscaPaciente').value.toLowerCase();
    // Implementar busca de pacientes
    alert(`Buscando pacientes por: ${termo}`);
}

/**
 * Mostra os detalhes de um item (agendamento, exame, paciente)
 * @param {string} tipo - O tipo do item
 * @param {Object} dados - Os dados do item
 */
function mostrarDetalhes(tipo, dados) {
    const modal = new bootstrap.Modal(document.getElementById('detalhesModal'));
    const titulo = document.getElementById('detalhesModalLabel');
    const corpo = document.getElementById('detalhesModalBody');
    
    // Função auxiliar para formatar dados
    const formatarCampo = (valor, padrao = 'Não informado') => {
        return valor !== null && valor !== undefined && valor !== '' ? valor : padrao;
    };
    
    // Formata a data
    const formatarData = (dataString) => {
        if (!dataString) return 'Não informada';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR');
        } catch (e) {
            return 'Data inválida';
        }
    };
    
    // Formata o endereço completo
    const formatarEndereco = (medico) => {
        const partes = [];
        
        if (medico.endereco) partes.push(medico.endereco);
        if (medico.numero) partes.push(medico.numero);
        if (medico.complemento) partes.push(medico.complemento);
        if (medico.bairro) partes.push(medico.bairro);
        if (medico.cidade) partes.push(medico.cidade);
        if (medico.estado) partes.push(medico.estado);
        if (medico.cep) partes.push(`CEP: ${medico.cep}`);
        
        return partes.length > 0 ? partes.join(', ') : 'Endereço não informado';
    };
    
    // Formata o status
    const formatarStatus = (ativo) => {
        return ativo ? 
            '<span class="badge bg-success">Ativo</span>' : 
            '<span class="badge bg-secondary">Inativo</span>';
    };
    
    // Formata o email confirmado
    const formatarEmailConfirmado = (confirmado) => {
        return confirmado ? 
            '<span class="badge bg-success">Confirmado</span>' : 
            '<span class="badge bg-warning text-dark">Não confirmado</span>';
    };
    
    titulo.textContent = `Detalhes do ${tipo}`;
    
    // Cria o conteúdo do modal com base no tipo e dados
    let conteudo = '<div class="container-fluid">';
    
    for (const [chave, valor] of Object.entries(dados)) {
        if (valor !== null && valor !== undefined) {
            conteudo += `
                <div class="row mb-2">
                    <div class="col-md-3 fw-bold">${formatarChave(chave)}:</div>
                    <div class="col-md-9">${valor}</div>
                </div>
            `;
        }
    }
    
    // Adiciona gráfico se for um relatório de médico
    if (tipo === 'Médico') {
        conteudo += `
            <div class="row mt-4">
                <div class="col-12">
                    <h5>Atendimentos nos últimos 6 meses</h5>
                    <canvas id="graficoAtendimentos" height="100"></canvas>
                </div>
            </div>
        `;
    }
    
    conteudo += '</div>';
    
    corpo.innerHTML = conteudo;
    
    // Se for um médico, renderiza o gráfico
    if (tipo === 'Médico') {
        setTimeout(() => {
            renderizarGraficoAtendimentos();
        }, 100);
    }
    
    modal.show();
}

/**
 * Formata uma chave para exibição amigável
 * @param {string} chave - A chave a ser formatada
 * @return {string} A chave formatada para exibição
 */
function formatarChave(chave) {
    // Converte chaves de snake_case ou camelCase para formato legível
    return chave
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Retorna a classe CSS apropriada para o badge de status
 * @param {string} status - O status a ser estilizado
 * @return {string} A classe CSS para o badge
 */
function getStatusBadgeClass(status) {
    const classes = {
        'Agendado': 'bg-primary',
        'Realizado': 'bg-success',
        'Cancelado': 'bg-danger',
        'Pendente': 'bg-warning',
        'Concluído': 'bg-success',
        'Aguardando': 'bg-info',
        'Anormal': 'bg-danger',
        'Normal': 'bg-success'
    };
    
    return classes[status] || 'bg-secondary';
}

/**
 * Renderiza o gráfico de atendimentos do médico
 */
function renderizarGraficoAtendimentos() {
    const ctx = document.getElementById('graficoAtendimentos').getContext('2d');
    
    // Dados de exemplo
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const atendimentos = [12, 19, 15, 8, 14, 10];
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Atendimentos',
                data: atendimentos,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Variável global para armazenar todos os dados das especialidades
 * @type {Object}
 */
let todosOsDadosEspecialidades = {};

/**
 * Carrega os dados das especialidades
 * @returns {Promise<Object>} Dados das especialidades
 */
async function carregarDadosEspecialidades() {
    try {
        console.log('Iniciando carregamento de dados das especialidades...');
        
        // Função para obter os headers de autenticação
        function getAuthHeaders() {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            console.log('[RELATÓRIOS] Token encontrado:', token ? 'Sim' : 'Não');
            
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                console.warn('[RELATÓRIOS] Nenhum token de autenticação encontrado');
            }
            
            return headers;
        }

        // Tenta buscar os dados da API
        const [response, responseMedicos] = await Promise.all([
            fetch('/api/especialidades/relatorio', {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include'
            }),
            fetch('/api/medicos/por-especialidade', {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include'
            })
        ]);
        
        console.log('Resposta da API de especialidades recebida:', response.status, response.statusText);
        
        let dadosEspecialidades = {};
        
        if (response.ok) {
            const data = await response.json();
            console.log('Dados de especialidades recebidos da API:', data);
            
            // Normaliza os nomes das especialidades (remove acentos e espaços extras)
            dadosEspecialidades = {};
            Object.entries(data).forEach(([especialidade, valores]) => {
                const chaveNormalizada = especialidade
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();
                
                // Usa o nome original como chave, mas com a normalização
                dadosEspecialidades[especialidade] = valores;
            });
            
            console.log('Dados de especialidades normalizados:', dadosEspecialidades);
        } else {
            // Fallback para dados de exemplo se a API falhar
            console.warn('Falha ao buscar dados de especialidades da API, usando dados de exemplo');
            dadosEspecialidades = {
                'Cardiologia': [15, 12, 18, 20, 22, 25, 28, 26, 23, 20, 18, 16],
                'Dermatologia': [18, 16, 20, 22, 25, 28, 26, 24, 22, 20, 18, 16],
                'Endocrinologia': [10, 12, 14, 16, 18, 20, 22, 20, 18, 16, 14, 12],
                'Ginecologia': [25, 22, 26, 28, 30, 32, 30, 28, 26, 24, 22, 20],
                'Ortopedia': [20, 18, 22, 25, 28, 30, 32, 30, 28, 25, 22, 20],
                'Pediatria': [30, 28, 32, 30, 35, 38, 40, 42, 38, 35, 32, 30],
                'Clínica Geral': [40, 38, 42, 45, 48, 50, 52, 50, 48, 45, 42, 40]
            };
            
            // Adiciona médicos de exemplo para cada especialidade
            const medicosExemplo = {
                'Cardiologia': [
                    { nome: 'Dr. Carlos Eduardo', crm: 'SP12345', email: 'carlos@clinica.com', telefone: '(11) 98765-4321' },
                    { nome: 'Dra. Ana Paula', crm: 'SP54321', email: 'ana@clinica.com', telefone: '(11) 98765-1234' }
                ],
                'Dermatologia': [
                    { nome: 'Dr. Roberto Silva', crm: 'SP67890', email: 'roberto@clinica.com', telefone: '(11) 98765-5678' }
                ],
                'Endocrinologia': [
                    { nome: 'Dra. Fernanda Costa', crm: 'SP09876', email: 'fernanda@clinica.com', telefone: '(11) 98765-8765' },
                    { nome: 'Dr. Marcelo Oliveira', crm: 'SP56789', email: 'marcelo@clinica.com', telefone: '(11) 98765-3456' }
                ],
                'Ginecologia': [
                    { nome: 'Dra. Juliana Santos', crm: 'SP45678', email: 'juliana@clinica.com', telefone: '(11) 98765-7890' }
                ],
                'Ortopedia': [
                    { nome: 'Dr. Ricardo Mendes', crm: 'SP34567', email: 'ricardo@clinica.com', telefone: '(11) 98765-9012' },
                    { nome: 'Dr. Felipe Ramos', crm: 'SP23456', email: 'felipe@clinica.com', telefone: '(11) 98765-2109' }
                ],
                'Pediatria': [
                    { nome: 'Dra. Patrícia Almeida', crm: 'SP78901', email: 'patricia@clinica.com', telefone: '(11) 98765-4321' }
                ],
                'Clínica Geral': [
                    { nome: 'Dr. André Luiz', crm: 'SP89012', email: 'andre@clinica.com', telefone: '(11) 98765-9876' },
                    { nome: 'Dra. Camila Rocha', crm: 'SP90123', email: 'camila@clinica.com', telefone: '(11) 98765-6543' }
                ]
            };
            
            // Adiciona os médicos de exemplo à variável de médicos por especialidade
            medicosPorEspecialidade = medicosExemplo;
        }

        // Processa os dados dos médicos
        let medicosPorEspecialidade = {};
        
        if (responseMedicos.ok) {
            const dataMedicos = await responseMedicos.json();
            console.log('Dados de médicos por especialidade recebidos:', dataMedicos);
            
            // Normaliza os nomes das especialidades para garantir correspondência
            Object.entries(dataMedicos).forEach(([especialidade, medicos]) => {
                const chaveNormalizada = especialidade
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();
                
                // Tenta encontrar a chave correspondente em dadosEspecialidades
                const chaveCorrespondente = Object.keys(dadosEspecialidades).find(esp => 
                    esp.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                      .replace(/\s+/g, ' ')
                      .trim()
                      .toLowerCase() === chaveNormalizada
                ) || especialidade; // Se não encontrar, usa a chave original
                
                medicosPorEspecialidade[chaveCorrespondente] = medicos;
            });
            
            console.log('Médicos por especialidade processados:', medicosPorEspecialidade);
        } else {
            console.warn('Falha ao buscar médicos por especialidade, usando dados vazios');
        }

        // Verifica se os dados foram carregados corretamente
        if (Object.keys(dadosEspecialidades).length === 0) {
            throw new Error('Dados vazios recebidos da API');
        }
        
        // Combina os dados de especialidades com os dados dos médicos
        const dadosCompletos = {};
        Object.entries(dadosEspecialidades).forEach(([especialidade, valores]) => {
            dadosCompletos[especialidade] = {
                atendimentos: valores,
                medicos: medicosPorEspecialidade[especialidade] || []
            };
        });
        
        // Atualiza a variável global com os dados completos
        todosOsDadosEspecialidades = dadosCompletos;
        
        console.log('Dados completos carregados com sucesso:', todosOsDadosEspecialidades);
        
        // Atualiza a tabela e o gráfico com os dados carregados
        atualizarTabelaEspecialidades(todosOsDadosEspecialidades);
        atualizarGraficoEspecialidades(todosOsDadosEspecialidades);
        
        return todosOsDadosEspecialidades;
    } catch (error) {
        console.error('Erro ao carregar dados das especialidades:', error);
        
        // Exibe mensagem de erro para o usuário
        const container = document.getElementById('especialidades');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Não foi possível carregar os dados das especialidades. 
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="carregarDadosEspecialidades()">
                        Tentar novamente
                    </button>
                </div>
            `;
        }
        
        throw error; // Propaga o erro para quem chamou a função
    }
}

/**
 * Filtra os dados por especialidade
 * @param {string} filtroEspecialidade - A especialidade para filtrar
 */
function filtrarPorEspecialidade() {
    const filtroEspecialidade = document.getElementById('filtroEspecialidade').value;
    let dadosFiltrados = {};
    
    // Função para normalizar o nome da especialidade (remover acentos, espaços extras e converter para minúsculas)
    const normalizarEspecialidade = (nome) => {
        return nome
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um único
            .trim() // Remove espaços no início e fim
            .toLowerCase();
    };
    
    const filtroNormalizado = normalizarEspecialidade(filtroEspecialidade);
    
    if (filtroEspecialidade === '') {
        // Mostrar todas as especialidades
        dadosFiltrados = {...todosOsDadosEspecialidades};
    } else {
        // Procurar a especialidade que corresponde ao filtro (ignorando maiúsculas/minúsculas e acentos)
        for (const [especialidade, valores] of Object.entries(todosOsDadosEspecialidades)) {
            if (normalizarEspecialidade(especialidade) === filtroNormalizado) {
                dadosFiltrados[especialidade] = valores;
                break; // Encontrou a especialidade, pode sair do loop
            }
        }
    }
    
    console.log('Filtro aplicado:', filtroEspecialidade, 'Dados filtrados:', dadosFiltrados);
    
    // Atualiza a tabela e o gráfico com os dados filtrados
    atualizarTabelaEspecialidades(dadosFiltrados);
    atualizarGraficoEspecialidades(dadosFiltrados);
}

/**
 * Atualiza a tabela de especialidades com os dados fornecidos
 * @param {Object} dados - Os dados das especialidades e médicos
 */
function atualizarTabelaEspecialidades(dados) {
    const container = document.getElementById('tabelaEspecialidadesContainer');
    if (!container) {
        console.error('Elemento tabelaEspecialidadesContainer não encontrado');
        return;
    }
    
    // Limpa o container
    container.innerHTML = '';
    
    if (!dados || Object.keys(dados).length === 0) {
        console.log('Nenhum dado para exibir na tabela');
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-info';
        alertDiv.textContent = 'Nenhum dado disponível';
        container.appendChild(alertDiv);
        return;
    }
    
    console.log(`Processando ${Object.keys(dados).length} registros para a tabela`);
    
    // Cria um container para a tabela com barra de rolagem horizontal
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';
    tableWrapper.style.maxHeight = '70vh';
    tableWrapper.style.overflowY = 'auto';
    
    // Cria a tabela
    const table = document.createElement('table');
    table.className = 'table table-bordered table-striped table-hover table-sm';
    table.style.fontSize = '0.85rem';
    
    // Meses do ano
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Cria o cabeçalho da tabela
    const thead = document.createElement('thead');
    thead.className = 'sticky-top bg-light';
    
    // Primeira linha do cabeçalho - Meses
    const trMeses = document.createElement('tr');
    trMeses.innerHTML = `
        <th rowspan="2" class="align-middle text-center">Especialidade</th>
        <th rowspan="2" class="align-middle text-center">Médicos</th>
        <th colspan="12" class="text-center">Meses do Ano</th>
        <th rowspan="2" class="align-middle text-center">Total</th>
    `;
    
    // Segunda linha do cabeçalho - Nomes dos meses
    const trMesesNomes = document.createElement('tr');
    trMesesNomes.innerHTML = `
        ${meses.map(mes => `<th class="text-center">${mes}</th>`).join('')}
    `;
    
    thead.appendChild(trMeses);
    thead.appendChild(trMesesNomes);
    
    // Cria o corpo da tabela
    const tbody = document.createElement('tbody');
    
    // Ordena as especialidades por nome
    const especialidades = Object.keys(dados).sort();
    
    // Preenche a tabela com os dados
    especialidades.forEach(especialidade => {
        const item = dados[especialidade];
        const valores = Array.isArray(item.atendimentos) ? item.atendimentos : Array(12).fill(0);
        const medicos = Array.isArray(item.medicos) ? item.medicos : [];
        
        const total = valores.reduce((a, b) => a + b, 0);
        
        // Cria a linha principal da especialidade
        const tr = document.createElement('tr');
        tr.dataset.especialidade = especialidade;
        
        // Célula da especialidade
        const tdEspecialidade = document.createElement('td');
        tdEspecialidade.className = 'align-middle';
        tdEspecialidade.textContent = especialidade;
        
        // Célula dos médicos
        const tdMedicos = document.createElement('td');
        tdMedicos.className = 'align-middle';
        
        if (medicos.length > 0) {
            const medicosList = document.createElement('div');
            medicosList.className = 'medicos-list';
            
            medicos.forEach((medico, index) => {
                const medicoItem = document.createElement('div');
                medicoItem.className = 'medico-item';
                medicoItem.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="bi bi-person-fill me-2"></i>
                        <div>
                            <div class="fw-medium">${medico.nome}</div>
                            <small class="text-muted">CRM: ${medico.crm || 'N/A'}</small>
                        </div>
                    </div>
                `;
                
                // Adiciona tooltip com mais informações
                medicoItem.setAttribute('data-bs-toggle', 'tooltip');
                medicoItem.setAttribute('data-bs-placement', 'top');
                medicoItem.setAttribute('title', 
                    `Nome: ${medico.nome}\n` +
                    `CRM: ${medico.crm || 'N/A'}\n` +
                    `Email: ${medico.email || 'N/A'}\n` +
                    `Telefone: ${medico.telefone || 'N/A'}`
                );
                
                medicosList.appendChild(medicoItem);
                
                // Adiciona uma linha divisória entre os médicos (exceto após o último)
                if (index < medicos.length - 1) {
                    const divider = document.createElement('hr');
                    divider.className = 'my-1';
                    medicosList.appendChild(divider);
                }
            });
            
            tdMedicos.appendChild(medicosList);
        } else {
            tdMedicos.textContent = 'Nenhum médico cadastrado';
            tdMedicos.className += ' text-muted fst-italic';
        }
        
        // Células dos valores mensais
        const tdsValores = valores.map(valor => {
            const td = document.createElement('td');
            td.className = 'text-center align-middle';
            td.textContent = valor;
            return td.outerHTML;
        }).join('');
        
        // Célula do total
        const tdTotal = document.createElement('td');
        tdTotal.className = 'text-center align-middle fw-bold';
        tdTotal.textContent = total;
        
        // Monta a linha
        tr.innerHTML = `
            ${tdEspecialidade.outerHTML}
            ${tdMedicos.outerHTML}
            ${tdsValores}
            ${tdTotal.outerHTML}
        `;
        
        tbody.appendChild(tr);
    });
    
    // Adiciona linha de totais
    const totaisMensais = Array(12).fill(0);
    Object.values(dados).forEach(item => {
        const valores = Array.isArray(item.atendimentos) ? item.atendimentos : [];
        valores.forEach((valor, i) => {
            if (i < 12) {
                totaisMensais[i] += valor;
            }
        });
    });
    
    const tfoot = document.createElement('tfoot');
    const trTotal = document.createElement('tr');
    trTotal.className = 'table-active';
    trTotal.innerHTML = `
        <td class="font-weight-bold" colspan="2">Total</td>
        ${totaisMensais.map(total => `<td class="text-center font-weight-bold">${total}</td>`).join('')}
        <td class="text-center font-weight-bold">${totaisMensais.reduce((a, b) => a + b, 0)}</td>
    `;
    tfoot.appendChild(trTotal);
    
    // Monta a tabela
    table.appendChild(thead);
    table.appendChild(tbody);
    table.appendChild(tfoot);
    
    // Adiciona a tabela ao wrapper
    tableWrapper.appendChild(table);
    
    // Adiciona o wrapper ao container
    container.appendChild(tableWrapper);
    
    // Adiciona estilos inline para melhorar a aparência
    const style = document.createElement('style');
    style.textContent = `
        .table-responsive::-webkit-scrollbar {
            height: 8px;
        }
        .table-responsive::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 4px;
        }
        .table th, .table td {
            white-space: nowrap;
            position: relative;
            vertical-align: middle;
        }
        .table td {
            min-width: 50px;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .table thead th {
            background-color: #f8f9fa;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .medicos-list {
            max-height: 150px;
            overflow-y: auto;
            padding: 0.25rem;
        }
        .medico-item {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .medico-item:hover {
            background-color: rgba(0, 0, 0, 0.03);
        }
        .medico-item small {
            font-size: 0.75rem;
        }
    `;
    container.appendChild(style);
    
    // Inicializa os tooltips
    const tooltipTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Atualiza o gráfico de especialidades com os dados fornecidos
 * @param {Object} dados - Os dados das especialidades e médicos
 */
function atualizarGraficoEspecialidades(dados) {
    try {
        const ctx = document.getElementById('graficoEspecialidades');
        if (!ctx) {
            console.error('Elemento graficoEspecialidades não encontrado');
            return;
        }
        
        // Destrói o gráfico anterior, se existir
        if (window.graficoEspecialidades && typeof window.graficoEspecialidades.destroy === 'function') {
            window.graficoEspecialidades.destroy();
        }
        
        // Prepara os dados para o gráfico
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        // Ordena as especialidades por nome
        const especialidades = Object.keys(dados).sort();
        
        // Cores para as linhas do gráfico
        const cores = [
            'rgba(54, 162, 235, 1)',    // Azul
            'rgba(255, 99, 132, 1)',    // Vermelho
            'rgba(75, 192, 192, 1)',    // Verde água
            'rgba(255, 159, 64, 1)',    // Laranja
            'rgba(153, 102, 255, 1)',   // Roxo
            'rgba(255, 205, 86, 1)',    // Amarelo
            'rgba(201, 203, 207, 1)'    // Cinza
        ];
        
        // Prepara os datasets para o gráfico
        const datasets = [];
        
        // Adiciona cada especialidade como uma linha no gráfico
        especialidades.forEach((especialidade, index) => {
            const valores = (dados[especialidade] && Array.isArray(dados[especialidade].atendimentos))
                ? dados[especialidade].atendimentos
                : Array(12).fill(0);
                
            const cor = cores[index % cores.length];
            
            datasets.push({
                label: especialidade,
                data: valores,
                borderColor: cor,
                backgroundColor: cor.replace('1)', '0.1)'),
                borderWidth: 2,
                tension: 0.3,
                fill: false,
                pointBackgroundColor: cor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: cor
            });
        });
        
        // Configurações do gráfico
        const config = {
            type: 'line',
            data: {
                labels: meses,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Atendimentos',
                            font: {
                                weight: 'bold',
                                size: 12
                            },
                            padding: {bottom: 10}
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            stepSize: 1,
                            precision: 0,
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mês',
                            font: {
                                weight: 'bold',
                                size: 12
                            },
                            padding: {top: 10}
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolução Mensal de Atendimentos por Especialidade',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 20
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            weight: 'bold',
                            size: 12
                        },
                        bodyFont: {
                            size: 12
                        },
                        padding: 10,
                        cornerRadius: 4,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.parsed.y} atendimentos`;
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        borderJoinStyle: 'round',
                        borderWidth: 2
                    },
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 15,
                        bottom: 10,
                        left: 15
                    }
                }
            }
        };
        
        // Cria o gráfico
        window.graficoEspecialidades = new Chart(ctx, config);
        
        // Ajusta o tamanho do gráfico quando a janela for redimensionada
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                if (window.graficoEspecialidades && typeof window.graficoEspecialidades.resize === 'function') {
                    window.graficoEspecialidades.resize();
                }
            });
            
            if (ctx.parentElement) {
                resizeObserver.observe(ctx.parentElement);
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar o gráfico de especialidades:', error);
    }
}

/**
 * Exporta o relatório de especialidades para PDF
 */
async function exportarRelatorioEspecialidades(button) {
    const originalButtonHTML = button?.innerHTML || '';
    
    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Exportando...';
        }
        
        // Tenta obter os dados das especialidades
        let dadosEspecialidades = todosOsDadosEspecialidades || {};
        
        // Se não houver dados, tenta carregar
        if (Object.keys(dadosEspecialidades).length === 0) {
            try {
                console.log('Dados não encontrados, tentando carregar...');
                dadosEspecialidades = await carregarDadosEspecialidades();
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            }
        }
        
        if (!dadosEspecialidades || Object.keys(dadosEspecialidades).length === 0) {
            alert('Não foi possível carregar os dados das especialidades. Por favor, gere o relatório primeiro.');
            return;
        }

        // Cria um novo documento PDF em modo paisagem
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Configurações do documento
        const titulo = 'RELATÓRIO DE ATENDIMENTOS POR ESPECIALIDADE';  
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const margem = 8;  
        
        // Adiciona o cabeçalho
        doc.setDrawColor(41, 128, 185);
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
        
        // Adiciona o título do relatório
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const tituloWidth = doc.getStringUnitWidth(titulo) * doc.getFontSize() / doc.internal.scaleFactor;
        const tituloX = (doc.internal.pageSize.width - tituloWidth) / 2;
        doc.text(titulo, tituloX, 30);
        
        // Adiciona informações da clínica
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Clínica Vida & Saúde', margem, 45);
        doc.text(`Emitido em: ${dataAtual} às ${horaAtual}`, doc.internal.pageSize.width - margem, 45, { align: 'right' });
        
        // Prepara os dados da tabela com cabeçalhos mais legíveis
        const mesesAbreviados = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const headers = ['Especialidade', ...mesesAbreviados, 'Total'];
        
        // Prepara os dados da tabela e calcula totais
        const data = [];
        const totaisMensais = Array(12).fill(0);
        
        // Adiciona as linhas das especialidades
        Object.keys(dadosEspecialidades).sort().forEach(especialidade => {
            const valores = Array.isArray(dadosEspecialidades[especialidade]) ? 
                dadosEspecialidades[especialidade] : 
                Array(12).fill(0);
                
            // Atualiza totais mensais
            valores.forEach((valor, i) => {
                totaisMensais[i] += parseInt(valor) || 0;
            });
            
            const total = valores.reduce((a, b) => a + b, 0);
            data.push([especialidade, ...valores.map(v => v.toString()), total.toString()]);
        });
        
        const totalGeral = totaisMensais.reduce((a, b) => a + b, 0);
        
        // Configurações da tabela
        const larguraColunaEspecialidade = 40;
        const larguraColunaMes = 9;
        const larguraColunaTotal = 15;
        const larguraTotalTabela = larguraColunaEspecialidade + (mesesAbreviados.length * larguraColunaMes) + larguraColunaTotal;
        const margemLateral = (doc.internal.pageSize.width - larguraTotalTabela) / 2;
        
        const tableConfig = {
            head: [headers],
            body: data,
            startY: 45,
            margin: { left: margemLateral, right: margemLateral },
            tableWidth: 'wrap',
            styles: {
                fontSize: 8,
                cellPadding: 1.5,
                overflow: 'linebreak',
                cellWidth: 'wrap',
                valign: 'middle',
                lineWidth: 0.1,
                textColor: [0, 0, 0],
                minCellHeight: 6
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontSize: 8,
                cellPadding: 2,
                lineWidth: 0.1,
                valign: 'middle',
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { 
                    cellWidth: larguraColunaEspecialidade,
                    halign: 'left',
                    cellPadding: { left: 2, right: 1, top: 1, bottom: 1 },
                    fontStyle: 'normal',
                    fontSize: 8
                },
                ...Object.fromEntries(mesesAbreviados.map((_, i) => [i + 1, { 
                    cellWidth: larguraColunaMes,
                    halign: 'center',
                    cellPadding: 1,
                    fontSize: 8
                }])),
                [mesesAbreviados.length + 1]: { 
                    cellWidth: larguraColunaTotal,
                    halign: 'center',
                    fontStyle: 'bold',
                    cellPadding: 1,
                    fontSize: 8
                }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 0) {
                    data.cell.styles.cellWidth = larguraColunaEspecialidade;
                    data.cell.styles.fontSize = 8;
                    data.cell.styles.halign = 'left';
                }
            },
            didDrawPage: function(data) {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height || pageSize.getHeight();
                doc.setFontSize(7);
                doc.setTextColor(100);
                doc.text(
                    'Página ' + doc.internal.getNumberOfPages(),
                    pageSize.width / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }
        };
        
        // Adiciona a tabela principal
        doc.autoTable({
            ...tableConfig,
            // Sobrescreve estilos específicos para a tabela principal
            styles: {
                ...tableConfig.styles,
                lineWidth: 0.1,
                lineColor: [0, 0, 0],
            },
            // Ajusta o cabeçalho para ocupar apenas uma linha
            headStyles: {
                ...tableConfig.headStyles,
                textColor: [255, 255, 255],
                fillColor: [41, 128, 185],
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            // Ajusta as células do corpo
            bodyStyles: {
                textColor: [0, 0, 0],
                fontStyle: 'normal',
                lineWidth: 0.1,
                lineColor: [200, 200, 200]
            },
            // Configuração para quebrar texto longo na primeira coluna
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 0) {
                    data.cell.styles.cellWidth = larguraColunaEspecialidade;
                    data.cell.styles.fontSize = 8;
                    data.cell.styles.halign = 'left';
                    data.cell.styles.valign = 'middle';
                    data.cell.styles.lineWidth = 0.1;
                }
            }
        });
        
        // Adiciona a tabela de totais
        doc.autoTable({
            body: [
                [
                    { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'left' } },
                    ...totaisMensais.map(t => ({
                        content: t.toString(), 
                        styles: { fontStyle: 'bold', halign: 'center' }
                    })),
                    { 
                        content: totalGeral.toString(), 
                        styles: { fontStyle: 'bold', halign: 'center' } 
                    }
                ]
            ],
            startY: doc.lastAutoTable.finalY + 3,
            margin: { left: margemLateral, right: margemLateral },
            styles: {
                fontSize: 8,
                cellPadding: 1.5,
                lineWidth: 0.1,
                fillColor: [240, 248, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                minCellHeight: 6
            },
            columnStyles: tableConfig.columnStyles  // Usa o mesmo estilo de coluna
        });
        
        // Salva o PDF
        doc.save(`relatorio_especialidades_${new Date().toISOString().split('T')[0]}.pdf`);
        
        // Mostra mensagem de sucesso
        if (window.showToast) {
            showToast('Relatório exportado com sucesso!', 'success');
        } else if (window.bootstrap && document.getElementById('toastSucesso')) {
            const toast = new bootstrap.Toast(document.getElementById('toastSucesso'));
            toast.show();
        }
        
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        
        // Exibe mensagem de erro de forma segura
        if (window.showToast) {
            showToast('Erro ao exportar o relatório. Tente novamente.', 'error');
        } else if (window.bootstrap && document.getElementById('toastErro')) {
            const toast = new bootstrap.Toast(document.getElementById('toastErro'));
            toast.show();
        } else {
            alert('Erro ao exportar o relatório. Verifique o console para mais detalhes.');
        }
    } finally {
        // Restaura o botão em qualquer caso
        if (button) {
            button.disabled = false;
            button.innerHTML = originalButtonHTML;
        }
    }
}

/**
 * Carrega os dados das consultas do mês selecionado
 * @async
 */
async function carregarConsultasMes() {
    // Removido
}

/**
 * Simula uma busca de consultas do mês (substituir por chamada AJAX real)
 * @param {string} mes - Mês no formato MM
 * @param {string} ano - Ano no formato YYYY
 * @return {Promise<Object>} Dados simulados das consultas
 */
async function simularBuscaConsultasMes(mes, ano) {
    // Removido
}

/**
 * Atualiza a tabela de detalhamento por dia com os dados fornecidos
 * @param {Array} dados - Array de objetos com os dados de cada dia
 */
function atualizarTabelaDetalhamentoDias(dados) {
    // Removido
}
document.addEventListener('DOMContentLoaded', function () {
    // --- Funções Auxiliares de Validação (definidas uma vez) ---
    function validarCPF(cpf) {
        cpf = cpf.replace(new RegExp("[^\\d]+", "g"), '');
        if (cpf === '' || cpf.length !== 11 || new RegExp("^(\\d)\\1+$").test(cpf)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    }

    function exibirErro(input, mensagem) {
        input.classList.add('is-invalid');
        let errorDiv = input.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('invalid-feedback')) {
            errorDiv = document.createElement('div');
            errorDiv.classList.add('invalid-feedback');
            input.parentNode.insertBefore(errorDiv, input.nextSibling);
        }
        errorDiv.textContent = mensagem;
        errorDiv.style.display = 'block';
    }

    function limparErro(input) {
        input.classList.remove('is-invalid');
        let errorDiv = input.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
    }

    function validarCampo(input, validacoes) {
        if (!input) return true;
        limparErro(input);
        let mensagemErro = '';

        for (const v of validacoes) {
            let erroAtual = '';
            const valorTrimado = typeof input.value === 'string' ? input.value.trim() : input.value;
            
            // Pular validação se o campo estiver vazio e não for obrigatório
            if (v.tipo !== 'obrigatorio' && (valorTrimado === '' || valorTrimado === null)) {
                continue;
            }

            switch (v.tipo) {
                case 'obrigatorio':
                    if (input.type === 'checkbox' && !input.checked) erroAtual = v.mensagem || 'Este campo é obrigatório.';
                    else if (valorTrimado === '' || valorTrimado === null) erroAtual = v.mensagem || 'Este campo é obrigatório.';
                    break;
                case 'minlength':
                    if (valorTrimado.length < v.valor) erroAtual = v.mensagem || `Deve ter no mínimo ${v.valor} caracteres.`;
                    break;
                case 'maxlength':
                    if (valorTrimado.length > v.valor) erroAtual = v.mensagem || `Deve ter no máximo ${v.valor} caracteres.`;
                    break;
                case 'email':
                    const emailRegex = new RegExp("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
                    if (!emailRegex.test(valorTrimado)) erroAtual = v.mensagem || 'Formato de email inválido.';
                    break;
                case 'cpf':
                    if (!validarCPF(valorTrimado)) erroAtual = v.mensagem || 'CPF inválido.';
                    break;
                case 'regex':
                    if (!v.valor.test(valorTrimado)) erroAtual = v.mensagem || 'Formato inválido.';
                    break;
                case 'comparar':
                    const outroInput = document.getElementById(v.idComparacao);
                    if (outroInput && input.value !== outroInput.value) erroAtual = v.mensagem || 'Os valores não coincidem.';
                    break;
                case 'minValor':
                    if (parseFloat(valorTrimado) < v.valor) erroAtual = v.mensagem || `Valor deve ser no mínimo ${v.valor}.`;
                    break;
                case 'custom':
                    if (v.validar && !v.validar(valorTrimado)) erroAtual = v.mensagem || 'Valor inválido.';
                    break;
            }
            if (erroAtual) {
                mensagemErro = erroAtual;
                break;
            }
        }
        if (mensagemErro) {
            exibirErro(input, mensagemErro);
            return false;
        }
        return true;
    }

    function validarFormulario(form, camposConfig) {
        let isValid = true;
        camposConfig.forEach(campo => {
            const input = form.querySelector(`#${campo.id}`);
            if (input && !validarCampo(input, campo.validacoes)) {
                isValid = false;
            }
        });
        return isValid;
    }

    // Função para validar CRM
    function validarCRM(crm) {
        // Remove todos os caracteres não numéricos
        const crmNumerico = crm.replace(/\D/g, '');
        
        // Verifica se o CRM contém apenas números
        if (!/^\d+$/.test(crmNumerico)) {
            return false;
        }
        
        // Verifica se o CRM tem pelo menos 6 dígitos
        if (crmNumerico.length < 6) {
            return false;
        }
        
        return true;
    }

    // Função para aplicar máscara no CRM
    function aplicarMascaraCRM(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
           
            input.setAttribute('type', 'text');
            
            input.setAttribute('inputmode', 'numeric');
            input.setAttribute('pattern', '\\d*');
            
            // Remove qualquer caractere não numérico ao digitar
            input.addEventListener('input', function(e) {
                // Remove todos os caracteres não numéricos
                let value = e.target.value.replace(/\D/g, '');
                
                // Limita o tamanho do CRM para 10 dígitos
                value = value.slice(0, 10);
                
                // Atualiza o valor do campo
                e.target.value = value;
                
                // Dispara o evento 'input' para forçar a validação
                const event = new Event('input', { bubbles: true });
                e.target.dispatchEvent(event);
            });
            
            // Adiciona validação ao perder o foco
            input.addEventListener('blur', function() {
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            });
        }
    }

    // Função para mostrar feedback de carregamento
    function mostrarCarregamento(form, mostrar) {
        const btnSubmit = form.querySelector('button[type="submit"]');
        if (!btnSubmit) return;
        
        if (mostrar) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
        } else {
            btnSubmit.disabled = false;
            btnSubmit.textContent = btnSubmit.getAttribute('data-original-text') || 'Enviar';
        }
    }

    // Função para validar data de nascimento
    function validarDataNascimento(data) {
        const dataNasc = new Date(data);
        const hoje = new Date();
        
        // Verifica se é uma data válida
        if (isNaN(dataNasc.getTime())) return false;
        
        // Verifica se a data não é futura
        if (dataNasc > hoje) return false;
        
        // Verifica se a pessoa tem pelo menos 12 anos
        const idadeMinima = new Date(hoje.getFullYear() - 12, hoje.getMonth(), hoje.getDate());
        if (dataNasc > idadeMinima) return false;
        
        return true;
    }

    // --- Aplicação de Máscaras --- 
    function aplicarMascaraCPF(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function (e) {
                let value = e.target.value.replace(new RegExp("\\D", "g"), '');
                value = value.replace(new RegExp("(\\d{3})(\\d)"), '$1.$2');
                value = value.replace(new RegExp("(\\d{3})(\\d)"), '$1.$2');
                value = value.replace(new RegExp("(\\d{3})(\\d{1,2})$"), '$1-$2');
                e.target.value = value.slice(0, 14);
            });
        }
    }

    function aplicarMascaraTelefone(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function (e) {
                let value = e.target.value.replace(new RegExp("\\D", "g"), '');
                if (value.length <= 2) value = value.replace(new RegExp("^(\\d{0,2})"), '($1');
                else if (value.length <= 6) value = value.replace(new RegExp("^(\\d{2})(\\d{0,4})"), '($1) $2');
                else if (value.length <= 10) value = value.replace(new RegExp("^(\\d{2})(\\d{4})(\\d{0,4})"), '($1) $2-$3');
                else value = value.replace(new RegExp("^(\\d{2})(\\d{5})(\\d{0,4})"), '($1) $2-$3');
                e.target.value = value.slice(0, 15);
            });
        }
    }

    function aplicarMascaraCEP(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function (e) {
                let value = e.target.value.replace(new RegExp("\\D", "g"), '');
                value = value.replace(new RegExp("^(\\d{5})(\\d)"), '$1-$2');
                e.target.value = value.slice(0, 9);
            });
        }
    }

    // Função para permitir apenas números em um campo de entrada
    function permitirApenasNumeros(input) {
        input.addEventListener('input', function(e) {
            // Remove qualquer caractere que não seja número
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    // Aplicar máscaras
    aplicarMascaraCPF('cpfMedico');
    aplicarMascaraTelefone('telefoneMedico');
    aplicarMascaraCRM('crm');
    aplicarMascaraCPF('cpfFuncionario');
    aplicarMascaraTelefone('telefoneFuncionario');
    aplicarMascaraCEP('cepMedico');
    aplicarMascaraCEP('cepFuncionario');
    
    // Aplicar validação de apenas números nos campos de número
    const camposNumero = ['numeroMedico', 'numeroFuncionario'];
    camposNumero.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            permitirApenasNumeros(input);
            // Adicionar validação de comprimento máximo
            input.setAttribute('maxlength', '6'); // Limita a 6 dígitos
        }
    });

    // --- Configuração dos Campos e Lógica para Formulário de Médico ---
    const medicoCamposConfig = [
        { id: 'nomeMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 2 }, { tipo: 'maxlength', valor: 100 }, { tipo: 'regex', valor: new RegExp("^[a-zA-ZÀ-ÿ\\s]+$"), mensagem: 'Nome deve conter apenas letras e espaços.' }] },
        { 
            id: 'crm', 
            validacoes: [
                { tipo: 'obrigatorio', mensagem: 'CRM é obrigatório.' },
                { 
                    tipo: 'regex', 
                    valor: /^\d+$/,  // Aceita apenas dígitos
                    mensagem: 'CRM deve conter apenas números.' 
                },
                { 
                    tipo: 'minlength', 
                    valor: 6, 
                    mensagem: 'CRM deve ter no mínimo 6 dígitos.' 
                },
                { 
                    tipo: 'maxlength', 
                    valor: 10, 
                    mensagem: 'CRM deve ter no máximo 10 dígitos.' 
                }
            ] 
        },
        { id: 'cpfMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'cpf' }] },
        { id: 'especialidade', validacoes: [{ tipo: 'obrigatorio' }] },
        { id: 'emailMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'email' }] },
        { 
            id: 'telefoneMedico', 
            validacoes: [
                { tipo: 'obrigatorio' }, 
                { 
                    tipo: 'regex', 
                    valor: new RegExp("^\\(\\d{2}\\) \\d{4,5}-\\d{4}$"), 
                    mensagem: 'Formato de telefone inválido. Use (XX) XXXX-XXXX para fixo ou (XX) 9XXXX-XXXX para celular.' 
                } 
            ] 
        },
        { id: 'cepMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'regex', valor: new RegExp("^\\d{5}-\\d{3}$"), mensagem: 'Formato de CEP inválido. Use XXXXX-XXX.' }] },
        { id: 'enderecoMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 5 }, { tipo: 'maxlength', valor: 200 }] },
        { id: 'numeroMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'maxlength', valor: 10 }, { tipo: 'regex', valor: new RegExp("^[a-zA-Z0-9\\s]+$"), mensagem: 'Número deve conter apenas letras e números.' }] },
        { id: 'bairroMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 2 }, { tipo: 'maxlength', valor: 100 }] },
        { id: 'cidadeMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 2 }, { tipo: 'maxlength', valor: 100 }] },
        { id: 'estadoMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'regex', valor: new RegExp("^[A-Z]{2}$"), mensagem: 'Estado deve ser uma sigla com 2 letras maiúsculas (ex: SP).' }] },
        { id: 'senhaMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'regex', valor: new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{6,12}$"), mensagem: 'Senha: 6-12 caracteres, 1 maiúscula, 1 número, 1 especial (!@#$%^&*).' }] },
        { id: 'confirmarSenhaMedico', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'comparar', idComparacao: 'senhaMedico', mensagem: 'As senhas não coincidem.' }] }
    ];

    const formMedico = document.getElementById('formMedico');
    if (formMedico) {
        formMedico.addEventListener('submit', function (event) {
            event.preventDefault();
            if (validarFormulario(formMedico, medicoCamposConfig)) {
                alert('Formulário de médico válido! Implementar envio.');
            }
        });
        const inputsMedico = formMedico.querySelectorAll('input');
        inputsMedico.forEach(input => {
            input.addEventListener('blur', function () {
                const campoConfig = medicoCamposConfig.find(c => c.id === input.id);
                if (campoConfig) validarCampo(input, campoConfig.validacoes);
            });
            input.addEventListener('input', function () { limparErro(input); });
        });
    }

    // --- Configuração dos Campos e Lógica para Formulário de Funcionário ---
    const funcionarioCamposConfig = [
        { id: 'nomeFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 2 }, { tipo: 'maxlength', valor: 100 }, { tipo: 'regex', valor: new RegExp("^[a-zA-ZÀ-ÿ\\s]+$"), mensagem: 'Nome deve conter apenas letras e espaços.' }] },
        { id: 'cpfFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'cpf' }] },
        { 
            id: 'dataNascimentoFuncionario', 
            validacoes: [
                { tipo: 'obrigatorio', mensagem: 'Data de nascimento é obrigatória.' },
                { 
                    tipo: 'custom', 
                    validar: (valor) => validarDataNascimento(valor),
                    mensagem: 'Data de nascimento inválida ou idade mínima não atingida (12 anos).'
                }
            ] 
        },
        { id: 'emailFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'email' }] },
        { 
            id: 'telefoneFuncionario', 
            validacoes: [
                { tipo: 'obrigatorio' }, 
                { 
                    tipo: 'regex', 
                    valor: new RegExp("^\\(\\d{2}\\) \\d{4,5}-\\d{4}$"), 
                    mensagem: 'Formato de telefone inválido. Use (XX) XXXX-XXXX para fixo ou (XX) 9XXXX-XXXX para celular.' 
                } 
            ] 
        },
        { id: 'cargoFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 2 }, { tipo: 'maxlength', valor: 100 }] },
        { id: 'salarioFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minValor', valor: 0.01, mensagem: 'Salário deve ser um valor positivo.' }] },
        { id: 'dataContratacaoFuncionario', validacoes: [{ tipo: 'obrigatorio', mensagem: 'Data de contratação é obrigatória.' }] },
        { id: 'enderecoFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 5 }, { tipo: 'maxlength', valor: 200 }] },
        { id: 'numeroFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'maxlength', valor: 10 }, { tipo: 'regex', valor: new RegExp("^[a-zA-Z0-9\\s]+$"), mensagem: 'Número deve conter apenas letras e números.' }] },
        { id: 'bairroFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 2 }, { tipo: 'maxlength', valor: 100 }] },
        { id: 'cidadeFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'minlength', valor: 2 }, { tipo: 'maxlength', valor: 100 }] },
        { id: 'estadoFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'regex', valor: new RegExp("^[A-Z]{2}$"), mensagem: 'Estado deve ser uma sigla com 2 letras maiúsculas (ex: SP).' }] },
        { id: 'cepFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'regex', valor: new RegExp("^\\d{5}-\\d{3}$"), mensagem: 'Formato de CEP inválido. Use XXXXX-XXX.' }] },
        { id: 'senhaFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'regex', valor: new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{6,12}$"), mensagem: 'Senha: 6-12 caracteres, 1 maiúscula, 1 número, 1 especial (!@#$%^&*).' }] },
        { id: 'confirmarSenhaFuncionario', validacoes: [{ tipo: 'obrigatorio' }, { tipo: 'comparar', idComparacao: 'senhaFuncionario', mensagem: 'As senhas não coincidem.' }] }
    ];

    const formFuncionario = document.getElementById('formFuncionario');
    if (formFuncionario) {
        // Salvar o texto original do botão
        const btnSubmit = formFuncionario.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.setAttribute('data-original-text', btnSubmit.textContent);
        }

        formFuncionario.addEventListener('submit', async function (event) {
            event.preventDefault();
            
            if (!validarFormulario(formFuncionario, funcionarioCamposConfig)) {
                return;
            }

            try {
                mostrarCarregamento(formFuncionario, true);
                
                // Coletar os dados do formulário
                const formData = {
                    nome: document.getElementById('nomeFuncionario').value.trim(),
                    cpf: document.getElementById('cpfFuncionario').value.replace(/\D/g, ''), // Remove formatação
                    data_nascimento: document.getElementById('dataNascimentoFuncionario').value,
                    email: document.getElementById('emailFuncionario').value.trim(),
                    telefone: document.getElementById('telefoneFuncionario').value,
                    cargo: document.getElementById('cargoFuncionario').value,
                    salario: parseFloat(document.getElementById('salarioFuncionario').value),
                    data_contratacao: document.getElementById('dataContratacaoFuncionario').value,
                    endereco: document.getElementById('enderecoFuncionario').value.trim(),
                    numero: document.getElementById('numeroFuncionario').value.trim(),
                    bairro: document.getElementById('bairroFuncionario').value.trim(),
                    cidade: document.getElementById('cidadeFuncionario').value.trim(),
                    estado: document.getElementById('estadoFuncionario').value.trim(),
                    cep: document.getElementById('cepFuncionario').value.replace(/\D/g, ''), // Remove formatação
                    senha: document.getElementById('senhaFuncionario').value
                };

                // Enviar para a API
                const response = await fetch('/api/funcionarios', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.erro || 'Erro ao cadastrar funcionário');
                }
                
                // Mostrar mensagem de sucesso
                alert('Funcionário cadastrado com sucesso!');
                formFuncionario.reset();
                
            } catch (error) {
                console.error('Erro:', error);
                alert(error.message || 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.');
            } finally {
                mostrarCarregamento(formFuncionario, false);
            }
        });

        const inputsFuncionario = formFuncionario.querySelectorAll('input, select');
        inputsFuncionario.forEach(input => {
            input.addEventListener('blur', function () {
                const campoConfig = funcionarioCamposConfig.find(c => c.id === input.id);
                if (campoConfig) validarCampo(input, campoConfig.validacoes);
            });
            input.addEventListener('input', function () { 
                if (input.type !== 'file') { // Não limpar erros para campos de arquivo
                    limparErro(input); 
                }
            });
            
            // Adicionar validação ao mudar a seleção
            if (input.tagName === 'SELECT') {
                input.addEventListener('change', function() {
                    const campoConfig = funcionarioCamposConfig.find(c => c.id === input.id);
                    if (campoConfig) validarCampo(input, campoConfig.validacoes);
                });
            }
        });
    }
});
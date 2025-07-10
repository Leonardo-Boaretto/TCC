document.addEventListener('DOMContentLoaded', async () => {
    const formEditarUsuario = document.getElementById('formEditarUsuario');
    const nomeInput = document.getElementById('nome');
    const cpfInput = document.getElementById('cpf');
    const dataNascimentoInput = document.getElementById('data_nascimento');
    const emailInput = document.getElementById('email');
    const telefoneInput = document.getElementById('telefone');
    const cepInput = document.getElementById('cep');
    const enderecoInput = document.getElementById('endereco');
    const numeroInput = document.getElementById('numero');
    const bairroInput = document.getElementById('bairro');
    const cidadeInput = document.getElementById('cidade');
    const estadoInput = document.getElementById('estado');
    const referenciaInput = document.getElementById('referencia');

    const urlParams = new URLSearchParams(window.location.search);
    const usuarioId = urlParams.get('id');

    if (!usuarioId) {
        alert('ID do usuário não fornecido na URL.');
        return;
    }

    // Função para buscar dados do usuário e preencher o formulário
    async function carregarDadosUsuario() {
        try {
            const response = await fetch(`/api/usuarios/${usuarioId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || 'Erro ao buscar dados do usuário');
            }
            const usuario = await response.json();

            nomeInput.value = usuario.nome || '';
            cpfInput.value = usuario.cpf || '';
            dataNascimentoInput.value = usuario.data_nascimento ? usuario.data_nascimento.split('T')[0] : '';
            emailInput.value = usuario.email || '';
            telefoneInput.value = usuario.telefone || '';
            cepInput.value = usuario.cep || '';
            enderecoInput.value = usuario.endereco || '';
            numeroInput.value = usuario.numero || '';
            bairroInput.value = usuario.bairro || '';
            cidadeInput.value = usuario.cidade || '';
            estadoInput.value = usuario.estado || '';
            if (referenciaInput) {
                referenciaInput.value = usuario.referencia || '';
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            alert(`Erro ao carregar dados do usuário: ${error.message}`);
        }
    }

    // Função para aplicar máscara de CPF
    function aplicarMascaraCPF(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = value.slice(0, 14);
            });
        }
    }

    // Função para aplicar máscara de telefone
    function aplicarMascaraTelefone(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 2) value = value.replace(/^(\d{0,2})/, '($1');
                else if (value.length <= 6) value = value.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
                else if (value.length <= 10) value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
                else value = value.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                e.target.value = value.slice(0, 15);
            });
        }
    }

    // Aplicar máscaras e validações
    aplicarMascaraCPF('cpf');
    aplicarMascaraTelefone('telefone');

    // Validar campo número para aceitar apenas números
    if (numeroInput) {
        numeroInput.addEventListener('input', function(e) {
            // Remove qualquer caractere que não seja número
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    // Função de validação de Email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Função para validar CPF
    function validarCPF(cpf) {
        // Remove caracteres não numéricos
        cpf = cpf.replace(/[^\d]/g, '');
        
        console.log('Validando CPF:', cpf);
        
        // Verifica se o CPF tem 11 dígitos
        if (cpf.length !== 11) {
            console.log('CPF inválido: não tem 11 dígitos');
            return false;
        }
        
        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cpf)) {
            console.log('CPF inválido: todos os dígitos são iguais');
            return false;
        }
        
        // Validação do primeiro dígito verificador
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(9))) {
            console.log('CPF inválido: primeiro dígito verificador incorreto');
            return false;
        }
        
        // Validação do segundo dígito verificador
        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpf.charAt(i)) * (11 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(10))) {
            console.log('CPF inválido: segundo dígito verificador incorreto');
            return false;
        }
        
        console.log('CPF válido');
        return true;
    }

    // Função principal de validação do formulário
    function validateForm() {
        console.log('Iniciando validação do formulário...');
        let isValid = true;
        const errorMessages = [];

        // Validação do Nome
        if (!nomeInput.value.trim()) {
            console.log('Validação falhou: Nome é obrigatório');
            errorMessages.push('O campo Nome é obrigatório.');
            nomeInput.classList.add('is-invalid');
            isValid = false;
        } else {
            nomeInput.classList.remove('is-invalid');
        }

        // Validação do CPF
        const cpf = cpfInput.value.replace(/\D/g, '');
        if (!cpf) {
            console.log('Validação falhou: CPF é obrigatório');
            errorMessages.push('O campo CPF é obrigatório.');
            cpfInput.classList.add('is-invalid');
            isValid = false;
        } else if (!validarCPF(cpf)) {
            console.log('Validação falhou: CPF inválido');
            errorMessages.push('CPF inválido.');
            cpfInput.classList.add('is-invalid');
            isValid = false;
        } else {
            cpfInput.classList.remove('is-invalid');
        }

        // Validação da Data de Nascimento
        const dataNascimento = dataNascimentoInput.value.trim();
        if (!dataNascimento) {
            console.log('Validação falhou: Data de Nascimento é obrigatória');
            errorMessages.push('A Data de Nascimento é obrigatória.');
            dataNascimentoInput.classList.add('is-invalid');
            isValid = false;
        } else {
            dataNascimentoInput.classList.remove('is-invalid');
        }

        const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dataRegex.test(dataNascimento)) {
            console.log('Validação falhou: Data de Nascimento deve estar no formato AAAA-MM-DD');
            errorMessages.push('A Data de Nascimento deve estar no formato AAAA-MM-DD.');
            dataNascimentoInput.classList.add('is-invalid');
            isValid = false;
        } else {
            dataNascimentoInput.classList.remove('is-invalid');
        }

        const dataAtual = new Date();
        const dataNasc = new Date(dataNascimento);
        if (dataNasc >= dataAtual) {
            console.log('Validação falhou: Data de Nascimento não pode ser no futuro');
            errorMessages.push('A Data de Nascimento não pode ser no futuro.');
            dataNascimentoInput.classList.add('is-invalid');
            isValid = false;
        } else {
            dataNascimentoInput.classList.remove('is-invalid');
        }

        // Validação do Email
        const email = emailInput.value.trim();
        if (!email) {
            console.log('Validação falhou: Email é obrigatório');
            errorMessages.push('O campo Email é obrigatório.');
            emailInput.classList.add('is-invalid');
            isValid = false;
        } else {
            emailInput.classList.remove('is-invalid');
        }
        if (email.length > 100) {
            console.log('Validação falhou: Email muito longo');
            errorMessages.push('O Email não pode ter mais de 100 caracteres.');
            emailInput.classList.add('is-invalid');
            isValid = false;
        } else {
            emailInput.classList.remove('is-invalid');
        }
        if (!isValidEmail(email)) {
            console.log('Validação falhou: Email inválido');
            errorMessages.push('Email inválido.');
            emailInput.classList.add('is-invalid');
            isValid = false;
        } else {
            emailInput.classList.remove('is-invalid');
        }

        // Validação do Telefone
        const telefone = telefoneInput.value.replace(/\D/g, '');
        if (telefone && telefone.length < 10) {
            console.log('Validação falhou: Telefone inválido');
            errorMessages.push('O Telefone deve ter pelo menos 10 dígitos (incluindo DDD).');
            telefoneInput.classList.add('is-invalid');
            isValid = false;
        } else {
            telefoneInput.classList.remove('is-invalid');
        }

        // Validação do CEP
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep && cep.length !== 8) {
            console.log('Validação falhou: CEP inválido');
            errorMessages.push('O CEP deve ter exatamente 8 dígitos.');
            cepInput.classList.add('is-invalid');
            isValid = false;
        } else {
            cepInput.classList.remove('is-invalid');
        }

        // Validação do Endereço
        const endereco = enderecoInput.value.trim();
        if (!endereco) {
            console.log('Validação falhou: Endereço é obrigatório');
            errorMessages.push('O campo Endereço é obrigatório.');
            enderecoInput.classList.add('is-invalid');
            isValid = false;
        } else if (endereco.length < 5) {
            console.log('Validação falhou: Endereço muito curto');
            errorMessages.push('O Endereço deve ter pelo menos 5 caracteres.');
            enderecoInput.classList.add('is-invalid');
            isValid = false;
        } else {
            enderecoInput.classList.remove('is-invalid');
        }

        // Validação do Número
        const numero = numeroInput.value.trim();
        if (!numero) {
            console.log('Validação falhou: Número é obrigatório');
            errorMessages.push('O campo Número é obrigatório.');
            numeroInput.classList.add('is-invalid');
            isValid = false;
        } else if (!/^\d+$/.test(numero)) {
            console.log('Validação falhou: Número inválido (apenas dígitos são permitidos)');
            errorMessages.push('O campo Número deve conter apenas dígitos.');
            numeroInput.classList.add('is-invalid');
            isValid = false;
        } else {
            numeroInput.classList.remove('is-invalid');
        }

        // Validação do Bairro
        const bairro = bairroInput.value.trim();
        if (!bairro) {
            console.log('Validação falhou: Bairro é obrigatório');
            errorMessages.push('O campo Bairro é obrigatório.');
            bairroInput.classList.add('is-invalid');
            isValid = false;
        } else {
            bairroInput.classList.remove('is-invalid');
        }

        // Validação da Cidade
        const cidade = cidadeInput.value.trim();
        if (!cidade) {
            console.log('Validação falhou: Cidade é obrigatória');
            errorMessages.push('O campo Cidade é obrigatório.');
            cidadeInput.classList.add('is-invalid');
            isValid = false;
        } else {
            cidadeInput.classList.remove('is-invalid');
        }

        // Validação do Estado
        const estado = estadoInput.value.trim();
        if (!estado) {
            console.log('Validação falhou: Estado é obrigatório');
            errorMessages.push('O campo Estado é obrigatório.');
            estadoInput.classList.add('is-invalid');
            isValid = false;
        } else if (!/^[A-Z]{2}$/.test(estado)) {
            console.log('Validação falhou: Estado deve ter 2 letras maiúsculas');
            errorMessages.push('O Estado deve ser composto por 2 letras maiúsculas.');
            estadoInput.classList.add('is-invalid');
            isValid = false;
        } else {
            estadoInput.classList.remove('is-invalid');
        }

        // Exibir mensagens de erro, se houver
        const errorContainer = document.getElementById('error-messages');
        if (errorContainer) {
            if (errorMessages.length > 0) {
                errorContainer.innerHTML = errorMessages.map(msg => `<div class="alert alert-danger">${msg}</div>`).join('');
                errorContainer.style.display = 'block';
            } else {
                errorContainer.style.display = 'none';
            }
        }

        console.log('Validação concluída. Válido?', isValid);
        if (!isValid) {
            console.log('Mensagens de erro:', errorMessages);
        }

        return isValid;
    }

    // Event listener para o envio do formulário
    if (formEditarUsuario) {
        formEditarUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();

            console.log('Iniciando validação do formulário...');
            if (!validateForm()) {
                console.log('Validação do formulário falhou');
                return; // Impede o envio se a validação falhar
            }
            console.log('Validação do formulário bem-sucedida');

            const dadosAtualizados = {
                nome: nomeInput.value.trim(),
                cpf: cpfInput.value.trim().replace(/\D/g, ''), 
                data_nascimento: dataNascimentoInput.value,
                email: emailInput.value.trim(),
                telefone: telefoneInput.value.trim().replace(/\D/g, ''), 
                cep: cepInput.value.trim().replace(/\D/g, ''), 
                endereco: enderecoInput.value.trim(),
                numero: numeroInput.value.trim(),
                bairro: bairroInput.value.trim(),
                cidade: cidadeInput.value.trim(),
                estado: estadoInput.value.trim(),
                referencia: referenciaInput ? referenciaInput.value.trim() : ''
            };

            console.log('Dados a serem enviados:', dadosAtualizados);

            try {
                console.log(`Enviando requisição para /api/usuarios/${usuarioId}`);
                const response = await fetch(`/api/usuarios/${usuarioId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dadosAtualizados)
                });

                const result = await response.json();
                console.log('Resposta da API:', { status: response.status, result });

                if (response.ok) {
                    alert(result.mensagem || 'Usuário atualizado com sucesso!');
                    
                } else {
                    alert(result.erro || 'Erro ao atualizar usuário.');
                }
            } catch (error) {
                console.error('Erro ao atualizar usuário:', error);
                alert('Erro ao conectar ao servidor. Por favor, tente novamente.');
            }
        });
    } else {
        console.error('Formulário de edição não encontrado.');
    }

    // Carregar os dados do usuário quando a página for carregada
    await carregarDadosUsuario();

   
    window.reativarUsuario = async function(idUsuarioParaReativar) {
        if (!confirm('Tem certeza que deseja reativar este usuário?')) {
            return;
        }
        try {
            const response = await fetch(`/api/usuarios/${idUsuarioParaReativar}/reativar`, {
                method: 'POST'
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.mensagem || 'Usuário reativado com sucesso!');
                location.reload(); 
            } else {
                alert(result.erro || 'Erro ao reativar usuário.');
            }
        } catch (error) {
            console.error('Erro ao reativar usuário:', error);
            alert('Erro ao tentar reativar o usuário.');
        }
    };
});
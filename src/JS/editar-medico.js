document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - editar-medico.js iniciado'); // Log inicial
    const listaMedicosUL = document.getElementById('listaMedicos');
    const searchMedicoInput = document.getElementById('searchMedico');
    let medicosData = []; // Para armazenar os dados dos médicos e facilitar a busca

    // --- Funções Auxiliares de Validação e Máscara ---
    function showError(fieldPrefix, medicoId, message) {
        const errorElement = document.getElementById(`error-${fieldPrefix}-${medicoId}`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block'; // Garante que a mensagem seja visível
        }
        const inputElement = document.getElementById(`${fieldPrefix}-${medicoId}`);
        if (inputElement) {
            inputElement.classList.add('is-invalid');
        }
    }

    function clearError(fieldPrefix, medicoId) {
        const errorElement = document.getElementById(`error-${fieldPrefix}-${medicoId}`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none'; // Esconde o elemento de erro
        }
        const inputElement = document.getElementById(`${fieldPrefix}-${medicoId}`);
        if (inputElement) {
            inputElement.classList.remove('is-invalid');
        }
    }

    function isValidCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let add = 0;
        for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(cpf.charAt(9))) return false;
        add = 0;
        for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        return rev === parseInt(cpf.charAt(10));
    }

    function formatCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        cpf = cpf.substring(0, 11);
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
        cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        return cpf;
    }

    function isValidEmail(email) {
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        return emailRegex.test(email);
    }

    function isValidTelefone(telefone) {
        telefone = telefone.replace(/\D/g, '');
        return telefone.length >= 10 && telefone.length <= 11; // Formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    }

    function formatTelefone(telefone) {
        telefone = telefone.replace(/\D/g, '');
        telefone = telefone.substring(0, 11);
        if (telefone.length > 10) {
            telefone = telefone.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (telefone.length > 5) {
            telefone = telefone.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (telefone.length > 2) {
            telefone = telefone.replace(/^(\d{2})(\d*)/, '($1) $2');
        } else if (telefone.length > 0) {
            telefone = telefone.replace(/^(\d*)/, '($1');
        }
        return telefone;
    }

    function isValidCEP(cep) {
        cep = cep.replace(/\D/g, '');
        return cep.length === 8;
    }

    function formatCEP(cep) {
        cep = cep.replace(/\D/g, '');
        cep = cep.substring(0, 8);
        cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
        return cep;
    }

    function validarCRM(crm) {
        // Remove espaços em branco
        crm = crm.trim();
        
        // Verifica se é um número válido
        if (!/^[0-9]+$/.test(crm)) {
            return false;
        }
        
        // Verifica se tem pelo menos 6 dígitos
        if (crm.length < 6) {
            return false;
        }
        
        return true;
    }

    function aplicarMascaraCRM(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function (e) {
                // Remove todos os caracteres não numéricos
                let value = e.target.value.replace(/\D/g, '');
                // Limita o tamanho do CRM
                e.target.value = value.slice(0, 10); // Limita em 10 dígitos
            });
        }
    }

    function isValidCRM(crm) {
        // Validação básica: não vazio e um formato comum (ex: 123456/SP). Pode ser mais complexo.
        return crm && crm.trim() !== '' && /^[0-9]+\/[A-Z]{2}$/.test(crm.trim().toUpperCase());
    }

    // --- Fim das Funções Auxiliares ---

    // --- Validação em tempo real e Validação do Formulário ---
    function validateMedicoField(inputElement, medicoId, validationFn, errorMessage, fieldName) {
        clearError(fieldName, medicoId); // Limpa erro anterior ao validar
        if (!validationFn(inputElement.value)) {
            showError(fieldName, medicoId, errorMessage);
            return false;
        }
        return true;
    }

    function validateMedicoForm(medicoId) {
        // Implementação futura para validação do formulário completo
    }

    function carregarMedicos() {
        console.log('carregarMedicos: Buscando médicos da API...'); // Log
        fetch('/api/medicos') // Usamos a API que lista todos os médicos (ativos e inativos, conforme backend)
            .then(response => response.json())
            .then(data => {
                console.log('carregarMedicos: Dados recebidos da API:', data); // Log
                medicosData = data;
                renderMedicos(medicosData);
            })
            .catch(error => {
                console.error('Erro ao carregar médicos:', error);
                listaMedicosUL.innerHTML = '<li class="list-group-item">Erro ao carregar médicos.</li>';
            });
    }

    function renderMedicos(medicos) {
        listaMedicosUL.innerHTML = ''; // Limpa a lista atual
        if (medicos.length === 0) {
            listaMedicosUL.innerHTML = '<li class="list-group-item">Nenhum médico encontrado.</li>';
            return;
        }

        medicos.forEach(medico => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `
                <div class="medico-info">
                    <div class="medico-details">
                        <span class="medico-nome">${medico.nome}</span>
                        <span class="medico-especialidade">${medico.especialidade}</span>
                        <span class="medico-status">(${medico.ativo ? 'Ativo' : 'Inativo'})</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="toggleDetails(this, ${medico.id})">Editar</button>
                </div>
                <div class="details" id="details-${medico.id}" style="display: none;">
                    <form onsubmit="return atualizarMedico(event, ${medico.id})">
                        <div class="form-row">
                            <div class="form-group col-md-12">
                                <label for="nome-${medico.id}">Nome:</label>
                                <input type="text" id="nome-${medico.id}" class="form-control" name="nome" value="${medico.nome || ''}" required>
                                <span class="error-message text-danger" id="error-nome-${medico.id}"></span>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label for="especialidade-${medico.id}">Especialidade:</label>
                                <select id="especialidade-${medico.id}" class="form-control" name="especialidade" required>
                                    <option value="">Selecione uma especialidade</option>
                                    <option value="Clinica Geral" ${medico.especialidade === 'Clinica Geral' ? 'selected' : ''}>Clínica Geral</option>
                                    <option value="Cardiologia" ${medico.especialidade === 'Cardiologia' ? 'selected' : ''}>Cardiologia</option>
                                    <option value="Dermatologia" ${medico.especialidade === 'Dermatologia' ? 'selected' : ''}>Dermatologia</option>
                                    <option value="Endocrinologia" ${medico.especialidade === 'Endocrinologia' ? 'selected' : ''}>Endocrinologia</option>
                                    <option value="Ginecologia" ${medico.especialidade === 'Ginecologia' ? 'selected' : ''}>Ginecologia</option>
                                    <option value="Ortopedia" ${medico.especialidade === 'Ortopedia' ? 'selected' : ''}>Ortopedia</option>
                                    <option value="Pediatria" ${medico.especialidade === 'Pediatria' ? 'selected' : ''}>Pediatria</option>
                                </select>
                                <span class="error-message text-danger" id="error-especialidade-${medico.id}"></span>
                            </div>
                            <div class="form-group col-md-6">
                                <label for="crm-${medico.id}">CRM:</label>
                                <input type="text" id="crm-${medico.id}" class="form-control" name="crm" value="${medico.crm || ''}" required>
                                <span class="error-message text-danger" id="error-crm-${medico.id}"></span>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label for="cpf-${medico.id}">CPF:</label>
                                <input type="text" id="cpf-${medico.id}" class="form-control" name="cpf" value="${medico.cpf || ''}" required>
                                <span class="error-message text-danger" id="error-cpf-${medico.id}"></span>
                            </div>
                            <div class="form-group col-md-6">
                                <label for="email-${medico.id}">Email:</label>
                                <input type="email" id="email-${medico.id}" class="form-control" name="email" value="${medico.email || ''}" required>
                                <span class="error-message text-danger" id="error-email-${medico.id}"></span>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label for="telefone-${medico.id}">Telefone:</label>
                                <input type="text" id="telefone-${medico.id}" class="form-control" name="telefone" value="${medico.telefone || ''}">
                                <span class="error-message text-danger" id="error-telefone-${medico.id}"></span>
                            </div>
                            <div class="form-group col-md-6">
                                <label for="cep-${medico.id}">CEP:</label>
                                <input type="text" id="cep-${medico.id}" class="form-control" name="cep" value="${medico.cep || ''}">
                                <span class="error-message text-danger" id="error-cep-${medico.id}"></span>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-8">
                                <label for="endereco-${medico.id}">Endereço:</label>
                                <input type="text" id="endereco-${medico.id}" class="form-control" name="endereco" value="${medico.endereco || ''}">
                                <span class="error-message text-danger" id="error-endereco-${medico.id}"></span>
                            </div>
                            <div class="form-group col-md-4">
                                <label for="numero-${medico.id}">Número:</label>
                                <input type="text" id="numero-${medico.id}" class="form-control" name="numero" value="${medico.numero || ''}">
                                <span class="error-message text-danger" id="error-numero-${medico.id}"></span>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-4">
                                <label for="bairro-${medico.id}">Bairro:</label>
                                <input type="text" id="bairro-${medico.id}" class="form-control" name="bairro" value="${medico.bairro || ''}">
                                <span class="error-message text-danger" id="error-bairro-${medico.id}"></span>
                            </div>
                            <div class="form-group col-md-4">
                                <label for="cidade-${medico.id}">Cidade:</label>
                                <input type="text" id="cidade-${medico.id}" class="form-control" name="cidade" value="${medico.cidade || ''}">
                                <span class="error-message text-danger" id="error-cidade-${medico.id}"></span>
                            </div>
                            <div class="form-group col-md-4">
                                <label for="estado-${medico.id}">Estado (UF):</label>
                                <input type="text" id="estado-${medico.id}" class="form-control" name="estado" value="${medico.estado || ''}" maxlength="2">
                                <span class="error-message text-danger" id="error-estado-${medico.id}"></span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="ativo-${medico.id}">Status:</label>
                            <select id="ativo-${medico.id}" name="ativo" class="form-control">
                                <option value="1" ${medico.ativo ? 'selected' : ''}>Ativo</option>
                                <option value="0" ${!medico.ativo ? 'selected' : ''}>Inativo</option>
                            </select>
                        </div>
                        <div class="form-buttons">
                            <button type="submit" class="btn btn-success">Salvar</button>
                            <button type="button" class="btn btn-secondary" onclick="toggleDetails(this.closest('.list-group-item').querySelector('.medico-info .btn-primary'), ${medico.id})">Cancelar</button>
                        </div>
                    </form>
                </div>
            `;
            listaMedicosUL.appendChild(li);

            // Adicionar listeners para máscaras
            const cpfInput = document.getElementById(`cpf-${medico.id}`);
            if (cpfInput) cpfInput.addEventListener('input', (e) => { e.target.value = formatCPF(e.target.value); });
            
            const telefoneInput = document.getElementById(`telefone-${medico.id}`);
            if (telefoneInput) telefoneInput.addEventListener('input', (e) => { e.target.value = formatTelefone(e.target.value); });

            const cepInput = document.getElementById(`cep-${medico.id}`);
            if (cepInput) cepInput.addEventListener('input', (e) => { e.target.value = formatCEP(e.target.value); });
            
            const crmInput = document.getElementById(`crm-${medico.id}`);
            if (crmInput) crmInput.addEventListener('input', (e) => { 
                e.target.value = e.target.value.replace(/\D/g, '');
                aplicarMascaraCRM(`crm-${medico.id}`);
            });

            const estadoInput = document.getElementById(`estado-${medico.id}`);
            if (estadoInput) estadoInput.addEventListener('input', (e) => { 
                e.target.value = e.target.value.toUpperCase();
            });
        });
    }

    window.toggleDetails = function(button, medicoId) {
        console.log(`toggleDetails: Chamada com medicoId: ${medicoId}`, button); // Log
        const detailsDiv = document.getElementById(`details-${medicoId}`);
        console.log('toggleDetails: detailsDiv encontrado:', detailsDiv); // Log

        if (!detailsDiv) {
            console.error(`toggleDetails: Elemento details-${medicoId} não encontrado!`);
            return;
        }

        //  alternar a classe 'open' que o CSS usa para a animação.
        detailsDiv.classList.toggle('open');
        const isVisible = detailsDiv.classList.contains('open');

        if (isVisible) {
            detailsDiv.style.display = ''; 
        } else {
        
        }

        button.textContent = isVisible ? 'Fechar' : 'Editar';
        console.log(`toggleDetails: Classe 'open' ${isVisible ? 'adicionada' : 'removida'}. Visibilidade de detailsDiv alterada.`); // Log

        if (isVisible) { // Alterado de !isVisible para isVisible, pois agora populamos quando se torna visível
            console.log('toggleDetails: Populando formulário para medicoId:', medicoId); // Log
            const medico = medicosData.find(m => m.id === medicoId);
            console.log('toggleDetails: Médico encontrado em medicosData:', medico); // Log

            if (medico) {
                document.getElementById(`nome-${medicoId}`).value = medico.nome || '';
                document.getElementById(`especialidade-${medicoId}`).value = medico.especialidade || '';
                document.getElementById(`crm-${medicoId}`).value = medico.crm || '';
                document.getElementById(`cpf-${medicoId}`).value = medico.cpf || '';
                document.getElementById(`email-${medicoId}`).value = medico.email || '';
                document.getElementById(`telefone-${medicoId}`).value = medico.telefone || '';
                document.getElementById(`cep-${medicoId}`).value = medico.cep || '';
                document.getElementById(`endereco-${medicoId}`).value = medico.endereco || '';
                document.getElementById(`numero-${medicoId}`).value = medico.numero || '';
                document.getElementById(`bairro-${medicoId}`).value = medico.bairro || '';
                document.getElementById(`cidade-${medicoId}`).value = medico.cidade || '';
                document.getElementById(`estado-${medicoId}`).value = medico.estado || '';
                document.getElementById(`ativo-${medicoId}`).value = medico.ativo ? '1' : '0';
                console.log('toggleDetails: Formulário populado.'); // Log
            } else {
                console.error(`toggleDetails: Médico com ID ${medicoId} não encontrado em medicosData para popular o formulário.`); // Log
            }
        }
    }

    window.atualizarMedico = function(event, medicoId) {
        event.preventDefault();
        console.log(`atualizarMedico: Tentando atualizar médico ID: ${medicoId}`); // Log
        const form = event.target;
        const formData = new FormData(form);
        const dadosAtualizados = {};
        
        // Validar campo número antes de processar
        const numeroInput = document.getElementById(`numero-${medicoId}`);
        if (numeroInput && numeroInput.value.trim() && !/^\d+$/.test(numeroInput.value.trim())) {
            showError('numero', medicoId, 'Por favor, insira apenas números no campo número.');
            numeroInput.focus();
            return false;
        }
        
        formData.forEach((value, key) => {
            if (key === 'cpf') {
                dadosAtualizados[key] = value.replace(/\D/g, '');
            } else if (key === 'cep') {
                dadosAtualizados[key] = value.replace(/\D/g, '');
            } else if (key === 'telefone') {
                dadosAtualizados[key] = value.replace(/\D/g, '');
            } else if (key === 'numero') {
                // Garante que o número contenha apenas dígitos
                dadosAtualizados[key] = value.replace(/\D/g, '');
            } else {
                dadosAtualizados[key] = value;
            }
        });

        dadosAtualizados.ativo = parseInt(dadosAtualizados.ativo, 10);

        // Validação dos campos usando a validateMedicoField corrigida
        let formIsValid = true;
        if (!validateMedicoField(form.querySelector(`#nome-${medicoId}`), medicoId, (value) => value.trim() !== '', 'Nome é obrigatório.', 'nome')) formIsValid = false;
        if (!validateMedicoField(form.querySelector(`#especialidade-${medicoId}`), medicoId, (value) => value.trim() !== '', 'Especialidade é obrigatória.', 'especialidade')) formIsValid = false;
        if (!validateMedicoField(form.querySelector(`#crm-${medicoId}`), medicoId, validarCRM, 'CRM inválido.', 'crm')) formIsValid = false;
        if (!validateMedicoField(form.querySelector(`#cpf-${medicoId}`), medicoId, isValidCPF, 'CPF inválido', 'cpf')) formIsValid = false;
        if (!validateMedicoField(form.querySelector(`#email-${medicoId}`), medicoId, isValidEmail, 'Email inválido', 'email')) formIsValid = false;

        const telefoneInput = form.querySelector(`#telefone-${medicoId}`);
        if (telefoneInput.value.trim() && !validateMedicoField(telefoneInput, medicoId, isValidTelefone, 'Telefone inválido', 'telefone')) formIsValid = false;

        const cepInput = form.querySelector(`#cep-${medicoId}`);
        if (cepInput.value.trim() && !validateMedicoField(cepInput, medicoId, isValidCEP, 'CEP inválido', 'cep')) formIsValid = false;

        const estadoInput = form.querySelector(`#estado-${medicoId}`);
        if (estadoInput.value.trim() && !validateMedicoField(estadoInput, medicoId, (value) => value.length === 2, 'Estado inválido (deve ter 2 caracteres, ex: SP).', 'estado')) formIsValid = false;

        if (!formIsValid) {
            console.error(`editar-medico.js:${new Error().lineNumber} Erro ao atualizar médico: Existem erros de validação`); // Mantenha o log para depuração
            alert('Existem erros de validação. Por favor, verifique os campos destacados.');
            return false; // Impede o envio do formulário
        }

        console.log('Dados para atualizar (sem máscara):', dadosAtualizados); // Log

        fetch(`/api/medicos/${medicoId}/atualizar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosAtualizados),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message || 'Erro ao atualizar médico'); });
            }
            return response.json();
        })
        .then(data => {
            alert(data.message || 'Médico atualizado com sucesso!');
            carregarMedicos(); 
            const editButton = form.closest('.list-group-item').querySelector('.medico-info .btn-primary');
            if (editButton) {
                 toggleDetails(editButton, medicoId); 
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar médico:', error);
            alert(`Erro ao atualizar médico: ${error.message}`);
        });

        return false; 
    }

    searchMedicoInput.addEventListener('input', function(e) {
        const termoBusca = e.target.value.toLowerCase();
        const medicosFiltrados = medicosData.filter(medico => {
            return medico.nome.toLowerCase().includes(termoBusca) || 
                   medico.especialidade.toLowerCase().includes(termoBusca);
        });
        renderMedicos(medicosFiltrados);
    });

    carregarMedicos();
});
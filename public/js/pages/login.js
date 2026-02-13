/* ============================================
   LOGIN PAGE - Login + Multi-step Registration
   ============================================ */

const LoginPage = {
    currentStep: 0,
    mode: 'ask', // 'ask', 'login', 'register'
    regData: {},

    render(container) {
        this.mode = 'ask';
        this.currentStep = 0;
        this.regData = {};
        this._renderAsk(container);
    },

    _renderAsk(container) {
        container.innerHTML = `
            <div class="auth-card">
                <div class="auth-logo">
                    <h1>Mi Plataforma Personal</h1>
                    <p>Dashboard</p>
                </div>
                <div class="auth-question">
                    <h2>¿Estás registrado?</h2>
                    <div class="auth-buttons">
                        <button id="btn-has-account" class="btn btn-success btn-xl">Sí</button>
                        <button id="btn-no-account" class="btn btn-primary btn-xl">No</button>
                    </div>
                </div>
            </div>
        `;
        UI.bindButton('btn-has-account', () => this._renderLogin(container));
        UI.bindButton('btn-no-account', () => this._renderRegisterStep(container));
    },

    _renderLogin(container) {
        this.mode = 'login';
        container.innerHTML = `
            <div class="auth-card">
                <div class="auth-logo">
                    <h1>Iniciar Sesión</h1>
                    <p>Ingresa con tu cuenta</p>
                </div>
                <div id="login-error"></div>
                <form id="login-form">
                    ${UI.formGroup('Correo / Usuario', UI.input('email', { placeholder: 'tu@correo.com', required: true }))}
                    ${UI.formGroup('Contraseña', UI.input('password', { type: 'password', placeholder: '••••••', required: true }))}
                    <button type="submit" class="btn btn-success btn-lg btn-block mt-md">Iniciar Sesión</button>
                </form>
                <div class="text-center mt-lg">
                    <button id="btn-go-register" class="btn btn-ghost">¿No tienes cuenta? Regístrate</button>
                </div>
                <div class="text-center mt-sm">
                    <button id="btn-go-back" class="btn btn-ghost btn-sm">← Volver</button>
                </div>
            </div>
        `;

        UI.bindForm('login-form', async (data) => {
            const errorDiv = document.getElementById('login-error');
            const result = await Auth.login(data.email, data.password);
            if (result.success) {
                UI.toast(`Bienvenido, ${result.user.perfil?.nombre || result.user.email}`, 'success');
                Router.navigate();
            } else {
                errorDiv.innerHTML = `<div class="auth-error">${result.error}</div>`;
            }
        });

        UI.bindButton('btn-go-register', () => this._renderRegisterStep(container));
        UI.bindButton('btn-go-back', () => this._renderAsk(container));
    },

    _renderRegisterStep(container) {
        this.mode = 'register';
        const totalSteps = 4;

        container.innerHTML = `
            <div class="auth-card" style="max-width: 560px;">
                <div class="auth-logo">
                    <h1>Crear Cuenta</h1>
                    <p>Paso ${this.currentStep + 1} de ${totalSteps}</p>
                </div>
                <div class="steps-bar">
                    ${Array.from({ length: totalSteps }, (_, i) => `
                        <div class="step-indicator ${i < this.currentStep ? 'completed' : ''} ${i === this.currentStep ? 'active' : ''}"></div>
                    `).join('')}
                </div>
                <div id="register-error"></div>
                <div id="step-container"></div>
                <div class="step-nav">
                    <button id="btn-step-back" class="btn btn-secondary" ${this.currentStep === 0 ? 'style="visibility:hidden"' : ''}>← Anterior</button>
                    <button id="btn-step-next" class="btn btn-primary">${this.currentStep === totalSteps - 1 ? 'Crear Cuenta' : 'Siguiente →'}</button>
                </div>
            </div>
        `;

        this._renderStepContent(this.currentStep);

        UI.bindButton('btn-step-back', () => {
            if (this.currentStep > 0) {
                this._saveStepData();
                this.currentStep--;
                this._renderRegisterStep(container);
            }
        });

        UI.bindButton('btn-step-next', async () => {
            this._saveStepData();
            const errorDiv = document.getElementById('register-error');
            errorDiv.innerHTML = '';

            if (this.currentStep === 0) {
                if (!this.regData.nombre?.trim()) {
                    errorDiv.innerHTML = '<div class="auth-error">El nombre es obligatorio</div>';
                    return;
                }
                if (!this.regData.genero) {
                    errorDiv.innerHTML = '<div class="auth-error">Selecciona tu género</div>';
                    return;
                }
            }

            if (this.currentStep === 3) {
                // Final step - create account
                if (!this.regData.email?.trim()) {
                    errorDiv.innerHTML = '<div class="auth-error">El correo es obligatorio</div>';
                    return;
                }
                if (!this.regData.password || this.regData.password.length < 3) {
                    errorDiv.innerHTML = '<div class="auth-error">La contraseña debe tener al menos 3 caracteres</div>';
                    return;
                }

                const result = await Auth.register(this.regData.email, this.regData.password, {
                    nombre: this.regData.nombre,
                    genero: this.regData.genero,
                    edad: this.regData.edad,
                    altura: this.regData.altura,
                    peso: this.regData.peso,
                    ingresos: this.regData.ingresos || [],
                    deudas: this.regData.deudas || [],
                    opcionesActivas: this.regData.opcionesActivas || {}
                });

                if (result.success) {
                    UI.toast('¡Cuenta creada exitosamente!', 'success');
                    window.location.hash = '#setup';
                    Router.navigate();
                } else {
                    errorDiv.innerHTML = `<div class="auth-error">${result.error}</div>`;
                }
                return;
            }

            if (this.currentStep < 3) {
                this.currentStep++;
                this._renderRegisterStep(container);
            }
        });
    },

    _renderStepContent(step) {
        const stepContainer = document.getElementById('step-container');
        if (!stepContainer) return;

        switch (step) {
            case 0: // Personal data
                stepContainer.innerHTML = `
                    <h3 class="step-title">Datos Personales</h3>
                    ${UI.formGroup('Nombre completo *', UI.input('reg_nombre', { value: this.regData.nombre || '', placeholder: 'Tu nombre completo', required: true }))}
                    ${UI.formGroup('Género *', UI.select('reg_genero', [
                        { value: '', label: 'Seleccionar...' },
                        { value: 'hombre', label: 'Hombre' },
                        { value: 'mujer', label: 'Mujer' },
                        { value: 'otro', label: 'Otro' }
                    ], this.regData.genero || ''))}
                    ${UI.formGroup('Edad', UI.input('reg_edad', { type: 'number', value: this.regData.edad || '', placeholder: 'Años', min: 1, max: 120 }))}
                `;
                break;

            case 1: // Physical & financial
                stepContainer.innerHTML = `
                    <h3 class="step-title">Datos Físicos y Financieros</h3>
                    <div class="form-row">
                        ${UI.formGroup('Altura (cm)', UI.input('reg_altura', { type: 'number', value: this.regData.altura || '', placeholder: 'Opcional', min: 50, max: 250 }))}
                        ${UI.formGroup('Peso (kg)', UI.input('reg_peso', { type: 'number', value: this.regData.peso || '', placeholder: 'Opcional', step: '0.1', min: 1 }))}
                    </div>
                    <h4 style="margin: var(--spacing-md) 0 var(--spacing-sm);">Ingresos</h4>
                    <div id="reg-ingresos-list" class="dynamic-list"></div>
                    <button type="button" id="btn-add-reg-ingreso" class="btn btn-ghost btn-sm mt-sm">+ Agregar ingreso</button>
                    <h4 style="margin: var(--spacing-md) 0 var(--spacing-sm);">Deudas</h4>
                    <div id="reg-deudas-list" class="dynamic-list"></div>
                    <button type="button" id="btn-add-reg-deuda" class="btn btn-ghost btn-sm mt-sm">+ Agregar deuda</button>
                `;
                this._renderRegDynamicLists();
                UI.bindButton('btn-add-reg-ingreso', () => this._addRegIngreso());
                UI.bindButton('btn-add-reg-deuda', () => this._addRegDeuda());
                break;

            case 2: // Module selection
                stepContainer.innerHTML = `
                    <h3 class="step-title">Elige tus módulos activos</h3>
                    <p class="text-secondary mb-md">Puedes cambiar esto después en tu perfil.</p>
                    <div class="module-options" id="reg-modules">
                        ${this._renderModuleCheckboxes()}
                    </div>
                `;
                // Bind module clicks
                stepContainer.querySelectorAll('.module-option').forEach(opt => {
                    opt.addEventListener('click', () => {
                        const cb = opt.querySelector('input[type="checkbox"]');
                        cb.checked = !cb.checked;
                        opt.classList.toggle('selected', cb.checked);
                    });
                });
                break;

            case 3: // Credentials
                stepContainer.innerHTML = `
                    <h3 class="step-title">Crea tu cuenta</h3>
                    ${UI.formGroup('Correo electrónico *', UI.input('reg_email', { type: 'email', value: this.regData.email || '', placeholder: 'tu@correo.com', required: true }))}
                    ${UI.formGroup('Contraseña *', UI.input('reg_password', { type: 'password', value: this.regData.password || '', placeholder: 'Mínimo 3 caracteres', required: true }))}
                    <button type="button" id="btn-gen-pass" class="btn btn-ghost btn-sm">Generar contraseña temporal</button>
                `;
                UI.bindButton('btn-gen-pass', () => {
                    const pass = Math.random().toString(36).substring(2, 10);
                    const input = document.getElementById('input-reg_password');
                    if (input) {
                        input.value = pass;
                        input.type = 'text';
                    }
                    UI.toast(`Contraseña generada: ${pass}`, 'info', 6000);
                });
                break;
        }
    },

    _saveStepData() {
        switch (this.currentStep) {
            case 0:
                this.regData.nombre = document.getElementById('input-reg_nombre')?.value || '';
                this.regData.genero = document.getElementById('input-reg_genero')?.value || '';
                this.regData.edad = parseInt(document.getElementById('input-reg_edad')?.value) || null;
                break;
            case 1:
                this.regData.altura = parseFloat(document.getElementById('input-reg_altura')?.value) || null;
                this.regData.peso = parseFloat(document.getElementById('input-reg_peso')?.value) || null;
                this.regData.ingresos = this._collectRegIngresos();
                this.regData.deudas = this._collectRegDeudas();
                break;
            case 2:
                this.regData.opcionesActivas = {};
                document.querySelectorAll('#reg-modules .module-option').forEach(opt => {
                    const key = opt.dataset.module;
                    this.regData.opcionesActivas[key] = opt.querySelector('input').checked;
                });
                break;
            case 3:
                this.regData.email = document.getElementById('input-reg_email')?.value || '';
                this.regData.password = document.getElementById('input-reg_password')?.value || '';
                break;
        }
    },

    _renderModuleCheckboxes() {
        const modules = [
            { key: 'biblia', label: 'Biblia / Religión', icon: '📖' },
            { key: 'habitos', label: 'Hábitos', icon: '✅' },
            { key: 'ejercicios', label: 'Ejercicios', icon: '💪' },
            { key: 'estudios', label: 'Estudios', icon: '📚' },
            { key: 'gastosCompartidos', label: 'Gastos Compartidos', icon: '👥' },
            { key: 'juegos', label: 'Juegos', icon: '🎮' },
            { key: 'documentos', label: 'Documentos', icon: '📁' },
            { key: 'cicloMenstrual', label: 'Ciclo Menstrual', icon: '🩺' }
        ];
        const saved = this.regData.opcionesActivas || {};
        return modules.map(m => {
            const checked = saved[m.key] !== false;
            return `
                <div class="module-option ${checked ? 'selected' : ''}" data-module="${m.key}">
                    <input type="checkbox" ${checked ? 'checked' : ''}>
                    <span class="module-option-text">${m.icon} ${m.label}</span>
                </div>
            `;
        }).join('');
    },

    _renderRegDynamicLists() {
        const ingList = document.getElementById('reg-ingresos-list');
        const deudList = document.getElementById('reg-deudas-list');
        if (ingList) {
            ingList.innerHTML = '';
            (this.regData.ingresos || []).forEach(i => this._addRegIngreso(i));
            if (!this.regData.ingresos?.length) this._addRegIngreso();
        }
        if (deudList) {
            deudList.innerHTML = '';
            (this.regData.deudas || []).forEach(d => this._addRegDeuda(d));
        }
    },

    _addRegIngreso(data = {}) {
        const list = document.getElementById('reg-ingresos-list');
        if (!list) return;
        const id = DateUtils.generateId();
        const cats = Storage.getModulesGlobal().categoriasIngresos;
        const row = document.createElement('div');
        row.className = 'dynamic-item';
        row.dataset.id = id;
        row.innerHTML = `
            <div class="form-group"><input type="text" class="form-input" name="ri_fuente_${id}" placeholder="Fuente" value="${UI.esc(data.fuente || '')}"></div>
            <div class="form-group"><input type="number" class="form-input" name="ri_monto_${id}" placeholder="Monto" value="${data.monto || ''}" min="0"></div>
            <div class="form-group">
                <select class="form-select" name="ri_cat_${id}">
                    ${cats.map(c => `<option value="${c}" ${c === data.categoria ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <button type="button" class="btn-icon btn-remove" onclick="this.closest('.dynamic-item').remove()">✕</button>
        `;
        list.appendChild(row);
    },

    _addRegDeuda(data = {}) {
        const list = document.getElementById('reg-deudas-list');
        if (!list) return;
        const id = DateUtils.generateId();
        const row = document.createElement('div');
        row.className = 'dynamic-item';
        row.dataset.id = id;
        row.innerHTML = `
            <div class="form-group"><input type="text" class="form-input" name="rd_desc_${id}" placeholder="Descripción" value="${UI.esc(data.descripcion || '')}"></div>
            <div class="form-group"><input type="number" class="form-input" name="rd_monto_${id}" placeholder="Monto" value="${data.monto || ''}" min="0"></div>
            <div class="form-group"><input type="date" class="form-input" name="rd_fecha_${id}" value="${data.fecha || ''}"></div>
            <div class="form-group"><input type="number" class="form-input" name="rd_pct_${id}" placeholder="%" value="${data.porcentaje || ''}" min="0" max="100" step="0.1"></div>
            <button type="button" class="btn-icon btn-remove" onclick="this.closest('.dynamic-item').remove()">✕</button>
        `;
        list.appendChild(row);
    },

    _collectRegIngresos() {
        const items = [];
        document.querySelectorAll('#reg-ingresos-list .dynamic-item').forEach(row => {
            const id = row.dataset.id;
            const fuente = row.querySelector(`[name="ri_fuente_${id}"]`)?.value || '';
            const monto = parseFloat(row.querySelector(`[name="ri_monto_${id}"]`)?.value) || 0;
            const categoria = row.querySelector(`[name="ri_cat_${id}"]`)?.value || '';
            if (fuente || monto) items.push({ fuente, monto, categoria });
        });
        return items;
    },

    _collectRegDeudas() {
        const items = [];
        document.querySelectorAll('#reg-deudas-list .dynamic-item').forEach(row => {
            const id = row.dataset.id;
            const descripcion = row.querySelector(`[name="rd_desc_${id}"]`)?.value || '';
            const monto = parseFloat(row.querySelector(`[name="rd_monto_${id}"]`)?.value) || 0;
            const fecha = row.querySelector(`[name="rd_fecha_${id}"]`)?.value || '';
            const porcentaje = parseFloat(row.querySelector(`[name="rd_pct_${id}"]`)?.value) || 0;
            if (descripcion || monto) items.push({ descripcion, monto, fecha, porcentaje });
        });
        return items;
    }
};

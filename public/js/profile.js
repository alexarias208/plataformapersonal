/* ============================================
   PROFILE - Shared Profile Form (Setup & Edit)
   ============================================ */

const Profile = {
    /**
     * Renders the profile form into a container.
     * Used both during initial setup and profile editing.
     * @param {HTMLElement|string} container - DOM element or ID
     * @param {Object} userData - current user data
     * @param {Object} options - { isSetup: bool, onSave: fn }
     */
    renderForm(container, userData, options = {}) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;

        const p = userData.perfil || {};
        const isSetup = options.isSetup || false;

        el.innerHTML = `
            <form id="profile-form" class="fade-in">
                ${isSetup ? '<h3 class="step-title">Completa tu perfil</h3>' : ''}

                <div class="form-row">
                    ${UI.formGroup('Nombre completo', UI.input('nombre', { value: p.nombre || '', placeholder: 'Tu nombre', required: true }))}
                    ${UI.formGroup('Género', UI.select('genero', [
                        { value: '', label: 'Seleccionar' },
                        { value: 'hombre', label: 'Hombre' },
                        { value: 'mujer', label: 'Mujer' },
                        { value: 'otro', label: 'Otro' }
                    ], p.genero || '', { required: true }))}
                </div>

                <div class="form-row">
                    ${UI.formGroup('Edad', UI.input('edad', { type: 'number', value: p.edad || '', placeholder: 'Años', min: 1, max: 120 }))}
                    ${UI.formGroup('Peso (kg)', UI.input('peso', { type: 'number', value: p.peso || '', placeholder: 'kg', step: '0.1', min: 1 }))}
                </div>

                <div class="form-row">
                    ${UI.formGroup('Altura (cm)', UI.input('altura', { type: 'number', value: p.altura || '', placeholder: 'cm', min: 50, max: 250 }))}
                    <div></div>
                </div>

                <h4 style="margin: var(--spacing-lg) 0 var(--spacing-sm);">Ingresos</h4>
                <div id="ingresos-list" class="dynamic-list"></div>
                <button type="button" id="btn-add-ingreso" class="btn btn-ghost btn-sm mt-sm">+ Agregar ingreso</button>

                <h4 style="margin: var(--spacing-lg) 0 var(--spacing-sm);">Deudas</h4>
                <div id="deudas-list" class="dynamic-list"></div>
                <button type="button" id="btn-add-deuda" class="btn btn-ghost btn-sm mt-sm">+ Agregar deuda</button>

                <h4 style="margin: var(--spacing-lg) 0 var(--spacing-sm);">Módulos activos</h4>
                <div class="module-options" id="module-options">
                    ${this._renderModuleOptions(p.opcionesActivas)}
                </div>

                <div class="modal-actions mt-lg">
                    ${!isSetup ? '<button type="button" id="btn-profile-cancel" class="btn btn-secondary">Cancelar</button>' : ''}
                    <button type="submit" class="btn btn-primary btn-lg">${isSetup ? 'Completar Perfil' : 'Guardar Cambios'}</button>
                </div>
            </form>
        `;

        // Render existing income/debt lists
        this._renderIngresosList(p.ingresos || []);
        this._renderDeudasList(p.deudas || []);

        // Bind add buttons
        UI.bindButton('btn-add-ingreso', () => this._addIngresoRow());
        UI.bindButton('btn-add-deuda', () => this._addDeudaRow());

        // Bind module options click
        el.querySelectorAll('.module-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const cb = opt.querySelector('input[type="checkbox"]');
                cb.checked = !cb.checked;
                opt.classList.toggle('selected', cb.checked);
            });
        });

        // Bind cancel
        if (!isSetup) {
            UI.bindButton('btn-profile-cancel', () => UI.closeModal());
        }

        // Bind form submit
        UI.bindForm('profile-form', (data) => {
            const profileData = this._collectFormData();
            if (!profileData.nombre.trim()) {
                UI.toast('El nombre es obligatorio', 'error');
                return;
            }
            if (options.onSave) {
                options.onSave(profileData);
            }
        });
    },

    _renderModuleOptions(opts) {
        const modules = [
            { key: 'biblia', label: 'Biblia / Religión' },
            { key: 'habitos', label: 'Hábitos' },
            { key: 'ejercicios', label: 'Ejercicios' },
            { key: 'estudios', label: 'Estudios' },
            { key: 'gastosCompartidos', label: 'Gastos Compartidos' },
            { key: 'juegos', label: 'Juegos' },
            { key: 'documentos', label: 'Documentos' },
            { key: 'cicloMenstrual', label: 'Ciclo Menstrual' },
            { key: 'diario', label: 'Diario de Vida' },
            { key: 'foda', label: 'Análisis FODA' },
            { key: 'registroIntimo', label: 'Registro Íntimo' }
        ];
        const defaults = opts || {};
        return modules.map(m => {
            const checked = defaults[m.key] !== false;
            return `
                <div class="module-option ${checked ? 'selected' : ''}" data-module="${m.key}">
                    <input type="checkbox" name="mod_${m.key}" ${checked ? 'checked' : ''}>
                    <span class="module-option-text">${m.label}</span>
                </div>
            `;
        }).join('');
    },

    _renderIngresosList(ingresos) {
        const list = document.getElementById('ingresos-list');
        if (!list) return;
        list.innerHTML = '';
        if (ingresos.length === 0) {
            this._addIngresoRow();
            return;
        }
        ingresos.forEach(ing => this._addIngresoRow(ing));
    },

    _addIngresoRow(data = {}) {
        const list = document.getElementById('ingresos-list');
        if (!list) return;
        const id = DateUtils.generateId();
        const row = document.createElement('div');
        row.className = 'dynamic-item';
        row.dataset.id = id;
        row.innerHTML = `
            <div class="form-group">
                <input type="text" class="form-input" name="ing_fuente_${id}" placeholder="Fuente" value="${UI.esc(data.fuente || '')}">
            </div>
            <div class="form-group">
                <input type="number" class="form-input" name="ing_monto_${id}" placeholder="Monto" value="${data.monto || ''}" min="0">
            </div>
            <div class="form-group">
                <select class="form-select" name="ing_cat_${id}">
                    ${Storage.getModulesGlobal().categoriasIngresos.map(c =>
                        `<option value="${c}" ${c === data.categoria ? 'selected' : ''}>${c}</option>`
                    ).join('')}
                </select>
            </div>
            <button type="button" class="btn-icon btn-remove" onclick="this.closest('.dynamic-item').remove()">✕</button>
        `;
        list.appendChild(row);
    },

    _renderDeudasList(deudas) {
        const list = document.getElementById('deudas-list');
        if (!list) return;
        list.innerHTML = '';
        if (deudas.length === 0) return;
        deudas.forEach(d => this._addDeudaRow(d));
    },

    _addDeudaRow(data = {}) {
        const list = document.getElementById('deudas-list');
        if (!list) return;
        const id = DateUtils.generateId();
        const row = document.createElement('div');
        row.className = 'dynamic-item';
        row.dataset.id = id;
        row.innerHTML = `
            <div class="form-group">
                <input type="text" class="form-input" name="deu_desc_${id}" placeholder="Descripción" value="${UI.esc(data.descripcion || '')}">
            </div>
            <div class="form-group">
                <input type="number" class="form-input" name="deu_monto_${id}" placeholder="Monto" value="${data.monto || ''}" min="0">
            </div>
            <div class="form-group">
                <input type="date" class="form-input" name="deu_fecha_${id}" value="${data.fecha || ''}">
            </div>
            <div class="form-group">
                <input type="number" class="form-input" name="deu_pct_${id}" placeholder="%" value="${data.porcentaje || ''}" min="0" max="100" step="0.1">
            </div>
            <button type="button" class="btn-icon btn-remove" onclick="this.closest('.dynamic-item').remove()">✕</button>
        `;
        list.appendChild(row);
    },

    _collectFormData() {
        const form = document.getElementById('profile-form');
        if (!form) return {};

        const data = {
            nombre: form.querySelector('[name="nombre"]')?.value || '',
            genero: form.querySelector('[name="genero"]')?.value || null,
            edad: parseInt(form.querySelector('[name="edad"]')?.value) || null,
            peso: parseFloat(form.querySelector('[name="peso"]')?.value) || null,
            altura: parseFloat(form.querySelector('[name="altura"]')?.value) || null,
            ingresos: [],
            deudas: [],
            opcionesActivas: {}
        };

        // Collect ingresos
        document.querySelectorAll('#ingresos-list .dynamic-item').forEach(row => {
            const id = row.dataset.id;
            const fuente = row.querySelector(`[name="ing_fuente_${id}"]`)?.value;
            const monto = parseFloat(row.querySelector(`[name="ing_monto_${id}"]`)?.value) || 0;
            const categoria = row.querySelector(`[name="ing_cat_${id}"]`)?.value || '';
            if (fuente || monto) {
                data.ingresos.push({ fuente, monto, categoria });
            }
        });

        // Collect deudas
        document.querySelectorAll('#deudas-list .dynamic-item').forEach(row => {
            const id = row.dataset.id;
            const descripcion = row.querySelector(`[name="deu_desc_${id}"]`)?.value;
            const monto = parseFloat(row.querySelector(`[name="deu_monto_${id}"]`)?.value) || 0;
            const fecha = row.querySelector(`[name="deu_fecha_${id}"]`)?.value || '';
            const porcentaje = parseFloat(row.querySelector(`[name="deu_pct_${id}"]`)?.value) || 0;
            if (descripcion || monto) {
                data.deudas.push({ descripcion, monto, fecha, porcentaje });
            }
        });

        // Collect module options
        document.querySelectorAll('#module-options .module-option').forEach(opt => {
            const key = opt.dataset.module;
            const checked = opt.querySelector('input[type="checkbox"]').checked;
            data.opcionesActivas[key] = checked;
        });

        return data;
    },

    showEditModal() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        UI.showModal('<div id="profile-edit-container"></div>', {
            size: 'lg',
            onReady: () => {
                this.renderForm('profile-edit-container', user, {
                    isSetup: false,
                    onSave: (profileData) => {
                        Auth.updateProfile(profileData);
                        UI.closeModal();
                        UI.toast('Perfil actualizado', 'success');
                        // Refresh sidebar and current page
                        if (typeof App !== 'undefined') {
                            App.renderSidebar();
                            Router.refresh();
                        }
                    }
                });
            }
        });
    }
};

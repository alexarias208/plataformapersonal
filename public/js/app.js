/* ============================================
   APP.JS - Main Orchestrator
   Dashboard-centric navigation (no sidebar)
   ============================================ */

const App = {
    async init() {
        // Initialize auth (creates manager if needed)
        await Auth.init();

        // Initialize IndexedDB
        await Storage.initDB();

        // Initialize global modules config
        Storage.getModulesGlobal();

        // Register routes
        this._registerRoutes();

        // Bind global events
        this._bindGlobalEvents();

        // Start router
        Router.init();

        // Render header if logged in
        if (Auth.isLoggedIn()) {
            this.renderHeader();
        }
    },

    _registerRoutes() {
        // Auth routes
        Router.register('#login', (c) => LoginPage.render(c));
        Router.register('#register', (c) => LoginPage.render(c));
        Router.register('#setup', (c) => this._renderSetup(c));

        // Main dashboard (home)
        Router.register('#dashboard', (c) => DashboardPage.render(c));

        // Module pages (back button added via UI.pageTitle)
        Router.register('#calendar', (c) => CalendarPage.render(c));
        Router.register('#finance', (c) => FinancePage.render(c));
        Router.register('#shared-expenses', (c) => SharedExpensesPage.render(c), { moduleKey: 'gastosCompartidos' });
        Router.register('#summary', (c) => SummaryPage.render(c));
        Router.register('#studies', (c) => StudiesPage.render(c), { moduleKey: 'estudios' });
        Router.register('#religion', (c) => ReligionPage.render(c), { moduleKey: 'biblia' });
        Router.register('#cycle', (c) => CyclePage.render(c), { moduleKey: 'cicloMenstrual' });
        Router.register('#habits', (c) => HabitsPage.render(c), { moduleKey: 'habitos' });
        Router.register('#exercises', (c) => ExercisesPage.render(c), { moduleKey: 'ejercicios' });
        Router.register('#games', (c) => GamesPage.render(c), { moduleKey: 'juegos' });
        Router.register('#documents', (c) => DocumentsPage.render(c), { moduleKey: 'documentos' });
        Router.register('#diary', (c) => DiaryPage.render(c), { moduleKey: 'diario' });
        Router.register('#foda', (c) => FodaPage.render(c), { moduleKey: 'foda' });
        Router.register('#intimate', (c) => IntimatePage.render(c), { moduleKey: 'registroIntimo' });
        Router.register('#settings', (c) => SettingsPage.render(c));

        // Manager routes
        Router.register('#manager', (c) => Manager.render(c), { managerOnly: true });
    },

    _initTheme() {
        const saved = localStorage.getItem('plataforma_theme') || 'dark';
        if (saved && ['dark', 'light', 'pink', 'blue'].includes(saved)) {
            document.documentElement.setAttribute('data-theme', saved);
        }
        this._updateThemeIcons();
        // Re-render charts when theme changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'plataforma_theme') {
                setTimeout(() => {
                    if (Router.currentRoute) Router.refresh();
                }, 100);
            }
        });
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const themes = ['dark', 'light', 'pink', 'blue'];
        const currentIdx = themes.indexOf(current);
        const nextIdx = (currentIdx + 1) % themes.length;
        const nextTheme = themes[nextIdx];
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('plataforma_theme', nextTheme);
        this._updateThemeIcons();
        // Refresh charts by triggering a custom event
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: nextTheme } }));
        // Refresh current page to re-render charts
        setTimeout(() => {
            if (Router.currentRoute) Router.refresh();
        }, 100);
    },

    _updateThemeIcons() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const sun = document.getElementById('theme-icon-sun');
        const moon = document.getElementById('theme-icon-moon');
        if (sun && moon) {
            const isLight = theme === 'light' || theme === 'pink';
            sun.classList.toggle('hidden', !isLight);
            moon.classList.toggle('hidden', isLight);
        }
    },

    _bindGlobalEvents() {
        // Theme toggle
        this._initTheme();
        UI.bindButton('btn-theme-toggle', () => this.toggleTheme());

        // Quick expense: unified form
        UI.bindButton('btn-quick-expense', (e) => {
            if (!Auth.isLoggedIn()) return;
            e.preventDefault();
            e.stopPropagation();
            const email = Auth.getCurrentEmail();
            const globalConfig = Storage.getModulesGlobal();
            this._showUnifiedQuickExpense(email, globalConfig);
        });

        // Quick event button
        UI.bindButton('btn-quick-event', () => {
            if (!Auth.isLoggedIn()) return;
            const email = Auth.getCurrentEmail();
            UI.showModal(`
                <h3 class="modal-title">Evento Rápido</h3>
                <form id="quick-event-form">
                    ${UI.formGroup('Título', UI.input('qev_titulo', { placeholder: 'Título del evento', required: true }))}
                    <div class="form-row">
                        ${UI.formGroup('Fecha', UI.input('qev_fecha', { type: 'date', value: DateUtils.today(), required: true }))}
                        ${UI.formGroup('Hora', UI.input('qev_hora', { type: 'time' }))}
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="btn-qev-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear</button>
                    </div>
                </form>
            `, {
                size: 'sm',
                onReady: () => {
                    UI.bindButton('btn-qev-cancel', () => UI.closeModal());
                    UI.bindForm('quick-event-form', (fd) => {
                        if (!fd.qev_titulo.trim()) return;
                        const data = Storage.getUserData(email);
                        data.calendario.eventos.push({
                            id: DateUtils.generateId(),
                            titulo: fd.qev_titulo,
                            fecha: fd.qev_fecha || DateUtils.today(),
                            hora: fd.qev_hora || '',
                            tipo: 'General',
                            color: '',
                            completado: false
                        });
                        Storage.saveUserData(email, data);
                        UI.closeModal();
                        UI.toast('Evento creado', 'success');
                        Router.refresh();
                    });
                }
            });
        });

        // Export button
        UI.bindButton('btn-export', () => {
            if (!Auth.isLoggedIn()) return;
            const email = Auth.getCurrentEmail();
            const data = Storage.getUserData(email);
            ExportUtils.exportDashboard(data);
        });

        // User avatar
        UI.bindButton('btn-user-avatar', () => {
            if (!Auth.isLoggedIn()) return;
            const user = Auth.getCurrentUser();
            const isViewMode = Auth.isManagerViewMode();

            // If not in view mode, directly open profile edit modal
            if (!isViewMode) {
                Profile.showEditModal();
                return;
            }

            // If in view mode (manager viewing user), show user info modal
            UI.showModal(`
                <div class="text-center">
                    <div class="user-avatar" style="width:56px;height:56px;font-size:var(--font-2xl);margin:0 auto var(--spacing-md);">
                        ${(user.perfil?.nombre || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <h3 style="margin-bottom:2px;">${UI.esc(user.perfil?.nombre || user.email)}</h3>
                    <p class="text-secondary text-sm">${UI.esc(user.email)}</p>
                    <p class="text-warning mt-sm text-sm">Modo vista (solo lectura)</p>
                </div>
                <div class="flex flex-col gap-sm mt-lg">
                    <button id="btn-av-return" class="btn btn-primary btn-block">Volver a Manager</button>
                    <button id="btn-av-settings" class="btn btn-secondary btn-block">Configuración</button>
                    <button id="btn-av-logout" class="btn btn-danger btn-block">Cerrar Sesión</button>
                </div>
            `, {
                size: 'sm',
                onReady: () => {
                    UI.bindButton('btn-av-settings', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        UI.closeModal();
                        window.location.hash = '#settings';
                    });
                    UI.bindButton('btn-av-logout', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        UI.closeModal();
                        Auth.logout();
                    });
                    UI.bindButton('btn-av-return', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        UI.closeModal();
                        Manager.returnToManager();
                    });
                }
            });
        });

        // Header update on route changes
        window.addEventListener('hashchange', () => {
            if (Auth.isLoggedIn()) {
                this.renderHeader();
            }
        });
    },

    renderHeader() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const initial = document.getElementById('user-initial');
        if (initial) {
            initial.textContent = (user.perfil?.nombre || user.email || 'U').charAt(0).toUpperCase();
        }
    },

    // Keep renderSidebar as no-op for backward compat
    renderSidebar() {},

    _renderSetup(container) {
        const user = Auth.getCurrentUser();
        if (!user || user.configuracionCompleta) {
            window.location.hash = '#dashboard';
            return;
        }

        container.innerHTML = `
            <div class="auth-card" style="max-width: 600px;">
                <div class="auth-logo">
                    <h1>Completa tu Perfil</h1>
                    <p>Un último paso antes de comenzar</p>
                </div>
                <div id="setup-form-container"></div>
            </div>
        `;

        Profile.renderForm('setup-form-container', user, {
            isSetup: true,
            onSave: (profileData) => {
                Auth.completeSetup(profileData);
                UI.toast('¡Perfil completado! Bienvenido.', 'success');
                window.location.hash = '#dashboard';
                Router.navigate();
                this.renderHeader();
            }
        });
    },

    _showUnifiedQuickExpense(email, globalConfig) {
        const data = Storage.getUserData(email);
        const shared = data.gastosCompartidos || { participantes: [], gastos: [] };
        let participants = shared.participantes || [];
        const me = Auth.getCurrentUser();
        
        // Add current user to participants if not present
        if (!participants.find(p => p.email === email)) {
            participants = [{ email: email, nombre: me?.perfil?.nombre || email, ingresoMensual: this._getUserTotalIncome(me) }].concat(participants);
        }
        
        const hasParticipants = participants.length >= 2;
        const allUsers = Storage.getUsers();
        const otherUsers = Object.values(allUsers).filter(u => u.rol !== 'manager' && u.email !== email);
        const canUseShared = hasParticipants || otherUsers.length > 0;

        const quienOptions = participants.map(p => ({
            value: p.email,
            label: p.email === email ? 'Yo' : (p.nombre || p.email)
        }));

        UI.showModal(`
            <h3 class="modal-title">Registrar Gasto</h3>
            <form id="unified-expense-form">
                ${UI.formGroup('Descripción', UI.input('ue_desc', { placeholder: 'Descripción', required: true }))}
                ${UI.formGroup('Monto', UI.input('ue_monto', { type: 'number', placeholder: '0', required: true, min: 0 }))}
                ${UI.formGroup('Categoría', UI.select('ue_cat', globalConfig.categoriasGastos, '', { placeholder: 'Seleccionar' }))}
                
                <div class="form-group">
                    <label class="form-label">Tipo de Gasto</label>
                    <div style="display:flex; gap:var(--spacing-md); margin-top:8px;">
                        <label class="form-check" style="flex:1;">
                            <input type="radio" name="ue_type" value="personal" checked>
                            <span class="form-check-label">Personal</span>
                        </label>
                        <label class="form-check" style="flex:1;">
                            <input type="radio" name="ue_type" value="compartido" ${!canUseShared ? 'disabled' : ''}>
                            <span class="form-check-label">Compartido</span>
                        </label>
                    </div>
                    ${!canUseShared ? '<p class="text-secondary text-sm mt-xs">Agrega participantes en Gastos Compartidos para usar esta opción</p>' : ''}
                </div>

                <div id="ue-shared-fields" style="display:none;">
                    ${UI.formGroup('Quién pagó', `<select id="ue_quien" name="ue_quien" class="form-select">${quienOptions.map(o => `<option value="${UI.esc(o.value)}" ${o.value === email ? 'selected' : ''}>${UI.esc(o.label)}</option>`).join('')}</select>`)}
                </div>

                <div class="modal-actions">
                    <button type="button" id="btn-ue-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="button" id="btn-ue-save" class="btn btn-success">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-ue-cancel', () => UI.closeModal());
                
                // Toggle shared fields based on radio selection
                const typeRadios = document.querySelectorAll('input[name="ue_type"]');
                const sharedFields = document.getElementById('ue-shared-fields');
                
                typeRadios.forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (radio.value === 'compartido' && canUseShared) {
                            sharedFields.style.display = 'block';
                        } else {
                            sharedFields.style.display = 'none';
                        }
                    });
                });

                UI.bindButton('btn-ue-save', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const descInput = document.getElementById('input-ue_desc');
                    const montoInput = document.getElementById('input-ue_monto');
                    const catInput = document.getElementById('input-ue_cat');
                    const typeRadio = document.querySelector('input[name="ue_type"]:checked');
                    const quienSelect = document.getElementById('ue_quien');
                    
                    const desc = descInput?.value?.trim();
                    const monto = montoInput?.value;
                    const cat = catInput?.value || '';
                    const type = typeRadio?.value || 'personal';
                    const quienPago = quienSelect?.value || email;
                    
                    if (!desc || !monto) {
                        UI.toast('Completa descripción y monto', 'warning');
                        return;
                    }

                    if (type === 'compartido') {
                        if (!canUseShared) {
                            UI.toast('Primero agrega participantes en Gastos Compartidos', 'warning');
                            return;
                        }
                        this._saveQuickExpenseShared(email, desc, monto, cat, quienPago, me, participants);
                    } else {
                        this._saveQuickExpensePersonal(email, desc, monto, cat);
                    }
                });
            }
        });
    },

    _getUserTotalIncome(user) {
        if (!user || !user.perfil) return 0;
        const ingresos = user.perfil.ingresos || [];
        return ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
    },

    _saveQuickExpensePersonal(email, desc, monto, cat) {
        const data = Storage.getUserData(email);
        if (!data.finanzas) data.finanzas = { ingresos: [], gastos: [], deudas: [], balances: [] };
        data.finanzas.gastos.push({
            id: DateUtils.generateId(),
            descripcion: desc,
            monto: parseFloat(monto) || 0,
            fecha: DateUtils.today(),
            categoria: cat
        });
        Storage.saveUserData(email, data);
        UI.closeModal();
        UI.toast('Gasto personal registrado', 'success');
        Router.refresh();
    },

    _saveQuickExpenseShared(email, desc, monto, cat, quienPago, me, participants) {
        const udata = Storage.getUserData(email);
        if (!udata.gastosCompartidos) udata.gastosCompartidos = { participantes: [], gastos: [] };
        
        // Ensure current user is in participants
        if (!udata.gastosCompartidos.participantes.find(p => p.email === email)) {
            udata.gastosCompartidos.participantes.push({
                email: email,
                nombre: me?.perfil?.nombre || email,
                ingresoMensual: this._getUserTotalIncome(me)
            });
        }

        const totalIngresos = udata.gastosCompartidos.participantes.reduce((s, p) => {
            const pUser = Storage.getUser(p.email);
            const pIncome = pUser ? this._getUserTotalIncome(pUser) : (parseFloat(p.ingresoMensual) || 0);
            return s + pIncome;
        }, 0);
        
        const myIncome = this._getUserTotalIncome(me);
        const myShare = totalIngresos > 0 ? (myIncome / totalIngresos) * parseFloat(monto) : parseFloat(monto);

        udata.gastosCompartidos.gastos.push({
            id: DateUtils.generateId(),
            descripcion: desc,
            monto: parseFloat(monto) || 0,
            fecha: DateUtils.today(),
            quienPago: quienPago || email,
            categoria: cat || ''
        });
        
        if (!udata.finanzas) udata.finanzas = { ingresos: [], gastos: [], deudas: [], balances: [] };
        udata.finanzas.gastos.push({
            id: DateUtils.generateId(),
            descripcion: '[Compartido] ' + desc,
            monto: myShare,
            fecha: DateUtils.today(),
            categoria: cat || 'Compartido'
        });
        
        Storage.saveUserData(email, udata);
        UI.closeModal();
        UI.toast('Gasto compartido registrado. Tu parte se reflejó en Finanzas.', 'success');
        Router.refresh();
    },

    _showQuickExpensePersonal(email, globalConfig) {
        UI.showModal(`
            <h3 class="modal-title">Gasto Personal</h3>
            <form id="quick-expense-form">
                ${UI.formGroup('Descripción', UI.input('qe_desc', { placeholder: 'Descripción', required: true }))}
                ${UI.formGroup('Monto', UI.input('qe_monto', { type: 'number', placeholder: '0', required: true, min: 0 }))}
                ${UI.formGroup('Categoría', UI.select('qe_cat', globalConfig.categoriasGastos, '', { placeholder: 'Seleccionar' }))}
                <div class="modal-actions">
                    <button type="button" id="btn-qe-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="button" id="btn-qe-save" class="btn btn-success">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-qe-cancel', () => UI.closeModal());
                UI.bindButton('btn-qe-save', () => {
                    const desc = document.getElementById('input-qe_desc')?.value?.trim();
                    const monto = document.getElementById('input-qe_monto')?.value;
                    const cat = document.getElementById('input-qe_cat')?.value || '';
                    if (!desc || !monto) {
                        UI.toast('Completa todos los campos', 'warning');
                        return;
                    }
                    const data = Storage.getUserData(email);
                    data.finanzas.gastos.push({
                        id: DateUtils.generateId(),
                        descripcion: desc,
                        monto: parseFloat(monto) || 0,
                        fecha: DateUtils.today(),
                        categoria: cat
                    });
                    Storage.saveUserData(email, data);
                    UI.closeModal();
                    UI.toast('Gasto personal registrado', 'success');
                    Router.refresh();
                });
            }
        });
    },

    _showQuickExpenseShared(email, globalConfig) {
        const data = Storage.getUserData(email);
        const shared = data.gastosCompartidos || { participantes: [], gastos: [] };
        let participants = shared.participantes || [];
        const me = Auth.getCurrentUser();
        if (!participants.find(p => p.email === email)) {
            participants = [{ email: email, nombre: me?.perfil?.nombre || email, ingresoMensual: me?.perfil?.ingresos || 0 }].concat(participants);
        }
        const hasParticipants = participants.length >= 2;
        const allUsers = Storage.getUsers();
        const otherUsers = Object.values(allUsers).filter(u => u.rol !== 'manager' && u.email !== email);

        if (!hasParticipants && otherUsers.length === 0) {
            UI.showModal(`
                <h3 class="modal-title">Gasto Compartido</h3>
                <p class="text-secondary">Para registrar gastos compartidos primero agrega al menos un participante en <strong>Gastos Compartidos</strong>.</p>
                <div class="modal-actions mt-md">
                    <button type="button" id="btn-qe-close" class="btn btn-secondary">Cerrar</button>
                    <button type="button" id="btn-qe-go-shared" class="btn btn-primary">Ir a Gastos Compartidos</button>
                </div>
            `, {
                onReady: () => {
                    UI.bindButton('btn-qe-close', () => UI.closeModal());
                    UI.bindButton('btn-qe-go-shared', () => { UI.closeModal(); window.location.hash = '#shared-expenses'; });
                }
            });
            return;
        }

        const quienOptions = participants.map(p => ({
            value: p.email,
            label: p.email === email ? 'Yo' : (p.nombre || p.email)
        }));

        UI.showModal(`
            <h3 class="modal-title">Gasto Compartido</h3>
            <form id="quick-expense-shared-form">
                ${UI.formGroup('Descripción', UI.input('qes_desc', { placeholder: 'Descripción', required: true }))}
                ${UI.formGroup('Monto total', UI.input('qes_monto', { type: 'number', placeholder: '0', required: true, min: 0 }))}
                ${UI.formGroup('Quién pagó', `<select id="qes_quien" class="form-select">${quienOptions.map(o => `<option value="${UI.esc(o.value)}">${UI.esc(o.label)}</option>`).join('')}</select>`)}
                ${UI.formGroup('Categoría', UI.select('qes_cat', globalConfig.categoriasGastos, '', { placeholder: 'Seleccionar' }))}
                <div class="modal-actions">
                    <button type="button" id="btn-qes-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="button" id="btn-qes-save" class="btn btn-success">Guardar en Compartidos</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-qes-cancel', () => UI.closeModal());
                UI.bindButton('btn-qes-save', () => {
                    const form = document.getElementById('quick-expense-shared-form');
                    if (!form) return;
                    const formData = new FormData(form);
                    const fd = {};
                    formData.forEach((value, key) => { fd[key] = value; });
                    
                    if (!fd.qes_desc?.trim() || !fd.qes_monto) {
                        UI.toast('Completa descripción y monto', 'warning');
                        return;
                    }
                    const udata = Storage.getUserData(email);
                    if (!udata.gastosCompartidos) udata.gastosCompartidos = { participantes: [], gastos: [] };
                    if (!udata.gastosCompartidos.participantes.find(p => p.email === email)) {
                        udata.gastosCompartidos.participantes.push({
                            email: email,
                            nombre: me?.perfil?.nombre || email,
                            ingresoMensual: me?.perfil?.ingresos || 0
                        });
                    }
                    const totalIngresos = udata.gastosCompartidos.participantes.reduce((s, p) => s + (parseFloat(p.ingresoMensual) || 0), 0);
                    const myIncome = parseFloat(me?.perfil?.ingresos) || 0;
                    const myShare = totalIngresos > 0 ? (myIncome / totalIngresos) * parseFloat(fd.qes_monto) : parseFloat(fd.qes_monto);

                    udata.gastosCompartidos.gastos.push({
                        id: DateUtils.generateId(),
                        descripcion: fd.qes_desc,
                        monto: parseFloat(fd.qes_monto) || 0,
                        fecha: DateUtils.today(),
                        quienPago: fd.qes_quien || email,
                        categoria: fd.qes_cat || ''
                    });
                    udata.finanzas.gastos.push({
                        id: DateUtils.generateId(),
                        descripcion: '[Compartido] ' + fd.qes_desc,
                        monto: myShare,
                        fecha: DateUtils.today(),
                        categoria: fd.qes_cat || 'Compartido'
                    });
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Gasto compartido registrado. Tu parte se reflejó en Finanzas.', 'success');
                    Router.refresh();
                });
            }
        });
    },

    _icon(name) {
        const icons = {
            home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
            calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
            dollar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
            users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
            chart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
            settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
            shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
        };
        return icons[name] || '';
    }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    App.init().catch(err => {
        console.error('App init error:', err);
    });
});

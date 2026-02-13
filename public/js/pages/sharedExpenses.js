/* ============================================
   SHARED EXPENSES - Between Registered Users
   Costs split proportionally by salary
   ============================================ */

const SharedExpensesPage = {
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const shared = data.gastosCompartidos || { participantes: [], gastos: [] };

        // Get current user salary from profile
        const currentUser = Auth.getCurrentUser();
        const myIncome = this._getUserTotalIncome(currentUser);

        // Enrich participants with their actual profile salary
        const enrichedParticipants = shared.participantes.map(p => {
            const pUser = Storage.getUser(p.email);
            const pIncome = pUser ? this._getUserTotalIncome(pUser) : (parseFloat(p.ingresoMensual) || 0);
            return { ...p, ingresoMensual: pIncome, nombre: p.nombre || pUser?.perfil?.nombre || p.email };
        });

        // Add current user as participant if not present
        let myParticipant = enrichedParticipants.find(p => p.email === email);
        if (!myParticipant && enrichedParticipants.length > 0) {
            myParticipant = { email, nombre: currentUser?.perfil?.nombre || email, ingresoMensual: myIncome };
            enrichedParticipants.unshift(myParticipant);
        }

        // Calculate totals (for selected month)
        const totalGastos = filteredGastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const pagosPorPersona = {};
        enrichedParticipants.forEach(p => { pagosPorPersona[p.email] = 0; });
        filteredGastos.forEach(g => {
            if (pagosPorPersona[g.quienPago] !== undefined) {
                pagosPorPersona[g.quienPago] += parseFloat(g.monto) || 0;
            }
        });

        const totalIngresos = enrichedParticipants.reduce((s, p) => s + (parseFloat(p.ingresoMensual) || 0), 0);

        // Get registered users for the "add partner" selector
        const allUsers = Storage.getUsers();
        const registeredUsers = Object.values(allUsers).filter(u => u.rol !== 'manager' && u.email !== email);

        // Filter expenses by selected month/year
        const { start: monthStart, end: monthEnd } = DateUtils.getMonthRange(this.selectedYear, this.selectedMonth);
        const filteredGastos = shared.gastos.filter(g => {
            if (!g.fecha) return true;
            return DateUtils.isInRange(g.fecha, monthStart, monthEnd);
        });

        const monthOptions = DateUtils.MONTHS.map((m, i) => ({ value: String(i), label: m }));
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let y = currentYear - 2; y <= currentYear + 1; y++) {
            yearOptions.push({ value: String(y), label: String(y) });
        }

        container.innerHTML = `
            ${UI.pageTitle('Gastos Compartidos', '<button id="btn-add-shared" class="btn btn-primary btn-sm">+ Gasto</button>')}

            <!-- Month/Year Selector -->
            <div class="card mb-md">
                <div style="display:flex; gap:var(--spacing-sm); align-items:center; flex-wrap:wrap;">
                    <label class="text-secondary" style="font-size:0.85rem;">Período:</label>
                    ${UI.select('shared_month', monthOptions, String(this.selectedMonth))}
                    ${UI.select('shared_year', yearOptions, String(this.selectedYear))}
                    <button id="btn-shared-dashboard" class="btn btn-secondary btn-sm" style="margin-left:auto;">Dashboard</button>
                </div>
            </div>

            <div class="cards-grid">
                <!-- Participants -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Participantes</span>
                        <button id="btn-add-participant" class="btn btn-ghost btn-sm">+ Agregar usuario</button>
                    </div>
                    ${enrichedParticipants.length > 0 ? enrichedParticipants.map(p => {
                        const pct = totalIngresos > 0 ? Math.round((p.ingresoMensual / totalIngresos) * 100) : 0;
                        const paid = pagosPorPersona[p.email] || 0;
                        const isMe = p.email === email;
                        return `
                            <div class="finance-item ${isMe ? '' : 'clickable'}" data-participant-email="${UI.esc(p.email)}">
                                <div class="item-info">
                                    <strong>${UI.esc(p.nombre)} ${isMe ? '(Tú)' : ''}</strong>
                                    <span class="text-secondary">Sueldo: ${UI.money(p.ingresoMensual)} &middot; Proporción: ${pct}%</span>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-weight:bold;">Pagó: ${UI.money(paid)}</div>
                                    <div class="text-sm text-secondary">del total ${UI.money(totalGastos)}</div>
                                </div>
                            </div>
                        `;
                    }).join('') : `
                        <div class="empty-state">
                            <p>Agrega un usuario registrado para compartir gastos.</p>
                            <p class="text-secondary text-sm mt-sm">Los gastos se dividirán proporcionalmente según el sueldo de cada uno.</p>
                        </div>
                    `}
                </div>

                <!-- Balance Chart -->
                <div class="card">
                    <h4 class="card-title mb-md">Distribución de Aportes</h4>
                    <div class="chart-container" style="height:220px;"><canvas id="chart-shared-pie"></canvas></div>
                    ${totalIngresos > 0 && enrichedParticipants.length >= 2 ? `
                        <div class="mt-md">
                            <h5 class="mb-sm text-secondary">Proporción ideal vs. real</h5>
                            ${enrichedParticipants.map(p => {
                                const idealPct = totalIngresos > 0 ? (p.ingresoMensual / totalIngresos) * 100 : 0;
                                const realPct = totalGastos > 0 ? ((pagosPorPersona[p.email] || 0) / totalGastos) * 100 : 0;
                                return `
                                    <div class="flex justify-between items-center mb-xs">
                                        <span class="text-sm">${UI.esc(p.nombre)}</span>
                                        <span class="text-sm">Ideal: ${idealPct.toFixed(0)}% &middot; Real: ${realPct.toFixed(0)}%</span>
                                    </div>
                                    <div class="progress mb-sm" style="height:8px;">
                                        <div class="progress-bar" style="width:${realPct}%;background:${realPct > idealPct + 5 ? 'var(--state-success)' : realPct < idealPct - 5 ? 'var(--state-error)' : 'var(--accent-blue)'};"></div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Balance Summary -->
            ${enrichedParticipants.length >= 2 ? this._renderBalance(enrichedParticipants, totalGastos, totalIngresos, pagosPorPersona) : ''}

            <!-- Expenses List -->
            <div class="card mt-lg">
                <div class="card-header">
                    <span class="card-title">Gastos Compartidos - ${DateUtils.MONTHS[this.selectedMonth]} ${this.selectedYear} (${filteredGastos.length})</span>
                </div>
                ${filteredGastos.length > 0 ? filteredGastos
                    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
                    .map(g => {
                        const payer = enrichedParticipants.find(p => p.email === g.quienPago);
                        return `
                            <div class="finance-item clickable" data-gasto-id="${g.id}">
                                <div class="item-info">
                                    <strong>${UI.esc(g.descripcion)}</strong>
                                    <span class="text-secondary">${g.categoria || 'Sin categoría'} &middot; ${g.fecha ? DateUtils.format(g.fecha, 'short') : ''} &middot; Pagó: ${UI.esc(payer?.nombre || g.quienPago)}</span>
                                </div>
                                <span class="item-amount expense">${UI.money(g.monto)}</span>
                            </div>
                        `;
                    }).join('') : UI.emptyState('Sin gastos compartidos')}
            </div>
        `;

        this._bindEvents(container, email, shared, enrichedParticipants, registeredUsers);
        this._renderChart(enrichedParticipants, pagosPorPersona);
    },

    _renderDashboard(container, email, shared, enrichedParticipants) {
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ year: d.getFullYear(), month: d.getMonth(), label: DateUtils.MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear() });
        }

        const monthData = months.map(m => {
            const { start, end } = DateUtils.getMonthRange(m.year, m.month);
            const monthGastos = shared.gastos.filter(g => {
                if (!g.fecha) return false;
                return DateUtils.isInRange(g.fecha, start, end);
            });
            const total = monthGastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
            
            const byPerson = {};
            enrichedParticipants.forEach(p => { byPerson[p.email] = 0; });
            monthGastos.forEach(g => {
                if (byPerson[g.quienPago] !== undefined) {
                    byPerson[g.quienPago] += parseFloat(g.monto) || 0;
                }
            });

            const byCategory = {};
            monthGastos.forEach(g => {
                const cat = g.categoria || 'Sin categoría';
                byCategory[cat] = (byCategory[cat] || 0) + (parseFloat(g.monto) || 0);
            });

            return { ...m, total, byPerson, byCategory, count: monthGastos.length };
        });

        const totalIngresos = enrichedParticipants.reduce((s, p) => s + (parseFloat(p.ingresoMensual) || 0), 0);

        UI.showModal(`
            <h3 class="modal-title">Dashboard - Gastos Compartidos</h3>
            <div style="max-height:70vh; overflow-y:auto;">
                <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                    <div class="card">
                        <h4 class="card-title mb-md">Tendencia de Gastos (6 meses)</h4>
                        <div class="chart-container" style="height:220px;"><canvas id="chart-shared-trend"></canvas></div>
                    </div>
                    <div class="card">
                        <h4 class="card-title mb-md">Gastos por Categoría (Total)</h4>
                        <div class="chart-container" style="height:220px;"><canvas id="chart-shared-cat"></canvas></div>
                    </div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-md">Resumen por Mes</h4>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="border-bottom:2px solid rgba(255,255,255,0.1);">
                                    <th style="text-align:left; padding:8px; font-size:0.85rem;">Mes</th>
                                    <th style="text-align:right; padding:8px; font-size:0.85rem;">Total</th>
                                    <th style="text-align:right; padding:8px; font-size:0.85rem;">Gastos</th>
                                    ${enrichedParticipants.map(p => `<th style="text-align:right; padding:8px; font-size:0.85rem;">${UI.esc(p.nombre)}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${monthData.map(m => `
                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                        <td style="padding:8px;">${m.label}</td>
                                        <td style="padding:8px; text-align:right; font-weight:600;">${UI.money(m.total)}</td>
                                        <td style="padding:8px; text-align:right; font-size:0.85rem;">${m.count}</td>
                                        ${enrichedParticipants.map(p => `<td style="padding:8px; text-align:right; font-size:0.85rem;">${UI.money(m.byPerson[p.email] || 0)}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" id="btn-dash-close" class="btn btn-primary">Cerrar</button>
            </div>
        `, {
            size: 'lg',
            onReady: () => {
                UI.bindButton('btn-dash-close', () => UI.closeModal());
                
                // Trend chart
                const labels = monthData.map(m => m.label);
                const totals = monthData.map(m => m.total);
                ChartUtils.line('chart-shared-trend', labels, [{
                    label: 'Total Gastos',
                    data: totals,
                    color: '#ec4899',
                    fill: true
                }]);

                // Category pie chart
                const allCats = {};
                monthData.forEach(m => {
                    Object.entries(m.byCategory).forEach(([cat, amt]) => {
                        allCats[cat] = (allCats[cat] || 0) + amt;
                    });
                });
                const catEntries = Object.entries(allCats).sort((a, b) => b[1] - a[1]);
                if (catEntries.length > 0) {
                    ChartUtils.pie('chart-shared-cat', catEntries.map(e => e[0]), catEntries.map(e => e[1]));
                }
            }
        });
    },

    _getUserTotalIncome(user) {
        if (!user || !user.perfil) return 0;
        const ingresos = user.perfil.ingresos || [];
        return ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
    },

    _renderBalance(participants, totalGastos, totalIngresos, pagosPorPersona) {
        if (participants.length < 2 || totalGastos === 0) return '';

        let balanceHtml = '<div class="card mt-lg"><h4 class="card-title mb-md">Balance de Cuentas</h4>';
        const balances = [];

        participants.forEach(p => {
            const pct = totalIngresos > 0 ? p.ingresoMensual / totalIngresos : 1 / participants.length;
            const shouldPay = totalGastos * pct;
            const actualPaid = pagosPorPersona[p.email] || 0;
            const diff = actualPaid - shouldPay;
            balances.push({ ...p, shouldPay, actualPaid, diff });

            balanceHtml += `
                <div class="finance-item">
                    <div class="item-info">
                        <strong>${UI.esc(p.nombre)}</strong>
                        <span class="text-secondary">Le corresponde: ${UI.money(shouldPay)} (${(pct*100).toFixed(0)}%) &middot; Pagó: ${UI.money(actualPaid)}</span>
                    </div>
                    <span class="item-amount ${diff >= 0 ? 'income' : 'expense'}" style="font-weight:bold;">
                        ${diff >= 0 ? 'A favor: +' : 'Debe: -'}${UI.money(Math.abs(diff))}
                    </span>
                </div>
            `;
        });

        // Suggest transfer
        if (balances.length === 2) {
            const [a, b] = balances;
            if (Math.abs(a.diff) > 1) {
                const debtor = a.diff < 0 ? a : b;
                const creditor = a.diff >= 0 ? a : b;
                balanceHtml += `
                    <div class="alert alert-info mt-md">
                        <strong>Sugerencia:</strong> ${UI.esc(debtor.nombre)} debería transferir <strong>${UI.money(Math.abs(debtor.diff))}</strong> a ${UI.esc(creditor.nombre)} para equilibrar.
                    </div>
                `;
            }
        }

        balanceHtml += '</div>';
        return balanceHtml;
    },

    _renderChart(participants, pagosPorPersona) {
        if (typeof Chart === 'undefined' || participants.length === 0) return;
        const labels = participants.map(p => p.nombre);
        const values = labels.map((n, i) => pagosPorPersona[participants[i].email] || 0);
        if (values.some(v => v > 0)) {
            ChartUtils.doughnut('chart-shared-pie', labels, values);
        }
    },

    _bindEvents(container, email, shared, enrichedParticipants, registeredUsers) {
        // Month/Year selector
        const monthSelect = document.getElementById('shared_month');
        const yearSelect = document.getElementById('shared_year');
        if (monthSelect) {
            monthSelect.addEventListener('change', () => {
                this.selectedMonth = parseInt(monthSelect.value);
                this.render(container);
            });
        }
        if (yearSelect) {
            yearSelect.addEventListener('change', () => {
                this.selectedYear = parseInt(yearSelect.value);
                this.render(container);
            });
        }

        // Dashboard button
        UI.bindButton('btn-shared-dashboard', () => {
            this._renderDashboard(container, email, shared, enrichedParticipants);
        });

        // Add participant (select from registered users)
        UI.bindButton('btn-add-participant', () => {
            const alreadyAdded = shared.participantes.map(p => p.email);
            const available = registeredUsers.filter(u => !alreadyAdded.includes(u.email));

            if (available.length === 0) {
                UI.showModal(`
                    <h3 class="modal-title">Agregar Usuario</h3>
                    <p class="text-secondary">No hay más usuarios registrados disponibles para agregar.</p>
                    <p class="text-sm text-muted mt-sm">Los usuarios deben registrarse primero en la plataforma.</p>
                    <div class="modal-actions">
                        <button type="button" id="btn-no-users-ok" class="btn btn-primary">Entendido</button>
                    </div>
                `, { size: 'sm', onReady: () => UI.bindButton('btn-no-users-ok', () => UI.closeModal()) });
                return;
            }

            const userOptions = available.map(u => ({
                value: u.email,
                label: `${u.perfil?.nombre || u.email} (${UI.money(this._getUserTotalIncome(u))}/mes)`
            }));

            UI.showModal(`
                <h3 class="modal-title">Agregar Usuario para Compartir</h3>
                <form id="participant-form">
                    ${UI.formGroup('Seleccionar usuario', UI.select('part_email', userOptions, '', { required: true, placeholder: 'Elige un usuario registrado' }))}
                    <p class="text-sm text-secondary mt-sm">El sueldo se toma automáticamente del perfil del usuario. Los gastos se dividen proporcionalmente.</p>
                    <div class="modal-actions">
                        <button type="button" id="btn-part-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Agregar</button>
                    </div>
                </form>
            `, {
                size: 'sm',
                onReady: () => {
                    UI.bindButton('btn-part-cancel', () => UI.closeModal());
                    UI.bindForm('participant-form', (fd) => {
                        if (!fd.part_email) return;
                        const udata = Storage.getUserData(email);
                        const selectedUser = Storage.getUser(fd.part_email);
                        
                        // Add current user first if not present
                        if (!udata.gastosCompartidos.participantes.find(p => p.email === email)) {
                            udata.gastosCompartidos.participantes.push({
                                email: email,
                                nombre: Auth.getCurrentUser()?.perfil?.nombre || email,
                                ingresoMensual: this._getUserTotalIncome(Auth.getCurrentUser())
                            });
                        }
                        
                        udata.gastosCompartidos.participantes.push({
                            email: fd.part_email,
                            nombre: selectedUser?.perfil?.nombre || fd.part_email,
                            ingresoMensual: this._getUserTotalIncome(selectedUser)
                        });
                        Storage.saveUserData(email, udata);
                        UI.closeModal();
                        UI.toast('Usuario agregado para compartir gastos', 'success');
                        this.render(container);
                    });
                }
            });
        });

        // Add shared expense
        UI.bindButton('btn-add-shared', () => {
            if (enrichedParticipants.length === 0) {
                UI.toast('Primero agrega un usuario para compartir', 'warning');
                return;
            }

            const payerOptions = enrichedParticipants.map(p => ({ value: p.email, label: p.nombre + (p.email === email ? ' (Tú)' : '') }));
            const globalConfig = Storage.getModulesGlobal();

            UI.showModal(`
                <h3 class="modal-title">Nuevo Gasto Compartido</h3>
                <form id="shared-form">
                    ${UI.formGroup('Descripción', UI.input('sh_desc', { placeholder: 'Ej: Supermercado, Arriendo, Luz...', required: true }))}
                    <div class="form-row">
                        ${UI.formGroup('Monto', UI.input('sh_monto', { type: 'number', placeholder: '0', required: true, min: 0 }))}
                        ${UI.formGroup('Fecha', UI.input('sh_fecha', { type: 'date', value: DateUtils.today() }))}
                    </div>
                    <div class="form-row">
                        ${UI.formGroup('¿Quién pagó?', UI.select('sh_quien', payerOptions, email, { required: true }))}
                        ${UI.formGroup('Categoría', UI.select('sh_cat', globalConfig.categoriasGastos, '', { placeholder: 'Seleccionar' }))}
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="btn-sh-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            `, {
                onReady: () => {
                    UI.bindButton('btn-sh-cancel', () => UI.closeModal());
                    UI.bindForm('shared-form', (fd) => {
                        if (!fd.sh_desc.trim() || !fd.sh_monto) {
                            UI.toast('Completa todos los campos', 'error');
                            return;
                        }
                        const udata = Storage.getUserData(email);
                        udata.gastosCompartidos.gastos.push({
                            id: DateUtils.generateId(),
                            descripcion: fd.sh_desc,
                            monto: parseFloat(fd.sh_monto) || 0,
                            fecha: fd.sh_fecha || DateUtils.today(),
                            quienPago: fd.sh_quien,
                            categoria: fd.sh_cat
                        });
                        Storage.saveUserData(email, udata);
                        UI.closeModal();
                        UI.toast('Gasto compartido agregado', 'success');
                        this.render(container);
                    });
                }
            });
        });

        // Click expense to view/delete
        container.querySelectorAll('[data-gasto-id]').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.gastoId;
                const udata = Storage.getUserData(email);
                const g = udata.gastosCompartidos.gastos.find(x => x.id === id);
                if (!g) return;
                const payer = enrichedParticipants.find(p => p.email === g.quienPago);
                UI.showModal(`
                    <h3 class="modal-title">${UI.esc(g.descripcion)}</h3>
                    <div class="mb-md">
                        <p><strong>Monto:</strong> ${UI.money(g.monto)}</p>
                        <p><strong>Pagó:</strong> ${UI.esc(payer?.nombre || g.quienPago)}</p>
                        <p><strong>Categoría:</strong> ${UI.esc(g.categoria || 'Sin categoría')}</p>
                        <p><strong>Fecha:</strong> ${g.fecha ? DateUtils.format(g.fecha, 'medium') : '-'}</p>
                    </div>
                    <div class="modal-actions">
                        <button id="btn-del-shared" class="btn btn-danger">Eliminar</button>
                    </div>
                `, {
                    size: 'sm',
                    onReady: () => {
                        UI.bindButton('btn-del-shared', () => {
                            udata.gastosCompartidos.gastos = udata.gastosCompartidos.gastos.filter(x => x.id !== id);
                            Storage.saveUserData(email, udata);
                            UI.closeModal();
                            UI.toast('Gasto eliminado', 'success');
                            this.render(container);
                        });
                    }
                });
            });
        });

        // Click participant to remove (not self)
        container.querySelectorAll('[data-participant-email]').forEach(item => {
            item.addEventListener('click', () => {
                const partEmail = item.dataset.participantEmail;
                if (partEmail === email) return; // Can't remove self
                const part = enrichedParticipants.find(p => p.email === partEmail);
                if (!part) return;
                UI.confirm(`¿Quitar a ${part.nombre} de los gastos compartidos?`, () => {
                    const udata = Storage.getUserData(email);
                    udata.gastosCompartidos.participantes = udata.gastosCompartidos.participantes.filter(x => x.email !== partEmail);
                    Storage.saveUserData(email, udata);
                    UI.toast('Participante eliminado', 'success');
                    this.render(container);
                });
            });
        });
    }
};

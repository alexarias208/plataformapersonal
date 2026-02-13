/* ============================================
   FINANCE PAGE - 5-Tab Financial Dashboard
   Situación Actual | Flujo de Caja | Balance General
   Estado de Resultado | Movimientos
   ============================================ */

const FinancePage = {
    currentTab: 'situacion',
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    dateFilterStart: '',
    dateFilterEnd: '',
    sortBy: 'fecha-desc',

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const fin = data.finanzas || { ingresos: [], gastos: [], deudas: [], balances: [] };
        if (!fin.balances) fin.balances = [];
        const globalConfig = Storage.getModulesGlobal();

        container.innerHTML = `
            ${UI.pageTitle('Finanzas', '<button id="btn-add-finance" class="btn btn-primary btn-sm">+ Agregar</button>')}

            <div class="tabs" style="margin-bottom:var(--spacing-lg);">
                <button class="tab-btn ${this.currentTab === 'situacion' ? 'active' : ''}" data-tab="situacion">Situación Actual</button>
                <button class="tab-btn ${this.currentTab === 'flujo' ? 'active' : ''}" data-tab="flujo">Flujo de Caja</button>
                <button class="tab-btn ${this.currentTab === 'balance' ? 'active' : ''}" data-tab="balance">Balance General</button>
                <button class="tab-btn ${this.currentTab === 'resultado' ? 'active' : ''}" data-tab="resultado">Estado de Resultado</button>
                <button class="tab-btn ${this.currentTab === 'movimientos' ? 'active' : ''}" data-tab="movimientos">Movimientos</button>
            </div>

            <div id="tab-situacion" class="tab-content ${this.currentTab === 'situacion' ? 'active' : ''}">
                ${this._renderSituacion(fin)}
            </div>
            <div id="tab-flujo" class="tab-content ${this.currentTab === 'flujo' ? 'active' : ''}">
                ${this._renderFlujo(fin)}
            </div>
            <div id="tab-balance" class="tab-content ${this.currentTab === 'balance' ? 'active' : ''}">
                ${this._renderBalance(fin)}
            </div>
            <div id="tab-resultado" class="tab-content ${this.currentTab === 'resultado' ? 'active' : ''}">
                ${this._renderResultado(fin)}
            </div>
            <div id="tab-movimientos" class="tab-content ${this.currentTab === 'movimientos' ? 'active' : ''}">
                ${this._renderMovimientos(fin)}
            </div>
        `;

        this._bindEvents(container, email, fin, globalConfig);

        setTimeout(() => {
            this._renderChartsForTab(fin, email, data);
        }, 50);
    },

    /* ==============================================
       TAB 1: SITUACIÓN ACTUAL
       ============================================== */
    _renderSituacion(fin) {
        const totalIncome = fin.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = fin.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const totalDebt = fin.deudas.reduce((s, d) => s + (parseFloat(d.monto) || 0), 0);
        const balance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;

        const today = DateUtils.today();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Nearest upcoming debt payment
        const upcomingDebts = fin.deudas
            .filter(d => d.fechaVence && d.fechaVence >= today)
            .sort((a, b) => a.fechaVence.localeCompare(b.fechaVence));
        const nextPayment = upcomingDebts[0] || null;

        // Overdue debts
        const overdueDebts = fin.deudas.filter(d => d.fechaVence && d.fechaVence < today);

        // This month's debts
        const { start: monthStart, end: monthEnd } = DateUtils.getMonthRange(currentYear, currentMonth);
        const monthDebts = fin.deudas.filter(d =>
            d.fechaVence && DateUtils.isInRange(d.fechaVence, monthStart, monthEnd)
        );

        return `
            <!-- Summary Cards -->
            <div class="finance-summary" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Saldo Disponible</p>
                    <p style="font-size:1.5rem; font-weight:700; color:${balance >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">
                        ${UI.money(balance)}
                    </p>
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Deudas Totales</p>
                    <p style="font-size:1.5rem; font-weight:700; color:var(--color-error, #f43f5e);">
                        ${UI.money(totalDebt)}
                    </p>
                    ${overdueDebts.length > 0 ? `<span class="badge badge-danger" style="margin-top:4px;">${overdueDebts.length} vencida(s)</span>` : ''}
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Próximo Pago</p>
                    ${nextPayment ? `
                        <p style="font-size:1.1rem; font-weight:600;">${UI.money(nextPayment.monto)}</p>
                        <p class="text-secondary" style="font-size:0.75rem;">${UI.esc(nextPayment.descripcion)} · ${DateUtils.format(nextPayment.fechaVence, 'short')}</p>
                    ` : `<p class="text-secondary" style="font-size:0.85rem;">Sin pagos pendientes</p>`}
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Tasa de Ahorro</p>
                    <p style="font-size:1.5rem; font-weight:700; color:${savingsRate >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">
                        ${savingsRate.toFixed(1)}%
                    </p>
                </div>
            </div>

            <!-- Income vs Expenses summary -->
            <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                <div class="card">
                    <h4 class="card-title mb-md">Ingresos por Categoría</h4>
                    <div class="chart-container" style="height:220px;"><canvas id="chart-sit-income-pie"></canvas></div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-md">Gastos por Categoría</h4>
                    <div class="chart-container" style="height:220px;"><canvas id="chart-sit-expense-pie"></canvas></div>
                </div>
            </div>

            <!-- Upcoming payments this month -->
            <div class="card">
                <h4 class="card-title mb-md">Pagos de este mes (${DateUtils.MONTHS[currentMonth]})</h4>
                ${monthDebts.length > 0 ? `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${monthDebts.map(d => {
                            const overdue = d.fechaVence < today;
                            return `
                                <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.03); border-left:3px solid ${overdue ? 'var(--color-error, #f43f5e)' : 'var(--color-warning, #fbbf24)'};">
                                    <div>
                                        <strong>${UI.esc(d.descripcion)}</strong>
                                        <span class="text-secondary" style="margin-left:8px; font-size:0.8rem;">
                                            ${d.fechaVence ? DateUtils.format(d.fechaVence, 'short') : ''}
                                        </span>
                                        ${overdue ? '<span class="badge badge-danger" style="margin-left:6px;">Vencida</span>' : ''}
                                    </div>
                                    <span style="font-weight:600; color:var(--color-error, #f43f5e);">${UI.money(d.monto)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : UI.emptyState('Sin pagos programados este mes')}
            </div>

            <!-- Retroalimentación financiera -->
            ${this._getFinancialFeedback('situacion', { balance, savingsRate, totalDebt, overdueDebts, totalIncome, totalExpense })}
        `;
    },

    _getFinancialFeedback(tab, data) {
        let feedback = [];
        let type = 'info';

        if (tab === 'situacion') {
            const { balance, savingsRate, totalDebt, overdueDebts, totalIncome, totalExpense } = data;
            if (balance < 0) {
                feedback.push('⚠️ Tienes un saldo negativo. Prioriza reducir gastos no esenciales este mes.');
                type = 'error';
            } else if (balance > 0 && balance < totalIncome * 0.1) {
                feedback.push('💡 Tu saldo es positivo pero bajo. Intenta ahorrar al menos el 10% de tus ingresos.');
                type = 'warning';
            }
            if (savingsRate < 0) {
                feedback.push('📉 Estás gastando más de lo que ganas. Revisa tus gastos y considera reducir categorías no esenciales.');
                type = 'error';
            } else if (savingsRate >= 0 && savingsRate < 10) {
                feedback.push('💪 Estás ahorrando, pero podrías aumentar tu tasa de ahorro al 10-20% para mayor seguridad financiera.');
                type = 'warning';
            } else if (savingsRate >= 20) {
                feedback.push('🎉 ¡Excelente! Tu tasa de ahorro es superior al 20%. Estás en buen camino hacia la libertad financiera.');
                type = 'success';
            }
            if (overdueDebts.length > 0) {
                feedback.push(`🚨 Tienes ${overdueDebts.length} deuda(s) vencida(s). Prioriza pagarlas para evitar intereses y afectar tu historial crediticio.`);
                type = 'error';
            } else if (totalDebt > 0 && totalDebt > totalIncome * 3) {
                feedback.push('⚠️ Tu nivel de deuda es alto (más de 3 veces tus ingresos). Considera un plan de pago agresivo.');
                type = 'warning';
            }
            if (totalIncome > 0 && totalExpense / totalIncome > 0.9) {
                feedback.push('💡 Estás gastando más del 90% de tus ingresos. Intenta reducir gastos fijos o aumentar ingresos.');
                type = 'warning';
            }
        } else if (tab === 'flujo') {
            const { fin, selectedYear, selectedMonth } = data;
            const { start, end } = DateUtils.getMonthRange(selectedYear, selectedMonth);
            const monthIncome = fin.ingresos.filter(i => DateUtils.isInRange(i.fecha, start, end));
            const monthExpenses = fin.gastos.filter(g => DateUtils.isInRange(g.fecha, start, end));
            const totalInc = monthIncome.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
            const totalExp = monthExpenses.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
            const saldoBruto = totalInc - totalExp;
            
            if (saldoBruto < 0) {
                feedback.push('📊 Este mes tienes un flujo negativo. Revisa las categorías de gastos más altas y considera ajustes.');
                type = 'error';
            } else if (saldoBruto > 0 && saldoBruto < totalInc * 0.1) {
                feedback.push('💡 Tu flujo es positivo pero conservador. Podrías optimizar para aumentar el ahorro mensual.');
                type = 'warning';
            } else if (saldoBruto >= totalInc * 0.2) {
                feedback.push('✅ Excelente flujo de caja este mes. Estás generando un buen excedente.');
                type = 'success';
            }
            
            const expByCat = {};
            monthExpenses.forEach(g => {
                const cat = g.categoria || 'Otro';
                expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
            });
            const maxCat = Object.entries(expByCat).sort((a, b) => b[1] - a[1])[0];
            if (maxCat && maxCat[1] > totalExp * 0.4) {
                feedback.push(`💡 La categoría "${maxCat[0]}" representa más del 40% de tus gastos. Considera revisar si hay oportunidades de optimización.`);
                if (type !== 'error') type = 'warning';
            }
        } else if (tab === 'balance') {
            const { activos, pasivos, patrimonio } = data;
            if (patrimonio < 0) {
                feedback.push('🚨 Tu patrimonio neto es negativo. Prioriza reducir pasivos y aumentar activos.');
                type = 'error';
            } else if (pasivos > activos * 0.5) {
                feedback.push('⚠️ Tus pasivos representan más del 50% de tus activos. Considera un plan para reducir deudas.');
                type = 'warning';
            } else if (patrimonio > 0 && pasivos < activos * 0.3) {
                feedback.push('✅ Excelente relación activos/pasivos. Tu patrimonio está bien estructurado.');
                type = 'success';
            }
            if (activos === 0) {
                feedback.push('💡 No tienes activos registrados. Considera agregar activos fijos (propiedades, vehículos) para un balance más completo.');
                if (type !== 'error') type = 'warning';
            }
        } else if (tab === 'resultado') {
            const { monthData } = data;
            const allNetos = monthData.map(m => m.neto);
            const avgNeto = allNetos.reduce((s, v) => s + v, 0) / allNetos.length;
            const trend = allNetos[allNetos.length - 1] - allNetos[0];
            
            if (avgNeto < 0) {
                feedback.push('📉 En promedio, tus resultados netos son negativos. Revisa ingresos y gastos para mejorar la rentabilidad.');
                type = 'error';
            } else if (trend < 0 && avgNeto > 0) {
                feedback.push('⚠️ Aunque tienes resultados positivos, hay una tendencia a la baja. Identifica qué está cambiando.');
                type = 'warning';
            } else if (trend > 0 && avgNeto > 0) {
                feedback.push('📈 Excelente tendencia: tus resultados están mejorando mes a mes. Sigue así.');
                type = 'success';
            }
            
            const lastMonth = monthData[monthData.length - 1];
            if (lastMonth && lastMonth.neto < 0) {
                feedback.push('💡 El último mes cerró en negativo. Analiza qué categorías de gastos aumentaron.');
                if (type !== 'error') type = 'warning';
            }
        }

        if (feedback.length === 0) {
            feedback.push('✅ Tu situación financiera se ve estable. Sigue monitoreando tus gastos y mantén el buen hábito de ahorrar.');
            type = 'success';
        }

        return `
            <div class="card mt-lg" style="border-left:4px solid var(--state-${type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success'});">
                <h4 class="card-title mb-sm">💡 Retroalimentación Financiera</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${feedback.map(f => `<p class="text-sm" style="margin:0;">${f}</p>`).join('')}
                </div>
            </div>
        `;
    },

    /* ==============================================
       TAB 2: FLUJO DE CAJA
       ============================================== */
    _renderFlujo(fin) {
        const monthOptions = DateUtils.MONTHS.map((m, i) =>
            ({ value: String(i), label: m })
        );
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let y = currentYear - 3; y <= currentYear + 1; y++) {
            yearOptions.push({ value: String(y), label: String(y) });
        }

        return `
            <div class="card mb-md">
                <div style="display:flex; gap:var(--spacing-sm); align-items:center; flex-wrap:wrap; margin-bottom:var(--spacing-md);">
                    <label class="text-secondary" style="font-size:0.85rem;">Período:</label>
                    ${UI.select('flujo_month', monthOptions, String(this.selectedMonth))}
                    ${UI.select('flujo_year', yearOptions, String(this.selectedYear))}
                </div>

                <h4 class="card-title mb-md">Waterfall del Mes</h4>
                <div id="flujo-waterfall"></div>
            </div>

            <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:var(--spacing-md);">
                <div class="card">
                    <h4 class="card-title mb-md">Ingresos vs Gastos por Categoría</h4>
                    <div class="chart-container" style="height:280px;"><canvas id="chart-flujo-stacked"></canvas></div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-md">Tendencia Últimos 6 Meses</h4>
                    <div class="chart-container" style="height:280px;"><canvas id="chart-flujo-trend"></canvas></div>
                </div>
            </div>

            <!-- Retroalimentación Flujo de Caja -->
            ${this._getFinancialFeedback('flujo', { fin, selectedYear: this.selectedYear, selectedMonth: this.selectedMonth })}
        `;
    },

    _renderWaterfall(fin) {
        const { start, end } = DateUtils.getMonthRange(this.selectedYear, this.selectedMonth);

        const monthIncome = fin.ingresos.filter(i => DateUtils.isInRange(i.fecha, start, end));
        const monthExpenses = fin.gastos.filter(g => DateUtils.isInRange(g.fecha, start, end));

        const totalIncome = monthIncome.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);

        // Group expenses by category
        const expByCat = {};
        monthExpenses.forEach(g => {
            const cat = g.categoria || 'Otro';
            expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
        });

        const totalExpense = Object.values(expByCat).reduce((s, v) => s + v, 0);
        const saldoBruto = totalIncome - totalExpense;

        const container = document.getElementById('flujo-waterfall');
        if (!container) return;

        let running = totalIncome;
        let rows = `
            <div style="display:flex; justify-content:space-between; padding:10px 14px; border-radius:8px; background:rgba(52,211,153,0.12); margin-bottom:6px;">
                <span style="font-weight:600;">Total Ingresos</span>
                <span style="font-weight:700; color:var(--color-success, #34d399);">+${UI.money(totalIncome)}</span>
            </div>
        `;

        const catEntries = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);
        catEntries.forEach(([cat, amount]) => {
            running -= amount;
            rows += `
                <div style="display:flex; justify-content:space-between; padding:8px 14px; border-radius:6px; background:rgba(244,63,94,0.08); margin-bottom:4px; margin-left:16px;">
                    <span class="text-secondary">${UI.esc(cat)}</span>
                    <span style="color:var(--color-error, #f43f5e);">-${UI.money(amount)}</span>
                </div>
            `;
        });

        rows += `
            <div style="display:flex; justify-content:space-between; padding:10px 14px; border-radius:8px; background:${saldoBruto >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(244,63,94,0.12)'}; margin-top:8px; border-top:2px solid rgba(255,255,255,0.1);">
                <span style="font-weight:700;">Saldo Bruto</span>
                <span style="font-weight:700; color:${saldoBruto >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">${UI.money(saldoBruto)}</span>
            </div>
        `;

        container.innerHTML = rows;
    },

    _renderFlujoCharts(fin) {
        if (typeof Chart === 'undefined') return;

        // Stacked bar: income categories + expense categories for selected month
        const { start, end } = DateUtils.getMonthRange(this.selectedYear, this.selectedMonth);
        const monthIncome = fin.ingresos.filter(i => DateUtils.isInRange(i.fecha, start, end));
        const monthExpenses = fin.gastos.filter(g => DateUtils.isInRange(g.fecha, start, end));

        const incByCat = {};
        monthIncome.forEach(i => {
            const cat = i.categoria || 'Otro';
            incByCat[cat] = (incByCat[cat] || 0) + (parseFloat(i.monto) || 0);
        });
        const expByCat = {};
        monthExpenses.forEach(g => {
            const cat = g.categoria || 'Otro';
            expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
        });

        const allCats = [...new Set([...Object.keys(incByCat), ...Object.keys(expByCat)])];
        if (allCats.length > 0) {
            ChartUtils.bar('chart-flujo-stacked', allCats, [
                { label: 'Ingresos', data: allCats.map(c => incByCat[c] || 0), color: '#34d399' },
                { label: 'Gastos', data: allCats.map(c => expByCat[c] || 0), color: '#f43f5e' }
            ]);
        }

        // 6-month trend
        const now = new Date(this.selectedYear, this.selectedMonth, 1);
        const labels = [];
        const incData = [];
        const expData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            labels.push(DateUtils.MONTHS_SHORT[m] + ' ' + y);
            const { start: ms, end: me } = DateUtils.getMonthRange(y, m);
            const mInc = fin.ingresos
                .filter(x => DateUtils.isInRange(x.fecha, ms, me))
                .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
            const mExp = fin.gastos
                .filter(x => DateUtils.isInRange(x.fecha, ms, me))
                .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
            incData.push(mInc);
            expData.push(mExp);
        }

        ChartUtils.bar('chart-flujo-trend', labels, [
            { label: 'Ingresos', data: incData, color: '#34d399' },
            { label: 'Gastos', data: expData, color: '#f43f5e' }
        ]);
    },

    /* ==============================================
       TAB 3: BALANCE GENERAL
       ============================================== */
    _renderBalance(fin) {
        const monthOptions = DateUtils.MONTHS.map((m, i) =>
            ({ value: String(i), label: m })
        );
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let y = currentYear - 3; y <= currentYear + 1; y++) {
            yearOptions.push({ value: String(y), label: String(y) });
        }

        // Auto-calculate current values
        const totalIncome = fin.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = fin.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const activos = totalIncome - totalExpense;
        const pasivos = fin.deudas.reduce((s, d) => s + (parseFloat(d.monto) || 0), 0);
        const patrimonio = activos - pasivos;

        return `
            <div class="card mb-md">
                <div style="display:flex; gap:var(--spacing-sm); align-items:center; flex-wrap:wrap; margin-bottom:var(--spacing-md);">
                    <label class="text-secondary" style="font-size:0.85rem;">Período:</label>
                    ${UI.select('balance_month', monthOptions, String(this.selectedMonth))}
                    ${UI.select('balance_year', yearOptions, String(this.selectedYear))}
                    <button id="btn-save-balance-snapshot" class="btn btn-secondary btn-sm" style="margin-left:auto;">Guardar Snapshot</button>
                </div>

                <!-- Balance Table -->
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid rgba(255,255,255,0.1);">
                            <th style="text-align:left; padding:10px 12px; font-size:0.85rem; color:var(--text-secondary);">Concepto</th>
                            <th style="text-align:right; padding:10px 12px; font-size:0.85rem; color:var(--text-secondary);">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background:rgba(52,211,153,0.06);">
                            <td style="padding:12px; font-weight:700; font-size:0.95rem;">ACTIVOS</td>
                            <td style="padding:12px; text-align:right; font-weight:700; color:var(--color-success, #34d399);">${UI.money(Math.max(activos, 0))}</td>
                        </tr>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                            <td style="padding:8px 12px 8px 28px; font-size:0.85rem;">Efectivo / Disponible</td>
                            <td style="padding:8px 12px; text-align:right; font-size:0.85rem;">${UI.money(Math.max(activos, 0))}</td>
                        </tr>
                        <tr style="background:rgba(244,63,94,0.06); margin-top:8px;">
                            <td style="padding:12px; font-weight:700; font-size:0.95rem;">PASIVOS</td>
                            <td style="padding:12px; text-align:right; font-weight:700; color:var(--color-error, #f43f5e);">${UI.money(pasivos)}</td>
                        </tr>
                        ${fin.deudas.map(d => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                <td style="padding:8px 12px 8px 28px; font-size:0.85rem;">${UI.esc(d.descripcion)}</td>
                                <td style="padding:8px 12px; text-align:right; font-size:0.85rem;">${UI.money(d.monto)}</td>
                            </tr>
                        `).join('')}
                        <tr style="border-top:2px solid rgba(255,255,255,0.15); background:${patrimonio >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)'};">
                            <td style="padding:14px 12px; font-weight:700; font-size:1rem;">PATRIMONIO NETO</td>
                            <td style="padding:14px 12px; text-align:right; font-weight:700; font-size:1.1rem; color:${patrimonio >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">${UI.money(patrimonio)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h4 class="card-title mb-md">Activos vs Pasivos</h4>
                <div class="chart-container" style="height:200px;"><canvas id="chart-balance-hbar"></canvas></div>
            </div>

            <!-- Retroalimentación Balance General -->
            ${this._getFinancialFeedback('balance', { activos, pasivos, patrimonio })}
        `;
    },

    _renderBalanceChart(fin) {
        if (typeof Chart === 'undefined') return;

        const totalIncome = fin.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = fin.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const activos = Math.max(totalIncome - totalExpense, 0);
        const pasivos = fin.deudas.reduce((s, d) => s + (parseFloat(d.monto) || 0), 0);

        ChartUtils.horizontalBar('chart-balance-hbar',
            ['Activos', 'Pasivos'],
            [{
                label: 'Monto',
                data: [activos, pasivos],
                backgroundColor: ['#34d399', '#f43f5e']
            }]
        );
    },

    /* ==============================================
       TAB 4: ESTADO DE RESULTADO
       ============================================== */
    _renderResultado(fin) {
        const now = new Date();
        const months = [];
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ year: d.getFullYear(), month: d.getMonth(), label: DateUtils.MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear() });
        }

        // Compute per-month data
        const monthData = months.map(m => {
            const { start, end } = DateUtils.getMonthRange(m.year, m.month);
            const mInc = fin.ingresos.filter(x => DateUtils.isInRange(x.fecha, start, end));
            const mExp = fin.gastos.filter(x => DateUtils.isInRange(x.fecha, start, end));

            const incByCat = {};
            mInc.forEach(i => {
                const cat = i.categoria || 'Otro';
                incByCat[cat] = (incByCat[cat] || 0) + (parseFloat(i.monto) || 0);
            });
            const expByCat = {};
            mExp.forEach(g => {
                const cat = g.categoria || 'Otro';
                expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
            });

            const totalInc = Object.values(incByCat).reduce((s, v) => s + v, 0);
            const totalExp = Object.values(expByCat).reduce((s, v) => s + v, 0);

            return { ...m, incByCat, expByCat, totalInc, totalExp, neto: totalInc - totalExp };
        });

        // All unique categories
        const allIncCats = [...new Set(monthData.flatMap(m => Object.keys(m.incByCat)))];
        const allExpCats = [...new Set(monthData.flatMap(m => Object.keys(m.expByCat)))];

        return `
            <div class="card mb-md">
                <h4 class="card-title mb-md">Estado de Resultados - Últimos 3 Meses</h4>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; min-width:500px;">
                        <thead>
                            <tr style="border-bottom:2px solid rgba(255,255,255,0.1);">
                                <th style="text-align:left; padding:10px 12px; font-size:0.85rem; color:var(--text-secondary);">Concepto</th>
                                ${monthData.map(m => `<th style="text-align:right; padding:10px 12px; font-size:0.85rem; color:var(--text-secondary);">${m.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Income Section -->
                            <tr style="background:rgba(52,211,153,0.06);">
                                <td style="padding:10px 12px; font-weight:700;">INGRESOS</td>
                                ${monthData.map(m => `<td style="padding:10px 12px; text-align:right; font-weight:700; color:var(--color-success, #34d399);">${UI.money(m.totalInc)}</td>`).join('')}
                            </tr>
                            ${allIncCats.map(cat => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                    <td style="padding:6px 12px 6px 28px; font-size:0.85rem;">${UI.esc(cat)}</td>
                                    ${monthData.map(m => `<td style="padding:6px 12px; text-align:right; font-size:0.85rem;">${UI.money(m.incByCat[cat] || 0)}</td>`).join('')}
                                </tr>
                            `).join('')}

                            <!-- Expense Section -->
                            <tr style="background:rgba(244,63,94,0.06);">
                                <td style="padding:10px 12px; font-weight:700;">(-) GASTOS</td>
                                ${monthData.map(m => `<td style="padding:10px 12px; text-align:right; font-weight:700; color:var(--color-error, #f43f5e);">${UI.money(m.totalExp)}</td>`).join('')}
                            </tr>
                            ${allExpCats.map(cat => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                    <td style="padding:6px 12px 6px 28px; font-size:0.85rem;">${UI.esc(cat)}</td>
                                    ${monthData.map(m => `<td style="padding:6px 12px; text-align:right; font-size:0.85rem;">${UI.money(m.expByCat[cat] || 0)}</td>`).join('')}
                                </tr>
                            `).join('')}

                            <!-- Net Result -->
                            <tr style="border-top:2px solid rgba(255,255,255,0.15);">
                                <td style="padding:12px; font-weight:700; font-size:1rem;">= RESULTADO NETO</td>
                                ${monthData.map(m => `
                                    <td style="padding:12px; text-align:right; font-weight:700; font-size:1rem; color:${m.neto >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">
                                        ${UI.money(m.neto)}
                                    </td>
                                `).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <h4 class="card-title mb-md">Tendencia Resultado Neto (6 Meses)</h4>
                <div class="chart-container" style="height:260px;"><canvas id="chart-resultado-trend"></canvas></div>
            </div>

            <!-- Retroalimentación Estado de Resultado -->
            ${this._getFinancialFeedback('resultado', { monthData })}
        `;
    },

    _renderResultadoChart(fin) {
        if (typeof Chart === 'undefined') return;

        const now = new Date();
        const labels = [];
        const netData = [];
        const incData = [];
        const expData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            labels.push(DateUtils.MONTHS_SHORT[m] + ' ' + y);
            const { start, end } = DateUtils.getMonthRange(y, m);
            const mInc = fin.ingresos
                .filter(x => DateUtils.isInRange(x.fecha, start, end))
                .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
            const mExp = fin.gastos
                .filter(x => DateUtils.isInRange(x.fecha, start, end))
                .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
            incData.push(mInc);
            expData.push(mExp);
            netData.push(mInc - mExp);
        }

        ChartUtils.area('chart-resultado-trend', labels, [
            { label: 'Ingresos', data: incData, color: '#34d399' },
            { label: 'Gastos', data: expData, color: '#f43f5e' },
            { label: 'Neto', data: netData, color: '#818cf8' }
        ]);
    },

    /* ==============================================
       TAB 5: MOVIMIENTOS
       ============================================== */
    _renderMovimientos(fin) {
        const sortOptions = [
            { value: 'fecha-desc', label: 'Fecha (reciente)' },
            { value: 'fecha-asc', label: 'Fecha (antigua)' },
            { value: 'monto-desc', label: 'Monto (mayor)' },
            { value: 'monto-asc', label: 'Monto (menor)' }
        ];

        // Combine and filter
        let allItems = [
            ...fin.ingresos.map(i => ({ ...i, _type: 'ingreso' })),
            ...fin.gastos.map(g => ({ ...g, _type: 'gasto' })),
            ...fin.deudas.map(d => ({ ...d, _type: 'deuda' }))
        ];

        // Date filter
        if (this.dateFilterStart) {
            allItems = allItems.filter(x => (x.fecha || x.fechaVence || '') >= this.dateFilterStart);
        }
        if (this.dateFilterEnd) {
            allItems = allItems.filter(x => (x.fecha || x.fechaVence || '') <= this.dateFilterEnd);
        }

        // Sort
        switch (this.sortBy) {
            case 'fecha-desc':
                allItems.sort((a, b) => (b.fecha || b.fechaVence || '').localeCompare(a.fecha || a.fechaVence || ''));
                break;
            case 'fecha-asc':
                allItems.sort((a, b) => (a.fecha || a.fechaVence || '').localeCompare(b.fecha || b.fechaVence || ''));
                break;
            case 'monto-desc':
                allItems.sort((a, b) => (parseFloat(b.monto) || 0) - (parseFloat(a.monto) || 0));
                break;
            case 'monto-asc':
                allItems.sort((a, b) => (parseFloat(a.monto) || 0) - (parseFloat(b.monto) || 0));
                break;
        }

        return `
            <div class="card mb-md">
                <div style="display:flex; gap:var(--spacing-sm); align-items:center; flex-wrap:wrap;">
                    <label class="text-secondary" style="font-size:0.85rem;">Desde:</label>
                    ${UI.input('mov_start', { type: 'date', value: this.dateFilterStart })}
                    <label class="text-secondary" style="font-size:0.85rem;">Hasta:</label>
                    ${UI.input('mov_end', { type: 'date', value: this.dateFilterEnd })}
                    <label class="text-secondary" style="font-size:0.85rem; margin-left:auto;">Ordenar:</label>
                    ${UI.select('mov_sort', sortOptions, this.sortBy)}
                    <button id="btn-mov-filter" class="btn btn-secondary btn-sm">Aplicar</button>
                    <button id="btn-mov-clear" class="btn btn-ghost btn-sm">Limpiar</button>
                </div>
            </div>

            <!-- Income -->
            <div class="card mb-md">
                <h4 class="card-title mb-sm" style="color:var(--color-success, #34d399);">Ingresos</h4>
                ${allItems.filter(x => x._type === 'ingreso').length > 0 ?
                    allItems.filter(x => x._type === 'ingreso').map(i => `
                        <div class="finance-item" data-id="${i.id}" data-type="ingreso" style="cursor:pointer;">
                            <div class="item-info">
                                <strong>${UI.esc(i.descripcion)}</strong>
                                <span class="text-secondary">${i.categoria || ''} · ${i.fecha ? DateUtils.format(i.fecha, 'short') : ''}</span>
                            </div>
                            <span class="item-amount income">${UI.money(i.monto)}</span>
                        </div>
                    `).join('') : UI.emptyState('Sin ingresos')}
            </div>

            <!-- Expenses -->
            <div class="card mb-md">
                <h4 class="card-title mb-sm" style="color:var(--color-error, #f43f5e);">Gastos</h4>
                ${allItems.filter(x => x._type === 'gasto').length > 0 ?
                    allItems.filter(x => x._type === 'gasto').map(g => `
                        <div class="finance-item" data-id="${g.id}" data-type="gasto" style="cursor:pointer;">
                            <div class="item-info">
                                <strong>${UI.esc(g.descripcion)}</strong>
                                <span class="text-secondary">${g.categoria || ''} · ${g.fecha ? DateUtils.format(g.fecha, 'short') : ''}</span>
                            </div>
                            <span class="item-amount expense">${UI.money(g.monto)}</span>
                        </div>
                    `).join('') : UI.emptyState('Sin gastos')}
            </div>

            <!-- Debts -->
            <div class="card">
                <h4 class="card-title mb-sm" style="color:var(--color-warning, #fbbf24);">Deudas</h4>
                ${allItems.filter(x => x._type === 'deuda').length > 0 ?
                    allItems.filter(x => x._type === 'deuda').map(d => `
                        <div class="finance-item" data-id="${d.id}" data-type="deuda" style="cursor:pointer;">
                            <div class="item-info">
                                <strong>${UI.esc(d.descripcion)}</strong>
                                <span class="text-secondary">Vence: ${d.fechaVence ? DateUtils.format(d.fechaVence, 'short') : 'Sin fecha'} · ${d.porcentaje || 0}%</span>
                            </div>
                            <span class="item-amount expense">${UI.money(d.monto)}</span>
                        </div>
                    `).join('') : UI.emptyState('Sin deudas')}
            </div>
        `;
    },

    /* ==============================================
       CHART RENDERING DISPATCHER
       ============================================== */
    _renderChartsForTab(fin, email, data) {
        if (typeof Chart === 'undefined') return;

        if (this.currentTab === 'situacion') {
            this._renderSituacionCharts(fin);
        } else if (this.currentTab === 'flujo') {
            this._renderWaterfall(fin);
            this._renderFlujoCharts(fin);
        } else if (this.currentTab === 'balance') {
            this._renderBalanceChart(fin);
        } else if (this.currentTab === 'resultado') {
            this._renderResultadoChart(fin);
        }
    },

    _renderSituacionCharts(fin) {
        // Income by category pie
        const incByCat = {};
        fin.ingresos.forEach(i => {
            const cat = i.categoria || 'Otro';
            incByCat[cat] = (incByCat[cat] || 0) + (parseFloat(i.monto) || 0);
        });
        if (Object.keys(incByCat).length > 0) {
            ChartUtils.doughnut('chart-sit-income-pie', Object.keys(incByCat), Object.values(incByCat));
        }

        // Expense by category pie
        const expByCat = {};
        fin.gastos.forEach(g => {
            const cat = g.categoria || 'Otro';
            expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
        });
        if (Object.keys(expByCat).length > 0) {
            ChartUtils.doughnut('chart-sit-expense-pie', Object.keys(expByCat), Object.values(expByCat));
        }
    },

    /* ==============================================
       EVENT BINDING
       ============================================== */
    _bindEvents(container, email, fin, globalConfig) {
        // Tab switching
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentTab = btn.dataset.tab;
                this.render(container);
            });
        });

        // Add finance item
        UI.bindButton('btn-add-finance', () => {
            this._showAddModal(container, email, globalConfig);
        });

        // Flujo month/year selectors
        const flujoMonth = document.getElementById('input-flujo_month');
        const flujoYear = document.getElementById('input-flujo_year');
        if (flujoMonth) {
            flujoMonth.addEventListener('change', () => {
                this.selectedMonth = parseInt(flujoMonth.value);
                this.render(container);
            });
        }
        if (flujoYear) {
            flujoYear.addEventListener('change', () => {
                this.selectedYear = parseInt(flujoYear.value);
                this.render(container);
            });
        }

        // Balance month/year selectors
        const balMonth = document.getElementById('input-balance_month');
        const balYear = document.getElementById('input-balance_year');
        if (balMonth) {
            balMonth.addEventListener('change', () => {
                this.selectedMonth = parseInt(balMonth.value);
                this.render(container);
            });
        }
        if (balYear) {
            balYear.addEventListener('change', () => {
                this.selectedYear = parseInt(balYear.value);
                this.render(container);
            });
        }

        // Save balance snapshot
        UI.bindButton('btn-save-balance-snapshot', () => {
            const udata = Storage.getUserData(email);
            const f = udata.finanzas || { ingresos: [], gastos: [], deudas: [], balances: [] };
            if (!f.balances) f.balances = [];

            const totalInc = f.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
            const totalExp = f.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
            const activos = totalInc - totalExp;
            const pasivos = f.deudas.reduce((s, d) => s + (parseFloat(d.monto) || 0), 0);

            const snapshotKey = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}`;
            const existingIdx = f.balances.findIndex(b => b.periodo === snapshotKey);
            const snapshot = {
                periodo: snapshotKey,
                fecha: DateUtils.today(),
                activos: Math.max(activos, 0),
                pasivos,
                patrimonio: activos - pasivos
            };

            if (existingIdx >= 0) {
                f.balances[existingIdx] = snapshot;
            } else {
                f.balances.push(snapshot);
            }

            Storage.saveUserData(email, udata);
            UI.toast('Snapshot de balance guardado', 'success');
        });

        // Movimientos filter
        UI.bindButton('btn-mov-filter', () => {
            const startInput = document.getElementById('input-mov_start');
            const endInput = document.getElementById('input-mov_end');
            const sortInput = document.getElementById('input-mov_sort');
            this.dateFilterStart = startInput?.value || '';
            this.dateFilterEnd = endInput?.value || '';
            this.sortBy = sortInput?.value || 'fecha-desc';
            this.render(container);
        });

        UI.bindButton('btn-mov-clear', () => {
            this.dateFilterStart = '';
            this.dateFilterEnd = '';
            this.sortBy = 'fecha-desc';
            this.render(container);
        });

        // Click finance items to edit/delete (in movimientos tab)
        container.querySelectorAll('.finance-item[data-id]').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const type = item.dataset.type;
                this._showEditModal(container, email, id, type);
            });
        });
    },

    /* ==============================================
       ADD MODAL
       ============================================== */
    _showAddModal(container, email, globalConfig) {
        UI.showModal(`
            <h3 class="modal-title">Agregar Registro Financiero</h3>
            <form id="finance-add-form">
                ${UI.formGroup('Tipo', UI.select('fin_type', [
                    { value: 'ingreso', label: 'Ingreso' },
                    { value: 'gasto', label: 'Gasto' },
                    { value: 'deuda', label: 'Deuda' }
                ], '', { required: true }))}
                ${UI.formGroup('Descripción', UI.input('fin_desc', { placeholder: 'Descripción', required: true }))}
                ${UI.formGroup('Monto', UI.input('fin_monto', { type: 'number', placeholder: '0', required: true, min: 0, step: '1' }))}
                ${UI.formGroup('Fecha', UI.input('fin_fecha', { type: 'date', value: DateUtils.today() }))}
                ${UI.formGroup('Categoría', UI.select('fin_cat',
                    globalConfig.categoriasGastos || [], '', { placeholder: 'Seleccionar' }))}
                <div id="fin-extra-fields"></div>
                <div class="modal-actions">
                    <button type="button" id="btn-fin-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="button" id="btn-fin-save" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            onReady: () => {
                const typeSelect = document.getElementById('input-fin_type');
                const extraDiv = document.getElementById('fin-extra-fields');
                typeSelect.addEventListener('change', () => {
                    if (typeSelect.value === 'deuda') {
                        extraDiv.innerHTML = `
                            ${UI.formGroup('Fecha Vencimiento', UI.input('fin_vence', { type: 'date' }))}
                            ${UI.formGroup('Interés (%)', UI.input('fin_pct', { type: 'number', step: '0.1', min: 0, max: 100 }))}
                        `;
                    } else {
                        extraDiv.innerHTML = '';
                    }
                    // Update categories based on type
                    const catSelect = document.getElementById('input-fin_cat');
                    const cats = typeSelect.value === 'ingreso'
                        ? (globalConfig.categoriasIngresos || [])
                        : (globalConfig.categoriasGastos || []);
                    catSelect.innerHTML = `<option value="">Seleccionar</option>` +
                        cats.map(c => `<option value="${c}">${c}</option>`).join('');
                });

                UI.bindButton('btn-fin-cancel', () => UI.closeModal());
                UI.bindButton('btn-fin-save', () => {
                    const form = document.getElementById('finance-add-form');
                    if (!form) return;
                    const formData = new FormData(form);
                    const fd = {};
                    formData.forEach((value, key) => { fd[key] = value; });
                    
                    if (!fd.fin_desc?.trim() || !fd.fin_monto) {
                        UI.toast('Completa descripción y monto', 'error');
                        return;
                    }
                    const udata = Storage.getUserData(email);
                    if (!udata.finanzas) udata.finanzas = { ingresos: [], gastos: [], deudas: [], balances: [] };
                    const item = {
                        id: DateUtils.generateId(),
                        descripcion: fd.fin_desc,
                        monto: parseFloat(fd.fin_monto) || 0,
                        fecha: fd.fin_fecha || DateUtils.today(),
                        categoria: fd.fin_cat || ''
                    };
                    if (fd.fin_type === 'ingreso') {
                        udata.finanzas.ingresos.push(item);
                    } else if (fd.fin_type === 'gasto') {
                        udata.finanzas.gastos.push(item);
                    } else {
                        item.fechaVence = fd.fin_vence || '';
                        item.porcentaje = parseFloat(fd.fin_pct) || 0;
                        item.pagos = [];
                        udata.finanzas.deudas.push(item);
                        if (item.fechaVence) {
                            CalendarPage.addAutoEvent(email, `Pago: ${item.descripcion}`, item.fechaVence, 'Urgente', 'finanzas');
                        }
                    }
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Registro guardado', 'success');
                    this.render(container);
                });
            }
        });
    },

    /* ==============================================
       EDIT MODAL
       ============================================== */
    _showEditModal(container, email, id, type) {
        const data = Storage.getUserData(email);
        let item;
        if (type === 'ingreso') item = data.finanzas.ingresos.find(i => i.id === id);
        else if (type === 'gasto') item = data.finanzas.gastos.find(g => g.id === id);
        else item = data.finanzas.deudas.find(d => d.id === id);

        if (!item) return;

        UI.showModal(`
            <h3 class="modal-title">Editar ${type}</h3>
            <form id="finance-edit-form">
                ${UI.formGroup('Descripción', UI.input('ed_desc', { value: item.descripcion, required: true }))}
                ${UI.formGroup('Monto', UI.input('ed_monto', { type: 'number', value: item.monto, required: true, min: 0 }))}
                ${UI.formGroup('Fecha', UI.input('ed_fecha', { type: 'date', value: item.fecha || '' }))}
                ${UI.formGroup('Categoría', UI.input('ed_cat', { value: item.categoria || '' }))}
                ${type === 'deuda' ? `
                    ${UI.formGroup('Fecha Vencimiento', UI.input('ed_vence', { type: 'date', value: item.fechaVence || '' }))}
                    ${UI.formGroup('Interés (%)', UI.input('ed_pct', { type: 'number', value: item.porcentaje || 0, step: '0.1' }))}
                ` : ''}
                <div class="modal-actions">
                    <button type="button" id="btn-ed-delete" class="btn btn-danger">Eliminar</button>
                    <button type="button" id="btn-ed-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            onReady: () => {
                UI.bindButton('btn-ed-cancel', () => UI.closeModal());
                UI.bindButton('btn-ed-delete', () => {
                    const udata = Storage.getUserData(email);
                    if (type === 'ingreso') udata.finanzas.ingresos = udata.finanzas.ingresos.filter(i => i.id !== id);
                    else if (type === 'gasto') udata.finanzas.gastos = udata.finanzas.gastos.filter(g => g.id !== id);
                    else udata.finanzas.deudas = udata.finanzas.deudas.filter(d => d.id !== id);
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Registro eliminado', 'success');
                    this.render(container);
                });
                UI.bindForm('finance-edit-form', (fd) => {
                    const udata = Storage.getUserData(email);
                    let target;
                    if (type === 'ingreso') target = udata.finanzas.ingresos.find(i => i.id === id);
                    else if (type === 'gasto') target = udata.finanzas.gastos.find(g => g.id === id);
                    else target = udata.finanzas.deudas.find(d => d.id === id);
                    if (target) {
                        target.descripcion = fd.ed_desc;
                        target.monto = parseFloat(fd.ed_monto) || 0;
                        target.fecha = fd.ed_fecha;
                        target.categoria = fd.ed_cat;
                        if (type === 'deuda') {
                            target.fechaVence = fd.ed_vence || '';
                            target.porcentaje = parseFloat(fd.ed_pct) || 0;
                        }
                    }
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Registro actualizado', 'success');
                    this.render(container);
                });
            }
        });
    }
};

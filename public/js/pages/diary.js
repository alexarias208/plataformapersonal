/* ============================================
   DIARY PAGE - Life Diary / Mood Tracker
   ============================================ */

const DiaryPage = {
    currentTab: 'today',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    _container: null,
    _email: null,

    render(container) {
        this._container = container;
        this._email = Auth.getCurrentEmail();
        const data = Storage.getUserData(this._email);
        if (!data.diario) data.diario = { entradas: {} };

        const entradas = data.diario.entradas || {};
        const totalEntries = Object.keys(entradas).length;

        container.innerHTML = `
            ${UI.pageTitle('Mi Diario', `<span class="text-secondary text-sm">${totalEntries} entradas</span>`)}

            <div class="tabs">
                <button class="tab-btn ${this.currentTab === 'today' ? 'active' : ''}" data-tab="today">Hoy</button>
                <button class="tab-btn ${this.currentTab === 'calendar' ? 'active' : ''}" data-tab="calendar">Calendario</button>
                <button class="tab-btn ${this.currentTab === 'trends' ? 'active' : ''}" data-tab="trends">Tendencias</button>
            </div>

            <div id="tab-today" class="tab-content ${this.currentTab === 'today' ? 'active' : ''}">
                ${this._renderToday(data)}
            </div>

            <div id="tab-calendar" class="tab-content ${this.currentTab === 'calendar' ? 'active' : ''}">
                ${this._renderCalendar(data)}
            </div>

            <div id="tab-trends" class="tab-content ${this.currentTab === 'trends' ? 'active' : ''}">
                ${this._renderTrends(data)}
            </div>
        `;

        this._bindEvents(container);
        this._renderCharts(data);
    },

    /* ==================== TAB: HOY ==================== */

    _renderToday(data) {
        const today = DateUtils.today();
        const entry = data.diario.entradas[today] || null;
        const texto = entry ? entry.texto : '';
        const calificacion = entry ? entry.calificacion : '';
        const nota = entry ? entry.nota : 5;
        const actividades = entry ? (entry.actividades || []).join(', ') : '';

        return `
            <div class="card">
                <h4 class="card-title mb-md">${DateUtils.format(today, 'long')}</h4>
                ${entry ? '<p class="text-secondary text-sm mb-md">Ya tienes una entrada para hoy. Puedes editarla.</p>' : ''}
                <form id="diary-today-form">
                    ${UI.formGroup('¿Cómo fue tu día?',
                        `<textarea name="diary_texto" id="input-diary_texto" class="form-textarea" 
                            placeholder="Escribe sobre tu día, pensamientos, logros..." 
                            rows="8" style="min-height:180px; resize:vertical;">${UI.esc(texto)}</textarea>`
                    )}

                    <div class="form-group">
                        <label class="form-label">Calificación del día</label>
                        <div class="diary-rating-buttons" style="display:flex; gap:var(--spacing-md); align-items:center; flex-wrap:wrap;">
                            <button type="button" class="diary-color-btn ${calificacion === 'rojo' ? 'selected' : ''}" data-color="rojo"
                                style="width:48px; height:48px; border-radius:50%; border:3px solid transparent; background:#e74c3c; cursor:pointer; transition:all 0.2s; ${calificacion === 'rojo' ? 'border-color:#c0392b; transform:scale(1.15); box-shadow:0 0 12px rgba(231,76,60,0.5);' : ''}"
                                title="Mal día">
                            </button>
                            <span class="text-sm text-secondary">Malo</span>

                            <button type="button" class="diary-color-btn ${calificacion === 'amarillo' ? 'selected' : ''}" data-color="amarillo"
                                style="width:48px; height:48px; border-radius:50%; border:3px solid transparent; background:#f1c40f; cursor:pointer; transition:all 0.2s; ${calificacion === 'amarillo' ? 'border-color:#f39c12; transform:scale(1.15); box-shadow:0 0 12px rgba(241,196,15,0.5);' : ''}"
                                title="Día regular">
                            </button>
                            <span class="text-sm text-secondary">Regular</span>

                            <button type="button" class="diary-color-btn ${calificacion === 'verde' ? 'selected' : ''}" data-color="verde"
                                style="width:48px; height:48px; border-radius:50%; border:3px solid transparent; background:#2ecc71; cursor:pointer; transition:all 0.2s; ${calificacion === 'verde' ? 'border-color:#27ae60; transform:scale(1.15); box-shadow:0 0 12px rgba(46,204,113,0.5);' : ''}"
                                title="Buen día">
                            </button>
                            <span class="text-sm text-secondary">Bueno</span>
                        </div>
                        <input type="hidden" name="diary_calificacion" id="input-diary_calificacion" value="${UI.esc(calificacion)}">
                    </div>

                    ${UI.formGroup('Nota del día (1-10)',
                        `<div style="display:flex; align-items:center; gap:var(--spacing-md);">
                            <input type="range" name="diary_nota" id="input-diary_nota" 
                                min="1" max="10" value="${nota}" 
                                style="flex:1; accent-color:var(--primary);">
                            <span id="diary-nota-display" style="font-size:var(--font-xl); font-weight:700; min-width:32px; text-align:center;">${nota}</span>
                        </div>`
                    )}

                    ${UI.formGroup('Actividades', UI.input('diary_actividades', {
                        placeholder: 'Ej: ejercicio, lectura, trabajo, meditación...',
                        value: actividades
                    }), 'Separa con comas')}

                    <div class="modal-actions" style="justify-content:flex-end; margin-top:var(--spacing-lg);">
                        <button type="submit" class="btn btn-primary">${entry ? 'Actualizar entrada' : 'Guardar entrada'}</button>
                    </div>
                </form>
            </div>
        `;
    },

    /* ==================== TAB: CALENDARIO ==================== */

    _renderCalendar(data) {
        const entradas = data.diario.entradas || {};
        const year = this.currentYear;
        const month = this.currentMonth;
        const daysInMonth = DateUtils.getDaysInMonth(year, month);
        const firstDay = DateUtils.getFirstDayOfMonth(year, month);
        const dateObj = new Date(year, month, 1);
        const today = DateUtils.today();

        // Build calendar grid
        let calendarCells = '';

        // Day headers
        DateUtils.DAYS_MIN.forEach(d => {
            calendarCells += `<div class="diary-cal-header">${d}</div>`;
        });

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            calendarCells += '<div class="diary-cal-cell empty"></div>';
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = entradas[dateStr];
            const isToday = dateStr === today;
            let colorStyle = 'background:#e0e0e0;'; // gray for no entry
            let colorClass = 'no-entry';

            if (entry) {
                if (entry.calificacion === 'verde') {
                    colorStyle = 'background:#2ecc71;';
                    colorClass = 'verde';
                } else if (entry.calificacion === 'amarillo') {
                    colorStyle = 'background:#f1c40f;';
                    colorClass = 'amarillo';
                } else if (entry.calificacion === 'rojo') {
                    colorStyle = 'background:#e74c3c;';
                    colorClass = 'rojo';
                }
            }

            calendarCells += `
                <div class="diary-cal-cell ${isToday ? 'today' : ''}" data-date="${dateStr}" style="cursor:pointer;" title="${entry ? 'Nota: ' + entry.nota + '/10' : 'Sin entrada'}">
                    <span class="diary-cal-day">${day}</span>
                    <div class="diary-cal-dot" style="width:12px; height:12px; border-radius:50%; ${colorStyle} margin:2px auto 0;"></div>
                </div>
            `;
        }

        // Monthly stats
        const monthEntries = Object.entries(entradas).filter(([key]) => {
            return key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
        });
        const daysWritten = monthEntries.length;
        const avgNota = daysWritten > 0
            ? (monthEntries.reduce((s, [, e]) => s + (e.nota || 0), 0) / daysWritten).toFixed(1)
            : '—';
        const greenDays = monthEntries.filter(([, e]) => e.calificacion === 'verde').length;
        const yellowDays = monthEntries.filter(([, e]) => e.calificacion === 'amarillo').length;
        const redDays = monthEntries.filter(([, e]) => e.calificacion === 'rojo').length;

        return `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-md);">
                    <button id="btn-cal-prev" class="btn btn-secondary btn-sm">&larr;</button>
                    <h4 class="card-title" style="margin:0;">${DateUtils.formatMonthYear(dateObj)}</h4>
                    <button id="btn-cal-next" class="btn btn-secondary btn-sm">&rarr;</button>
                </div>

                <div class="diary-calendar-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; text-align:center;">
                    ${calendarCells}
                </div>
            </div>

            <div class="cards-grid mt-lg">
                <div class="card text-center">
                    <p class="text-secondary">Días escritos</p>
                    <p style="font-size:var(--font-2xl); font-weight:700;">${daysWritten}</p>
                    <p class="text-muted text-sm">de ${daysInMonth} días</p>
                </div>
                <div class="card text-center">
                    <p class="text-secondary">Nota promedio</p>
                    <p style="font-size:var(--font-2xl); font-weight:700;">${avgNota}</p>
                    <p class="text-muted text-sm">de 10</p>
                </div>
                <div class="card text-center">
                    <p class="text-secondary">Estado de ánimo</p>
                    <div style="display:flex; justify-content:center; gap:var(--spacing-sm); margin-top:var(--spacing-xs);">
                        <span style="display:flex; align-items:center; gap:4px;">
                            <span style="width:12px; height:12px; border-radius:50%; background:#2ecc71; display:inline-block;"></span>
                            ${greenDays}
                        </span>
                        <span style="display:flex; align-items:center; gap:4px;">
                            <span style="width:12px; height:12px; border-radius:50%; background:#f1c40f; display:inline-block;"></span>
                            ${yellowDays}
                        </span>
                        <span style="display:flex; align-items:center; gap:4px;">
                            <span style="width:12px; height:12px; border-radius:50%; background:#e74c3c; display:inline-block;"></span>
                            ${redDays}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    /* ==================== TAB: TENDENCIAS ==================== */

    _renderTrends(data) {
        const entradas = data.diario.entradas || {};
        const totalEntries = Object.keys(entradas).length;

        if (totalEntries === 0) {
            return `
                <div class="card">
                    ${UI.emptyState('Escribe tu primera entrada para ver tendencias.', '📊')}
                </div>
            `;
        }

        // Find most common activities on good vs bad days
        const goodActivities = {};
        const badActivities = {};

        Object.values(entradas).forEach(e => {
            const acts = e.actividades || [];
            acts.forEach(a => {
                const key = a.trim().toLowerCase();
                if (!key) return;
                if (e.calificacion === 'verde' || e.nota >= 7) {
                    goodActivities[key] = (goodActivities[key] || 0) + 1;
                }
                if (e.calificacion === 'rojo' || e.nota <= 4) {
                    badActivities[key] = (badActivities[key] || 0) + 1;
                }
            });
        });

        const topGood = Object.entries(goodActivities).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topBad = Object.entries(badActivities).sort((a, b) => b[1] - a[1]).slice(0, 5);

        return `
            <div class="cards-grid">
                <div class="card">
                    <h4 class="card-title mb-md">Notas últimos 30 días</h4>
                    <div class="chart-container" style="height:260px;">
                        <canvas id="diary-line-chart"></canvas>
                    </div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-md">Distribución de ánimo</h4>
                    <div class="chart-container" style="height:260px;">
                        <canvas id="diary-pie-chart"></canvas>
                    </div>
                </div>
            </div>

            <div class="cards-grid mt-lg">
                <div class="card">
                    <h4 class="card-title mb-md" style="color:#2ecc71;">Actividades en días buenos</h4>
                    ${topGood.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:var(--spacing-xs);">
                            ${topGood.map(([act, count]) => `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-xs) var(--spacing-sm); background:rgba(46,204,113,0.08); border-radius:var(--radius-sm);">
                                    <span>${UI.esc(act)}</span>
                                    <span class="badge" style="background:#2ecc71; color:#fff;">${count}x</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted text-sm">Sin datos suficientes</p>'}
                </div>
                <div class="card">
                    <h4 class="card-title mb-md" style="color:#e74c3c;">Actividades en días malos</h4>
                    ${topBad.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:var(--spacing-xs);">
                            ${topBad.map(([act, count]) => `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-xs) var(--spacing-sm); background:rgba(231,76,60,0.08); border-radius:var(--radius-sm);">
                                    <span>${UI.esc(act)}</span>
                                    <span class="badge" style="background:#e74c3c; color:#fff;">${count}x</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted text-sm">Sin datos suficientes</p>'}
                </div>
            </div>
        `;
    },

    /* ==================== CHARTS ==================== */

    _renderCharts(data) {
        if (typeof Chart === 'undefined') return;
        const entradas = data.diario.entradas || {};

        // Line chart: last 30 days notas
        const today = DateUtils.today();
        const lineLabels = [];
        const lineData = [];

        for (let i = 29; i >= 0; i--) {
            const dateStr = DateUtils.addDays(today, -i);
            const entry = entradas[dateStr];
            lineLabels.push(DateUtils.format(dateStr, 'short'));
            lineData.push(entry ? entry.nota : null);
        }

        ChartUtils.line('diary-line-chart', lineLabels, [{
            label: 'Nota del día',
            data: lineData,
            color: '#667eea',
            fill: true,
            spanGaps: true
        }], {
            title: ''
        });

        // Pie chart: mood distribution
        let green = 0, yellow = 0, red = 0;
        Object.values(entradas).forEach(e => {
            if (e.calificacion === 'verde') green++;
            else if (e.calificacion === 'amarillo') yellow++;
            else if (e.calificacion === 'rojo') red++;
        });

        if (green + yellow + red > 0) {
            ChartUtils.pie('diary-pie-chart',
                ['Buenos', 'Regulares', 'Malos'],
                [green, yellow, red],
                { colors: ['#2ecc71', '#f1c40f', '#e74c3c'] }
            );
        }
    },

    /* ==================== EVENTS ==================== */

    _bindEvents(container) {
        const self = this;
        const email = this._email;

        // Tab switching
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                self.currentTab = btn.dataset.tab;
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const target = document.getElementById(`tab-${btn.dataset.tab}`);
                if (target) target.classList.add('active');

                // Re-render charts when switching to trends tab
                if (btn.dataset.tab === 'trends') {
                    const data = Storage.getUserData(email);
                    setTimeout(() => self._renderCharts(data), 50);
                }
                // Re-render calendar when switching to calendar tab
                if (btn.dataset.tab === 'calendar') {
                    self.render(container);
                }
            });
        });

        // Color rating buttons
        container.querySelectorAll('.diary-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                const hiddenInput = document.getElementById('input-diary_calificacion');
                if (hiddenInput) hiddenInput.value = color;

                // Visual feedback
                container.querySelectorAll('.diary-color-btn').forEach(b => {
                    b.classList.remove('selected');
                    b.style.borderColor = 'transparent';
                    b.style.transform = 'scale(1)';
                    b.style.boxShadow = 'none';
                });
                btn.classList.add('selected');
                const colors = { rojo: '#c0392b', amarillo: '#f39c12', verde: '#27ae60' };
                const glows = { rojo: 'rgba(231,76,60,0.5)', amarillo: 'rgba(241,196,15,0.5)', verde: 'rgba(46,204,113,0.5)' };
                btn.style.borderColor = colors[color];
                btn.style.transform = 'scale(1.15)';
                btn.style.boxShadow = `0 0 12px ${glows[color]}`;
            });
        });

        // Range slider display
        const rangeInput = document.getElementById('input-diary_nota');
        const rangeDisplay = document.getElementById('diary-nota-display');
        if (rangeInput && rangeDisplay) {
            rangeInput.addEventListener('input', () => {
                rangeDisplay.textContent = rangeInput.value;
            });
        }

        // Save today's entry
        UI.bindForm('diary-today-form', (fd) => {
            const texto = fd.diary_texto || '';
            const calificacion = fd.diary_calificacion || '';
            const nota = parseInt(fd.diary_nota) || 5;
            const actividadesRaw = fd.diary_actividades || '';
            const actividades = actividadesRaw
                .split(',')
                .map(a => a.trim())
                .filter(a => a.length > 0);

            if (!texto.trim() && !calificacion) {
                UI.toast('Escribe algo o selecciona una calificación', 'error');
                return;
            }

            const today = DateUtils.today();
            const data = Storage.getUserData(email);
            if (!data.diario) data.diario = { entradas: {} };
            if (!data.diario.entradas) data.diario.entradas = {};

            const existing = data.diario.entradas[today];
            data.diario.entradas[today] = {
                texto: texto,
                calificacion: calificacion,
                nota: nota,
                actividades: actividades,
                creado: existing ? existing.creado : new Date().toISOString(),
                modificado: new Date().toISOString()
            };

            Storage.saveUserData(email, data);
            UI.toast(existing ? 'Entrada actualizada' : 'Entrada guardada', 'success');
            self.render(container);
        });

        // Calendar navigation
        UI.bindButton('btn-cal-prev', () => {
            self.currentMonth--;
            if (self.currentMonth < 0) {
                self.currentMonth = 11;
                self.currentYear--;
            }
            self.currentTab = 'calendar';
            self.render(container);
        });

        UI.bindButton('btn-cal-next', () => {
            self.currentMonth++;
            if (self.currentMonth > 11) {
                self.currentMonth = 0;
                self.currentYear++;
            }
            self.currentTab = 'calendar';
            self.render(container);
        });

        // Click on calendar day
        container.querySelectorAll('.diary-cal-cell[data-date]').forEach(cell => {
            cell.addEventListener('click', () => {
                const dateStr = cell.dataset.date;
                self._showDayModal(container, email, dateStr);
            });
        });
    },

    /* ==================== DAY MODAL ==================== */

    _showDayModal(container, email, dateStr) {
        const data = Storage.getUserData(email);
        if (!data.diario) data.diario = { entradas: {} };
        const entry = data.diario.entradas[dateStr] || null;
        const self = this;

        const texto = entry ? entry.texto : '';
        const calificacion = entry ? entry.calificacion : '';
        const nota = entry ? entry.nota : 5;
        const actividades = entry ? (entry.actividades || []).join(', ') : '';

        UI.showModal(`
            <h3 class="modal-title">${DateUtils.format(dateStr, 'long')}</h3>
            <form id="diary-day-form">
                <div class="form-group">
                    <label class="form-label">Texto</label>
                    <textarea name="dm_texto" id="input-dm_texto" class="form-textarea" 
                        placeholder="¿Cómo fue este día?" rows="5">${UI.esc(texto)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Calificación</label>
                    <div style="display:flex; gap:var(--spacing-md); align-items:center;">
                        <button type="button" class="dm-color-btn" data-color="rojo"
                            style="width:40px; height:40px; border-radius:50%; border:3px solid ${calificacion === 'rojo' ? '#c0392b' : 'transparent'}; background:#e74c3c; cursor:pointer; transition:all 0.2s; ${calificacion === 'rojo' ? 'transform:scale(1.15);' : ''}">
                        </button>
                        <button type="button" class="dm-color-btn" data-color="amarillo"
                            style="width:40px; height:40px; border-radius:50%; border:3px solid ${calificacion === 'amarillo' ? '#f39c12' : 'transparent'}; background:#f1c40f; cursor:pointer; transition:all 0.2s; ${calificacion === 'amarillo' ? 'transform:scale(1.15);' : ''}">
                        </button>
                        <button type="button" class="dm-color-btn" data-color="verde"
                            style="width:40px; height:40px; border-radius:50%; border:3px solid ${calificacion === 'verde' ? '#27ae60' : 'transparent'}; background:#2ecc71; cursor:pointer; transition:all 0.2s; ${calificacion === 'verde' ? 'transform:scale(1.15);' : ''}">
                        </button>
                    </div>
                    <input type="hidden" name="dm_calificacion" id="input-dm_calificacion" value="${UI.esc(calificacion)}">
                </div>

                <div class="form-group">
                    <label class="form-label">Nota (1-10)</label>
                    <div style="display:flex; align-items:center; gap:var(--spacing-md);">
                        <input type="range" name="dm_nota" id="input-dm_nota" min="1" max="10" value="${nota}" style="flex:1; accent-color:var(--primary);">
                        <span id="dm-nota-display" style="font-size:var(--font-xl); font-weight:700; min-width:28px; text-align:center;">${nota}</span>
                    </div>
                </div>

                ${UI.formGroup('Actividades', UI.input('dm_actividades', {
                    placeholder: 'Ej: ejercicio, lectura...',
                    value: actividades
                }), 'Separa con comas')}

                <div class="modal-actions">
                    ${entry ? '<button type="button" id="btn-dm-delete" class="btn btn-danger">Eliminar</button>' : ''}
                    <button type="button" id="btn-dm-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            onReady: () => {
                // Color buttons in modal
                document.querySelectorAll('.dm-color-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const color = btn.dataset.color;
                        const hidden = document.getElementById('input-dm_calificacion');
                        if (hidden) hidden.value = color;

                        document.querySelectorAll('.dm-color-btn').forEach(b => {
                            b.style.borderColor = 'transparent';
                            b.style.transform = 'scale(1)';
                        });
                        const colors = { rojo: '#c0392b', amarillo: '#f39c12', verde: '#27ae60' };
                        btn.style.borderColor = colors[color];
                        btn.style.transform = 'scale(1.15)';
                    });
                });

                // Nota slider in modal
                const rangeInput = document.getElementById('input-dm_nota');
                const rangeDisplay = document.getElementById('dm-nota-display');
                if (rangeInput && rangeDisplay) {
                    rangeInput.addEventListener('input', () => {
                        rangeDisplay.textContent = rangeInput.value;
                    });
                }

                // Cancel
                UI.bindButton('btn-dm-cancel', () => UI.closeModal());

                // Delete
                if (entry) {
                    UI.bindButton('btn-dm-delete', () => {
                        UI.confirm('¿Eliminar esta entrada?', () => {
                            const d = Storage.getUserData(email);
                            if (d.diario && d.diario.entradas) {
                                delete d.diario.entradas[dateStr];
                            }
                            Storage.saveUserData(email, d);
                            UI.closeModal();
                            UI.toast('Entrada eliminada', 'success');
                            self.currentTab = 'calendar';
                            self.render(container);
                        });
                    });
                }

                // Save
                UI.bindForm('diary-day-form', (fd) => {
                    const textoVal = fd.dm_texto || '';
                    const califVal = fd.dm_calificacion || '';
                    const notaVal = parseInt(fd.dm_nota) || 5;
                    const actRaw = fd.dm_actividades || '';
                    const acts = actRaw.split(',').map(a => a.trim()).filter(a => a.length > 0);

                    if (!textoVal.trim() && !califVal) {
                        UI.toast('Escribe algo o selecciona una calificación', 'error');
                        return;
                    }

                    const d = Storage.getUserData(email);
                    if (!d.diario) d.diario = { entradas: {} };
                    if (!d.diario.entradas) d.diario.entradas = {};

                    const existingEntry = d.diario.entradas[dateStr];
                    d.diario.entradas[dateStr] = {
                        texto: textoVal,
                        calificacion: califVal,
                        nota: notaVal,
                        actividades: acts,
                        creado: existingEntry ? existingEntry.creado : new Date().toISOString(),
                        modificado: new Date().toISOString()
                    };

                    Storage.saveUserData(email, d);
                    UI.closeModal();
                    UI.toast('Entrada guardada', 'success');
                    self.currentTab = 'calendar';
                    self.render(container);
                });
            }
        });
    }
};

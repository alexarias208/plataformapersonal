/* ============================================
   HABITS PAGE - Daily Habit Tracker
   ============================================ */

// Lista de opciones predeterminadas (hábitos típicos) para elegir al crear
const HABIT_PRESETS = [
    'Leer 20-30 min', 'Beber 8 vasos de agua', 'Ejercicio o caminata', 'Dormir 7-8 horas',
    'Meditar o respirar', 'Leer la Biblia / Orar', 'Escribir en el diario', 'No redes sociales por la mañana',
    'Desayunar saludable', 'Tomar vitaminas/suplementos', 'Estirar o yoga', 'Estudiar o formarme',
    'Cenar sin pantalla', 'Ordenar 10 min', 'Gratitud (3 cosas)', 'Llamar a alguien',
    'Pausas activas', 'Comer fruta/verdura', 'Caminar 30 min', 'Acostarme a la misma hora',
];

const HabitsPage = {
    trackerView: 'week', // 'week' | 'month'
    trackerAspect: 'habits', // 'habits' | 'mood'

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const habits = data.habitos?.lista || [];
        const today = DateUtils.today();
        const todayRec = data.habitos?.registros?.[today] || {};

        // Weekly stats
        const week = DateUtils.getWeekRange(today);
        let weekTotal = 0, weekDone = 0;
        for (let i = 0; i < 7; i++) {
            const d = DateUtils.addDays(week.start, i);
            const rec = data.habitos?.registros?.[d] || {};
            habits.forEach(h => {
                weekTotal++;
                if (rec[h.id]) weekDone++;
            });
        }

        const completedToday = habits.filter(h => todayRec[h.id]).length;

        container.innerHTML = `
            ${UI.pageTitle('Hábitos', '<button id="btn-add-habit" class="btn btn-primary btn-sm">+ Hábito</button>')}

            <div class="cards-grid">
                <div class="card text-center">
                    <h4 class="card-title mb-md">Progreso Hoy</h4>
                    <div style="max-width:160px; margin:0 auto;">
                        <canvas id="habits-today-chart"></canvas>
                    </div>
                    <p class="mt-sm text-secondary">${completedToday} de ${habits.length}</p>
                </div>
                <div class="card text-center">
                    <h4 class="card-title mb-md">Progreso Semanal</h4>
                    <div style="max-width:160px; margin:0 auto;">
                        <canvas id="habits-week-chart"></canvas>
                    </div>
                    <p class="mt-sm text-secondary">${weekDone} de ${weekTotal}</p>
                </div>
            </div>

            <!-- Tracker circular: semana / mes, colores por aspecto -->
            <div class="card mt-lg">
                <div class="flex justify-between items-center mb-md flex-wrap gap-sm">
                    <h4 class="card-title mb-0">Tracker circular</h4>
                    <div class="flex gap-sm items-center">
                        <select id="tracker-view-select" class="form-select" style="width:auto;">
                            <option value="week" ${this.trackerView === 'week' ? 'selected' : ''}>Semana</option>
                            <option value="month" ${this.trackerView === 'month' ? 'selected' : ''}>Mes</option>
                        </select>
                        <select id="tracker-aspect-select" class="form-select" style="width:auto;">
                            <option value="habits" ${this.trackerAspect === 'habits' ? 'selected' : ''}>Hábitos</option>
                            <option value="mood" ${this.trackerAspect === 'mood' ? 'selected' : ''}>Ánimo (diario)</option>
                        </select>
                    </div>
                </div>
                <p class="text-secondary text-sm mb-md">Cada segmento es un día; el color refleja el aspecto elegido.</p>
                <div class="tracker-circular-wrap" style="display:flex; justify-content:center;">
                    <canvas id="tracker-circular-canvas" width="280" height="280"></canvas>
                </div>
                <div id="tracker-legend" class="tracker-legend mt-md text-center text-sm text-secondary"></div>
            </div>

            <div class="card mt-lg">
                <h4 class="card-title mb-md">Mis Hábitos</h4>
                ${habits.length > 0 ? `
                    <div style="display:flex; flex-direction:column; gap: var(--spacing-sm);">
                        ${habits.map(h => `
                            <div class="habit-item ${todayRec[h.id] ? 'completed-today' : ''}" data-habit-id="${h.id}">
                                <input type="checkbox" class="habit-check" data-id="${h.id}" ${todayRec[h.id] ? 'checked' : ''}>
                                <div style="flex:1;">
                                    <strong>${UI.esc(h.nombre)}</strong>
                                    <span class="text-secondary text-sm"> · ${h.frecuencia || 'Diario'}</span>
                                </div>
                                <button class="btn-icon btn-sm text-error" data-del-habit="${h.id}">✕</button>
                            </div>
                        `).join('')}
                    </div>
                ` : UI.emptyState('Sin hábitos. ¡Agrega uno para comenzar!')}
            </div>

            <!-- History -->
            <div class="card mt-lg">
                <h4 class="card-title mb-md">Historial (últimos 7 días)</h4>
                ${this._renderHistory(habits, data.habitos?.registros || {}, today)}
            </div>
        `;

        this._bindEvents(container, email);
        this._renderCharts(completedToday, habits.length, weekDone, weekTotal);
        this._renderTrackerCircular(email, data);
    },

    _renderTrackerCircular(email, data) {
        const canvas = document.getElementById('tracker-circular-canvas');
        const legendEl = document.getElementById('tracker-legend');
        if (!canvas) return;

        const habits = data.habitos?.lista || [];
        const registros = data.habitos?.registros || {};
        const diario = data.diario?.entradas || {};
        const today = DateUtils.today();

        const isWeek = this.trackerView === 'week';
        const days = isWeek ? 7 : DateUtils.getDaysInMonth(new Date(today).getFullYear(), new Date(today).getMonth());
        const startDate = isWeek ? DateUtils.getWeekRange(today).start : today.substring(0, 8) + '01';

        const segmentValues = [];
        for (let i = 0; i < days; i++) {
            const d = isWeek ? DateUtils.addDays(startDate, i) : DateUtils.addDays(startDate, i);
            if (this.trackerAspect === 'habits') {
                const rec = registros[d] || {};
                const done = habits.filter(h => rec[h.id]).length;
                segmentValues.push(habits.length > 0 ? done / habits.length : 0);
            } else {
                const ent = diario[d];
                const moodScore = !ent ? -1 : (ent.calificacion === 'verde' ? 1 : ent.calificacion === 'amarillo' ? 0.5 : 0);
                segmentValues.push(moodScore);
            }
        }

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r1 = 70;
        const r2 = 110;
        const gap = 1.5 * (Math.PI / 180);

        ctx.clearRect(0, 0, w, h);

        for (let i = 0; i < days; i++) {
            const v = segmentValues[i];
            const start = (i / days) * Math.PI * 2 - Math.PI / 2 + gap / 2;
            const end = ((i + 1) / days) * Math.PI * 2 - Math.PI / 2 - gap / 2;

            let fill = 'rgba(255,255,255,0.08)';
            if (this.trackerAspect === 'habits') {
                if (v > 0) fill = v >= 1 ? '#22c55e' : v >= 0.5 ? '#eab308' : '#f97316';
            } else {
                if (v >= 0) fill = v >= 1 ? '#22c55e' : v >= 0.5 ? '#eab308' : '#ef4444';
            }

            ctx.beginPath();
            ctx.arc(cx, cy, r2, start, end);
            ctx.arc(cx, cy, r1, end, start, true);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
        }

        if (legendEl) {
            legendEl.innerHTML = this.trackerAspect === 'habits'
                ? 'Verde: todo · Amarillo: mitad · Naranja: poco · Gris: sin datos'
                : 'Verde: buen día · Amarillo: regular · Rojo: mal · Gris: sin registro';
        }
    },

    _renderHistory(habits, registros, today) {
        if (habits.length === 0) return '<p class="text-muted text-center">Sin datos</p>';

        let html = '<div class="table-wrapper"><table class="table"><thead><tr><th>Hábito</th>';
        for (let i = 6; i >= 0; i--) {
            const d = DateUtils.addDays(today, -i);
            html += `<th style="text-align:center;">${DateUtils.format(d, 'short')}</th>`;
        }
        html += '</tr></thead><tbody>';

        habits.forEach(h => {
            html += `<tr><td>${UI.esc(h.nombre)}</td>`;
            for (let i = 6; i >= 0; i--) {
                const d = DateUtils.addDays(today, -i);
                const done = registros[d]?.[h.id];
                html += `<td style="text-align:center;">${done ? '<span style="color:var(--state-success);">✓</span>' : '<span style="color:var(--text-muted);">—</span>'}</td>`;
            }
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    },

    _renderCharts(todayDone, todayTotal, weekDone, weekTotal) {
        if (typeof Chart === 'undefined') return;
        ChartUtils.progressRing('habits-today-chart', todayDone, todayTotal || 1, { color: '#43e97b' });
        ChartUtils.progressRing('habits-week-chart', weekDone, weekTotal || 1, { color: '#667eea' });
    },

    _bindEvents(container, email) {
        // Toggle habit
        container.querySelectorAll('.habit-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const id = cb.dataset.id;
                const today = DateUtils.today();
                const data = Storage.getUserData(email);
                if (!data.habitos.registros[today]) data.habitos.registros[today] = {};
                data.habitos.registros[today][id] = cb.checked;
                Storage.saveUserData(email, data);
                this.render(container);
                if (cb.checked) UI.toast('¡Hábito completado!', 'success');
            });
        });

        // Tracker circular: view and aspect
        const viewSelect = document.getElementById('tracker-view-select');
        const aspectSelect = document.getElementById('tracker-aspect-select');
        if (viewSelect) viewSelect.addEventListener('change', () => { this.trackerView = viewSelect.value; this.render(container); });
        if (aspectSelect) aspectSelect.addEventListener('change', () => { this.trackerAspect = aspectSelect.value; this.render(container); });

        // Delete habit
        container.querySelectorAll('[data-del-habit]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.delHabit;
                UI.confirm('¿Eliminar este hábito?', () => {
                    const data = Storage.getUserData(email);
                    data.habitos.lista = data.habitos.lista.filter(h => h.id !== id);
                    Storage.saveUserData(email, data);
                    this.render(container);
                    UI.toast('Hábito eliminado', 'success');
                });
            });
        });

        // Add habit
        UI.bindButton('btn-add-habit', () => {
            UI.showModal(`
                <h3 class="modal-title">Nuevo Hábito</h3>
                <p class="text-secondary text-sm mb-md">Elige uno de la lista o escribe el tuyo.</p>
                <div class="habit-presets mb-md" style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${HABIT_PRESETS.map(name => `
                        <button type="button" class="btn btn-ghost btn-sm habit-preset-btn" data-name="${UI.esc(name)}">${UI.esc(name)}</button>
                    `).join('')}
                </div>
                <form id="habit-form">
                    ${UI.formGroup('Nombre', UI.input('hab_name', { placeholder: 'Ej: Leer 30 minutos', required: true }))}
                    ${UI.formGroup('Frecuencia', UI.select('hab_freq', ['Diario', 'Lun-Vie', 'Personalizado'], 'Diario'))}
                    <div class="modal-actions">
                        <button type="button" id="btn-hab-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear</button>
                    </div>
                </form>
            `, {
                size: 'md',
                onReady: () => {
                    document.querySelectorAll('.habit-preset-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const input = document.getElementById('hab_name');
                            if (input) input.value = btn.dataset.name;
                        });
                    });
                    UI.bindButton('btn-hab-cancel', () => UI.closeModal());
                    UI.bindForm('habit-form', (fd) => {
                        if (!fd.hab_name.trim()) return;
                        const data = Storage.getUserData(email);
                        data.habitos.lista.push({
                            id: DateUtils.generateId(),
                            nombre: fd.hab_name.trim(),
                            frecuencia: fd.hab_freq,
                            creado: DateUtils.today()
                        });
                        Storage.saveUserData(email, data);
                        UI.closeModal();
                        UI.toast('Hábito creado', 'success');
                        this.render(container);
                    });
                }
            });
        });
    }
};

/* ============================================
   DASHBOARD - Central Hub (Reference-style)
   Single-page dashboard with tools grid
   ============================================ */

// Biblioteca de frases motivadoras/realistas, cercanas (hopecore), sin citas de autor
const Motivational = {
    phrases: [
        "Hoy no tiene que ser perfecto, solo tiene que ser tuyo.",
        "Un paso al día basta.",
        "Está bien avanzar lento si no te detienes.",
        "Tu cuerpo y tu mente te están llevando hasta aquí. Confía un poco más.",
        "No hace falta tener todo resuelto para estar bien hoy.",
        "Algo que hiciste ayer te trajo hasta aquí. Eso cuenta.",
        "Los días malos también pasan. Los buenos también. Vive este.",
        "No tienes que ser productivo para merecer descansar.",
        "Pequeños cambios siguen siendo cambios.",
        "Hoy puedes elegir una cosa que te acerque a quien quieres ser.",
        "No todo tiene que salir bien para que el día valga la pena.",
        "Respira. Ya llevas mucho hecho.",
        "Tu versión de hoy es suficiente.",
        "A veces el logro es simplemente haber intentado.",
        "El progreso no es lineal. Un día bajo no borra lo que ya construiste.",
        "Cada día que te levantas y sigues ya es un triunfo.",
        "No compares tu capítulo 5 con el capítulo 20 de nadie.",
        "Hoy puedes ser un poco más amable contigo.",
        "Las rachas se construyen de a un día.",
        "No hace falta motivación; hace falta dar el primer paso.",
        "Tu futuro se escribe con lo que haces hoy, pero hoy no tiene que ser perfecto.",
        "A veces la meta es solo llegar al final del día. Y está bien.",
        "Confía en el proceso aunque no veas el resultado aún.",
        "Lo que haces por ti mismo cuenta más de lo que crees.",
        "Un día a la vez no es poco; es la única manera.",
    ],
    getDaily() {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        return { text: this.phrases[dayOfYear % this.phrases.length], author: "" };
    },
    getByProgress(pct) {
        if (pct >= 100) return { text: "Día cerrado. Descansa y mañana seguimos.", author: "" };
        if (pct >= 75) return { text: "Casi terminas. El cierre del día se siente bien.", author: "" };
        if (pct >= 50) return { text: "Vas por la mitad. Sigue a tu ritmo.", author: "" };
        return this.getDaily();
    }
};

const DashboardPage = {
    render(container) {
        const email = Auth.getCurrentEmail();
        const user = Auth.getCurrentUser();
        const data = Storage.getUserData(email);
        const today = DateUtils.today();
        const opts = user?.perfil?.opcionesActivas || {};
        const isManager = user?.rol === 'manager';

        // Habits
        const todayHabits = data.habitos?.lista || [];
        const todayHabitRecords = data.habitos?.registros?.[today] || {};
        const completedHabits = todayHabits.filter(h => todayHabitRecords[h.id]);
        const habitPct = todayHabits.length > 0 ? Math.round((completedHabits.length / todayHabits.length) * 100) : 0;

        // Priorities + Activities (eventos de hoy)
        const priorities = data.prioridadesDia || [];
        const todayEventsForPct = (data.calendario?.eventos || []).filter(e => e.fecha === today);
        const completedPriorities = priorities.filter(p => p.completado).length;
        const completedActivities = todayEventsForPct.filter(e => e.completado).length;
        const totalTasks = priorities.length + todayHabits.length + todayEventsForPct.length;
        const completedTasks = completedPriorities + completedHabits.length + completedActivities;
        const dayPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Motivational phrase
        const phrase = Motivational.getByProgress(dayPct);

        // Actividades del día = eventos del calendario para hoy
        const todayEvents = (data.calendario?.eventos || []).filter(e => e.fecha === today);

        container.innerHTML = `
            ${Auth.isManagerViewMode() ? `
                <div class="alert alert-info mb-md" style="text-align:center;">
                    Modo vista (solo lectura)
                    <button id="btn-return-manager" class="btn btn-secondary btn-sm" style="margin-left:12px;">Volver a Manager</button>
                </div>
            ` : ''}

            <!-- Fecha y saludo (presentación: fecha primero) -->
            <div class="dash-section dash-greeting">
                <p class="dash-greeting-date">${this._formatFullDate()}</p>
                <h1 class="dash-greeting-text">${this._getGreeting()}, <span class="dash-greeting-name">${UI.esc(user?.perfil?.nombre || 'Usuario')}</span></h1>
            </div>

            <!-- Actividades del día (desde calendario) -->
            <div class="dash-section dash-focus">
                <label class="dash-focus-label">Actividades del Día</label>
                ${todayEvents.length > 0 ? `
                    <ul class="dash-activities-list" id="dash-activities-list">
                        ${todayEvents.map(e => `
                            <li class="dash-activity ${e.completado ? 'done' : ''}" data-event-id="${e.id}">
                                <input type="checkbox" class="dash-activity-check" data-event-id="${e.id}" ${e.completado ? 'checked' : ''} title="Marcar como realizado">
                                <span class="dash-activity-text">${UI.esc(e.titulo)}${e.hora ? ' · ' + UI.esc(e.hora) : ''}</span>
                            </li>
                        `).join('')}
                    </ul>
                    <p class="text-sm text-secondary mt-sm"><a href="#calendar" style="color:var(--accent-blue);">Ver calendario</a> para agregar o editar</p>
                ` : `
                    <p class="text-secondary">No hay actividades registradas para hoy en el calendario.</p>
                    <p class="text-sm mt-sm"><a href="#calendar" style="color:var(--accent-blue);">Agregar en Calendario</a></p>
                `}
            </div>

            <!-- Progress Ring + Motivational -->
            <div class="dash-section dash-progress-area">
                <div class="dash-progress-ring-wrap">
                    <canvas id="dash-day-ring" width="120" height="120"></canvas>
                    <div class="dash-ring-label">
                        <span class="dash-ring-pct">${dayPct}%</span>
                    </div>
                </div>
                <div class="dash-progress-info">
                    <h3 class="dash-progress-title">Progreso del Día</h3>
                    <p class="dash-progress-phrase">${UI.esc(phrase.text)}</p>
                    ${phrase.author ? `<p class="dash-progress-author">— ${UI.esc(phrase.author)}</p>` : ''}
                </div>
            </div>

            <!-- Habits Tracker -->
            <div class="dash-section">
                <div class="dash-section-header">
                    <h2 class="dash-section-title">Tracker de Hábitos</h2>
                    <div class="dash-section-actions">
                        <button id="btn-habits-calendar" class="btn btn-ghost btn-sm">Ver calendario</button>
                        <button id="btn-habits-config" class="btn btn-ghost btn-sm">Configurar</button>
                    </div>
                </div>
                <div class="dash-habits-grid" id="dash-habits-grid">
                    ${todayHabits.length > 0 ? todayHabits.map(h => {
                        const done = !!todayHabitRecords[h.id];
                        const icon = this._habitIcon(h.nombre);
                        return `
                            <button class="dash-habit-btn ${done ? 'done' : ''}" data-habit-id="${h.id}" title="${UI.esc(h.nombre)}">
                                <span class="dash-habit-icon">${icon}</span>
                                <span class="dash-habit-name">${UI.esc(h.nombre)}</span>
                            </button>
                        `;
                    }).join('') : `
                        <p class="text-muted text-sm" style="grid-column:1/-1;text-align:center;padding:var(--spacing-lg);">
                            Sin hábitos configurados. <a href="#habits" style="color:var(--accent-blue);">Configurar hábitos</a>
                        </p>
                    `}
                </div>
            </div>

            <!-- Priorities -->
            <div class="dash-section">
                <div class="dash-section-header">
                    <h2 class="dash-section-title">Prioridades del Día</h2>
                </div>
                <div id="dash-priorities">
                    ${priorities.map((p, i) => `
                        <div class="dash-priority ${p.completado ? 'done' : ''}" data-id="${p.id}">
                            <input type="checkbox" class="dash-priority-check" data-id="${p.id}" ${p.completado ? 'checked' : ''}>
                            <span class="dash-priority-text">${UI.esc(p.texto)}</span>
                            <button class="dash-priority-del" data-id="${p.id}" title="Eliminar">&times;</button>
                        </div>
                    `).join('')}
                </div>
                <div class="dash-add-priority">
                    <input type="text" id="new-priority-text" class="dash-add-input"
                        placeholder="Añadir una nueva prioridad...">
                    <button type="button" id="btn-add-priority-inline" class="dash-add-btn" title="Añadir tarea">+</button>
                </div>
            </div>

            <!-- Tools Grid -->
            <div class="dash-section">
                <div class="dash-section-header">
                    <h2 class="dash-section-title">Herramientas</h2>
                </div>
                <div class="dash-tools-grid">
                    ${this._renderTools(user, opts, isManager)}
                </div>
            </div>

            <!-- Resumen del día -->
            <div class="dash-section" style="text-align:center;padding-bottom:var(--spacing-2xl);">
                <button id="btn-close-day" class="btn btn-primary btn-lg" style="min-width:200px;">
                    Resumen del día
                </button>
            </div>
        `;

        this._bindEvents(container, email, data, today);
        this._renderDayRing(dayPct);
    },

    _getGreeting() {
        const h = new Date().getHours();
        if (h < 6) return 'Buenas noches';
        if (h < 12) return 'Buenos días';
        if (h < 18) return 'Buenas tardes';
        return 'Buenas noches';
    },

    _formatFullDate() {
        const d = new Date();
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
    },

    _habitIcon(name) {
        const lower = name.toLowerCase();
        if (lower.includes('agua') || lower.includes('beber')) return '💧';
        if (lower.includes('ejercicio') || lower.includes('gym') || lower.includes('gimnasio')) return '🏋️';
        if (lower.includes('leer') || lower.includes('lectura')) return '📖';
        if (lower.includes('meditar') || lower.includes('meditación')) return '🧘';
        if (lower.includes('dormir') || lower.includes('sueño')) return '😴';
        if (lower.includes('caminar')) return '🚶';
        if (lower.includes('correr')) return '🏃';
        if (lower.includes('estudi') || lower.includes('program')) return '💻';
        if (lower.includes('cocin') || lower.includes('comida')) return '🍳';
        if (lower.includes('social') || lower.includes('redes')) return '📵';
        if (lower.includes('biblia') || lower.includes('oración') || lower.includes('orar')) return '✝️';
        if (lower.includes('diario') || lower.includes('escribir')) return '✍️';
        if (lower.includes('vitamina') || lower.includes('suplement')) return '💊';
        if (lower.includes('fruta') || lower.includes('verdura') || lower.includes('salud')) return '🥗';
        return '✅';
    },

    _renderTools(user, opts, isManager) {
        const tools = [];

        if (isManager) {
            tools.push({ hash: '#manager', label: 'Admin', icon: '🛡️', color: 'var(--tool-1)' });
        }

        tools.push(
            { hash: '#calendar', label: 'Calendario', icon: '📅', color: 'var(--tool-1)' },
            { hash: '#finance', label: 'Finanzas', icon: '💰', color: 'var(--tool-2)' },
            { hash: '#summary', label: 'Resumen', icon: '📊', color: 'var(--tool-3)' },
        );

        if (opts.gastosCompartidos !== false) {
            tools.push({ hash: '#shared-expenses', label: 'Gastos Compartidos', icon: '🤝', color: 'var(--tool-4)' });
        }
        if (opts.estudios !== false) {
            tools.push({ hash: '#studies', label: 'Estudios', icon: '🎓', color: 'var(--tool-5)' });
        }
        if (opts.biblia !== false) {
            tools.push({ hash: '#religion', label: 'Biblia', icon: '✝️', color: 'var(--tool-6)' });
        }
        if (opts.habitos !== false) {
            tools.push({ hash: '#habits', label: 'Hábitos', icon: '🎯', color: 'var(--tool-7)' });
        }
        if (opts.ejercicios !== false) {
            tools.push({ hash: '#exercises', label: 'Ejercicios', icon: '💪', color: 'var(--tool-8)' });
        }
        if (opts.cicloMenstrual !== false && user?.perfil?.genero === 'mujer') {
            tools.push({ hash: '#cycle', label: 'Ciclo', icon: '🌸', color: 'var(--tool-9)' });
        }
        if (opts.juegos !== false) {
            tools.push({ hash: '#games', label: 'Juegos', icon: '🎮', color: 'var(--tool-10)' });
        }
        if (opts.documentos !== false) {
            tools.push({ hash: '#documents', label: 'Documentos', icon: '📁', color: 'var(--tool-11)' });
        }
        if (opts.diario !== false) {
            tools.push({ hash: '#diary', label: 'Diario', icon: '📝', color: 'var(--tool-5)' });
        }
        if (opts.foda !== false) {
            tools.push({ hash: '#foda', label: 'FODA', icon: '🎯', color: 'var(--tool-4)' });
        }
        // Registro Intimo: show for non-women or if registroIntimo option is on
        if (opts.registroIntimo !== false && user?.perfil?.genero !== 'mujer') {
            tools.push({ hash: '#intimate', label: 'Registro Íntimo', icon: '❤️', color: 'var(--tool-3)' });
        }

        tools.push({ hash: '#settings', label: 'Configuración', icon: '⚙️', color: 'var(--tool-12)' });

        return tools.map(t => `
            <a href="${t.hash}" class="dash-tool-btn">
                <span class="dash-tool-icon">${t.icon}</span>
                <span class="dash-tool-label">${t.label}</span>
            </a>
        `).join('');
    },

    _renderDayRing(pct) {
        const canvas = document.getElementById('dash-day-ring');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = 120;
        const lineWidth = 8;
        const radius = (size - lineWidth) / 2;
        const cx = size / 2;
        const cy = size / 2;

        ctx.clearRect(0, 0, size, size);

        // Background ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Progress ring
        if (pct > 0) {
            const start = -Math.PI / 2;
            const end = start + (Math.PI * 2 * pct / 100);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, start, end);
            const grad = ctx.createLinearGradient(0, 0, size, size);
            grad.addColorStop(0, '#818cf8');
            grad.addColorStop(1, '#a855f7');
            ctx.strokeStyle = grad;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    },

    _bindEvents(container, email, data, today) {
        // Return to manager
        if (document.getElementById('btn-return-manager')) {
            UI.bindButton('btn-return-manager', () => Manager.returnToManager());
        }

        // Actividades del día (marcar evento completado)
        container.querySelectorAll('.dash-activity-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const eventId = cb.dataset.eventId;
                const udata = Storage.getUserData(email);
                const ev = (udata.calendario?.eventos || []).find(e => e.id === eventId);
                if (ev) {
                    ev.completado = cb.checked;
                    Storage.saveUserData(email, udata);
                    this.render(container);
                }
            });
        });

        // Habit toggle
        container.querySelectorAll('.dash-habit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.habitId;
                const udata = Storage.getUserData(email);
                if (!udata.habitos.registros[today]) udata.habitos.registros[today] = {};
                udata.habitos.registros[today][id] = !udata.habitos.registros[today][id];
                Storage.saveUserData(email, udata);
                this.render(container);
            });
        });

        // Habits calendar / config
        UI.bindButton('btn-habits-calendar', () => { window.location.hash = '#habits'; });
        UI.bindButton('btn-habits-config', () => { window.location.hash = '#habits'; });

        // Priority inline add
        const addPriority = () => {
            const input = document.getElementById('new-priority-text');
            const text = input?.value?.trim();
            if (!text) return;
            const udata = Storage.getUserData(email);
            if (!udata.prioridadesDia) udata.prioridadesDia = [];
            udata.prioridadesDia.push({
                id: DateUtils.generateId(),
                texto: text,
                orden: udata.prioridadesDia.length,
                completado: false
            });
            Storage.saveUserData(email, udata);
            this.render(container);
        };

        UI.bindButton('btn-add-priority-inline', addPriority);

        const priorityInput = document.getElementById('new-priority-text');
        if (priorityInput) {
            priorityInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addPriority();
                }
            });
        }

        // Priority check
        container.querySelectorAll('.dash-priority-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const id = cb.dataset.id;
                const udata = Storage.getUserData(email);
                const p = (udata.prioridadesDia || []).find(x => x.id === id);
                if (p) {
                    p.completado = cb.checked;
                    Storage.saveUserData(email, udata);
                    this.render(container);
                }
            });
        });

        // Priority delete
        container.querySelectorAll('.dash-priority-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const udata = Storage.getUserData(email);
                udata.prioridadesDia = (udata.prioridadesDia || []).filter(x => x.id !== id);
                Storage.saveUserData(email, udata);
                this.render(container);
            });
        });

        // Close Day / Summary
        UI.bindButton('btn-close-day', () => this._showDaySummary(container, email, data, today));
    },

    _showDaySummary(container, email, data, today) {
        const habits = data.habitos?.lista || [];
        const habitRec = data.habitos?.registros || {};
        const todayEvents = (data.calendario?.eventos || []).filter(e => e.fecha === today);
        const priorities = data.prioridadesDia || [];
        const todayGastos = (data.finanzas?.gastos || []).filter(g => g.fecha === today);
        const todayIngresos = (data.finanzas?.ingresos || []).filter(i => i.fecha === today);

        const completedH = habits.filter(h => habitRec[today]?.[h.id]).length;
        const completedP = priorities.filter(p => p.completado).length;
        const attendedE = todayEvents.filter(e => e.completado).length;
        const notAttendedE = todayEvents.filter(e => !e.completado).length;

        const totalIncome = todayIngresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = todayGastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);

        // Mini mapa de hábitos: últimos 7 días, cada hábito una fila
        const weekDays = [];
        for (let i = 6; i >= 0; i--) weekDays.push(DateUtils.addDays(today, -i));
        const habitsMapHtml = habits.length > 0 ? `
            <div class="day-summary-habits-map">
                <h4 class="mb-sm">Hábitos esta semana</h4>
                <div class="habits-map-grid">
                    <div class="habits-map-row-header"></div>
                    ${weekDays.map(d => `<div class="habits-map-col-header" title="${DateUtils.format(d, 'short')}">${d === today ? 'Hoy' : ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(d).getDay()]}</div>`).join('')}
                    ${habits.map(h => `
                        <div class="habits-map-row-label" title="${UI.esc(h.nombre)}">${UI.esc(h.nombre.substring(0, 12))}${h.nombre.length > 12 ? '…' : ''}</div>
                        ${weekDays.map(d => {
                            const done = habitRec[d]?.[h.id];
                            return `<div class="habits-map-cell ${done ? 'done' : ''}" title="${DateUtils.format(d, 'short')} - ${UI.esc(h.nombre)}"></div>`;
                        }).join('')}
                    `).join('')}
                </div>
            </div>
        ` : '';

        UI.showModal(`
            <h3 class="modal-title">Resumen del Día</h3>
            <p class="text-secondary mb-md">${DateUtils.format(today, 'long')}</p>

            <div class="summary-grid">
                <div class="summary-stat">
                    <span class="summary-stat-value">${completedH}/${habits.length}</span>
                    <span class="summary-stat-label">Hábitos</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">${completedP}/${priorities.length}</span>
                    <span class="summary-stat-label">Prioridades</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">${attendedE}/${todayEvents.length}</span>
                    <span class="summary-stat-label">Eventos</span>
                </div>
            </div>

            <div class="day-summary-section">
                <h4 class="mb-sm">Gastos realizados hoy</h4>
                ${todayGastos.length > 0 ? `
                    <ul class="day-summary-list">
                        ${todayGastos.map(g => `<li><span class="text-error">-${UI.money(parseFloat(g.monto) || 0)}</span> ${UI.esc(g.descripcion || g.categoria || 'Gasto')}</li>`).join('')}
                    </ul>
                    <p class="text-sm text-secondary">Total gastado: <strong class="text-error">${UI.money(totalExpense)}</strong></p>
                ` : '<p class="text-muted text-sm">Sin gastos registrados hoy.</p>'}
                ${todayIngresos.length > 0 ? `<p class="text-sm text-success mt-xs">Ingresos: +${UI.money(totalIncome)}</p>` : ''}
            </div>

            <div class="day-summary-section">
                <h4 class="mb-sm">Eventos: asistidos y no asistidos</h4>
                ${todayEvents.length > 0 ? `
                    <ul class="day-summary-list">
                        ${todayEvents.filter(e => e.completado).map(e => `<li class="text-success">✓ ${UI.esc(e.titulo)}</li>`).join('')}
                        ${todayEvents.filter(e => !e.completado).map(e => `<li class="text-muted">○ ${UI.esc(e.titulo)}</li>`).join('')}
                    </ul>
                ` : '<p class="text-muted text-sm">Sin eventos hoy.</p>'}
            </div>

            ${habitsMapHtml}

            <div class="mt-lg" style="border-top: 1px solid var(--border); padding-top: var(--spacing-md);">
                <h4 style="margin-bottom: var(--spacing-sm);">Marcar completados:</h4>
                <div id="close-day-items" style="max-height: 220px; overflow-y: auto;">
                    ${habits.map(h => `
                        <label class="form-check" style="padding:8px;">
                            <input type="checkbox" data-item-id="${h.id}" data-type="habit" ${habitRec[today]?.[h.id] ? 'checked' : ''}>
                            <span class="form-check-label">${UI.esc(h.nombre)}</span>
                            <span class="badge badge-info" style="margin-left:auto;font-size:0.65rem;">Hábito</span>
                        </label>
                    `).join('')}
                    ${todayEvents.map(e => `
                        <label class="form-check" style="padding:8px;">
                            <input type="checkbox" data-item-id="${e.id}" data-type="event" ${e.completado ? 'checked' : ''}>
                            <span class="form-check-label">${UI.esc(e.titulo)}</span>
                            <span class="badge badge-warning" style="margin-left:auto;font-size:0.65rem;">Evento</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="modal-actions">
                <button id="btn-close-day-save" class="btn btn-primary btn-lg">Cerrar y Guardar</button>
            </div>
        `, {
            onReady: () => {
                UI.bindButton('btn-close-day-save', () => {
                    const udata = Storage.getUserData(email);
                    document.querySelectorAll('#close-day-items input[type="checkbox"]').forEach(cb => {
                        const id = cb.dataset.itemId;
                        const type = cb.dataset.type;
                        if (type === 'habit') {
                            if (!udata.habitos) udata.habitos = { lista: [], registros: {} };
                            if (!udata.habitos.registros[today]) udata.habitos.registros[today] = {};
                            udata.habitos.registros[today][id] = cb.checked;
                        } else {
                            const ev = (udata.calendario?.eventos || []).find(e => e.id === id);
                            if (ev) ev.completado = cb.checked;
                        }
                    });
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Día cerrado. ¡Buen trabajo!', 'success');
                    this.render(container);
                });
            }
        });
    }
};

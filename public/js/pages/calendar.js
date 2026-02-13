/* ============================================
   CALENDAR PAGE - Monthly Calendar with Events
   ============================================ */

const CalendarPage = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const events = data.calendario?.eventos || [];

        const monthName = DateUtils.formatMonthYear(new Date(this.currentYear, this.currentMonth));
        const daysInMonth = DateUtils.getDaysInMonth(this.currentYear, this.currentMonth);
        const firstDay = DateUtils.getFirstDayOfMonth(this.currentYear, this.currentMonth);
        const todayStr = DateUtils.today();

        // Progress
        const monthEvents = events.filter(e => {
            return e.fecha && e.fecha.startsWith(`${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`);
        });
        const completed = monthEvents.filter(e => e.completado).length;
        const progressPct = monthEvents.length > 0 ? Math.round((completed / monthEvents.length) * 100) : 0;

        container.innerHTML = `
            ${UI.pageTitle('Calendario', '<button id="btn-add-event" class="btn btn-primary btn-sm">+ Evento</button>')}

            <div class="calendar-header">
                <div class="calendar-nav">
                    <button id="btn-prev-month" class="btn btn-ghost">◀</button>
                    <h3>${monthName}</h3>
                    <button id="btn-next-month" class="btn btn-ghost">▶</button>
                </div>
                <div class="flex items-center gap-md">
                    <span class="text-secondary text-sm">${completed}/${monthEvents.length} completados</span>
                    <div class="progress" style="width: 120px;">
                        <div class="progress-bar success" style="width: ${progressPct}%;"></div>
                    </div>
                </div>
            </div>

            <div class="calendar-grid">
                ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d =>
                    `<div class="cal-day-header">${d}</div>`
                ).join('')}
                ${this._renderDays(firstDay, daysInMonth, events, todayStr)}
            </div>
        `;

        this._bindEvents(container, email);
    },

    _renderDays(firstDay, daysInMonth, events, todayStr) {
        let html = '';
        // Adjust: JS Sunday=0, we want Monday=0
        const startOffset = (firstDay === 0 ? 6 : firstDay - 1);

        // Get diary entries for mood indicators
        const email = Auth.getCurrentEmail();
        const userData = Storage.getUserData(email);
        const diaryEntries = userData?.diario?.entradas || {};

        // Previous month padding
        const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1;
        const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
        const prevDays = DateUtils.getDaysInMonth(prevYear, prevMonth);

        for (let i = startOffset - 1; i >= 0; i--) {
            const day = prevDays - i;
            html += `<div class="cal-day other-month"><span class="cal-day-number">${day}</span></div>`;
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayEvents = events.filter(e => e.fecha === dateStr);

            // Diary mood indicator
            const diaryEntry = diaryEntries[dateStr];
            const moodColors = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' };
            const moodIndicator = diaryEntry ? `<div style="position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;background:${moodColors[diaryEntry.calificacion] || '#64748b'};" title="Ánimo: ${diaryEntry.calificacion || 'N/A'}"></div>` : '';

            const eventsHtml = dayEvents.slice(0, 3).map(e => {
                const typeClass = e.completado ? 'type-completed' : `type-${e.tipo || 'pending'}`;
                return `<div class="cal-event ${typeClass}" title="${UI.esc(e.titulo)}">${UI.esc(e.titulo)}</div>`;
            }).join('');

            const more = dayEvents.length > 3 ? `<div class="cal-event" style="color:var(--text-muted);">+${dayEvents.length - 3} más</div>` : '';

            html += `
                <div class="cal-day ${isToday ? 'today' : ''}" data-date="${dateStr}" style="position:relative;">
                    <span class="cal-day-number">${d}</span>
                    ${moodIndicator}
                    ${eventsHtml}${more}
                </div>
            `;
        }

        // Next month padding
        const totalCells = startOffset + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="cal-day other-month"><span class="cal-day-number">${i}</span></div>`;
        }

        return html;
    },

    _bindEvents(container, email) {
        UI.bindButton('btn-prev-month', () => {
            if (this.currentMonth === 0) {
                this.currentMonth = 11;
                this.currentYear--;
            } else {
                this.currentMonth--;
            }
            this.render(container);
        });

        UI.bindButton('btn-next-month', () => {
            if (this.currentMonth === 11) {
                this.currentMonth = 0;
                this.currentYear++;
            } else {
                this.currentMonth++;
            }
            this.render(container);
        });

        UI.bindButton('btn-add-event', () => this._showEventModal(container, email));

        // Click on day
        container.querySelectorAll('.cal-day:not(.other-month)').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                this._showDayModal(container, email, date);
            });
        });
    },

    _showDayModal(container, email, date) {
        const data = Storage.getUserData(email);
        const events = (data.calendario?.eventos || []).filter(e => e.fecha === date);

        UI.showModal(`
            <h3 class="modal-title">${DateUtils.format(date, 'long')}</h3>
            ${events.length > 0 ? events.map(e => `
                <div class="finance-item" style="cursor:pointer;" data-event-id="${e.id}">
                    <div class="item-info">
                        <strong>${UI.esc(e.titulo)}</strong>
                        <span class="text-secondary">${e.tipo || 'General'}${e.hora ? ' - ' + e.hora : ''}</span>
                    </div>
                    <div class="flex gap-sm items-center">
                        <button class="btn btn-ghost btn-sm toggle-complete" data-id="${e.id}">${e.completado ? '✅' : '⬜'}</button>
                        <button class="btn btn-ghost btn-sm edit-event" data-id="${e.id}">✏️</button>
                        <button class="btn btn-ghost btn-sm del-event" data-id="${e.id}">🗑️</button>
                    </div>
                </div>
            `).join('') : '<p class="text-muted text-center">Sin eventos</p>'}
            <div class="modal-actions">
                <button id="btn-add-day-event" class="btn btn-primary">+ Agregar Evento</button>
            </div>
        `, {
            onReady: () => {
                UI.bindButton('btn-add-day-event', () => {
                    UI.closeModal();
                    this._showEventModal(container, email, date);
                });

                document.querySelectorAll('.toggle-complete').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const udata = Storage.getUserData(email);
                        const ev = (udata.calendario.eventos || []).find(x => x.id === btn.dataset.id);
                        if (ev) {
                            ev.completado = !ev.completado;
                            Storage.saveUserData(email, udata);
                            UI.closeModal();
                            this.render(container);
                            UI.toast(ev.completado ? 'Evento completado' : 'Evento marcado pendiente', 'success');
                        }
                    });
                });

                document.querySelectorAll('.del-event').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const udata = Storage.getUserData(email);
                        udata.calendario.eventos = (udata.calendario.eventos || []).filter(x => x.id !== btn.dataset.id);
                        Storage.saveUserData(email, udata);
                        UI.closeModal();
                        this.render(container);
                        UI.toast('Evento eliminado', 'success');
                    });
                });

                document.querySelectorAll('.edit-event').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const udata = Storage.getUserData(email);
                        const ev = (udata.calendario.eventos || []).find(x => x.id === btn.dataset.id);
                        if (ev) {
                            UI.closeModal();
                            this._showEventModal(container, email, ev.fecha, ev);
                        }
                    });
                });
            }
        });
    },

    _showEventModal(container, email, defaultDate, editEvent = null) {
        const globalConfig = Storage.getModulesGlobal();
        const tipos = globalConfig.tiposEventos || [];
        const isEdit = !!editEvent;

        UI.showModal(`
            <h3 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} Evento</h3>
            <form id="event-form">
                ${UI.formGroup('Título', UI.input('ev_titulo', { value: editEvent?.titulo || '', placeholder: 'Título del evento', required: true }))}
                <div class="form-row">
                    ${UI.formGroup('Fecha', UI.input('ev_fecha', { type: 'date', value: editEvent?.fecha || defaultDate || DateUtils.today(), required: true }))}
                    ${UI.formGroup('Hora', UI.input('ev_hora', { type: 'time', value: editEvent?.hora || '' }))}
                </div>
                <div class="form-row">
                    ${UI.formGroup('Tipo', UI.select('ev_tipo', tipos, editEvent?.tipo || ''))}
                    ${UI.formGroup('Color', UI.select('ev_color', [
                        { value: '', label: 'Auto (por tipo)' },
                        { value: 'urgent', label: 'Rojo (Urgente)' },
                        { value: 'habit', label: 'Verde (Hábito)' },
                        { value: 'finance', label: 'Azul (Finanza)' },
                        { value: 'pending', label: 'Amarillo (Pendiente)' },
                        { value: 'study', label: 'Púrpura (Estudio)' },
                        { value: 'exercise', label: 'Naranja (Ejercicio)' }
                    ], editEvent?.color || ''))}
                </div>
                <div class="modal-actions">
                    <button type="button" id="btn-ev-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        `, {
            onReady: () => {
                UI.bindButton('btn-ev-cancel', () => UI.closeModal());
                UI.bindForm('event-form', (fd) => {
                    if (!fd.ev_titulo.trim()) {
                        UI.toast('El título es obligatorio', 'error');
                        return;
                    }
                    const udata = Storage.getUserData(email);
                    if (isEdit) {
                        const ev = udata.calendario.eventos.find(x => x.id === editEvent.id);
                        if (ev) {
                            ev.titulo = fd.ev_titulo;
                            ev.fecha = fd.ev_fecha;
                            ev.hora = fd.ev_hora;
                            ev.tipo = fd.ev_tipo;
                            ev.color = fd.ev_color;
                        }
                    } else {
                        udata.calendario.eventos.push({
                            id: DateUtils.generateId(),
                            titulo: fd.ev_titulo,
                            fecha: fd.ev_fecha,
                            hora: fd.ev_hora,
                            tipo: fd.ev_tipo,
                            color: fd.ev_color,
                            moduloOrigen: null,
                            completado: false
                        });
                    }
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast(isEdit ? 'Evento actualizado' : 'Evento creado', 'success');
                    this.render(container);
                });
            }
        });
    },

    // Helper: add event from other modules
    addAutoEvent(email, titulo, fecha, tipo, moduloOrigen) {
        const data = Storage.getUserData(email);
        // Avoid duplicates from same module + date + title
        const exists = data.calendario.eventos.some(e =>
            e.titulo === titulo && e.fecha === fecha && e.moduloOrigen === moduloOrigen
        );
        if (!exists) {
            data.calendario.eventos.push({
                id: DateUtils.generateId(),
                titulo, fecha, tipo,
                color: '',
                moduloOrigen,
                completado: false
            });
            Storage.saveUserData(email, data);
        }
    }
};

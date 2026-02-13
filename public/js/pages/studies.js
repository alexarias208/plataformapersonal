/* ============================================
   STUDIES PAGE - Academic Tracking
   ============================================ */

const StudiesPage = {
    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const estudios = data.estudios || { ramos: [], pruebas: [] };

        container.innerHTML = `
            ${UI.pageTitle('Estudios', '<button id="btn-add-ramo" class="btn btn-primary btn-sm">+ Ramo</button>')}

            <div class="cards-grid">
                ${estudios.ramos.length > 0 ? estudios.ramos.map(r => {
                    const avg = this._calcAvg(r.calificaciones);
                    return `
                        <div class="card card-clickable" data-ramo-id="${r.id}">
                            <h4 class="card-title">${UI.esc(r.nombre)}</h4>
                            <p class="text-secondary">${UI.esc(r.profesor || 'Sin profesor')}</p>
                            <div class="grade-bar mt-sm">
                                <div class="progress" style="flex:1;">
                                    <div class="progress-bar ${avg >= 4 ? 'success' : avg >= 3 ? 'warning' : 'danger'}" style="width: ${(avg / 7) * 100}%;"></div>
                                </div>
                                <span class="grade-value">${avg > 0 ? avg.toFixed(1) : '-'}</span>
                            </div>
                            <div class="mt-sm text-secondary text-sm">
                                ${r.calificaciones?.length || 0} calificaciones · 
                                ${r.horario?.length || 0} bloques horario
                            </div>
                        </div>
                    `;
                }).join('') : UI.emptyState('Sin ramos. ¡Agrega uno para comenzar!')}
            </div>

            <!-- Upcoming Tests -->
            ${estudios.pruebas.length > 0 ? `
                <div class="card mt-lg">
                    <h4 class="card-title mb-md">Próximas Pruebas</h4>
                    ${estudios.pruebas
                        .filter(p => p.fecha >= DateUtils.today())
                        .sort((a, b) => a.fecha.localeCompare(b.fecha))
                        .slice(0, 5)
                        .map(p => {
                            const ramo = estudios.ramos.find(r => r.id === p.ramoId);
                            return `
                                <div class="finance-item">
                                    <div class="item-info">
                                        <strong>${ramo ? UI.esc(ramo.nombre) : 'Desconocido'}</strong>
                                        <span class="text-secondary">${DateUtils.format(p.fecha, 'medium')} · ${p.ponderacion}%</span>
                                    </div>
                                    ${p.nota !== null && p.nota !== undefined ? `<span class="badge badge-success">${p.nota}</span>` : '<span class="badge badge-warning">Pendiente</span>'}
                                </div>
                            `;
                        }).join('') || '<p class="text-muted text-center">Sin pruebas próximas</p>'}
                </div>
            ` : ''}

            <!-- Grades Chart -->
            ${estudios.ramos.length > 0 ? `
                <div class="card mt-lg">
                    <h4 class="card-title mb-md">Notas por Ramo</h4>
                    <div class="chart-container" style="height:250px;"><canvas id="chart-grades"></canvas></div>
                </div>
            ` : ''}
        `;

        this._bindEvents(container, email, estudios);
        this._renderChart(estudios.ramos);
    },

    _calcAvg(calificaciones) {
        if (!calificaciones || calificaciones.length === 0) return 0;
        let totalWeight = 0, weighted = 0;
        calificaciones.forEach(c => {
            const w = parseFloat(c.ponderacion) || 1;
            weighted += (parseFloat(c.nota) || 0) * w;
            totalWeight += w;
        });
        return totalWeight > 0 ? weighted / totalWeight : 0;
    },

    _renderChart(ramos) {
        if (typeof Chart === 'undefined' || ramos.length === 0) return;
        const labels = ramos.map(r => r.nombre);
        const data = ramos.map(r => this._calcAvg(r.calificaciones));
        ChartUtils.bar('chart-grades', labels, [{ label: 'Nota Promedio', data }]);
    },

    _bindEvents(container, email, estudios) {
        // Add ramo
        UI.bindButton('btn-add-ramo', () => {
            UI.showModal(`
                <h3 class="modal-title">Nuevo Ramo</h3>
                <form id="ramo-form">
                    ${UI.formGroup('Nombre del Ramo', UI.input('ramo_nombre', { placeholder: 'Ej: Matemáticas', required: true }))}
                    ${UI.formGroup('Profesor', UI.input('ramo_prof', { placeholder: 'Nombre del profesor' }))}
                    ${UI.formGroup('Correos contacto', UI.input('ramo_correos', { placeholder: 'correo1@x.com, correo2@x.com' }))}
                    ${UI.formGroup('Compañeros', UI.input('ramo_comp', { placeholder: 'Nombre1, Nombre2' }))}
                    <div class="modal-actions">
                        <button type="button" id="btn-ramo-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear</button>
                    </div>
                </form>
            `, {
                onReady: () => {
                    UI.bindButton('btn-ramo-cancel', () => UI.closeModal());
                    UI.bindForm('ramo-form', (fd) => {
                        if (!fd.ramo_nombre.trim()) return;
                        const data = Storage.getUserData(email);
                        data.estudios.ramos.push({
                            id: DateUtils.generateId(),
                            nombre: fd.ramo_nombre,
                            profesor: fd.ramo_prof,
                            correos: fd.ramo_correos,
                            companeros: fd.ramo_comp,
                            calificaciones: [],
                            horario: []
                        });
                        Storage.saveUserData(email, data);
                        UI.closeModal();
                        UI.toast('Ramo creado', 'success');
                        this.render(container);
                    });
                }
            });
        });

        // Click ramo
        container.querySelectorAll('[data-ramo-id]').forEach(card => {
            card.addEventListener('click', () => {
                this._showRamoDetail(container, email, card.dataset.ramoId);
            });
        });
    },

    _showRamoDetail(container, email, ramoId) {
        const data = Storage.getUserData(email);
        const ramo = data.estudios.ramos.find(r => r.id === ramoId);
        if (!ramo) return;

        const avg = this._calcAvg(ramo.calificaciones);

        UI.showModal(`
            <h3 class="modal-title">${UI.esc(ramo.nombre)}</h3>
            <p><strong>Profesor:</strong> ${UI.esc(ramo.profesor || '-')}</p>
            <p><strong>Correos:</strong> ${UI.esc(ramo.correos || '-')}</p>
            <p><strong>Compañeros:</strong> ${UI.esc(ramo.companeros || '-')}</p>
            <p><strong>Promedio:</strong> ${avg > 0 ? avg.toFixed(2) : 'Sin notas'}</p>

            <h4 class="mt-lg mb-sm">Calificaciones</h4>
            ${ramo.calificaciones.length > 0 ? `
                <div class="table-wrapper">
                    <table class="table">
                        <thead><tr><th>Evaluación</th><th>Nota</th><th>Ponderación</th></tr></thead>
                        <tbody>
                            ${ramo.calificaciones.map(c => `
                                <tr>
                                    <td>${UI.esc(c.nombre)}</td>
                                    <td>${c.nota}</td>
                                    <td>${c.ponderacion}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p class="text-muted">Sin calificaciones</p>'}

            <div class="flex gap-sm mt-md">
                <button id="btn-add-grade" class="btn btn-success btn-sm">+ Calificación</button>
                <button id="btn-add-test" class="btn btn-primary btn-sm">+ Prueba</button>
                <button id="btn-add-schedule" class="btn btn-secondary btn-sm">+ Horario</button>
                <button id="btn-del-ramo" class="btn btn-danger btn-sm">Eliminar Ramo</button>
            </div>
        `, {
            size: 'lg',
            onReady: () => {
                UI.bindButton('btn-add-grade', () => {
                    UI.closeModal();
                    this._addGrade(container, email, ramoId);
                });
                UI.bindButton('btn-add-test', () => {
                    UI.closeModal();
                    this._addTest(container, email, ramoId);
                });
                UI.bindButton('btn-add-schedule', () => {
                    UI.closeModal();
                    this._addSchedule(container, email, ramoId);
                });
                UI.bindButton('btn-del-ramo', () => {
                    const d = Storage.getUserData(email);
                    d.estudios.ramos = d.estudios.ramos.filter(r => r.id !== ramoId);
                    d.estudios.pruebas = d.estudios.pruebas.filter(p => p.ramoId !== ramoId);
                    Storage.saveUserData(email, d);
                    UI.closeModal();
                    UI.toast('Ramo eliminado', 'success');
                    this.render(container);
                });
            }
        });
    },

    _addGrade(container, email, ramoId) {
        UI.showModal(`
            <h3 class="modal-title">Nueva Calificación</h3>
            <form id="grade-form">
                ${UI.formGroup('Nombre', UI.input('gr_name', { placeholder: 'Ej: Prueba 1', required: true }))}
                <div class="form-row">
                    ${UI.formGroup('Nota', UI.input('gr_nota', { type: 'number', placeholder: '1.0-7.0', required: true, min: 1, max: 7, step: '0.1' }))}
                    ${UI.formGroup('Ponderación (%)', UI.input('gr_pond', { type: 'number', placeholder: '%', required: true, min: 0, max: 100 }))}
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                const form = document.getElementById('grade-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fd = new FormData(form);
                        const data = {};
                        fd.forEach((v, k) => { data[k] = v; });
                        if (!data.gr_name || !data.gr_name.trim()) return;
                        const udata = Storage.getUserData(email);
                        const ramo = udata.estudios.ramos.find(r => r.id === ramoId);
                        if (ramo) {
                            ramo.calificaciones.push({
                                nombre: data.gr_name,
                                nota: parseFloat(data.gr_nota) || 0,
                                ponderacion: parseFloat(data.gr_pond) || 0
                            });
                            Storage.saveUserData(email, udata);
                            UI.closeModal();
                            UI.toast('Calificación agregada', 'success');
                            this.render(container);
                        }
                    });
                }
            }
        });
    },

    _addTest(container, email, ramoId) {
        UI.showModal(`
            <h3 class="modal-title">Nueva Prueba</h3>
            <form id="test-form">
                ${UI.formGroup('Fecha', UI.input('tst_fecha', { type: 'date', required: true, value: DateUtils.today() }))}
                ${UI.formGroup('Ponderación (%)', UI.input('tst_pond', { type: 'number', placeholder: '%', min: 0, max: 100 }))}
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Crear</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                const form = document.getElementById('test-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fd = new FormData(form);
                        const data = {};
                        fd.forEach((v, k) => { data[k] = v; });
                        if (!data.tst_fecha) return;
                        const udata = Storage.getUserData(email);
                        const ramo = udata.estudios.ramos.find(r => r.id === ramoId);
                        udata.estudios.pruebas.push({
                            id: DateUtils.generateId(),
                            ramoId,
                            fecha: data.tst_fecha,
                            ponderacion: parseFloat(data.tst_pond) || 0,
                            nota: null
                        });
                        if (ramo && data.tst_fecha && typeof CalendarPage !== 'undefined' && CalendarPage.addAutoEvent) {
                            CalendarPage.addAutoEvent(email, `Prueba: ${ramo.nombre}`, data.tst_fecha, 'Estudio', 'estudios');
                        }
                        Storage.saveUserData(email, udata);
                        UI.closeModal();
                        UI.toast('Prueba creada', 'success');
                        this.render(container);
                    });
                }
            }
        });
    },

    _addSchedule(container, email, ramoId) {
        UI.showModal(`
            <h3 class="modal-title">Agregar Horario</h3>
            <form id="sched-form">
                ${UI.formGroup('Día', UI.select('sch_dia', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'], '', { required: true }))}
                <div class="form-row">
                    ${UI.formGroup('Hora Inicio', UI.input('sch_inicio', { type: 'time', required: true }))}
                    ${UI.formGroup('Hora Fin', UI.input('sch_fin', { type: 'time', required: true }))}
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                const form = document.getElementById('sched-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fd = new FormData(form);
                        const data = {};
                        fd.forEach((v, k) => { data[k] = v; });
                        if (!data.sch_dia || !data.sch_inicio || !data.sch_fin) return;
                        const udata = Storage.getUserData(email);
                        const ramo = udata.estudios.ramos.find(r => r.id === ramoId);
                        if (ramo) {
                            ramo.horario.push({
                                dia: data.sch_dia,
                                horaInicio: data.sch_inicio,
                                horaFin: data.sch_fin
                            });
                            Storage.saveUserData(email, udata);
                            UI.closeModal();
                            UI.toast('Horario agregado', 'success');
                            this.render(container);
                        }
                    });
                }
            }
        });
    }
};

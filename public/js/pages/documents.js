/* ============================================
   DOCUMENTS PAGE - Personal Document Storage
   ============================================ */

const DocumentsPage = {
    categories: ['Personales', 'Auto', 'Casas', 'Propiedades', 'Tarjetas', 'Datos para Transferencias', 'Otro'],

    async render(container) {
        const email = Auth.getCurrentEmail();
        let docs = [];
        try {
            docs = await Storage.getDocuments(email);
        } catch (e) {
            console.error('Error loading documents:', e);
        }

        const byCategory = {};
        this.categories.forEach(c => { byCategory[c] = []; });
        docs.forEach(d => {
            const cat = d.categoria || 'Otro';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(d);
        });

        container.innerHTML = `
            ${UI.pageTitle('Documentos', '<button id="btn-upload-doc" class="btn btn-primary btn-sm">+ Subir</button>')}

            <div class="filters-bar">
                <input type="text" id="doc-search" class="form-input" placeholder="Buscar documentos..." style="max-width:300px;">
            </div>

            <div id="docs-container">
                ${Object.entries(byCategory).map(([cat, catDocs]) => {
                    if (catDocs.length === 0) return '';
                    return `
                        <div class="mb-lg">
                            <h4 class="mb-sm">${UI.esc(cat)} (${catDocs.length})</h4>
                            <div class="doc-grid">
                                ${catDocs.map(d => `
                                    <div class="card card-clickable doc-card" data-doc-id="${d.id}">
                                        <div class="doc-icon">${this._getIcon(d.tipo)}</div>
                                        <div class="doc-name">${UI.esc(d.nombre)}</div>
                                        <div class="text-muted" style="font-size:0.7rem;">${d.fecha ? DateUtils.format(d.fecha, 'short') : ''}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
                ${docs.length === 0 ? UI.emptyState('Sin documentos. Sube archivos para almacenarlos aquí.') : ''}
            </div>
        `;

        this._bindEvents(container, email);
    },

    _getIcon(type) {
        if (!type) return '📄';
        if (type.startsWith('image/')) return '🖼️';
        if (type.includes('pdf')) return '📕';
        if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return '📊';
        if (type.includes('word') || type.includes('document')) return '📝';
        return '📄';
    },

    _bindEvents(container, email) {
        // Upload
        UI.bindButton('btn-upload-doc', () => {
            UI.showModal(`
                <h3 class="modal-title">Subir Documento</h3>
                <form id="upload-form">
                    ${UI.formGroup('Nombre', UI.input('doc_name', { placeholder: 'Nombre del documento', required: true }))}
                    ${UI.formGroup('Categoría', UI.select('doc_cat', this.categories, '', { required: true }))}
                    ${UI.formGroup('Archivo', '<input type="file" id="doc-file" class="form-input" required>')}
                    <p class="form-hint">Máximo recomendado: 5MB por archivo.</p>
                    <div class="modal-actions">
                        <button type="button" id="btn-upload-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Subir</button>
                    </div>
                </form>
            `, {
                onReady: () => {
                    UI.bindButton('btn-upload-cancel', () => UI.closeModal());
                    const form = document.getElementById('upload-form');
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const name = document.getElementById('input-doc_name').value;
                        const cat = document.getElementById('input-doc_cat').value;
                        const fileInput = document.getElementById('doc-file');
                        const file = fileInput.files[0];

                        if (!file) {
                            UI.toast('Selecciona un archivo', 'error');
                            return;
                        }

                        if (file.size > 10 * 1024 * 1024) {
                            UI.toast('Archivo demasiado grande (máx 10MB)', 'error');
                            return;
                        }

                        try {
                            const base64 = await this._fileToBase64(file);
                            await Storage.saveDocument({
                                id: DateUtils.generateId(),
                                email,
                                nombre: name || file.name,
                                categoria: cat,
                                tipo: file.type,
                                base64data: base64,
                                fecha: DateUtils.today()
                            });
                            UI.closeModal();
                            UI.toast('Documento subido exitosamente', 'success');
                            this.render(container);
                        } catch (err) {
                            UI.toast('Error al subir: ' + err.message, 'error');
                        }
                    });
                }
            });
        });

        // Click document
        container.querySelectorAll('[data-doc-id]').forEach(card => {
            card.addEventListener('click', async () => {
                const id = card.dataset.docId;
                try {
                    const doc = await Storage.idbGet('documentos', id);
                    if (!doc) {
                        UI.toast('Documento no encontrado', 'error');
                        return;
                    }
                    this._showDocPreview(container, email, doc);
                } catch (e) {
                    UI.toast('Error al cargar documento', 'error');
                }
            });
        });

        // Search
        const searchInput = document.getElementById('doc-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase();
                container.querySelectorAll('.doc-card').forEach(card => {
                    const name = card.querySelector('.doc-name')?.textContent?.toLowerCase() || '';
                    card.style.display = name.includes(query) ? '' : 'none';
                });
            });
        }
    },

    _showDocPreview(container, email, doc) {
        let previewHtml = '';
        if (doc.tipo && doc.tipo.startsWith('image/')) {
            previewHtml = `<img src="${doc.base64data}" style="max-width:100%; border-radius: var(--border-radius-sm);">`;
        } else if (doc.tipo && doc.tipo.includes('pdf')) {
            previewHtml = `<p class="text-secondary">Vista previa no disponible para PDF.</p>`;
        } else {
            previewHtml = `<p class="text-secondary">Vista previa no disponible para este tipo de archivo.</p>`;
        }

        UI.showModal(`
            <h3 class="modal-title">${UI.esc(doc.nombre)}</h3>
            <p class="text-secondary mb-md">${doc.categoria} · ${doc.fecha ? DateUtils.format(doc.fecha, 'medium') : ''} · ${doc.tipo || 'Desconocido'}</p>
            ${previewHtml}
            <div class="modal-actions mt-lg">
                <button id="btn-doc-delete" class="btn btn-danger btn-sm">Eliminar</button>
                <button id="btn-doc-download" class="btn btn-primary btn-sm">Descargar</button>
            </div>
        `, {
            size: 'lg',
            onReady: () => {
                UI.bindButton('btn-doc-download', () => {
                    const a = document.createElement('a');
                    a.href = doc.base64data;
                    a.download = doc.nombre;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });

                UI.bindButton('btn-doc-delete', () => {
                    UI.confirm('¿Eliminar este documento?', async () => {
                        await Storage.deleteDocument(doc.id);
                        UI.closeModal();
                        UI.toast('Documento eliminado', 'success');
                        this.render(container);
                    });
                });
            }
        });
    },

    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};

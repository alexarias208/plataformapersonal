/* ============================================
   STORAGE - localStorage + IndexedDB Abstraction
   ============================================ */

const Storage = {
    KEYS: {
        USERS: 'plataforma_users',
        SESSION: 'plataforma_session',
        MODULES_GLOBAL: 'plataforma_modules_global',
        DATA_PREFIX: 'plataforma_data_'
    },

    DB_NAME: 'plataformaDB',
    DB_VERSION: 1,
    _db: null,

    // ==================== localStorage ====================

    _get(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Storage._get error:', key, e);
            return null;
        }
    },

    _set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage._set error:', key, e);
            return false;
        }
    },

    _remove(key) {
        localStorage.removeItem(key);
    },

    // --- Users ---
    getUsers() {
        return this._get(this.KEYS.USERS) || {};
    },

    saveUsers(users) {
        return this._set(this.KEYS.USERS, users);
    },

    getUser(email) {
        const users = this.getUsers();
        return users[email] || null;
    },

    saveUser(email, userData) {
        const users = this.getUsers();
        users[email] = userData;
        return this.saveUsers(users);
    },

    deleteUser(email) {
        const users = this.getUsers();
        delete users[email];
        this.saveUsers(users);
        this._remove(this.KEYS.DATA_PREFIX + email);
    },

    // --- Session ---
    getSession() {
        return this._get(this.KEYS.SESSION);
    },

    setSession(email, managerViewMode = false) {
        return this._set(this.KEYS.SESSION, { email, managerViewMode });
    },

    clearSession() {
        this._remove(this.KEYS.SESSION);
    },

    // --- User Data (isolated per user) ---
    getUserData(email) {
        if (!email) return null;
        return this._get(this.KEYS.DATA_PREFIX + email) || this._defaultUserData();
    },

    saveUserData(email, data) {
        if (!email) return false;
        return this._set(this.KEYS.DATA_PREFIX + email, data);
    },

    _defaultUserData() {
        return {
            finanzas: { ingresos: [], gastos: [], deudas: [] },
            gastosCompartidos: { participantes: [], gastos: [] },
            calendario: { eventos: [] },
            habitos: { lista: [], registros: {} },
            estudios: { ramos: [], pruebas: [] },
            religion: {
                posicionActual: { libro: 0, capitulo: 0, versiculo: 0 },
                favoritos: [],
                reflexiones: {},
                progreso: { versiculosLeidos: 0, totalVersiculos: 0, ultimaLectura: null, versiculosHoy: 0 },
                modoLectura: true
            },
            ciclo: { registros: {}, duracionCiclo: 28, ultimoInicio: null, encuentros: [] },
            ejercicios: { sesiones: [] },
            juegos: {
                palabraDia: { fecha: null, intentos: 0, resuelto: false },
                crucigrama: { mejorTiempo: null, resueltos: 0 },
                sudoku: { mejorTiempo: null, resueltos: 0 },
                historial: []
            },
            prioridadesDia: [],
            enfoqueDia: { texto: '', fecha: '' },
            diario: {
                entradas: {}  // keyed by "YYYY-MM-DD": { texto, calificacion, nota, actividades, creado }
            },
            foda: {
                fortalezas: [],
                oportunidades: [],
                debilidades: [],
                amenazas: [],
                estrategias: []
            },
            registroIntimo: {
                encuentros: []
            }
        };
    },

    // --- Global Modules Config ---
    getModulesGlobal() {
        return this._get(this.KEYS.MODULES_GLOBAL) || this._defaultModulesGlobal();
    },

    saveModulesGlobal(config) {
        return this._set(this.KEYS.MODULES_GLOBAL, config);
    },

    _defaultModulesGlobal() {
        return {
            categoriasGastos: ['Comida', 'Transporte', 'Salud', 'Educación', 'Entretenimiento', 'Servicios', 'Hogar', 'Ropa', 'Otro'],
            categoriasIngresos: ['Salario', 'Freelance', 'Inversiones', 'Otro'],
            tiposEventos: ['General', 'Urgente', 'Hábito', 'Finanza', 'Estudio', 'Ejercicio', 'Salud'],
            opcionesRapidas: ['Ejercicio', 'Leer Biblia', 'Pago Deuda', 'Prueba Estudio', 'Médico']
        };
    },

    // ==================== IndexedDB ====================

    async initDB() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('documentos')) {
                    db.createObjectStore('documentos', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('biblia')) {
                    db.createObjectStore('biblia', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve(this._db);
            };
            request.onerror = (e) => {
                console.error('IndexedDB error:', e);
                reject(e);
            };
        });
    },

    async idbPut(storeName, data) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async idbGet(storeName, key) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async idbGetAll(storeName) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async idbDelete(storeName, key) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    // --- Document helpers ---
    async saveDocument(doc) {
        return this.idbPut('documentos', doc);
    },

    async getDocuments(email) {
        const all = await this.idbGetAll('documentos');
        return all.filter(d => d.email === email);
    },

    async deleteDocument(id) {
        return this.idbDelete('documentos', id);
    },

    // --- Bible helpers ---
    async getBiblia() {
        return this.idbGet('biblia', 'rv1960');
    },

    async saveBiblia(data) {
        return this.idbPut('biblia', { id: 'rv1960', ...data });
    }
};

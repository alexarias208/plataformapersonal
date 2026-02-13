/* ============================================
   ROUTER - Hash-based SPA Router with Guards
   ============================================ */

const Router = {
    routes: {},
    currentRoute: null,

    register(hash, renderFn, options = {}) {
        this.routes[hash] = { render: renderFn, ...options };
    },

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
    },

    navigate(hash) {
        if (hash) {
            window.location.hash = hash;
            return;
        }

        const rawHash = window.location.hash || '#login';
        const route = rawHash.split('?')[0];

        // Auth guard
        if (!Auth.isLoggedIn() && route !== '#login' && route !== '#register') {
            window.location.hash = '#login';
            return;
        }

        // If logged in and trying to access login/register, redirect
        if (Auth.isLoggedIn() && (route === '#login' || route === '#register')) {
            const user = Auth.getCurrentUser();
            if (user.rol === 'manager') {
                window.location.hash = '#manager';
            } else if (!user.configuracionCompleta) {
                window.location.hash = '#setup';
            } else {
                window.location.hash = '#dashboard';
            }
            return;
        }

        // Setup guard: if user hasn't completed setup, force it
        if (Auth.isLoggedIn() && route !== '#setup' && route !== '#login') {
            const user = Auth.getCurrentUser();
            if (user && user.rol !== 'manager' && !user.configuracionCompleta) {
                window.location.hash = '#setup';
                return;
            }
        }

        // Manager guard
        const routeConfig = this.routes[route];
        if (routeConfig && routeConfig.managerOnly && !Auth.isManager()) {
            window.location.hash = '#dashboard';
            return;
        }

        // Module visibility guard (only block if explicitly set to false)
        if (routeConfig && routeConfig.moduleKey) {
            const user = Auth.getCurrentUser();
            if (user && user.perfil && user.perfil.opcionesActivas) {
                if (user.perfil.opcionesActivas[routeConfig.moduleKey] === false) {
                    window.location.hash = '#dashboard';
                    UI.toast('Módulo no activo. Actívalo en tu perfil.', 'warning');
                    return;
                }
            }
        }

        this.currentRoute = route;
        this._render(route);
    },

    _render(route) {
        const routeConfig = this.routes[route];

        // Auth screen (login/register/setup)
        if (route === '#login' || route === '#register' || route === '#setup') {
            document.getElementById('app-shell').classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('hidden');
            if (routeConfig) {
                routeConfig.render(document.getElementById('auth-screen'));
            }
            return;
        }

        // App shell pages
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('auth-screen').innerHTML = '';
        document.getElementById('app-shell').classList.remove('hidden');

        const container = document.getElementById('page-container');
        if (!container) return;

        container.innerHTML = '';
        container.className = 'page-container fade-in';

        // Update sidebar active state
        document.querySelectorAll('.sidebar-menu a').forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === route);
        });

        if (routeConfig) {
            routeConfig.render(container);
        } else {
            container.innerHTML = UI.emptyState('Página no encontrada', '🔍');
        }

        // Scroll to top
        window.scrollTo(0, 0);
    },

    refresh() {
        if (this.currentRoute) {
            this._render(this.currentRoute);
        }
    },

    getParam(key) {
        const hash = window.location.hash;
        const queryPart = hash.split('?')[1];
        if (!queryPart) return null;
        const params = new URLSearchParams(queryPart);
        return params.get(key);
    }
};

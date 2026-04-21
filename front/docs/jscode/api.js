/* ==========================================================================
   UEQO - api.js
   Cliente compartido para hablar con el backend UEQO.
   Carga ANTES que cualquier otro JS en las páginas privadas (mapa, perfil, chat).
   ========================================================================== */

(function () {
    "use strict";

    const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';

    // Claves de localStorage (unificadas para todo el frontend)
    const KEY_TOKEN = 'ueqo_token';
    const KEY_USER_ID = 'benaluma_user_id';
    const KEY_USER_NOMBRE = 'benaluma_user_nombre';

    // ---------- Sesión ----------
    function guardarSesion({ token, usuario }) {
        if (token) localStorage.setItem(KEY_TOKEN, token);
        if (usuario?.id) localStorage.setItem(KEY_USER_ID, usuario.id);
        if (usuario?.nombre) localStorage.setItem(KEY_USER_NOMBRE, usuario.nombre);
    }

    function cerrarSesion() {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_USER_ID);
        localStorage.removeItem(KEY_USER_NOMBRE);
        // Limpiar también estado de chats leídos
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('estado_chats_')) localStorage.removeItem(k);
        });
    }

    function getToken() { return localStorage.getItem(KEY_TOKEN); }
    function getUserId() { return localStorage.getItem(KEY_USER_ID); }
    function getUserNombre() { return localStorage.getItem(KEY_USER_NOMBRE); }
    function estaLogueado() { return !!getToken() && !!getUserId(); }

    // ---------- apiFetch: el wrapper que reemplaza a fetch() para cualquier /api/* ----------
    // Añade el Bearer token automáticamente y redirige al login si la sesión caduca.
    async function apiFetch(path, options = {}) {
        const token = getToken();
        const url = path.startsWith('http') ? path : `${URL_BACKEND}${path}`;

        const headers = Object.assign({}, options.headers || {});
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Solo añadimos Content-Type si hay body y no es FormData (multer necesita el multipart)
        if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        let res;
        try {
            res = await fetch(url, { ...options, headers });
        } catch (err) {
            // Error de red / CORS / server caído
            throw new ApiError('Sin conexión con el servidor', 0, err);
        }

        // 401/403: sesión caducada o sin permisos
        if (res.status === 401 || res.status === 403) {
            // Solo redirigimos en 401 (token caducado). 403 es "autenticado pero no autorizado"
            // → no borramos sesión, solo dejamos que el llamador maneje el error.
            if (res.status === 401) {
                cerrarSesion();
                // Pequeño aviso antes de redirigir (si hay SweetAlert)
                if (typeof Swal !== 'undefined') {
                    try {
                        await Swal.fire({
                            icon: 'warning',
                            title: 'Sesión caducada',
                            text: 'Vuelve a iniciar sesión para continuar.',
                            confirmButtonColor: '#16a34a',
                            confirmButtonText: 'Ir al login',
                            allowOutsideClick: false
                        });
                    } catch { }
                }
                window.location.href = 'login.html';
                // Propagamos el error para cortar cualquier `.then` encadenado
                throw new ApiError('Sesión expirada', 401);
            }
        }

        return res;
    }

    // Helper: apiFetch + res.json() en un paso. Lanza ApiError con mensaje del backend si no es OK.
    async function apiFetchJSON(path, options = {}) {
        const res = await apiFetch(path, options);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(data.error || `Error ${res.status}`, res.status, data);
        return data;
    }

    class ApiError extends Error {
        constructor(message, status = 0, cause = null) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.cause = cause;
        }
    }

    // ---------- Guardia para páginas privadas ----------
    // Úsalo al tope de mapa.js, perfil.js, chat.js: si no hay sesión, redirige al login.
    function requireLogin() {
        if (!estaLogueado()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // ---------- Exponer en window.UEQO ----------
    window.UEQO = {
        URL_BACKEND,
        apiFetch,
        apiFetchJSON,
        guardarSesion,
        cerrarSesion,
        getToken,
        getUserId,
        getUserNombre,
        estaLogueado,
        requireLogin,
        ApiError
    };
})();
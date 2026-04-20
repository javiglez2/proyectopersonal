// ==========================================
// VARIABLES GLOBALES
// ==========================================
const userId = localStorage.getItem('benaluma_user_id');
const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';
let chatActivoId = null;
let tipoChatActivo = null;
let intervaloChat = null;
let intervaloLista = null;

const STORAGE_KEY = 'estado_chats_' + userId;

if (!userId) {
    window.location.href = 'login.html';
}

// ==========================================
// HELPERS
// ==========================================
// Escapa HTML para evitar XSS cuando se pinta texto de usuario con innerHTML.
// Esto es crítico aquí: los mensajes del chat los escribe cualquier usuario.
function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function urlAvatarFallback(nombre) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || '?')}&background=1a2e25&color=4ade80`;
}

// Wrapper de fetch que detecta sesión expirada y redirige al login.
// Antes una sesión caducada provocaba errores silenciosos en el catch: el usuario
// se quedaba viendo la lista vacía sin entender qué pasaba.
async function fetchConAuth(url, opts = {}) {
    const res = await fetch(url, opts);
    if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        await Swal.fire({
            icon: 'warning',
            title: 'Sesión caducada',
            text: 'Vuelve a iniciar sesión para seguir chateando.',
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Ir al login'
        }).catch(() => { });
        window.location.href = 'login.html';
        throw new Error('Sesión expirada');
    }
    return res;
}

// SweetAlert puede no estar cargado en chat.html actualmente. Fallback con alert nativo.
// (Si quieres, en la Tanda 3 añadimos el <script> de SweetAlert a chat.html para alertas bonitas.)
const Swal = window.Swal || {
    fire: (opts) => { alert((opts.title || '') + '\n' + (opts.text || '')); return Promise.resolve({ isConfirmed: true }); }
};

// ==========================================
// HELPERS DE ESTADO (leído / no leído)
// ==========================================
function getEstado() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
}
function setEstado(obj) { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }
function marcarLeido(idChat, ultimoMensaje) {
    const e = getEstado(); e[String(idChat)] = ultimoMensaje; setEstado(e);
}
function estaNoLeido(idChat, ultimoMensaje) {
    return getEstado()[String(idChat)] !== ultimoMensaje;
}

// ==========================================
// 1. CARGAR LA LISTA DE CHATS UNIFICADA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarListaDeChats();
    iniciarPollingLista();
});

async function cargarListaDeChats() {
    const listaDiv = document.getElementById('lista-conversaciones');
    listaDiv.innerHTML = '<p style="text-align:center; padding:20px; color:#8b949e;">Cargando tus chats...</p>';

    try {
        const resViajes = await fetchConAuth(`${URL_BACKEND}/api/mis-viajes/${userId}`);
        const viajes = resViajes.ok ? await resViajes.json() : [];
        const resPrivados = await fetchConAuth(`${URL_BACKEND}/api/inbox/${userId}`);
        const privados = resPrivados.ok ? await resPrivados.json() : [];

        listaDiv.innerHTML = '';

        if (viajes.length === 0 && privados.length === 0) {
            listaDiv.innerHTML = `<p style="text-align:center; color:#9ca3af; padding:20px;">No tienes conversaciones aún.</p>`;
            return;
        }

        const todosLosChats = [
            ...viajes.map(v => ({
                idOriginal: v.id, tipo: 'grupal',
                nombre: `Viaje a ${v.destino || ''}`,
                sub: 'Grupo del viaje',
                foto: 'fotos/fotogrupo2.png'
            })),
            ...privados.map(p => ({
                idOriginal: p.usuario.id, tipo: 'privado',
                nombre: p.usuario.nombre || 'Usuario',
                sub: p.ultimoMensaje || 'Chat privado',
                foto: p.usuario.avatar_url || urlAvatarFallback(p.usuario.nombre)
            }))
        ];

        todosLosChats.forEach(c => {
            const noLeido = estaNoLeido(c.idOriginal, c.sub);
            const div = document.createElement('div');
            div.className = 'contacto-item';
            div.id = `chat-item-${c.tipo}-${c.idOriginal}`;
            // 🔒 Pasamos los valores crudos a abrirChat (innerText los tratará como texto plano)
            div.onclick = () => abrirChat(c.idOriginal, c.tipo, c.nombre);
            // 🔒 TODAS las strings de usuario pasan por escapeHTML antes de ir al innerHTML
            div.innerHTML = `
                <img src="${escapeHTML(c.foto)}" alt="perfil" onerror="this.src='${urlAvatarFallback('?')}'">
                <div class="contacto-info">
                    <strong>${escapeHTML(c.nombre)}</strong>
                    <span class="ultimo-mensaje-txt">${escapeHTML(c.sub)}</span>
                </div>
                <div class="badge-chat ${noLeido ? 'activo' : ''}" id="badge-chat-item-${c.tipo}-${c.idOriginal}">${noLeido ? '1' : ''}</div>
            `;
            listaDiv.appendChild(div);
        });

        // --- Leer la URL para abrir un chat privado automáticamente ---
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('userId');
        const targetUserName = urlParams.get('userName');  // 🔒 Valor crudo, se escapa al usarlo

        if (targetUserId && targetUserName) {
            const idElemento = `chat-item-privado-${targetUserId}`;
            let item = document.getElementById(idElemento);

            if (item) {
                const nombreEl = item.querySelector('strong');
                if (nombreEl) nombreEl.innerText = targetUserName; // innerText es seguro (no parsea HTML)
            } else {
                item = document.createElement('div');
                item.className = 'contacto-item';
                item.id = idElemento;
                item.onclick = () => abrirChat(targetUserId, 'privado', targetUserName);
                // 🔒 encodeURIComponent para la URL del avatar + escapeHTML para el <strong>
                item.innerHTML = `
                    <img src="${urlAvatarFallback(targetUserName)}" alt="perfil">
                    <div class="contacto-info">
                        <strong>${escapeHTML(targetUserName)}</strong>
                        <span class="ultimo-mensaje-txt">Empieza a escribir...</span>
                    </div>
                    <div class="badge-chat" id="badge-${idElemento}"></div>
                `;
                listaDiv.prepend(item);
            }

            abrirChat(targetUserId, 'privado', targetUserName);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

    } catch (error) {
        if (error.message !== 'Sesión expirada') {
            console.error(error);
            listaDiv.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px;">Error al cargar los chats. <button onclick="cargarListaDeChats()" style="margin-left:8px; background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">Reintentar</button></p>`;
        }
    }
}

// ==========================================
// 2. ABRIR UN CHAT
// ==========================================
window.abrirChat = function (idChat, tipoChat, tituloChat) {
    chatActivoId = String(idChat);
    tipoChatActivo = tipoChat;

    const lista = document.getElementById('lista-conversaciones');
    const itemClickado = document.getElementById(`chat-item-${tipoChat}-${idChat}`);

    document.querySelectorAll('.contacto-item').forEach(el => el.classList.remove('activo'));
    document.querySelector('.chat-card').classList.add('chat-activo');

    if (itemClickado) {
        lista.prepend(itemClickado);
        itemClickado.classList.add('activo');

        const spanTexto = itemClickado.querySelector('.ultimo-mensaje-txt');
        const ultimoMsg = spanTexto ? spanTexto.innerText : '';
        marcarLeido(idChat, ultimoMsg);

        const badge = itemClickado.querySelector('.badge-chat');
        if (badge) { badge.classList.remove('activo'); badge.innerText = ''; }
    }

    const cabecera = document.getElementById('chat-header-dinamico');
    cabecera.style.display = 'flex';
    // 🔒 innerText en vez de innerHTML: el título no puede ejecutar HTML/JS aunque venga de la URL
    document.getElementById('nombre-chat-actual').innerText = tituloChat;

    const msgBienvenida = document.querySelector('.mensaje-bienvenida');
    if (msgBienvenida) msgBienvenida.style.display = 'none';
    document.getElementById('form-enviar-mensaje').classList.remove('oculto');

    document.getElementById('historial-mensajes').innerHTML = '<p style="text-align:center; color:#9ca3af; margin-top: 20px;">Cargando mensajes...</p>';

    if (intervaloChat) clearInterval(intervaloChat);
    cargarMensajesActivos();
    intervaloChat = setInterval(cargarMensajesActivos, 2500);
};

// ==========================================
// 3. CARGAR LOS MENSAJES DEL CHAT ACTIVO
// ==========================================
async function cargarMensajesActivos() {
    if (!chatActivoId) return;
    const historial = document.getElementById('historial-mensajes');

    try {
        const url = (tipoChatActivo === 'grupal')
            ? `${URL_BACKEND}/api/mensajes/${chatActivoId}`
            : `${URL_BACKEND}/api/mensajes-privados/${userId}/${chatActivoId}`;

        const res = await fetchConAuth(url);
        const mensajes = await res.json();

        if (mensajes.length === 0) {
            historial.innerHTML = `<p style="text-align:center; color:#9ca3af; margin-top:20px;">No hay mensajes aún. ¡Di hola! 👋</p>`;
            return;
        }

        const estaAlFinal = historial.scrollHeight - historial.scrollTop <= historial.clientHeight + 50;
        let htmlMensajes = '';

        mensajes.forEach(msg => {
            const horaRaw = new Date(msg.creado_en || msg.fecha || new Date());
            const hora = horaRaw.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            let esMio, nombre, avatar, textoMsg;

            if (tipoChatActivo === 'grupal') {
                esMio = String(msg.id_usuario) === String(userId);
                nombre = msg.usuarios?.nombre || 'Usuario';
                avatar = msg.usuarios?.avatar_url || urlAvatarFallback(nombre);
                textoMsg = msg.mensaje;
            } else {
                esMio = String(msg.id_emisor) === String(userId);
                nombre = esMio ? 'Tú' : (msg.emisor?.nombre || 'Usuario');
                avatar = msg.emisor?.avatar_url || urlAvatarFallback(nombre);
                textoMsg = msg.mensaje;
            }

            // 🔒🔒🔒 CRÍTICO: escapar el texto del mensaje antes de insertarlo.
            // Antes esto permitía a cualquiera inyectar <script>, <img onerror>, etc. en el chat.
            const textoSeguro = escapeHTML(textoMsg);
            const nombreSeguro = escapeHTML(nombre);
            const avatarSeguro = escapeHTML(avatar);

            if (esMio) {
                htmlMensajes += `
                    <div class="burbuja mia">
                        ${textoSeguro}
                        <span style="display:block; font-size:10px; text-align:right; margin-top:5px; opacity:0.7;">${hora}</span>
                    </div>`;
            } else {
                htmlMensajes += `
                    <div style="display:flex; gap:8px; align-items:flex-end; align-self:flex-start; margin-bottom:10px; max-width:75%;">
                        <img src="${avatarSeguro}" alt="" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.1);" onerror="this.src='${urlAvatarFallback('?')}'">
                        <div class="burbuja otra" style="max-width:100%; margin-bottom:0;">
                            ${tipoChatActivo === 'grupal' ? `<strong style="font-size:11px; display:block; margin-bottom:4px; color:#4ade80;">${nombreSeguro}</strong>` : ''}
                            ${textoSeguro}
                            <span style="display:block; font-size:10px; text-align:right; margin-top:5px; opacity:0.7;">${hora}</span>
                        </div>
                    </div>`;
            }
        });

        historial.innerHTML = htmlMensajes;
        if (estaAlFinal) historial.scrollTop = historial.scrollHeight;

        const ultimoMsg = mensajes[mensajes.length - 1].mensaje;
        marcarLeido(chatActivoId, ultimoMsg);
        const spanActivo = document.querySelector(`#chat-item-${tipoChatActivo}-${chatActivoId} .ultimo-mensaje-txt`);
        if (spanActivo) spanActivo.innerText = ultimoMsg; // innerText es seguro

    } catch (e) {
        if (e.message === 'Sesión expirada') return;
        console.error("Error pintando mensajes:", e);
        if (historial.children.length === 0 || historial.innerHTML.includes('Cargando')) {
            historial.innerHTML = `<p style="color:#ef4444; text-align:center; margin-top:20px;">Error al cargar mensajes.</p>`;
        }
    }
}

// ==========================================
// 4. ENVIAR UN MENSAJE
// ==========================================
document.getElementById('form-enviar-mensaje').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('input-mensaje');
    const btn = e.target.querySelector('button[type="submit"]');
    const texto = input.value.trim();
    if (!texto || !chatActivoId) return;

    // 🛡️ Prevenir doble envío
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;
    input.value = '';
    input.disabled = true;

    try {
        const url = tipoChatActivo === 'grupal' ? `${URL_BACKEND}/api/mensajes` : `${URL_BACKEND}/api/mensajes-privados`;
        const bodyData = tipoChatActivo === 'grupal'
            ? { id_viaje: chatActivoId, id_usuario: userId, mensaje: texto }
            : { id_emisor: userId, id_receptor: chatActivoId, mensaje: texto };

        const res = await fetchConAuth(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        if (res.ok) {
            await cargarMensajesActivos();
            setTimeout(() => {
                const h = document.getElementById('historial-mensajes');
                h.scrollTop = h.scrollHeight;
            }, 50);
        } else {
            // Si falla, devolvemos el texto al input para que el usuario no lo pierda
            input.value = texto;
        }
    } catch (err) {
        if (err.message !== 'Sesión expirada') {
            console.error("Error al enviar", err);
            input.value = texto; // restaurar
        }
    } finally {
        if (btn) btn.disabled = false;
        input.disabled = false;
        input.focus();
    }
});

// ==========================================
// 5. VIGILANTE SILENCIOSO DE NUEVOS MENSAJES
// ==========================================
async function actualizarListaSilenciosa() {
    if (!userId) return;
    try {
        const resViajes = await fetchConAuth(`${URL_BACKEND}/api/mis-viajes/${userId}`);
        const viajes = resViajes.ok ? await resViajes.json() : [];
        const resPrivados = await fetchConAuth(`${URL_BACKEND}/api/inbox/${userId}`);
        const privados = resPrivados.ok ? await resPrivados.json() : [];

        const todos = [
            ...viajes.map(v => ({ idOriginal: v.id, tipo: 'grupal', sub: 'Grupo del viaje' })),
            ...privados.map(p => ({ idOriginal: p.usuario.id, tipo: 'privado', sub: p.ultimoMensaje || 'Chat privado' }))
        ];

        const lista = document.getElementById('lista-conversaciones');

        todos.forEach(c => {
            const item = document.getElementById(`chat-item-${c.tipo}-${c.idOriginal}`);
            if (!item) return;

            const spanTexto = item.querySelector('.ultimo-mensaje-txt');
            const textoActual = spanTexto ? spanTexto.innerText : '';
            if (textoActual === c.sub) return;

            if (spanTexto) spanTexto.innerText = c.sub; // innerText es seguro
            lista.prepend(item);

            const esElChatAbierto = chatActivoId === String(c.idOriginal);
            if (!esElChatAbierto) {
                const badge = item.querySelector('.badge-chat');
                if (badge) {
                    badge.classList.add('activo');
                    const n = parseInt(badge.innerText) || 0;
                    badge.innerText = n + 1;
                }
            } else {
                marcarLeido(c.idOriginal, c.sub);
            }
        });
    } catch (e) {
        // Silenciado (excepto la sesión expirada, que la gestiona fetchConAuth)
    }
}

// ==========================================
// 6. CERRAR CHAT EN MÓVIL (VOLVER A LA LISTA)
// ==========================================
window.cerrarChatMovil = function () {
    const chatCard = document.querySelector('.chat-card');
    if (chatCard) chatCard.classList.remove('chat-activo');

    chatActivoId = null;
    tipoChatActivo = null;

    if (intervaloChat) {
        clearInterval(intervaloChat);
        intervaloChat = null;
    }
};

// ==========================================
// 🔋 GESTIÓN DE POLLING (pausa en segundo plano)
// ==========================================
// Antes los intervalos corrían eternamente cada 2.5s y 4s aunque la pestaña estuviera
// oculta. Eso gasta batería del móvil, datos, y tira del free tier de Render sin necesidad.
function iniciarPollingLista() {
    if (intervaloLista) return;
    intervaloLista = setInterval(actualizarListaSilenciosa, 4000);
}

function pararPollingLista() {
    if (intervaloLista) {
        clearInterval(intervaloLista);
        intervaloLista = null;
    }
}

function pararPollingChat() {
    if (intervaloChat) {
        clearInterval(intervaloChat);
        intervaloChat = null;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        pararPollingLista();
        pararPollingChat();
    } else {
        // Al volver a la pestaña: refrescamos de inmediato y reanudamos el polling
        actualizarListaSilenciosa();
        iniciarPollingLista();
        if (chatActivoId) {
            cargarMensajesActivos();
            intervaloChat = setInterval(cargarMensajesActivos, 2500);
        }
    }
});

// Limpiar intervalos al salir de la página (evita fugas)
window.addEventListener('beforeunload', () => {
    pararPollingLista();
    pararPollingChat();
});
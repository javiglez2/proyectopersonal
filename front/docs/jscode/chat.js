// ==========================================
// UEQO - chat.js (v3, con JWT)
// ==========================================

if (!window.UEQO?.requireLogin()) throw new Error('No autenticado');

const userId = window.UEQO.getUserId();
let chatActivoId = null;
let tipoChatActivo = null;
let intervaloChat = null;
let intervaloLista = null;

const STORAGE_KEY = 'estado_chats_' + userId;

// ==========================================
// HELPERS
// ==========================================
function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function urlAvatarFallback(nombre) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || '?')}&background=1a2e25&color=4ade80`;
}

const SwalSafe = window.Swal || {
    fire: (opts) => { alert((opts.title || '') + '\n' + (opts.text || '')); return Promise.resolve({ isConfirmed: true }); }
};

// ==========================================
// ESTADO leído/no leído (localStorage)
// ==========================================
function getEstado() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
function setEstado(obj) { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }
function marcarLeido(idChat, ultimoMensaje) { const e = getEstado(); e[String(idChat)] = ultimoMensaje; setEstado(e); }
function estaNoLeido(idChat, ultimoMensaje) { return getEstado()[String(idChat)] !== ultimoMensaje; }

// ==========================================
// 1. LISTA DE CHATS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarListaDeChats();
    iniciarPollingLista();
});

async function cargarListaDeChats() {
    const listaDiv = document.getElementById('lista-conversaciones');
    listaDiv.innerHTML = '<p style="text-align:center; padding:20px; color:#8b949e;">Cargando tus chats...</p>';

    try {
        const [viajes, privados] = await Promise.all([
            window.UEQO.apiFetchJSON(`/api/mis-viajes/${userId}`).catch(() => []),
            window.UEQO.apiFetchJSON(`/api/inbox/${userId}`).catch(() => [])
        ]);

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
            div.onclick = () => abrirChat(c.idOriginal, c.tipo, c.nombre);
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

        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('userId');
        const targetUserName = urlParams.get('userName');

        if (targetUserId && targetUserName) {
            const idElemento = `chat-item-privado-${targetUserId}`;
            let item = document.getElementById(idElemento);

            if (item) {
                const nombreEl = item.querySelector('strong');
                if (nombreEl) nombreEl.innerText = targetUserName;
            } else {
                item = document.createElement('div');
                item.className = 'contacto-item';
                item.id = idElemento;
                item.onclick = () => abrirChat(targetUserId, 'privado', targetUserName);
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
        if (error?.status === 401) return;
        console.error(error);
        listaDiv.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px;">Error al cargar los chats. <button onclick="cargarListaDeChats()" style="margin-left:8px; background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">Reintentar</button></p>`;
    }
}

// ==========================================
// 2. ABRIR CHAT
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
// 3. CARGAR MENSAJES
// ==========================================
async function cargarMensajesActivos() {
    if (!chatActivoId) return;
    const historial = document.getElementById('historial-mensajes');

    try {
        const path = (tipoChatActivo === 'grupal')
            ? `/api/mensajes/${chatActivoId}`
            : `/api/mensajes-privados/${userId}/${chatActivoId}`;

        const mensajes = await window.UEQO.apiFetchJSON(path);

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
        if (spanActivo) spanActivo.innerText = ultimoMsg;

    } catch (e) {
        if (e?.status === 401) return;
        console.error("Error pintando mensajes:", e);
        if (historial.children.length === 0 || historial.innerHTML.includes('Cargando')) {
            historial.innerHTML = `<p style="color:#ef4444; text-align:center; margin-top:20px;">Error al cargar mensajes.</p>`;
        }
    }
}

// ==========================================
// 4. ENVIAR MENSAJE
// ==========================================
document.getElementById('form-enviar-mensaje').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('input-mensaje');
    const btn = e.target.querySelector('button[type="submit"]');
    const texto = input.value.trim();
    if (!texto || !chatActivoId) return;

    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;
    input.value = '';
    input.disabled = true;

    try {
        // 🔑 Ya NO mandamos id_usuario / id_emisor — el backend lo saca del token
        const path = tipoChatActivo === 'grupal' ? '/api/mensajes' : '/api/mensajes-privados';
        const bodyData = tipoChatActivo === 'grupal'
            ? { id_viaje: chatActivoId, mensaje: texto }
            : { id_receptor: chatActivoId, mensaje: texto };

        await window.UEQO.apiFetchJSON(path, {
            method: 'POST',
            body: JSON.stringify(bodyData)
        });

        await cargarMensajesActivos();
        setTimeout(() => {
            const h = document.getElementById('historial-mensajes');
            h.scrollTop = h.scrollHeight;
        }, 50);
    } catch (err) {
        if (err?.status === 401) return;
        console.error("Error al enviar", err);
        input.value = texto;
        if (err?.status === 429) {
            SwalSafe.fire({ icon: 'warning', title: 'Espera un momento', text: 'Estás enviando demasiado rápido.', confirmButtonColor: '#16a34a' });
        }
    } finally {
        if (btn) btn.disabled = false;
        input.disabled = false;
        input.focus();
    }
});

// ==========================================
// 5. POLLING SILENCIOSO DE LA LISTA
// ==========================================
async function actualizarListaSilenciosa() {
    if (!userId) return;
    try {
        const [viajes, privados] = await Promise.all([
            window.UEQO.apiFetchJSON(`/api/mis-viajes/${userId}`).catch(() => []),
            window.UEQO.apiFetchJSON(`/api/inbox/${userId}`).catch(() => [])
        ]);

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

            if (spanTexto) spanTexto.innerText = c.sub;
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
    } catch { /* silenciado */ }
}

// ==========================================
// 6. CERRAR CHAT MÓVIL
// ==========================================
window.cerrarChatMovil = function () {
    const chatCard = document.querySelector('.chat-card');
    if (chatCard) chatCard.classList.remove('chat-activo');
    chatActivoId = null;
    tipoChatActivo = null;
    if (intervaloChat) { clearInterval(intervaloChat); intervaloChat = null; }
};

// ==========================================
// 7. POLLING CON PAUSA EN VISIBILITYCHANGE
// ==========================================
function iniciarPollingLista() {
    if (intervaloLista) return;
    intervaloLista = setInterval(actualizarListaSilenciosa, 4000);
}
function pararPollingLista() { if (intervaloLista) { clearInterval(intervaloLista); intervaloLista = null; } }
function pararPollingChat() { if (intervaloChat) { clearInterval(intervaloChat); intervaloChat = null; } }

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        pararPollingLista(); pararPollingChat();
    } else {
        actualizarListaSilenciosa();
        iniciarPollingLista();
        if (chatActivoId) {
            cargarMensajesActivos();
            intervaloChat = setInterval(cargarMensajesActivos, 2500);
        }
    }
});

window.addEventListener('beforeunload', () => { pararPollingLista(); pararPollingChat(); });
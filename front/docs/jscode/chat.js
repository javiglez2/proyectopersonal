// ==========================================
// VARIABLES GLOBALES
// ==========================================
const userId = localStorage.getItem('benaluma_user_id');
const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';
let chatActivoId = null;
let tipoChatActivo = null;
let intervaloChat = null;

const STORAGE_KEY = 'estado_chats_' + userId;

if (!userId) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', cargarListaDeChats);

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
async function cargarListaDeChats() {
    const listaDiv = document.getElementById('lista-conversaciones');
    listaDiv.innerHTML = '<p style="text-align:center; padding:20px; color:#8b949e;">Cargando tus chats...</p>';

    try {
        const resViajes = await fetch(`${URL_BACKEND}/api/mis-viajes/${userId}`);
        const viajes = resViajes.ok ? await resViajes.json() : [];
        const resPrivados = await fetch(`${URL_BACKEND}/api/inbox/${userId}`);
        const privados = resPrivados.ok ? await resPrivados.json() : [];

        listaDiv.innerHTML = '';

        if (viajes.length === 0 && privados.length === 0) {
            listaDiv.innerHTML = `<p style="text-align:center; color:#9ca3af; padding:20px;">No tienes conversaciones aún.</p>`;
            return;
        }

        const todosLosChats = [
            ...viajes.map(v => ({
                idOriginal: v.id, tipo: 'grupal',
                nombre: `Viaje a ${v.destino}`,
                sub: 'Grupo del viaje',
                foto: 'fotos/fotogrupo2.png'
            })),
            ...privados.map(p => ({
                idOriginal: p.usuario.id, tipo: 'privado',
                nombre: p.usuario.nombre,
                sub: p.ultimoMensaje || 'Chat privado',
                foto: p.usuario.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.usuario.nombre)}&background=1a2e25&color=4ade80`
            }))
        ];

        todosLosChats.forEach(c => {
            const noLeido = estaNoLeido(c.idOriginal, c.sub);
            const div = document.createElement('div');
            div.className = 'contacto-item';
            div.id = `chat-item-${c.tipo}-${c.idOriginal}`;
            div.onclick = () => abrirChat(c.idOriginal, c.tipo, c.nombre);
            div.innerHTML = `
                <img src="${c.foto}" alt="perfil" onerror="this.src='https://ui-avatars.com/api/?name=?&background=1a2e25&color=4ade80'">
                <div class="contacto-info">
                    <strong>${c.nombre}</strong>
                    <span class="ultimo-mensaje-txt">${c.sub}</span>
                </div>
                <div class="badge-chat ${noLeido ? 'activo' : ''}" id="badge-chat-item-${c.tipo}-${c.idOriginal}">${noLeido ? '1' : ''}</div>
            `;
            listaDiv.appendChild(div);
        });

        // --- NUEVO: Leer la URL para abrir un chat privado automáticamente ---
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('userId');
        const targetUserName = urlParams.get('userName');

        if (targetUserId && targetUserName) {
            const idElemento = `chat-item-privado-${targetUserId}`;
            let item = document.getElementById(idElemento);

            // Si ya tenías un chat con él en la lista, actualizamos su nombre visual
            if (item) {
                const nombreEl = item.querySelector('strong');
                if (nombreEl) nombreEl.innerText = targetUserName;
            } else {
                // Si nunca habéis hablado, le creamos la tarjeta temporalmente en la lista
                item = document.createElement('div');
                item.className = 'contacto-item';
                item.id = idElemento;
                item.onclick = () => abrirChat(targetUserId, 'privado', targetUserName);
                item.innerHTML = `
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(targetUserName)}&background=1a2e25&color=4ade80" alt="perfil">
                    <div class="contacto-info">
                        <strong>${targetUserName}</strong>
                        <span class="ultimo-mensaje-txt">Empieza a escribir...</span>
                    </div>
                    <div class="badge-chat" id="badge-${idElemento}"></div>
                `;
                listaDiv.prepend(item);
            }

            // Forzamos a que se abra ese chat al instante
            abrirChat(targetUserId, 'privado', targetUserName);

            // Limpiamos la URL silenciosamente para que al recargar la página con F5 no se vuelva a ejecutar
            window.history.replaceState({}, document.title, window.location.pathname);
        }

    } catch (error) {
        console.error(error);
        listaDiv.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px;">Error al cargar los chats.</p>`;
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
        lista.prepend(itemClickado); // Mover al tope
        itemClickado.classList.add('activo');

        // Marcar como leído
        const spanTexto = itemClickado.querySelector('.ultimo-mensaje-txt');
        const ultimoMsg = spanTexto ? spanTexto.innerText : '';
        marcarLeido(idChat, ultimoMsg);

        // Quitar badge
        const badge = itemClickado.querySelector('.badge-chat');
        if (badge) { badge.classList.remove('activo'); badge.innerText = ''; }
    }

    // Mostrar cabecera y nombre
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
// 3. CARGAR LOS MENSAJES DEL CHAT ACTIVO
// ==========================================
async function cargarMensajesActivos() {
    if (!chatActivoId) return;
    const historial = document.getElementById('historial-mensajes');

    try {
        const url = (tipoChatActivo === 'grupal')
            ? `${URL_BACKEND}/api/mensajes/${chatActivoId}`
            : `${URL_BACKEND}/api/mensajes-privados/${userId}/${chatActivoId}`;

        const res = await fetch(url);
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
                avatar = msg.usuarios?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=1a2e25&color=4ade80`;
                textoMsg = msg.mensaje;
            } else {
                esMio = String(msg.id_emisor) === String(userId);
                nombre = esMio ? 'Tú' : (msg.emisor?.nombre || 'Usuario');
                avatar = msg.emisor?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=1a2e25&color=4ade80`;
                textoMsg = msg.mensaje;
            }

            if (esMio) {
                htmlMensajes += `
                    <div class="burbuja mia">
                        ${textoMsg}
                        <span style="display:block; font-size:10px; text-align:right; margin-top:5px; opacity:0.7;">${hora}</span>
                    </div>`;
            } else {
                htmlMensajes += `
                    <div style="display:flex; gap:8px; align-items:flex-end; align-self:flex-start; margin-bottom:10px; max-width:75%;">
                        <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.1);" onerror="this.src='https://ui-avatars.com/api/?name=?&background=1a2e25&color=4ade80'">
                        <div class="burbuja otra" style="max-width:100%; margin-bottom:0;">
                            ${tipoChatActivo === 'grupal' ? `<strong style="font-size:11px; display:block; margin-bottom:4px; color:#4ade80;">${nombre}</strong>` : ''}
                            ${textoMsg}
                            <span style="display:block; font-size:10px; text-align:right; margin-top:5px; opacity:0.7;">${hora}</span>
                        </div>
                    </div>`;
            }
        });

        historial.innerHTML = htmlMensajes;
        if (estaAlFinal) historial.scrollTop = historial.scrollHeight;

        // Marcar como leído el último mensaje del chat activo
        const ultimoMsg = mensajes[mensajes.length - 1].mensaje;
        marcarLeido(chatActivoId, ultimoMsg);
        const spanActivo = document.querySelector(`#chat-item-${tipoChatActivo}-${chatActivoId} .ultimo-mensaje-txt`);
        if (spanActivo) spanActivo.innerText = ultimoMsg;

    } catch (e) {
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
    const texto = input.value.trim();
    if (!texto || !chatActivoId) return;
    input.value = '';

    try {
        const url = tipoChatActivo === 'grupal' ? `${URL_BACKEND}/api/mensajes` : `${URL_BACKEND}/api/mensajes-privados`;
        const bodyData = tipoChatActivo === 'grupal'
            ? { id_viaje: chatActivoId, id_usuario: userId, mensaje: texto }
            : { id_emisor: userId, id_receptor: chatActivoId, mensaje: texto };

        const res = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        if (res.ok) {
            await cargarMensajesActivos();
            setTimeout(() => {
                const h = document.getElementById('historial-mensajes');
                h.scrollTop = h.scrollHeight;
            }, 50);
        }
    } catch (e) { console.error("Error al enviar", e); }
});

// ==========================================
// 5. VIGILANTE SILENCIOSO DE NUEVOS MENSAJES
// ==========================================
setInterval(actualizarListaSilenciosa, 4000);

async function actualizarListaSilenciosa() {
    if (!userId) return;
    try {
        const resViajes = await fetch(`${URL_BACKEND}/api/mis-viajes/${userId}`);
        const viajes = resViajes.ok ? await resViajes.json() : [];
        const resPrivados = await fetch(`${URL_BACKEND}/api/inbox/${userId}`);
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
            if (textoActual === c.sub) return; // Sin cambios

            if (spanTexto) spanTexto.innerText = c.sub;
            lista.prepend(item); // Subir al tope

            const esElChatAbierto = chatActivoId === String(c.idOriginal);
            if (!esElChatAbierto) {
                // Incrementar badge
                const badge = item.querySelector('.badge-chat');
                if (badge) {
                    badge.classList.add('activo');
                    const n = parseInt(badge.innerText) || 0;
                    badge.innerText = n + 1;
                }
            } else {
                // Ya lo estamos viendo, marcar leído
                marcarLeido(c.idOriginal, c.sub);
            }
        });
    } catch (e) { /* silenciado */ }
}

// ==========================================
// 6. CERRAR CHAT EN MÓVIL (VOLVER A LA LISTA)
// ==========================================
window.cerrarChatMovil = function() {
    // Quitamos la clase que muestra el chat a pantalla completa
    const chatCard = document.querySelector('.chat-card');
    if (chatCard) {
        chatCard.classList.remove('chat-activo');
    }
    
    // Dejamos de pedir los mensajes de ese chat al servidor constantemente 
    // para ahorrar datos y batería cuando estamos viendo la lista
    chatActivoId = null;
    tipoChatActivo = null;
    
    if (intervaloChat) {
        clearInterval(intervaloChat);
    }
};
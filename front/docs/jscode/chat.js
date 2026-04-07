// ==========================================
// VARIABLES GLOBALES
// ==========================================
const userId = localStorage.getItem('benaluma_user_id');
const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';
let chatActivoId = null;
let tipoChatActivo = null;
let intervaloChat = null;

if (!userId) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', cargarListaDeChats);

// ==========================================
// 1. CARGAR LA LISTA DE CHATS UNIFICADA
// ==========================================
async function cargarListaDeChats() {
    const listaDiv = document.getElementById('lista-conversaciones');
    listaDiv.innerHTML = '<p class="cargando" style="text-align:center; padding:20px; color:#8b949e;">Cargando tus chats...</p>';

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

        // Unificamos todo en un solo array (mezclados)
        let todosLosChats = [
            ...viajes.map(v => ({
                idOriginal: v.id,
                tipo: 'grupal',
                nombre: `Viaje a ${v.destino}`,
                sub: 'Grupo del viaje',
                foto: 'fotos/fotogrupo2.png' // Icono coche/mapa para viajes
            })),
            ...privados.map(p => ({
                idOriginal: p.usuario.id,
                tipo: 'privado',
                nombre: p.usuario.nombre,
                sub: p.ultimoMensaje || 'Chat privado',
                foto: p.usuario.avatar_url || `https://ui-avatars.com/api/?name=${p.usuario.nombre}&background=1a2e25&color=4ade80`
            }))
        ];

        // Renderizar la lista unificada
        // Renderizar la lista unificada
        todosLosChats.forEach(c => {
            const idElemento = `chat-item-${c.tipo}-${c.idOriginal}`;

            listaDiv.innerHTML += `
                <div class="contacto-item" id="${idElemento}" onclick="abrirChat('${c.idOriginal}', '${c.tipo}', '${c.nombre}')">
                    <img src="${c.foto}" alt="perfil">
                    <div class="contacto-info">
                        <strong>${c.nombre}</strong>
                        <span class="ultimo-mensaje-txt">${c.sub}</span> </div>
                    <div class="badge-chat" id="badge-${idElemento}">0</div>
            `;
        });

    } catch (error) {
        console.error(error);
        listaDiv.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px;">Error al cargar los chats.</p>`;
    }
}

// ==========================================
// 2. ABRIR UN CHAT Y MOVERLO ARRIBA
// ==========================================
window.abrirChat = function (idChat, tipoChat, tituloChat) {
    chatActivoId = idChat;
    tipoChatActivo = tipoChat;

    // 1. Marcar como activo y mover arriba (Prepend)
    const lista = document.getElementById('lista-conversaciones');
    const itemClickado = document.getElementById(`chat-item-${tipoChat}-${idChat}`);

    document.querySelectorAll('.contacto-item').forEach(el => el.classList.remove('activo'));

    if (itemClickado) {
        itemClickado.classList.add('activo');
        // Ocultar notificación si la tenía
        const badge = itemClickado.querySelector('.badge-chat');
        if (badge) {
            badge.classList.remove('activo');
            badge.innerText = '0';
        }
        const spanTexto = itemClickado.querySelector('.ultimo-mensaje-txt') || itemClickado.querySelector('.contacto-info span');
        if (spanTexto) {
            let estadoGuardado = JSON.parse(localStorage.getItem('estado_chats_' + userId)) || {};
            estadoGuardado[idChat] = spanTexto.innerText;
            localStorage.setItem('estado_chats_' + userId, JSON.stringify(estadoGuardado));
        }
    }

    // 2. Mostrar la cabecera fija y poner el nombre
    const cabecera = document.getElementById('chat-header-dinamico');
    cabecera.style.display = 'flex';
    document.getElementById('nombre-chat-actual').innerText = tituloChat;

    // 3. FIX: Ocultar mensaje de bienvenida SIN dar error si ya no existe
    const msgBienvenida = document.querySelector('.mensaje-bienvenida');
    if (msgBienvenida) {
        msgBienvenida.style.display = 'none';
    }

    document.getElementById('form-enviar-mensaje').classList.remove('oculto');

    // Limpiamos el historial
    document.getElementById('historial-mensajes').innerHTML = '<p style="text-align:center; color:#9ca3af; margin-top: 20px;">Cargando mensajes...</p>';

    if (intervaloChat) clearInterval(intervaloChat);
    cargarMensajesActivos();
    intervaloChat = setInterval(cargarMensajesActivos, 2500);
}

// ==========================================
// 3. CARGAR LOS MENSAJES DEL CHAT ACTIVO
// ==========================================
async function cargarMensajesActivos() {
    if (!chatActivoId) return;
    const historial = document.getElementById('historial-mensajes');

    try {
        let url = (tipoChatActivo === 'grupal')
            ? `${URL_BACKEND}/api/mensajes/${chatActivoId}`
            : `${URL_BACKEND}/api/mensajes-privados/${userId}/${chatActivoId}`;

        const res = await fetch(url);
        const mensajes = await res.json();

        if (mensajes.length === 0) {
            historial.innerHTML = `<p style="text-align:center; color:#9ca3af; margin-top:20px;">No hay mensajes aún. ¡Di hola! 👋</p>`;
            return;
        }

        const estaAlFinal = historial.scrollHeight - historial.scrollTop <= historial.clientHeight + 50;

        // FIX: Eliminada la variable "tituloContenedor" que daba error. Inicializamos en vacío.
        let htmlMensajes = '';

        mensajes.forEach(msg => {
            let esMio, nombre, avatar, textoMsg, horaRaw;

            horaRaw = new Date(msg.creado_en || msg.fecha || new Date());
            const hora = horaRaw.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            if (tipoChatActivo === 'grupal') {
                esMio = String(msg.id_usuario) === String(userId);
                nombre = msg.usuarios?.nombre || 'Usuario';
                avatar = msg.usuarios?.avatar_url || `https://ui-avatars.com/api/?name=${nombre}&background=1a2e25&color=4ade80`;
                textoMsg = msg.mensaje;
            } else {
                esMio = String(msg.id_emisor) === String(userId);
                nombre = esMio ? 'Tú' : (msg.emisor?.nombre || 'Usuario');
                avatar = msg.emisor?.avatar_url || `https://ui-avatars.com/api/?name=${nombre}&background=1a2e25&color=4ade80`;
                textoMsg = msg.mensaje;
            }

            if (esMio) {
                htmlMensajes += `
                    <div class="burbuja mia">
                        ${textoMsg}
                        <span class="timestamp" style="display:block; font-size:10px; text-align:right; margin-top:5px; opacity:0.7;">${hora}</span>
                    </div>
                `;
            } else {
                htmlMensajes += `
                    <div style="display:flex; gap:8px; align-items:flex-end; align-self:flex-start; margin-bottom:10px; max-width:75%;">
                        <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
                        <div class="burbuja otra" style="max-width:100%; margin-bottom:0;">
                            ${tipoChatActivo === 'grupal' ? `<strong style="font-size:11px; display:block; margin-bottom:4px; color:#4ade80;">${nombre}</strong>` : ''}
                            ${textoMsg}
                            <span class="timestamp" style="display:block; font-size:10px; text-align:right; margin-top:5px; opacity:0.7;">${hora}</span>
                        </div>
                    </div>
                `;
            }
        });

        historial.innerHTML = htmlMensajes;

        if (estaAlFinal) historial.scrollTop = historial.scrollHeight;

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
        let url, bodyData;

        if (tipoChatActivo === 'grupal') {
            url = `${URL_BACKEND}/api/mensajes`;
            bodyData = { id_viaje: chatActivoId, id_usuario: userId, mensaje: texto };
        } else {
            url = `${URL_BACKEND}/api/mensajes-privados`;
            bodyData = { id_emisor: userId, id_receptor: chatActivoId, mensaje: texto };
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        if (res.ok) {
            await cargarMensajesActivos();
            setTimeout(() => {
                const h = document.getElementById('historial-mensajes');
                h.scrollTop = h.scrollHeight;
            }, 50);
        }

    } catch (e) {
        console.error("Error al enviar", e);
    }
});

// ==========================================
// VIGILANTE SILENCIOSO DE NUEVOS MENSAJES
// ==========================================
setInterval(actualizarListaSilenciosa, 4000);

async function actualizarListaSilenciosa() {
    if (!userId) return;
    try {
        const resViajes = await fetch(`${URL_BACKEND}/api/mis-viajes/${userId}`);
        const viajes = resViajes.ok ? await resViajes.json() : [];

        const resPrivados = await fetch(`${URL_BACKEND}/api/inbox/${userId}`);
        const privados = resPrivados.ok ? await resPrivados.json() : [];

        let todosLosChats = [
            ...viajes.map(v => ({ idOriginal: v.id, tipo: 'grupal', sub: 'Grupo del viaje' })),
            ...privados.map(p => ({ idOriginal: p.usuario.id, tipo: 'privado', sub: p.ultimoMensaje || 'Chat privado' }))
        ];

        const lista = document.getElementById('lista-conversaciones');

        todosLosChats.forEach(c => {
            const idElemento = `chat-item-${c.tipo}-${c.idOriginal}`;
            const item = document.getElementById(idElemento);

            if (item) {
                const spanTexto = item.querySelector('.ultimo-mensaje-txt');

                // Si el texto del último mensaje es diferente al que tenemos en pantalla... ¡Hay mensaje nuevo!
                if (spanTexto && spanTexto.innerText !== c.sub) {
                    spanTexto.innerText = c.sub;
                    lista.prepend(item);

                    if (chatActivoId !== String(c.idOriginal)) {
                        // Si NO estamos en este chat, encendemos la bolita
                        const badge = item.querySelector('.badge-chat');
                        badge.classList.add('activo');
                        let numActual = parseInt(badge.innerText) || 0;
                        badge.innerText = numActual + 1;
                    } else {
                        // 🌟 Si YA estamos leyendo este chat en pantalla, lo marcamos como leído directamente en la memoria
                        let estadoGuardado = JSON.parse(localStorage.getItem('estado_chats_' + userId)) || {};
                        estadoGuardado[c.idOriginal] = c.sub;
                        localStorage.setItem('estado_chats_' + userId, JSON.stringify(estadoGuardado));
                    }
                }
            }
        });
    } catch (e) {
        // Silenciamos el error para no molestar en consola si falla una petición suelta
    }
}
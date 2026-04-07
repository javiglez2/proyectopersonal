// ==========================================
// VARIABLES GLOBALES
// ==========================================
const userId = localStorage.getItem('benaluma_user_id');
const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';
let chatActivoId = null;
let tipoChatActivo = null; // 'grupal' o 'privado'
let intervaloChat = null;

if (!userId) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', cargarListaDeChats);

// ==========================================
// 1. CARGAR LA LISTA DE CHATS (Grupos y Privados)
// ==========================================
async function cargarListaDeChats() {
    const listaDiv = document.getElementById('lista-conversaciones');
    
    try {
        // 1. Pedimos los viajes (Chats Grupales)
        const resViajes = await fetch(`${URL_BACKEND}/api/mis-viajes/${userId}`);
        const viajes = resViajes.ok ? await resViajes.json() : [];

        // 2. Pedimos la bandeja de entrada (Chats Privados)
        const resPrivados = await fetch(`${URL_BACKEND}/api/inbox/${userId}`);
        const privados = resPrivados.ok ? await resPrivados.json() : [];

        listaDiv.innerHTML = ''; // Limpiamos el texto de "Cargando..."

        if (viajes.length === 0 && privados.length === 0) {
            listaDiv.innerHTML = `<p style="text-align:center; color:#9ca3af; padding:20px;">No tienes conversaciones aún.</p>`;
            return;
        }

        // --- PINTAR LOS GRUPOS (VIAJES) ---
        if (viajes.length > 0) {
            listaDiv.innerHTML += `<div style="padding:10px 15px; font-size:12px; font-weight:bold; color:#6b7280; text-transform:uppercase;">🚗 Chats de Viajes</div>`;
            
            viajes.forEach(v => {
                listaDiv.innerHTML += `
                    <div class="contacto-item" id="chat-item-grupal-${v.id}" onclick="abrirChat('${v.id}', 'grupal', 'Viaje a ${v.destino}')">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="background:#1a2e25; width:40px; height:40px; border-radius:50%; color:#4ade80; display:flex; align-items:center; justify-content:center; font-size:16px;">
                                <i class="fa-solid fa-car"></i>
                            </div>
                            <div style="flex:1; overflow:hidden;">
                                <strong style="color:white; display:block; font-size:15px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">Viaje a ${v.destino}</strong>
                                <span style="font-size:12px; color:#9ca3af;">Grupo del viaje</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        // --- PINTAR LOS PRIVADOS ---
        if (privados.length > 0) {
            listaDiv.innerHTML += `<div style="padding:10px 15px; font-size:12px; font-weight:bold; color:#6b7280; text-transform:uppercase; margin-top:10px;">👤 Mensajes Privados</div>`;
            
            privados.forEach(c => {
                const avatar = c.usuario?.avatar_url || `https://ui-avatars.com/api/?name=${c.usuario.nombre}&background=1a2e25&color=4ade80`;
                
                listaDiv.innerHTML += `
                    <div class="contacto-item" id="chat-item-privado-${c.usuario.id}" onclick="abrirChat('${c.usuario.id}', 'privado', '${c.usuario.nombre}')">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #374151;">
                            <div style="flex:1; overflow:hidden;">
                                <strong style="color:white; display:block; font-size:15px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${c.usuario.nombre}</strong>
                                <span style="font-size:12px; color:#9ca3af; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; display:block;">${c.ultimoMensaje || 'Toca para ver...'}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

    } catch (error) {
        console.error(error);
        listaDiv.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px;">Error al cargar los chats.</p>`;
    }
}

// ==========================================
// 2. ABRIR UN CHAT (PREPARAR LA ZONA DERECHA)
// ==========================================
window.abrirChat = function(idChat, tipoChat, tituloChat) {
    chatActivoId = idChat;
    tipoChatActivo = tipoChat;

    // Quitar la clase "activo" a todos y ponérsela al que hemos clickeado
    document.querySelectorAll('.contacto-item').forEach(el => el.classList.remove('activo'));
    document.getElementById(`chat-item-${tipoChat}-${idChat}`).classList.add('activo');

    // Ocultar mensaje inicial y mostrar input de texto
    document.querySelector('.mensaje-bienvenida').style.display = 'none';
    document.getElementById('form-enviar-mensaje').classList.remove('oculto');
    
    const historial = document.getElementById('historial-mensajes');
    
    // Título fijo arriba
    historial.innerHTML = `
        <div style="position:sticky; top:-20px; background:#111827; padding-bottom:15px; border-bottom:1px solid #374151; margin-bottom:15px; z-index:5;">
            <h3 style="text-align:center; color:#4ade80; margin:0;">${tituloChat}</h3>
        </div>
        <p id="cargando-mensajes-text" style="text-align:center; color:#9ca3af;">Cargando mensajes...</p>
    `;

    // Limpiar intervalo anterior para no acumular llamadas al servidor
    if (intervaloChat) clearInterval(intervaloChat);
    
    // Cargar mensajes ahora, y luego cada 2.5 segundos
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
        let url = '';
        // Elegimos la URL dependiendo de si es grupo o privado (Igual que en tu index.js antiguo)
        if (tipoChatActivo === 'grupal') {
            url = `${URL_BACKEND}/api/mensajes/${chatActivoId}`;
        } else {
            url = `${URL_BACKEND}/api/mensajes-privados/${userId}/${chatActivoId}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        const mensajes = await res.json();

        // Extraemos el título pegajoso que pusimos antes para no borrarlo
        const tituloContenedor = historial.firstElementChild.outerHTML;
        
        if (mensajes.length === 0) {
            historial.innerHTML = tituloContenedor + `<p style="text-align:center; color:#9ca3af; margin-top:20px;">No hay mensajes aún. ¡Di hola! 👋</p>`;
            return;
        }

        // Comprobar si estábamos haciendo scroll abajo del todo para mantenerlo
        const estaAlFinal = historial.scrollHeight - historial.scrollTop <= historial.clientHeight + 50;

        let htmlMensajes = tituloContenedor;

        mensajes.forEach(msg => {
            let esMio, nombre, avatar, textoMsg, horaRaw;
            
            horaRaw = new Date(msg.creado_en || msg.fecha || new Date());
            const hora = horaRaw.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});

            // Adaptar las variables de base de datos según el tipo de chat
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
                // Burbuja a la derecha (Mía)
                htmlMensajes += `
                    <div class="burbuja mia">
                        ${textoMsg}
                        <span style="display:block; font-size:10px; text-align:right; margin-top:5px; opacity:0.7;">${hora}</span>
                    </div>
                `;
            } else {
                // Burbuja a la izquierda (De otro) con avatar
                htmlMensajes += `
                    <div style="display:flex; gap:8px; align-items:flex-end; align-self:flex-start; margin-bottom:10px; max-width:75%;">
                        <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid #374151;">
                        <div class="burbuja otra" style="max-width:100%; margin-bottom:0;">
                            ${tipoChatActivo === 'grupal' ? `<strong style="font-size:11px; display:block; margin-bottom:4px; color:#9ca3af;">${nombre}</strong>` : ''}
                            ${textoMsg}
                            <span style="display:block; font-size:10px; text-align:right; margin-top:5px; opacity:0.7;">${hora}</span>
                        </div>
                    </div>
                `;
            }
        });

        historial.innerHTML = htmlMensajes;

        // Auto-scroll hacia abajo si el usuario ya estaba abajo
        if (estaAlFinal) historial.scrollTop = historial.scrollHeight;

    } catch (e) {
        console.error(e);
        // Si hay error pero ya hay mensajes pintados, no los borramos. 
        // Si no hay nada pintado, mostramos el error.
        if (historial.children.length <= 2) { 
            const tituloContenedor = historial.firstElementChild ? historial.firstElementChild.outerHTML : '';
            historial.innerHTML = tituloContenedor + `<p style="color:#ef4444; text-align:center;">Error al cargar mensajes.</p>`;
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

    input.value = ''; // Vaciamos la caja rápido para mejor UX

    try {
        let url, bodyData;
        
        // La estructura de envío depende de si es grupo o privado
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
            // Forzamos a recargar la zona de mensajes para ver el nuestro al instante
            await cargarMensajesActivos();
            
            // Bajamos el scroll a tope
            setTimeout(() => {
                const h = document.getElementById('historial-mensajes');
                h.scrollTop = h.scrollHeight;
            }, 50);
        }

    } catch (e) {
        console.error("Error al enviar", e);
    }
});
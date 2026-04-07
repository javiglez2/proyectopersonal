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

    document.querySelectorAll('.contacto-item').forEach(el => el.classList.remove('activo'));
    const itemEncontrado = document.getElementById(`chat-item-${tipoChat}-${idChat}`);
    if(itemEncontrado) itemEncontrado.classList.add('activo');

    // Mostramos la cabecera nueva y ponemos el nombre
    const cabecera = document.getElementById('chat-header-dinamico');
    cabecera.style.display = 'block';
    document.getElementById('nombre-chat-actual').innerText = tituloChat;

    document.querySelector('.mensaje-bienvenida').style.display = 'none';
    document.getElementById('form-enviar-mensaje').classList.remove('oculto');
    
    // Limpiamos el historial para que no se vea el chat anterior mientras carga
    document.getElementById('historial-mensajes').innerHTML = '<p style="text-align:center; color:#9ca3af;">Cargando mensajes...</p>';

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
        let url = '';
        if (tipoChatActivo === 'grupal') {
            url = `${URL_BACKEND}/api/mensajes/${chatActivoId}`;
        } else {
            url = `${URL_BACKEND}/api/mensajes-privados/${userId}/${chatActivoId}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Error en el servidor");
        
        const mensajes = await res.json();

        // 1. Buscamos si ya hay un título arriba para NO borrarlo
        const tituloExistente = historial.querySelector('.titulo-chat-pegajoso');
        let htmlTitulo = tituloExistente ? tituloExistente.outerHTML : '';

        if (mensajes.length === 0) {
            historial.innerHTML = htmlTitulo + `<p style="text-align:center; color:#9ca3af; margin-top:20px;">No hay mensajes aún. ¡Di hola! 👋</p>`;
            return;
        }

        // 2. Construimos los mensajes
        let htmlMensajes = htmlTitulo;
        mensajes.forEach(msg => {
            const esMio = (tipoChatActivo === 'grupal') 
                ? String(msg.id_usuario) === String(userId)
                : String(msg.id_emisor) === String(userId);

            const textoMsg = msg.mensaje;
            const claseBurbuja = esMio ? 'mia' : 'otra';

            htmlMensajes += `
                <div class="burbuja ${claseBurbuja}">
                    ${textoMsg}
                </div>
            `;
        });

        historial.innerHTML = htmlMensajes;

        // Auto-scroll al final
        historial.scrollTop = historial.scrollHeight;

    } catch (e) {
        console.error("Error cargando mensajes:", e);
        // Solo mostramos error si el historial está vacío
        if (historial.innerText.includes('Cargando')) {
            historial.innerHTML += `<p style="color:#ef4444; text-align:center;">Error de conexión con el chat.</p>`;
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
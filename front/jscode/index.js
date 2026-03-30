// ==========================================
// 🚀 VARIABLES GLOBALES
// ==========================================
const usuarioID = localStorage.getItem('benaluma_user_id');
const nombreUsuario = localStorage.getItem('benaluma_user_nombre') || 'Usuario';
let mapa;
let marcadorTemp = null;
const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';

const iconoCoche = L.icon({
    iconUrl: 'https://api.iconify.design/fa6-solid/car-side.svg?color=red',
    iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24]
});

// ==========================================
// 🗺️ INICIALIZAR APP (DOM CONTENT LOADED)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar el mapa (Estilo Voyager - Término medio)
    mapa = L.map('miMapa').setView([36.65, -4.50], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO'
    }).addTo(mapa);

    setTimeout(() => { mapa.invalidateSize(); }, 500);

    // 2. Publicar al hacer clic
    mapa.on('click', (e) => {
        if (!usuarioID) return alert("Debes iniciar sesión para publicar");
        if (marcadorTemp) mapa.removeLayer(marcadorTemp);
        marcadorTemp = L.marker(e.latlng).addTo(mapa).bindPopup(`
            <button onclick="prepararViaje(${e.latlng.lat}, ${e.latlng.lng})" style="background:#2563eb; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">
                Publicar aquí 🚗
            </button>
        `).openPopup();
    });

    // 3. Perfil de usuario
    if (usuarioID) {
        document.getElementById('nombre-usuario-menu').innerText = nombreUsuario;
        fetch(`${URL_BACKEND}/api/usuarios/${usuarioID}`)
            .then(r => r.json())
            .then(u => { if (u.avatar_url) document.getElementById('avatar-menu').src = u.avatar_url; });
    }

    // 4. Calendario Flatpickr
    flatpickr("#form-fecha", {
        enableTime: true, dateFormat: "Y-m-d\\TH:i", minDate: "today", time_24hr: true, locale: "es"
    });

    cargarViajes();
    cargarMisViajes();

    // 5. Paneles Arrastrables
    hacerArrastrable(document.getElementById("panel-disponibles"), document.getElementById("cabecera-disponibles"));
    hacerArrastrable(document.getElementById("panel-mis-viajes"), document.getElementById("cabecera-mis-viajes"));
    hacerArrastrable(document.getElementById("panel-publicar"), document.getElementById("cabecera-publicar"));
});

// ==========================================
// 📱 FUNCIONES DE INTERFAZ (UI)
// ==========================================
function togglePanel(idPanel) {
    const panel = document.getElementById(idPanel);
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        if (idPanel === 'panel-mis-viajes') {
            if (window.innerWidth > 768) panel.style.width = '700px';
            cargarMisViajes();
        }
    } else {
        panel.style.display = 'none';
    }
}

function toggleDropdown() {
    document.getElementById("myDropdown").classList.toggle("show");
}

window.onclick = function (event) {
    if (!event.target.matches('#avatar-menu')) {
        const dropdown = document.getElementById("myDropdown");
        if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
    }
};

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// ==========================================
// 📍 GESTIÓN DE VIAJES (LISTAS)
// ==========================================
async function cargarViajes() {
    const contenedor = document.getElementById('lista-viajes');
    try {
        const res = await fetch(`${URL_BACKEND}/api/viajes`);
        const viajes = await res.json();
        contenedor.innerHTML = '';

        if (viajes.length === 0) {
            contenedor.innerHTML = `<div style="padding:20px; text-align:center; color:#6b7280;">📍 No hay viajes disponibles. ¡Sé el primero!</div>`;
            return;
        }

        viajes.forEach(v => {
            L.marker([v.latitud, v.longitud], { icon: iconoCoche }).addTo(mapa)
                .bindPopup(`<b>${v.usuarios?.nombre || 'Conductor'}</b> va a <b>${v.destino}</b>`);

            const yaUnido = v.reservas?.some(r => r.id_pasajero === usuarioID);
            const esConductor = v.id_conductor === usuarioID;

            let btnHTML = `<button onclick="unirseViaje('${v.id}', event, this)" style="background:#10b981; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Unirme</button>`;
            if (esConductor) btnHTML = `<span style="color:gray; font-size:12px;">Tu viaje</span>`;
            else if (yaUnido) btnHTML = `<span style="color:green; font-size:12px;">✔ Ya dentro</span>`;

            const div = document.createElement('div');
            div.className = "viaje-item";
            div.style = "background:white; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #ddd; cursor:pointer;";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between"><b>🏁 ${v.destino}</b> <b style="color:#2563eb">${v.precio}€</b></div>
                <div style="font-size:13px; color:#666;">De: ${v.origen}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <small>👤 ${v.usuarios?.nombre || 'User'}</small>
                    ${btnHTML}
                </div>
            `;
            div.onclick = () => mapa.flyTo([v.latitud, v.longitud], 15);
            contenedor.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

async function cargarMisViajes() {
    const contenedor = document.getElementById('lista-mis-viajes');
    if (!usuarioID) return;

    try {
        const res = await fetch(`${URL_BACKEND}/api/mis-viajes/${usuarioID}`);
        const viajes = await res.json();
        contenedor.innerHTML = '';

        if (viajes.length === 0) {
            contenedor.innerHTML = "<p style='padding:15px; text-align:center;'>No tienes viajes programados.</p>";
            return;
        }

        const creados = viajes.filter(v => v.id_conductor === usuarioID);
        const unidos = viajes.filter(v => v.id_conductor !== usuarioID);

        const generarTarjeta = (v, esConductor) => {
            const fechaRaw = v.fecha_hora_salida || v.fecha_hora || v.fecha;

            let diaFormateado = "No definida";
            let horaFormateada = "No definida";

            if (fechaRaw) {
                const fechaObj = new Date(fechaRaw);
                if (!isNaN(fechaObj)) {
                    diaFormateado = fechaObj.toLocaleDateString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                    });
                    horaFormateada = fechaObj.toLocaleTimeString('es-ES', {
                        hour: '2-digit', minute: '2-digit'
                    });
                }
            }

            // 2. Obtener lista de pasajeros
            // Si tu backend devuelve las reservas, sacamos los nombres. Si no, ponemos un contador.
            let pasajerosArray = v.reservas ? v.reservas.map(r => r.usuarios?.nombre || 'Alguien') : [];
            const textoPasajeros = pasajerosArray.length > 0 ? pasajerosArray.join(', ') : 'Aún no hay nadie';

            return `
                <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 5px solid ${esConductor ? '#2563eb' : '#8b5cf6'}; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #f3f4f6;">
                    <b style="font-size: 15px;">De: ${v.origen}</b><br>
                    <b style="font-size: 15px;">A: ${v.destino}</b>
                    
                    <div style="font-size: 13px; color: #4b5563; margin: 10px 0; background: #f9fafb; padding: 10px; border-radius: 8px; line-height: 1.6;">
                        <b>Día:</b> ${diaFormateado} <br>
                        <b>Hora:</b> ${horaFormateada} <br>
                        <b>Conductor:</b> ${v.usuarios?.nombre || 'Desconocido'} <br>
                        <b>Pasajeros:</b> ${textoPasajeros}
                    </div>

                    ${esConductor ? `
                        <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                            <button onclick="copiarEnlaceViaje('${v.id}')" style="flex: 1; background: #f3f4f6; border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                📋 Copiar Link
                            </button>
                            <button onclick="borrarViaje('${v.id}')" style="background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; cursor: pointer;">
                                🗑️
                            </button>
                        </div>
                    ` : ''}

                    <button onclick="abrirChat('${v.id}', '${v.destino}')" style="width: 100%; background: #374151; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s;">
                        Abrir Chat
                    </button>
                </div>
            `;
        };

        let html = '<div style="display:flex; flex-wrap:wrap; gap:20px; padding:10px;">';
        html += `<div style="flex:1; min-width:280px;"><h4>Mis Viajes Creados</h4>${creados.length ? creados.map(v => generarTarjeta(v, true)).join('') : 'Sin viajes'}</div>`;
        html += `<div style="flex:1; min-width:280px;"><h4>Viajes donde me uní</h4>${unidos.length ? unidos.map(v => generarTarjeta(v, false)).join('') : 'Sin viajes'}</div>`;
        html += '</div>';
        contenedor.innerHTML = html;
    } catch (e) { console.error(e); }
}

// ==========================================
// 📋 COMPARTIR Y BORRAR
// ==========================================
window.copiarEnlaceViaje = function (idViaje) {
    const urlCompartir = `${window.location.origin}${window.location.pathname}?viaje=${idViaje}`;
    navigator.clipboard.writeText(urlCompartir).then(() => {
        alert("¡Enlace de viaje copiado! 🚀");
    });
};

window.borrarViaje = async function (idViaje) {
    if (!confirm("¿Borrar viaje? Se eliminarán también reservas y mensajes.")) return;
    try {
        const res = await fetch(`${URL_BACKEND}/api/viajes/${idViaje}`, { method: 'DELETE' });
        if (res.ok) { alert("Eliminado"); location.reload(); }
    } catch (e) { alert("Error al borrar"); }
};

// ==========================================
// 💬 CHAT DINÁMICO (SISTEMA SEGURO)
// ==========================================
let chatViajeActual = null;
let intervaloChat = null;

window.abrirChat = function (idViaje, destino) {
    let modal = document.getElementById('modal-chat-dinamico');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-chat-dinamico';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:999999; justify-content:center; align-items:center;';
        modal.innerHTML = `
            <div style="background:white; width:90%; max-width:400px; height:80vh; border-radius:15px; display:flex; flex-direction:column; overflow:hidden;">
                <div style="background:#1d352d; color:white; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                    <b id="chat-titulo-dinamico">Chat</b>
                    <button onclick="cerrarChat()" style="color:white; background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                <div id="chat-mensajes-dinamico" style="flex:1; padding:15px; overflow-y:auto; background:#f3f4f6; display:flex; flex-direction:column; gap:10px;"></div>
                <div style="padding:15px; display:flex; gap:10px;">
                    <input type="text" id="input-mensaje-dinamico" placeholder="Mensaje..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #ccc;">
                    <button onclick="enviarMensaje()" style="background:#10b981; color:white; border:none; padding:10px 15px; border-radius:8px; cursor:pointer;">Enviar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    chatViajeActual = idViaje;
    document.getElementById('chat-titulo-dinamico').innerText = `💬 ${destino}`;
    cargarMensajes();
    intervaloChat = setInterval(cargarMensajes, 2000);
};

window.cerrarChat = function () {
    const modal = document.getElementById('modal-chat-dinamico');
    if (modal) modal.style.display = 'none';
    chatViajeActual = null;
    clearInterval(intervaloChat);
};

window.cargarMensajes = async function () {
    if (!chatViajeActual) return;
    try {
        const res = await fetch(`${URL_BACKEND}/api/mensajes/${chatViajeActual}`);
        const mensajes = await res.json();
        const contenedor = document.getElementById('chat-mensajes-dinamico');
        contenedor.innerHTML = mensajes.map(m => {
            const esMio = m.id_usuario === usuarioID;
            return `
                <div style="align-self:${esMio ? 'flex-end' : 'flex-start'}; max-width:80%;">
                    <small style="font-size:10px; color:gray;">${esMio ? 'Tú' : (m.usuarios?.nombre || 'User')}</small>
                    <div style="background:${esMio ? '#dcf8c6' : 'white'}; padding:8px 12px; border-radius:12px; font-size:14px; border:1px solid #eee;">${m.mensaje}</div>
                </div>
            `;
        }).join('');
        contenedor.scrollTop = contenedor.scrollHeight;
    } catch (e) { console.error(e); }
};

window.enviarMensaje = async function () {
    const input = document.getElementById('input-mensaje-dinamico');
    const texto = input.value.trim();
    if (!texto || !chatViajeActual) return;
    input.value = '';
    await fetch(`${URL_BACKEND}/api/mensajes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_viaje: chatViajeActual, id_usuario: usuarioID, mensaje: texto })
    });
    cargarMensajes();
};

// ==========================================
// 🚗 PUBLICAR Y ARRASTRAR (UTILIDADES)
// ==========================================
function prepararViaje(lat, lng) {
    document.getElementById('form-lat').value = lat;
    document.getElementById('form-lng').value = lng;
    document.getElementById('panel-publicar').style.display = 'block';
    mapa.closePopup();
}

async function unirseViaje(idViaje, evento, boton) {
    evento.stopPropagation();
    try {
        const res = await fetch(`${URL_BACKEND}/api/reservar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_viaje: idViaje, id_pasajero: usuarioID })
        });
        if (res.ok) { alert("¡Te has unido!"); location.reload(); }
    } catch (e) { alert("Error al unirse"); }
}

async function enviarViajeAlBack() {
    const fechaInput = document.getElementById('form-fecha').value;

    if (!fechaInput) {
        alert("⚠️ Por favor, elige el día y la hora.");
        return;
    }

    // Convertimos la fecha a formato ISO para que no falle nunca
    const fechaISO = new Date(fechaInput).toISOString();

    const viaje = {
        id_conductor: usuarioID,
        origen: document.getElementById('form-origen').value,
        destino: document.getElementById('form-destino').value,
        fecha_hora: fechaISO, // Asegúrate de que se llame exactamente así
        plazas: parseInt(document.getElementById('form-plazas').value),
        precio: parseFloat(document.getElementById('form-precio').value),
        latitud: parseFloat(document.getElementById('form-lat').value),
        longitud: parseFloat(document.getElementById('form-lng').value)
    };

    const res = await fetch(`${URL_BACKEND}/api/crear-viaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viaje)
    });

    if (res.ok) {
        alert("¡Viaje publicado!");
        location.reload();
    }
}

function hacerArrastrable(elmnt, handle) {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    if (handle) handle.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
        e.preventDefault(); p3 = e.clientX; p4 = e.clientY;
        document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
        document.onmousemove = (e) => {
            e.preventDefault(); p1 = p3 - e.clientX; p2 = p4 - e.clientY; p3 = e.clientX; p4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - p2) + "px"; elmnt.style.left = (elmnt.offsetLeft - p1) + "px";
        };
    }
}
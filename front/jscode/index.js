// ==========================================
// 🚀 VARIABLES GLOBALES
// ==========================================
const usuarioID = localStorage.getItem('benaluma_user_id');
const nombreUsuario = localStorage.getItem('benaluma_user_nombre') || 'Usuario';
let mapa;
let marcadorTemp = null;
const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';

// Configuración rápida de SweetAlert para avisos pequeños
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

const iconoCoche = L.icon({
    iconUrl: 'https://api.iconify.design/fa6-solid/car-side.svg?color=yellow',
    iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24]
});

// ==========================================
// 🗺️ INICIALIZAR APP (DOM CONTENT LOADED)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar el mapa
    mapa = L.map('miMapa').setView([36.65, -4.50], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO'
    }).addTo(mapa);

    setTimeout(() => { mapa.invalidateSize(); }, 500);

    // 2. Perfil de usuario e Imágenes (CORREGIDO PARA GITHUB PAGES)
    // 3. Perfil de usuario
    if (usuarioID) {
        const nombreDisplay = document.getElementById('nombre-usuario-menu');
        const avatarDisplay = document.getElementById('avatar-menu');

        // Ponemos el nombre
        if (nombreDisplay) nombreDisplay.innerText = nombreUsuario;

        // Ponemos la imagen
        if (avatarDisplay) {
            // 1. Ponemos un avatar con tu inicial mientras carga
            avatarDisplay.src = `https://ui-avatars.com/api/?name=${nombreUsuario}&background=1d352d&color=fff`;

            // 2. ¡LA CLAVE! Le pedimos tu foto real a la base de datos
            fetch(`${URL_BACKEND}/api/usuarios/${usuarioID}`)
                .then(res => res.json())
                .then(usuario => {
                    // Si el usuario tiene una foto guardada (avatar_url), sustituimos la inicial
                    if (usuario.avatar_url) {
                        avatarDisplay.src = usuario.avatar_url;
                    }
                })
                .catch(err => console.log("Usando imagen de iniciales por defecto."));
        }
    }

    // 3. Calendario
    flatpickr("#form-fecha", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        time_24hr: true,
        locale: "es" // Asegúrate de incluir el script de español de flatpickr si quieres
    });

    cargarViajes();
    cargarMisViajes();

    // 4. Paneles Arrastrables
    hacerArrastrable(document.getElementById("panel-disponibles"), document.getElementById("cabecera-disponibles"));
    hacerArrastrable(document.getElementById("panel-mis-viajes"), document.getElementById("cabecera-mis-viajes"));
    hacerArrastrable(document.getElementById("panel-publicar"), document.getElementById("cabecera-publicar"));
});

// ==========================================
// 📱 FUNCIONES DE INTERFAZ (UI)
// ==========================================
function togglePanel(idPanel) {
    const panel = document.getElementById(idPanel);
    if (!panel) return;
    panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';

    if (idPanel === 'panel-mis-viajes' && panel.style.display === 'block') {
        if (window.innerWidth > 768) panel.style.width = '700px';
        cargarMisViajes();
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
            contenedor.innerHTML = `<div style="padding:20px; text-align:center; color:#6b7280;">📍 No hay viajes disponibles.</div>`;
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
    if (!usuarioID || !contenedor) return;

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
            let dia = "No definida", hora = "No definida";

            if (fechaRaw) {
                const f = new Date(fechaRaw);
                if (!isNaN(f)) {
                    dia = f.toLocaleDateString('es-ES');
                    hora = f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                }
            }

            const pasajerosArray = v.reservas ? v.reservas.map(r => r.usuarios?.nombre || 'Pasajero') : [];
            const textoPasajeros = pasajerosArray.length > 0 ? pasajerosArray.join(', ') : 'Nadie aún';

            return `
                <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 5px solid ${esConductor ? '#2563eb' : '#8b5cf6'}; border: 1px solid #eee;">
                    <b>De: ${v.origen}</b><br><b>A: ${v.destino}</b>
                    <div style="font-size: 13px; color: #4b5563; margin: 10px 0; background: #f9fafb; padding: 10px; border-radius: 8px;">
                        📅 <b>Día:</b> ${dia} | ⏰ <b>Hora:</b> ${hora} <br>
                        👥 <b>Pasajeros:</b> ${textoPasajeros}
                    </div>
                    ${esConductor ? `
                        <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                            <button onclick="copiarEnlaceViaje('${v.id}')" style="flex: 1; background: #f3f4f6; border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px;">📋 Copiar Link</button>
                            <button onclick="borrarViaje('${v.id}')" style="background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; cursor: pointer;">🗑️</button>
                        </div>
                    ` : ''}
                    <button onclick="abrirChat('${v.id}', '${v.destino}')" style="width: 100%; background: #374151; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Abrir Chat</button>
                </div>`;
        };

        contenedor.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:20px; padding:10px;">
                <div style="flex:1; min-width:280px;"><h4>Mis Viajes Creados</h4>${creados.map(v => generarTarjeta(v, true)).join('') || 'Sin viajes'}</div>
                <div style="flex:1; min-width:280px;"><h4>Viajes donde me uní</h4>${unidos.map(v => generarTarjeta(v, false)).join('') || 'Sin viajes'}</div>
            </div>`;
    } catch (e) { console.error(e); }
}

// ==========================================
// 📋 ACCIONES
// ==========================================
window.copiarEnlaceViaje = function (idViaje) {
    const url = `${window.location.origin}${window.location.pathname}?viaje=${idViaje}`;
    navigator.clipboard.writeText(url).then(() => {
        Toast.fire({ icon: 'success', title: '¡Enlace copiado!' });
    });
};

window.borrarViaje = async function (idViaje) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Se borrarán también los mensajes y reservas.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#374151',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`${URL_BACKEND}/api/viajes/${idViaje}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire("Eliminado", "El viaje ha sido borrado.", "success").then(() => location.reload());
            }
        } catch (e) { Swal.fire("Error", "No se pudo borrar", "error"); }
    }
};

// ==========================================
// 💬 CHAT DINÁMICO
// ==========================================
let chatViajeActual = null;
let intervaloChat = null;

window.abrirChat = function (idViaje, destino) {
    let modal = document.getElementById('modal-chat-dinamico');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-chat-dinamico';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;';
        modal.innerHTML = `
            <div style="background:white; width:90%; max-width:400px; height:75vh; border-radius:20px; display:flex; flex-direction:column; overflow:hidden;">
                <div style="background:#1d352d; color:white; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                    <b id="chat-titulo">Chat</b>
                    <button onclick="cerrarChat()" style="color:white; background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                <div id="chat-mensajes" style="flex:1; padding:15px; overflow-y:auto; background:#f3f4f6; display:flex; flex-direction:column; gap:10px;"></div>
                <div style="padding:15px; display:flex; gap:10px; border-top:1px solid #eee;">
                    <input type="text" id="input-chat" placeholder="Mensaje..." style="flex:1; padding:10px; border-radius:10px; border:1px solid #ccc;">
                    <button onclick="enviarMensaje()" style="background:#10b981; color:white; border:none; padding:10px 15px; border-radius:10px; cursor:pointer; font-weight:bold;">Enviar</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    chatViajeActual = idViaje;
    document.getElementById('chat-titulo').innerText = `💬 ${destino}`;
    cargarMensajes();
    intervaloChat = setInterval(cargarMensajes, 2000);
};

window.cerrarChat = function () {
    document.getElementById('modal-chat-dinamico').style.display = 'none';
    chatViajeActual = null;
    clearInterval(intervaloChat);
};

async function cargarMensajes() {
    if (!chatViajeActual) return;
    const res = await fetch(`${URL_BACKEND}/api/mensajes/${chatViajeActual}`);
    const mensajes = await res.json();
    const contenedor = document.getElementById('chat-mensajes');
    contenedor.innerHTML = mensajes.map(m => {
        const esMio = m.id_usuario === usuarioID;
        return `<div style="align-self:${esMio ? 'flex-end' : 'flex-start'}; max-width:80%;">
            <small style="font-size:10px; color:gray;">${esMio ? 'Tú' : (m.usuarios?.nombre || 'User')}</small>
            <div style="background:${esMio ? '#dcf8c6' : 'white'}; padding:8px 12px; border-radius:12px; font-size:14px; border:1px solid #eee;">${m.mensaje}</div>
        </div>`;
    }).join('');
    contenedor.scrollTop = contenedor.scrollHeight;
}

async function enviarMensaje() {
    const input = document.getElementById('input-chat');
    const texto = input.value.trim();
    if (!texto || !chatViajeActual) return;
    input.value = '';
    await fetch(`${URL_BACKEND}/api/mensajes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_viaje: chatViajeActual, id_usuario: usuarioID, mensaje: texto })
    });
    cargarMensajes();
}

// ==========================================
// 🚗 PUBLICAR Y ARRASTRAR
// ==========================================
function prepararViaje(lat, lng) {
    document.getElementById('form-lat').value = lat;
    document.getElementById('form-lng').value = lng;
    document.getElementById('panel-publicar').style.display = 'block';
    mapa.closePopup();
}

async function unirseViaje(idViaje, evento, boton) {
    evento.stopPropagation();
    const res = await fetch(`${URL_BACKEND}/api/reservar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_viaje: idViaje, id_pasajero: usuarioID })
    });
    if (res.ok) {
        Swal.fire("¡Genial!", "Te has unido al viaje", "success").then(() => location.reload());
    }
}

async function enviarViajeAlBack() {
    // 1. Primero definimos la variable
    const inputFecha = document.getElementById('form-fecha');
    let fechaFinal = inputFecha.value; // <--- Aquí se define

    // 2. Si usas Flatpickr, intentamos sacarlo de su instancia interna
    if (!fechaFinal && inputFecha._flatpickr) {
        fechaFinal = inputFecha._flatpickr.input.value;
    }

    // 3. Comprobación de seguridad
    if (!fechaFinal || fechaFinal.trim() === "") {
        return Swal.fire("Falta la fecha", "Selecciona día y hora en el calendario", "warning");
    }

    // 4. EL RESTO DEL CÓDIGO (Ya puede usar fechaFinal sin errores)
    try {
        const fechaISO = new Date(fechaFinal.replace(' ', 'T')).toISOString();

        const viaje = {
            id_conductor: usuarioID,
            origen: document.getElementById('form-origen').value || "Origen",
            destino: document.getElementById('form-destino').value || "Destino",
            // Enviamos la fecha con los dos nombres posibles para asegurar el tiro
            fecha_hora_salida: fechaISO,
            fecha_hora: fechaISO,
            plazas: parseInt(document.getElementById('form-plazas').value) || 1,
            precio: parseFloat(document.getElementById('form-precio').value.toString().replace(',', '.')) || 0,
            latitud: parseFloat(document.getElementById('form-lat').value),
            longitud: parseFloat(document.getElementById('form-lng').value)
        };

        console.log("🚀 OBJETO FINAL QUE SALE AL SERVIDOR:", viaje);

        const res = await fetch(`${URL_BACKEND}/api/crear-viaje`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(viaje)
        });

        const data = await res.json();

        if (res.ok) {
            Swal.fire("¡Éxito!", "Viaje publicado correctamente", "success").then(() => location.reload());
        } else {
            console.error("❌ Error del servidor:", data);
            Swal.fire("Error 400", data.message || "Revisa los datos", "error");
        }

    } catch (error) {
        console.error("❌ Error de red:", error);
        Swal.fire("Error", "No se pudo conectar con el servidor", "error");
    }
}

function hacerArrastrable(elmnt, handle) {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    if (handle) handle.onmousedown = (e) => {
        e.preventDefault(); p3 = e.clientX; p4 = e.clientY;
        document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
        document.onmousemove = (e) => {
            e.preventDefault(); p1 = p3 - e.clientX; p2 = p4 - e.clientY; p3 = e.clientX; p4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - p2) + "px"; elmnt.style.left = (elmnt.offsetLeft - p1) + "px";
        };
    };
}
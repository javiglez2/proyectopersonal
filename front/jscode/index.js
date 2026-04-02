// ==========================================
// 🚀 VARIABLES GLOBALES
// ==========================================
const usuarioID = localStorage.getItem('benaluma_user_id');
const nombreUsuario = localStorage.getItem('benaluma_user_nombre') || 'Usuario';
let mapa;
let marcadorTemp = null;
const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';

// Variables para el sistema de filtros
let todosLosViajes = [];
let marcadoresMapa = [];

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

// ==========================================
// 🗺️ INICIALIZAR APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar el mapa
    mapa = L.map('miMapa').setView([36.65, -4.50], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO'
    }).addTo(mapa);

    setTimeout(() => { mapa.invalidateSize(); }, 500);

    // 2. Publicar al hacer clic
    mapa.on('click', (e) => {
        if (!usuarioID) return Swal.fire("Inicia sesión", "Debes estar conectado para publicar", "info");
        if (marcadorTemp) mapa.removeLayer(marcadorTemp);
        marcadorTemp = L.marker(e.latlng).addTo(mapa).bindPopup(`
            <button onclick="prepararViaje(${e.latlng.lat}, ${e.latlng.lng})" style="background:#2563eb; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; font-weight:bold;">
                Publicar aquí 🚗
            </button>
        `).openPopup();
    });

    // 3. Perfil de usuario e Imágenes
    if (usuarioID) {
        const nombreDisplay = document.getElementById('nombre-usuario-menu');
        const avatarDisplay = document.getElementById('avatar-menu');

        if (nombreDisplay) nombreDisplay.innerText = nombreUsuario;

        if (avatarDisplay) {
            avatarDisplay.src = `https://ui-avatars.com/api/?name=${nombreUsuario}&background=1d352d&color=fff`;

            fetch(`${URL_BACKEND}/api/usuarios/${usuarioID}`)
                .then(res => res.json())
                .then(usuario => {
                    if (usuario.avatar_url) {
                        avatarDisplay.src = usuario.avatar_url;
                    }
                })
                .catch(err => console.log("Usando imagen por defecto."));
        }
    }

    // 4. Calendario Flatpickr
    flatpickr("#form-fecha", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        time_24hr: true,
        locale: "es"
    });

    cargarViajes();
    cargarMisViajes();

    // 5. Paneles Arrastrables
    hacerArrastrable(document.getElementById("panel-disponibles"), document.getElementById("cabecera-disponibles"));
    hacerArrastrable(document.getElementById("panel-mis-viajes"), document.getElementById("cabecera-mis-viajes"));
    hacerArrastrable(document.getElementById("panel-publicar"), document.getElementById("cabecera-publicar"));
});

// ==========================================
// 📱 FUNCIONES DE INTERFAZ
// ==========================================
function togglePanel(idPanel) {
    const panel = document.getElementById(idPanel);
    if (!panel) return;
    panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';

    if (idPanel === 'panel-mis-viajes' && panel.style.display === 'block') {
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
// 📍 GESTIÓN DE VIAJES Y FILTROS
// ==========================================
function obtenerEstilosCategoria(categoria) {
    // 🚗 General por defecto (Azul)
    let colorIcono = 'blue';
    let colorFondo = '#dbeafe';
    let colorTexto = '#1e40af';

    // 🎓 UMA Teatinos (Rojo)
    if (categoria === 'UMA Teatinos') {
        colorIcono = 'red'; colorFondo = '#fee2e2'; colorTexto = '#991b1b';
    }
    // 🏛️ UMA El Ejido (Verde)
    else if (categoria === 'UMA El Ejido') {
        colorIcono = 'green'; colorFondo = '#dcf8c6'; colorTexto = '#166534';
    }
    // 📘 Grado Superior (Naranja)
    else if (categoria === 'Grado Superior') {
        colorIcono = 'orange'; colorFondo = '#ffedd5'; colorTexto = '#c2410c';
    }
    // 📚 Otros estudios (Negro)
    else if (categoria === 'Otros estudios') {
        colorIcono = 'black'; colorFondo = '#e5e7eb'; colorTexto = '#000000';
    }
    // 🏫 Antequera/Ronda (Morado)
    else if (categoria === 'Centros Antequera/Ronda') {
        colorIcono = 'purple'; colorFondo = '#f3e8ff'; colorTexto = '#6b21a8';
    }
    // 🏢 PTA (Rosa)
    else if (categoria === 'PTA (Parque Tecnológico)') {
        colorIcono = 'deeppink'; colorFondo = '#fce7f3'; colorTexto = '#9d174d';
    }

    return {
        // 🌟 AQUÍ ESTÁ LA MAGIA: Cambiamos "car-side" por "location-dot"
        icono: L.icon({
            iconUrl: `https://api.iconify.design/fa6-solid/location-dot.svg?color=${colorIcono}`,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -28]
        }),
        etiqueta: `<span style="background:${colorFondo}; color:${colorTexto}; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">${categoria}</span>`
    };
}

async function cargarViajes() {
    try {
        const res = await fetch(`${URL_BACKEND}/api/viajes`);
        todosLosViajes = await res.json();

        // Ordenamos por fecha
        todosLosViajes.sort((a, b) => new Date(a.fecha_hora_salida) - new Date(b.fecha_hora_salida));

        // Renderizamos inicialmente todos
        aplicarFiltros();
    } catch (e) { console.error(e); }
}

window.aplicarFiltros = function () {
    const contenedor = document.getElementById('lista-viajes');
    const filtroObjeto = document.getElementById('filtro-categoria');
    const filtro = filtroObjeto ? filtroObjeto.value : 'Todos';

    contenedor.innerHTML = '';

    // 1. Limpiar los coches antiguos del mapa
    marcadoresMapa.forEach(m => mapa.removeLayer(m));
    marcadoresMapa = [];

    // 2. Filtrar los viajes según el desplegable
    let viajesFiltrados = todosLosViajes;
    if (filtro !== 'Todos') {
        viajesFiltrados = todosLosViajes.filter(v => (v.categoria || 'General') === filtro);
    }

    if (viajesFiltrados.length === 0) {
        contenedor.innerHTML = `<div style="padding:20px; text-align:center; color:#6b7280;">📍 No hay viajes en esta categoría.</div>`;
        return;
    }

    // 3. Pintar los viajes filtrados
    viajesFiltrados.forEach(v => {
        const cat = v.categoria || 'General';
        const estilos = obtenerEstilosCategoria(cat);

        // Ponemos el coche en el mapa con su nuevo color y lo guardamos
        const marker = L.marker([v.latitud, v.longitud], { icon: estilos.icono }).addTo(mapa)
            .bindPopup(`<b>${v.usuarios?.nombre || 'Conductor'}</b> va a <b>${v.destino}</b><br>${estilos.etiqueta}`);
        marcadoresMapa.push(marker);

        const yaUnido = v.reservas?.some(r => r.id_pasajero === usuarioID);
        const esConductor = v.id_conductor === usuarioID;

        let btnHTML = `<button onclick="unirseViaje('${v.id}', event, this)" style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">Unirme</button>`;
        if (esConductor) btnHTML = `<span style="background:#f3f4f6; padding:5px 10px; border-radius:5px; color:#4b5563; font-size:12px; font-weight:bold;">🚗 Tu viaje</span>`;
        else if (yaUnido) btnHTML = `<span style="background:#dcf8c6; padding:5px 10px; border-radius:5px; color:#166534; font-size:12px; font-weight:bold;">✔ Ya estás dentro</span>`;

        const fechaObj = new Date(v.fecha_hora_salida);
        const diaFormateado = isNaN(fechaObj) ? "Fecha pdte." : fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const horaFormateada = isNaN(fechaObj) ? "--:--" : fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const avatarConductor = v.usuarios?.avatar_url || `https://ui-avatars.com/api/?name=${v.usuarios?.nombre || 'C'}&background=1d352d&color=fff`;

        const div = document.createElement('div');
        div.className = "viaje-item";
        div.style = "background:white; padding:15px; border-radius:12px; margin-bottom:15px; border:1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor:pointer;";

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <b style="font-size:16px; color:#111827;">🏁 ${v.destino}</b> 
                    <div style="margin-top:5px;">${estilos.etiqueta}</div>
                </div>
                <b style="color:#2563eb; font-size:18px;">${v.precio}€</b>
            </div>
            <div style="font-size:13px; color:#6b7280; margin-top:8px;">📍 De: ${v.origen}</div>
            
            <div style="background:#f9fafb; border-radius:8px; padding:10px; margin-top:12px; display:flex; justify-content:space-between; font-size:13px; color:#374151; font-weight:500;">
                <span>📅 ${diaFormateado} - ⏰ ${horaFormateada}</span>
                <span>💺 ${v.plazas_disponibles} plazas</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="${avatarConductor}" style="width:28px; height:28px; border-radius:50%; border:1px solid #ddd; object-fit:cover;">
                    <small style="font-weight:bold; color:#374151;">${v.usuarios?.nombre || 'Usuario'}</small>
                </div>
                ${btnHTML}
            </div>
        `;

        div.onclick = () => mapa.flyTo([v.latitud, v.longitud], 16);
        contenedor.appendChild(div);
    });
};

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

            const cat = v.categoria || 'General';
            const estilos = obtenerEstilosCategoria(cat);

            return `
                <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 5px solid ${esConductor ? '#2563eb' : '#8b5cf6'}; border: 1px solid #eee;">
                    <b>De: ${v.origen}</b><br>
                    <b>A: ${v.destino}</b>
                    <div style="margin-top:5px;">${estilos.etiqueta}</div>
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
// 📋 ACCIONES DE VIAJE
// ==========================================
window.copiarEnlaceViaje = function (idViaje) {
    const url = `${window.location.origin}${window.location.pathname}?viaje=${idViaje}`;
    navigator.clipboard.writeText(url).then(() => Toast.fire({ icon: 'success', title: '¡Enlace copiado!' }));
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

            // 🌟 NUEVO: Capturamos la respuesta exacta del servidor
            const data = await res.json();

            if (res.ok) {
                Swal.fire("Eliminado", "El viaje ha sido borrado.", "success").then(() => location.reload());
            } else {
                // 🌟 NUEVO: Si falla, nos mostrará el motivo real
                console.error("Error del servidor:", data);
                Swal.fire("No se pudo borrar", data.error || "Ruta no encontrada", "error");
            }
        } catch (e) {
            console.error("Error de red:", e);
            Swal.fire("Error", "No se pudo conectar con el servidor", "error");
        }
    }
};

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
    if (res.ok) Swal.fire("¡Genial!", "Te has unido al viaje", "success").then(() => location.reload());
}

async function enviarViajeAlBack() {
    const inputFecha = document.getElementById('form-fecha');
    let fechaFinal = inputFecha.value; 

    if (!fechaFinal && inputFecha._flatpickr) {
        fechaFinal = inputFecha._flatpickr.input.value;
    }

    if (!fechaFinal || fechaFinal.trim() === "") {
        return Swal.fire("Falta la fecha", "Selecciona día y hora en el calendario", "warning");
    }

    try {
        const fechaISO = new Date(fechaFinal.replace(' ', 'T')).toISOString();

        const viaje = {
            id_conductor: usuarioID,
            origen: document.getElementById('form-origen').value || "Origen",
            destino: document.getElementById('form-destino').value || "Destino",
            fecha_hora_salida: fechaISO,
            fecha_hora: fechaISO,
            plazas: parseInt(document.getElementById('form-plazas').value) || 1,
            precio: parseFloat(document.getElementById('form-precio').value.toString().replace(',', '.')) || 0,
            latitud: parseFloat(document.getElementById('form-lat').value),
            longitud: parseFloat(document.getElementById('form-lng').value),
            // 🌟 ESTA ES LA LÍNEA MÁGICA QUE FALTABA:
            categoria: document.getElementById('form-categoria').value 
        };

        const res = await fetch(`${URL_BACKEND}/api/crear-viaje`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(viaje)
        });

        const data = await res.json();

        if (res.ok) {
            Swal.fire("¡Éxito!", "Viaje publicado correctamente", "success").then(() => location.reload());
        } else {
            Swal.fire("Error 400", data.message || "Revisa los datos", "error");
        }

    } catch (error) {
        Swal.fire("Error", "No se pudo conectar con el servidor", "error");
    }
}

// ==========================================
// 💬 CHAT DINÁMICO (VERSIÓN PRO)
// ==========================================
let chatViajeActual = null;
let intervaloChat = null;

window.abrirChat = function (idViaje, destino) {
    let modal = document.getElementById('modal-chat-dinamico');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-chat-dinamico';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:99999; justify-content:center; align-items:center;';

        modal.innerHTML = `
            <div style="background:white; width:95%; max-width:450px; height:80vh; max-height:600px; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="background:#1d352d; color:white; padding:15px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <b id="chat-titulo-d" style="font-size:18px;">💬 Chat</b>
                    <button onclick="cerrarChat()" style="color:white; background:none; border:none; font-size:28px; cursor:pointer; line-height:1;">&times;</button>
                </div>
                
                <div id="chat-mensajes-d" style="flex:1; padding:20px; overflow-y:auto; background:#e5e5f7; background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 20px 20px; display:flex; flex-direction:column; gap:15px;">
                    <div style="text-align:center; color:#6b7280; font-size:13px;">Cargando mensajes...</div>
                </div>
                
                <div style="padding:15px; background:white; border-top:1px solid #e5e7eb; display:flex; gap:10px;">
                    <input type="text" id="input-chat-d" placeholder="Escribe un mensaje..." style="flex:1; padding:12px 15px; border-radius:20px; border:1px solid #d1d5db; outline:none; font-size:14px; transition:0.2s;">
                    <button onclick="enviarMensaje()" style="background:#2563eb; color:white; border:none; padding:0 20px; border-radius:20px; cursor:pointer; font-weight:bold; font-size:14px; transition:0.2s;">Enviar</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('input-chat-d').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') enviarMensaje();
        });
    }

    modal.style.display = 'flex';
    chatViajeActual = idViaje;
    document.getElementById('chat-titulo-d').innerText = `💬 Viaje a ${destino}`;

    if (intervaloChat) clearInterval(intervaloChat);

    cargarMensajes();
    intervaloChat = setInterval(cargarMensajes, 2000);
};

window.cerrarChat = function () {
    const modal = document.getElementById('modal-chat-dinamico');
    if (modal) modal.style.display = 'none';
    chatViajeActual = null;
    if (intervaloChat) clearInterval(intervaloChat);
};

async function cargarMensajes() {
    if (!chatViajeActual) return;
    try {
        const res = await fetch(`${URL_BACKEND}/api/mensajes/${chatViajeActual}`);
        if (!res.ok) throw new Error("Error al cargar");
        const mensajes = await res.json();

        const contenedor = document.getElementById('chat-mensajes-d');
        if (!contenedor) return;

        if (mensajes.length === 0) {
            contenedor.innerHTML = `<div style="text-align:center; color:#6b7280; font-size:13px; margin-top:20px; background:white; padding:10px; border-radius:10px;">No hay mensajes aún. ¡Di hola! 👋</div>`;
            return;
        }

        const estaAlFinal = contenedor.scrollHeight - contenedor.scrollTop <= contenedor.clientHeight + 50;

        contenedor.innerHTML = mensajes.map(m => {
            const esMio = m.id_usuario === usuarioID;
            const hora = new Date(m.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const nombre = m.usuarios?.nombre || 'Usuario';
            const avatar = m.usuarios?.avatar_url || `https://ui-avatars.com/api/?name=${nombre}&background=1d352d&color=fff`;

            if (esMio) {
                return `
                <div style="align-self:flex-end; max-width:85%; display:flex; flex-direction:column; align-items:flex-end;">
                    <div style="background:#dcf8c6; padding:10px 14px; border-radius:15px 15px 0 15px; font-size:14px; color:#111827; box-shadow:0 1px 2px rgba(0,0,0,0.1); word-break:break-word;">
                        ${m.mensaje}
                    </div>
                    <small style="font-size:10px; color:#6b7280; margin-top:4px;">${hora}</small>
                </div>`;
            } else {
                return `
                <div style="align-self:flex-start; max-width:85%; display:flex; gap:8px;">
                    <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; align-self:flex-end; border:1px solid #ddd; object-fit:cover;">
                    <div style="display:flex; flex-direction:column; align-items:flex-start;">
                        <small style="font-size:11px; color:#4b5563; margin-bottom:4px; font-weight:bold;">${nombre}</small>
                        <div style="background:white; padding:10px 14px; border-radius:15px 15px 15px 0; font-size:14px; color:#111827; box-shadow:0 1px 2px rgba(0,0,0,0.1); border:1px solid #e5e7eb; word-break:break-word;">
                            ${m.mensaje}
                        </div>
                        <small style="font-size:10px; color:#6b7280; margin-top:4px;">${hora}</small>
                    </div>
                </div>`;
            }
        }).join('');

        if (estaAlFinal) contenedor.scrollTop = contenedor.scrollHeight;

    } catch (error) {
        console.error("Error cargando mensajes:", error);
    }
}

async function enviarMensaje() {
    const input = document.getElementById('input-chat-d');
    if (!input) return;

    const texto = input.value.trim();
    if (!texto || !chatViajeActual) return;

    input.value = '';

    try {
        await fetch(`${URL_BACKEND}/api/mensajes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_viaje: chatViajeActual, id_usuario: usuarioID, mensaje: texto })
        });

        cargarMensajes();

        setTimeout(() => {
            const contenedor = document.getElementById('chat-mensajes-d');
            if (contenedor) contenedor.scrollTop = contenedor.scrollHeight;
        }, 100);

    } catch (e) {
        Swal.fire("Error", "No se pudo enviar el mensaje", "error");
    }
}

// ==========================================
// 🖱️ LÓGICA PARA ARRASTRAR PANELES CON LÍMITES
// ==========================================
function hacerArrastrable(elmnt, handle) {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    
    if (handle) {
        handle.onmousedown = dragMouseDown;
    } else {
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e.preventDefault();
        p3 = e.clientX;
        p4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        p1 = p3 - e.clientX;
        p2 = p4 - e.clientY;
        p3 = e.clientX;
        p4 = e.clientY;

        let nuevaPosicionTop = elmnt.offsetTop - p2;
        let nuevaPosicionLeft = elmnt.offsetLeft - p1;

        // 🛑 LÍMITES DE LA PANTALLA
        const alturaHeader = document.getElementById('menu-superior').offsetHeight || 60;
        
        // Límite Arriba (No dejar que se meta bajo el menú)
        if (nuevaPosicionTop < alturaHeader + 10) nuevaPosicionTop = alturaHeader + 10;
        
        // Límite Abajo (No dejar que desaparezca por el suelo)
        const maxTop = window.innerHeight - 50; 
        if (nuevaPosicionTop > maxTop) nuevaPosicionTop = maxTop;
        
        // Límite Izquierda
        if (nuevaPosicionLeft < 0) nuevaPosicionLeft = 0;
        
        // Límite Derecha (Ancho de la pantalla menos el ancho de la tarjeta)
        const maxLeft = window.innerWidth - elmnt.offsetWidth;
        if (nuevaPosicionLeft > maxLeft) nuevaPosicionLeft = maxLeft;

        // Aplicar la posición calculada
        elmnt.style.top = nuevaPosicionTop + "px";
        elmnt.style.left = nuevaPosicionLeft + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
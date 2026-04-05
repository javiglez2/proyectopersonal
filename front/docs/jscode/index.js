// ==========================================
// VARIABLES GLOBALES
// ==========================================
const usuarioID = localStorage.getItem('benaluma_user_id');
const nombreUsuario = localStorage.getItem('benaluma_user_nombre') || 'Usuario';
let mapa;
let marcadorTemp = null;
const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';

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
// INICIALIZAR APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    mapa = L.map('miMapa').setView([36.65, -4.50], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO'
    }).addTo(mapa);

    setTimeout(() => { mapa.invalidateSize(); }, 100);
    setTimeout(() => { mapa.invalidateSize(); }, 500);
    setTimeout(() => { mapa.invalidateSize(); }, 1000);

    mapa.on('click', (e) => {
        if (!usuarioID) return Swal.fire("Inicia sesión", "Debes estar conectado para publicar", "info");
        if (marcadorTemp) mapa.removeLayer(marcadorTemp);
        marcadorTemp = L.marker(e.latlng).addTo(mapa).bindPopup(`
            <button onclick="prepararViaje(${e.latlng.lat}, ${e.latlng.lng})" style="background:#2563eb; color:white; border:none; padding:10px 18px; border-radius:20px; cursor:pointer; font-weight:bold; font-size:14px;">
                Publicar aquí
            </button>
        `, { closeButton: false, className: 'popup-publicar-limpio' }).openPopup();

        marcadorTemp.on('popupclose', () => {
            if (marcadorTemp) { mapa.removeLayer(marcadorTemp); marcadorTemp = null; }
        });
    });

    if (usuarioID) {
        const nombreDisplay = document.getElementById('nombre-usuario-menu');
        const avatarDisplay = document.getElementById('avatar-menu');
        if (nombreDisplay) nombreDisplay.innerText = nombreUsuario;
        if (avatarDisplay) {
            avatarDisplay.src = `https://ui-avatars.com/api/?name=${nombreUsuario}&background=1d352d&color=fff`;
            fetch(`${URL_BACKEND}/api/usuarios/${usuarioID}`)
                .then(res => res.json())
                .then(usuario => { if (usuario.avatar_url) avatarDisplay.src = usuario.avatar_url; })
                .catch(() => { });
        }
    }

    flatpickr("#form-fecha", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        time_24hr: true,
        locale: "es"
    });

    cargarViajes();
    cargarMisViajes();

    hacerArrastrable(document.getElementById("panel-disponibles"), document.getElementById("cabecera-disponibles"));
    hacerArrastrable(document.getElementById("panel-mis-viajes"), document.getElementById("cabecera-mis-viajes"));
    hacerArrastrable(document.getElementById("panel-publicar"), document.getElementById("cabecera-publicar"));
    hacerArrastrable(document.getElementById("panel-chats"), document.getElementById("cabecera-chats"));
});

// ==========================================
// 📱 APERTURA DE PANELES (MÓVIL / TABLET / PC)
// ==========================================
window.togglePanel = function (idPanel) {
    const panel = document.getElementById(idPanel);
    if (!panel) return;

    // Detectamos si es Móvil o Tablet (hasta 1024px)
    const esMovilOTablet = window.innerWidth <= 1024;

    if (esMovilOTablet) {
        const estaAbierto = panel.classList.contains('abierta');

        // 1. Cerramos todos los paneles bajándolos
        document.querySelectorAll('.tarjeta-flotante').forEach(p => {
            p.classList.remove('abierta');
            setTimeout(() => { if (!p.classList.contains('abierta')) p.style.display = 'none'; }, 350);
        });

        // 2. Si el que hemos tocado estaba cerrado, lo abrimos
        if (!estaAbierto) {
            panel.style.display = 'flex';
            setTimeout(() => panel.classList.add('abierta'), 10);
        }
    } else {
        // --- MODO ESCRITORIO ---
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'flex';

            // 🌟 MAGIA: Calculamos el centro exacto de la pantalla para "Mis Viajes"
            if (idPanel === 'panel-mis-viajes') {
                const anchoPanel = panel.offsetWidth || 750;
                // Posición X = (Mitad de la pantalla) - (Mitad del panel)
                panel.style.left = (window.innerWidth / 2 - anchoPanel / 2) + 'px';
                panel.style.transform = 'none'; // Evita que pegue saltos al arrastrarlo
            }
        } else {
            panel.style.display = 'none';
        }
    }

    // Refrescar los datos siempre que se abran
    if (idPanel === 'panel-mis-viajes') cargarMisViajes();
    if (idPanel === 'panel-chats') cargarPanelChats();
};

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
    window.location.href = 'index.html';
}

// ==========================================
// VIAJES Y FILTROS
// ==========================================
function obtenerEstilosCategoria(categoria) {
    let colorIcono = 'blue'; let colorFondo = '#dbeafe'; let colorTexto = '#1e40af';
    if (categoria === 'UMA Teatinos') { colorIcono = 'red'; colorFondo = '#fee2e2'; colorTexto = '#991b1b'; }
    else if (categoria === 'UMA El Ejido') { colorIcono = 'green'; colorFondo = '#dcf8c6'; colorTexto = '#166534'; }
    else if (categoria === 'Grado Superior') { colorIcono = 'orange'; colorFondo = '#ffedd5'; colorTexto = '#c2410c'; }
    else if (categoria === 'Otros estudios') { colorIcono = 'black'; colorFondo = '#e5e7eb'; colorTexto = '#000000'; }
    else if (categoria === 'Centros Antequera/Ronda') { colorIcono = 'purple'; colorFondo = '#f3e8ff'; colorTexto = '#6b21a8'; }
    else if (categoria === 'PTA (Parque Tecnológico)') { colorIcono = 'deeppink'; colorFondo = '#fce7f3'; colorTexto = '#9d174d'; }
    return {
        icono: L.icon({
            iconUrl: `https://api.iconify.design/fa6-solid/location-dot.svg?color=${colorIcono}`,
            iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28]
        }),
        etiqueta: `<span style="background:${colorFondo}; color:${colorTexto}; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">${categoria}</span>`
    };
}

async function cargarViajes() {
    try {
        const res = await fetch(`${URL_BACKEND}/api/viajes`);
        todosLosViajes = await res.json();
        todosLosViajes.sort((a, b) => new Date(a.fecha_hora_salida) - new Date(b.fecha_hora_salida));
        aplicarFiltros();
    } catch (e) { console.error(e); }
}

window.aplicarFiltros = function () {
    const contenedor = document.getElementById('lista-viajes');
    const filtroObjeto = document.getElementById('filtro-categoria-busqueda');
    const filtro = filtroObjeto ? filtroObjeto.value : 'Todos';

    contenedor.innerHTML = '';
    marcadoresMapa.forEach(m => mapa.removeLayer(m));
    marcadoresMapa = [];

    let viajesFiltrados = todosLosViajes;
    if (filtro !== 'Todos') {
        viajesFiltrados = todosLosViajes.filter(v => (v.categoria || 'General') === filtro);
    }

    if (viajesFiltrados.length === 0) {
        contenedor.innerHTML = `<div style="padding:20px; text-align:center; color:#6b7280;">No hay viajes en esta categoría.</div>`;
        return;
    }

    viajesFiltrados.forEach(v => {
        const cat = v.categoria || 'General';
        const estilos = obtenerEstilosCategoria(cat);

        const marker = L.marker([v.latitud, v.longitud], { icon: estilos.icono }).addTo(mapa)
            .bindPopup(`<b>${v.usuarios?.nombre || 'Conductor'}</b> va a <b>${v.destino}</b><br>${estilos.etiqueta}`);
        marcadoresMapa.push(marker);

        const yaUnido = v.reservas?.some(r => r.id_pasajero === usuarioID);
        const esConductor = v.id_conductor === usuarioID;
        const estaLleno = v.plazas_disponibles <= 0;

        let btnHTML = `<button onclick="unirseViaje('${v.id}', event, this)" style="background:#16a34a; color:white; border:none; padding:8px 15px; border-radius:20px; cursor:pointer; font-weight:bold; font-size:13px; white-space:nowrap;">Unirme</button>`;
        
        // 🌟 LÓGICA INTELIGENTE CON TAMAÑOS COMPACTOS Y ANTI-SALTO DE LÍNEA
        if (estaLleno && !esConductor && !yaUnido) {
            btnHTML = `<span style="background:#fee2e2; padding:4px 8px; border-radius:20px; color:#ef4444; font-size:11px; font-weight:bold; white-space:nowrap;">Lleno</span>`;
        } else if (esConductor) {
            btnHTML = `<span style="background:#f3f4f6; padding:4px 8px; border-radius:20px; color:#4b5563; font-size:11px; font-weight:bold; white-space:nowrap;">Tu viaje ${estaLleno ? ' (Lleno)' : ''}</span>`;
        } else if (yaUnido) {
            btnHTML = `<span style="background:#dcfce7; padding:4px 8px; border-radius:20px; color:#166534; font-size:11px; font-weight:bold; white-space:nowrap;">✔ Ya estás dentro ${estaLleno ? ' (Lleno)' : ''}</span>`;
        }

        // Botón de contactar al conductor (solo si no eres tú el conductor)
        let btnContactar = '';
        if (!esConductor) {
            const nombreConductor = v.usuarios?.nombre || 'Conductor';
            btnContactar = `<button onclick="event.stopPropagation(); abrirChatPrivado('${v.id_conductor}', '${nombreConductor}')" 
                style="background:#f0fdf4; border:1px solid #bbf7d0; color:#16a34a; padding:7px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer;">
                💬 Conductor
            </button>`;
        }

        const fechaObj = new Date(v.fecha_hora_salida);
        const diaFormateado = isNaN(fechaObj) ? "Fecha pdte." : fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const horaFormateada = isNaN(fechaObj) ? "--:--" : fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const avatarConductor = v.usuarios?.avatar_url || `https://ui-avatars.com/api/?name=${v.usuarios?.nombre || 'C'}&background=1a2e25&color=4ade80`;

        const div = document.createElement('div');
        div.className = "viaje-item";
        div.style = `background:white; padding:15px; border-radius:12px; margin-bottom:15px; border:1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor:pointer; ${estaLleno ? 'opacity: 0.6;' : ''}`;
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <b style="font-size:16px; color:#111827;">${v.destino}</b>
                    <div style="margin-top:5px;">${estilos.etiqueta}</div>
                </div>
                <b style="color:#16a34a; font-size:18px;">${v.precio}€</b>
            </div>
            <div style="font-size:13px; color:#6b7280; margin-top:8px;">De: ${v.origen}</div>
            <div style="background:#f9fafb; border-radius:8px; padding:10px; margin-top:12px; display:flex; justify-content:space-between; font-size:13px; color:#374151; font-weight:500;">
                <span>${diaFormateado} - ${horaFormateada}</span>
                <span>${v.plazas_disponibles} plazas</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="${avatarConductor}" style="width:28px; height:28px; border-radius:50%; border:1px solid #ddd; object-fit:cover;">
                    <small style="font-weight:bold; color:#374151;">${v.usuarios?.nombre || 'Usuario'}</small>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    ${btnContactar}
                    ${btnHTML}
                </div>
            </div>
        `;

        div.onclick = () => mapa.flyTo([v.latitud, v.longitud], 16);
        contenedor.appendChild(div);
    });
};

async function cargarMisViajes() {
    const contenedor = document.getElementById('lista-mis-viajes');
    if (!usuarioID || !contenedor) return;

    // Mensaje temporal por si Render tarda en despertar
    contenedor.innerHTML = `<div style="text-align:center; padding:20px; color:#6b7280;">⏳ Cargando tus viajes...</div>`;

    try {
        const res = await fetch(`${URL_BACKEND}/api/mis-viajes/${usuarioID}`);
        const viajes = await res.json();
        contenedor.innerHTML = '';

        if (viajes.length === 0) {
            contenedor.innerHTML = "<p style='padding:15px; text-align:center; color:#6b7280;'>No tienes viajes programados.</p>";
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

            // 🌟 AQUÍ ESTÁ EL CÓDIGO DE PASAJEROS Y CHAT PERFECTAMENTE ENCAJADO
            const pasajerosHTML = v.reservas && v.reservas.length > 0
                ? v.reservas.map(r => {
                    const nombrePas = r.usuarios?.nombre || 'Pasajero';
                    const idPasajero = r.id_pasajero;

                    if (esConductor) {
                        return `<span style="background:#dbeafe; color:#1e40af; padding:4px 10px; border-radius:12px; font-size:12px; margin-right:5px; border:1px solid #bfdbfe; display:inline-flex; align-items:center; gap:6px; font-weight:bold;">
                            👤 ${nombrePas} 
                            <button onclick="abrirChatPrivado('${idPasajero}', '${nombrePas}')" style="background:none; border:none; cursor:pointer; padding:0; font-size:15px; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Hablar con ${nombrePas}">💬</button>
                        </span>`;
                    } else {
                        return `<span style="background:#f3f4f6; color:#374151; padding:4px 10px; border-radius:12px; font-size:12px; margin-right:5px; border:1px solid #e5e7eb; font-weight:bold;">👤 ${nombrePas}</span>`;
                    }
                }).join('')
                : 'Nadie aún';

            const cat = v.categoria || 'General';
            const estilos = obtenerEstilosCategoria(cat);
            const nombreConductor = v.usuarios?.nombre || 'Conductor';

            return `
                <div style="background:white; padding:15px; border-radius:14px; margin-bottom:15px; border:1px solid #e5e7eb; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                    <div style="border-left:4px solid ${esConductor ? '#2563eb' : '#8b5cf6'}; padding-left:10px; margin-bottom:10px;">
                        <b style="color:#111827;">De: ${v.origen}</b><br>
                        <b style="color:#111827;">A: ${v.destino}</b>
                        <div style="margin-top:5px;">${estilos.etiqueta}</div>
                    </div>
                    <div style="font-size:13px; color:#4b5563; background:#f9fafb; padding:10px; border-radius:8px; margin-bottom:10px;">
                        <b>Día:</b> ${dia} | <b>Hora:</b> ${hora}<br>
                        <div style="margin-top:6px;"><b>Pasajeros:</b> ${pasajerosHTML}</div>
                    </div>
                    ${esConductor ? `
                        <div style="display:flex; gap:5px; margin-bottom:8px;">
                            <button onclick="copiarEnlaceViaje('${v.id}')" style="flex:1; background:#f3f4f6; border:1px solid #d1d5db; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">Copiar Link</button>
                            <button onclick="borrarViaje('${v.id}')" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;">Borrar</button>
                        </div>
                    ` : `
                        <button onclick="abrirChatPrivado('${v.id_conductor}', '${nombreConductor}')" 
                            style="width:100%; background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:8px;">
                            💬 Mensaje al conductor
                        </button>
                    `}
                    <button onclick="abrirChat('${v.id}', '${v.destino}')" style="width:100%; background:#1a2e25; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">
                        Abrir Chat del Viaje
                    </button>
                </div>`;
        };

        contenedor.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:20px; padding:10px;">
                <div style="flex:1; min-width:280px;"><h4 style="margin:0 0 12px; color:#1a2e25;">Mis Viajes Creados</h4>${creados.map(v => generarTarjeta(v, true)).join('') || '<p style="color:#9ca3af;">Sin viajes creados</p>'}</div>
                <div style="flex:1; min-width:280px;"><h4 style="margin:0 0 12px; color:#1a2e25;">Viajes donde me uní</h4>${unidos.map(v => generarTarjeta(v, false)).join('') || '<p style="color:#9ca3af;">Sin viajes unidos</p>'}</div>
            </div>`;
    } catch (e) {
        console.error(e);
        contenedor.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">Error de conexión. Reintenta.</div>`;
    }
}

// ==========================================
// ACCIONES DE VIAJE
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
        Swal.fire({ title: 'Borrando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        try {
            const res = await fetch(`${URL_BACKEND}/api/viajes/${idViaje}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                Swal.fire("Eliminado", "El viaje ha sido borrado.", "success").then(() => location.reload());
            } else {
                Swal.fire("No se pudo borrar", data.error || "Error", "error");
            }
        } catch (e) {
            Swal.fire("Error", "No se pudo conectar con el servidor", "error");
        }
    }
};

function prepararViaje(lat, lng) {
    document.getElementById('form-lat').value = lat;
    document.getElementById('form-lng').value = lng;
    togglePanel('panel-publicar');
    mapa.closePopup();
}

async function unirseViaje(idViaje, evento, boton) {
    evento.stopPropagation();
    const res = await fetch(`${URL_BACKEND}/api/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_viaje: idViaje, id_pasajero: usuarioID })
    });
    if (res.ok) {
        Swal.fire("¡Genial!", "Te has unido al viaje", "success").then(() => location.reload());
    } else {
        const err = await res.json();
        Swal.fire("Error", err.error || "No se pudo unir", "error");
    }
}

async function enviarViajeAlBack() {
    const inputFecha = document.getElementById('form-fecha');
    let fechaFinal = inputFecha.value;
    if (!fechaFinal && inputFecha._flatpickr) fechaFinal = inputFecha._flatpickr.input.value;
    if (!fechaFinal) return Swal.fire("Falta la fecha", "Selecciona día y hora", "warning");

    try {
        const fechaISO = new Date(fechaFinal.replace(' ', 'T')).toISOString();
        const datosViaje = {
            id_conductor: usuarioID,
            origen: document.getElementById('form-origen').value,
            destino: document.getElementById('form-destino').value,
            fecha_hora: fechaISO,
            plazas: document.getElementById('form-plazas').value,
            precio: document.getElementById('form-precio').value,
            latitud: document.getElementById('form-lat').value,
            longitud: document.getElementById('form-lng').value,
            categoria: document.getElementById('form-categoria').value
        };

        const res = await fetch(`${URL_BACKEND}/api/crear-viaje`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosViaje)
        });

        if (res.ok) {
            Swal.fire("¡Éxito!", "Viaje publicado correctamente", "success").then(() => location.reload());
        } else {
            const err = await res.json();
            Swal.fire("Error", err.error, "error");
        }
    } catch (error) {
        Swal.fire("Error", "Fallo de conexión", "error");
    }
}

// ==========================================
// CHAT GRUPAL DEL VIAJE
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
            <div style="background:white; width:95%; max-width:450px; height:80vh; max-height:600px; border-radius:20px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
                <div style="background:#1a2e25; color:white; padding:15px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <b id="chat-titulo-d" style="font-size:16px; color:#4ade80;">Chat</b>
                    <button onclick="cerrarChat()" style="color:white; background:none; border:none; font-size:28px; cursor:pointer; line-height:1;">&times;</button>
                </div>
                <div id="chat-mensajes-d" style="flex:1; padding:16px; overflow-y:auto; background:#f8fafc; display:flex; flex-direction:column; gap:12px;">
                    <div style="text-align:center; color:#6b7280; font-size:13px;">Cargando mensajes...</div>
                </div>
                <div style="padding:12px 14px; background:white; border-top:1px solid #e5e7eb; display:flex; gap:10px;">
                    <input type="text" id="input-chat-d" placeholder="Escribe un mensaje..." style="flex:1; padding:11px 16px; border-radius:20px; border:1px solid #d1d5db; outline:none; font-size:14px;">
                    <button onclick="enviarMensaje()" style="background:#16a34a; color:white; border:none; padding:0 18px; border-radius:20px; cursor:pointer; font-weight:bold;">Enviar</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('input-chat-d').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarMensaje();
        });
    }

    modal.style.display = 'flex';
    chatViajeActual = idViaje;
    document.getElementById('chat-titulo-d').innerText = `Chat del viaje a ${destino}`;

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
        if (!res.ok) throw new Error();
        const mensajes = await res.json();
        const contenedor = document.getElementById('chat-mensajes-d');
        if (!contenedor) return;

        if (mensajes.length === 0) {
            contenedor.innerHTML = `<div style="text-align:center; color:#6b7280; font-size:13px; margin-top:20px; background:white; padding:10px; border-radius:10px;">No hay mensajes aún. ¡Di hola!</div>`;
            return;
        }

        const estaAlFinal = contenedor.scrollHeight - contenedor.scrollTop <= contenedor.clientHeight + 50;

        contenedor.innerHTML = mensajes.map(m => {
            const esMio = m.id_usuario === usuarioID;
            const hora = new Date(m.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const nombre = m.usuarios?.nombre || 'Usuario';
            const avatar = m.usuarios?.avatar_url || `https://ui-avatars.com/api/?name=${nombre}&background=1a2e25&color=4ade80`;

            if (esMio) {
                return `
                <div style="align-self:flex-end; max-width:85%; display:flex; flex-direction:column; align-items:flex-end;">
                    <div style="background:#dcfce7; padding:10px 14px; border-radius:16px 16px 4px 16px; font-size:14px; color:#111827; word-break:break-word;">${m.mensaje}</div>
                    <small style="font-size:10px; color:#9ca3af; margin-top:3px;">${hora}</small>
                </div>`;
            } else {
                return `
                <div style="align-self:flex-start; max-width:85%; display:flex; gap:8px;">
                    <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; align-self:flex-end; border:1px solid #ddd; object-fit:cover;">
                    <div style="display:flex; flex-direction:column; align-items:flex-start;">
                        <small style="font-size:11px; color:#4b5563; margin-bottom:3px; font-weight:bold;">${nombre}</small>
                        <div style="background:white; padding:10px 14px; border-radius:16px 16px 16px 4px; font-size:14px; color:#111827; border:1px solid #e5e7eb; word-break:break-word;">${m.mensaje}</div>
                        <small style="font-size:10px; color:#9ca3af; margin-top:3px;">${hora}</small>
                    </div>
                </div>`;
            }
        }).join('');

        if (estaAlFinal) contenedor.scrollTop = contenedor.scrollHeight;
    } catch (e) { console.error(e); }
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
            const c = document.getElementById('chat-mensajes-d');
            if (c) c.scrollTop = c.scrollHeight;
        }, 100);
    } catch (e) {
        Swal.fire("Error", "No se pudo enviar el mensaje", "error");
    }
}

// ==========================================
// CHAT PRIVADO CON EL CONDUCTOR
// ==========================================
let chatPrivadoReceptorID = null;
let chatPrivadoReceptorNombre = null;
let intervaloChatPrivado = null;

window.abrirChatPrivado = function (idReceptor, nombreReceptor) {
    if (!usuarioID) return Swal.fire("Inicia sesión", "Debes estar conectado", "info");

    chatPrivadoReceptorID = idReceptor;
    chatPrivadoReceptorNombre = nombreReceptor;

    let modal = document.getElementById('modal-chat-privado');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-chat-privado';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:99999; justify-content:center; align-items:center;';

        modal.innerHTML = `
            <div style="background:white; width:95%; max-width:420px; height:80vh; max-height:580px; border-radius:20px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
                <div style="background:#1a2e25; color:white; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:36px; height:36px; border-radius:50%; background:#4ade80; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; color:#1a2e25;" id="chat-privado-avatar">?</div>
                        <div>
                            <div style="font-weight:700; font-size:15px; color:#4ade80;" id="chat-privado-nombre">Cargando...</div>
                            <div style="font-size:11px; color:rgba(255,255,255,0.6);">Mensaje privado</div>
                        </div>
                    </div>
                    <button onclick="cerrarChatPrivado()" style="color:white; background:none; border:none; font-size:26px; cursor:pointer; line-height:1;">&times;</button>
                </div>
                <div id="chat-privado-mensajes" style="flex:1; padding:16px; overflow-y:auto; background:#f8fafc; display:flex; flex-direction:column; gap:12px;">
                    <div style="text-align:center; color:#9ca3af; font-size:13px;">Cargando mensajes...</div>
                </div>
                <div style="padding:12px 14px; background:white; border-top:1px solid #e5e7eb; display:flex; gap:10px;">
                    <input type="text" id="input-chat-privado" placeholder="Escribe un mensaje..." 
                        style="flex:1; padding:11px 16px; border-radius:20px; border:1px solid #d1d5db; outline:none; font-size:14px; background:#f9fafb;">
                    <button onclick="enviarMensajePrivado()" 
                        style="background:#16a34a; color:white; border:none; padding:0 18px; border-radius:20px; cursor:pointer; font-weight:700; font-size:14px;">
                        Enviar
                    </button>
                </div>
            </div>`;

        document.body.appendChild(modal);
        document.getElementById('input-chat-privado').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarMensajePrivado();
        });
    }

    document.getElementById('chat-privado-nombre').innerText = nombreReceptor;
    const iniciales = nombreReceptor.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('chat-privado-avatar').innerText = iniciales;

    modal.style.display = 'flex';

    if (intervaloChatPrivado) clearInterval(intervaloChatPrivado);
    cargarMensajesPrivados();
    intervaloChatPrivado = setInterval(cargarMensajesPrivados, 2500);
};

window.cerrarChatPrivado = function () {
    const modal = document.getElementById('modal-chat-privado');
    if (modal) modal.style.display = 'none';
    chatPrivadoReceptorID = null;
    if (intervaloChatPrivado) clearInterval(intervaloChatPrivado);
};

async function cargarMensajesPrivados() {
    if (!chatPrivadoReceptorID || !usuarioID) return;
    try {
        const res = await fetch(`${URL_BACKEND}/api/mensajes-privados/${usuarioID}/${chatPrivadoReceptorID}`);
        if (!res.ok) throw new Error();
        const mensajes = await res.json();

        const contenedor = document.getElementById('chat-privado-mensajes');
        if (!contenedor) return;

        if (mensajes.length === 0) {
            contenedor.innerHTML = `<div style="text-align:center; color:#9ca3af; font-size:13px; margin-top:20px; background:white; padding:12px; border-radius:12px;">
                Sé el primero en escribir 👋
            </div>`;
            return;
        }

        const estaAlFinal = contenedor.scrollHeight - contenedor.scrollTop <= contenedor.clientHeight + 50;

        contenedor.innerHTML = mensajes.map(m => {
            const esMio = m.id_emisor === usuarioID;
            const hora = new Date(m.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const nombre = esMio ? 'Tú' : (m.emisor?.nombre || 'Usuario');

            // 🌟 NUEVO: Obtenemos el avatar o generamos uno por defecto
            const avatar = m.emisor?.avatar_url || `https://ui-avatars.com/api/?name=${nombre}&background=1a2e25&color=4ade80`;

            if (esMio) {
                // Tus mensajes (Derecha, sin foto)
                return `
                <div style="align-self:flex-end; max-width:80%; display:flex; flex-direction:column; align-items:flex-end;">
                    <div style="background:#dcfce7; padding:10px 14px; border-radius:16px 16px 4px 16px; font-size:14px; color:#111827; word-break:break-word;">
                        ${m.mensaje}
                    </div>
                    <small style="font-size:10px; color:#9ca3af; margin-top:3px;">${hora} ${m.leido ? '✓✓' : '✓'}</small>
                </div>`;
            } else {
                // Mensajes del conductor (Izquierda, CON FOTO)
                return `
                <div style="align-self:flex-start; max-width:85%; display:flex; gap:8px;">
                    <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; align-self:flex-end; border:1px solid #ddd; object-fit:cover;">
                    <div style="display:flex; flex-direction:column; align-items:flex-start;">
                        <small style="font-size:11px; color:#6b7280; margin-bottom:3px; font-weight:600;">${nombre}</small>
                        <div style="background:white; padding:10px 14px; border-radius:16px 16px 16px 4px; font-size:14px; color:#111827; border:1px solid #e5e7eb; word-break:break-word;">
                            ${m.mensaje}
                        </div>
                        <small style="font-size:10px; color:#9ca3af; margin-top:3px;">${hora}</small>
                    </div>
                </div>`;
            }
        }).join('');

        if (estaAlFinal) contenedor.scrollTop = contenedor.scrollHeight;
    } catch (e) { console.error(e); }
}

async function enviarMensajePrivado() {
    const input = document.getElementById('input-chat-privado');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto || !chatPrivadoReceptorID) return;
    input.value = '';
    try {
        await fetch(`${URL_BACKEND}/api/mensajes-privados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_emisor: usuarioID, id_receptor: chatPrivadoReceptorID, mensaje: texto })
        });
        cargarMensajesPrivados();
        cargarPanelChats();
        setTimeout(() => {
            const c = document.getElementById('chat-privado-mensajes');
            if (c) c.scrollTop = c.scrollHeight;
        }, 100);
    } catch (e) {
        Swal.fire("Error", "No se pudo enviar el mensaje", "error");
    }


}

// ==========================================
// 💬 CENTRO DE MENSAJES UNIFICADO
// ==========================================
window.cargarPanelChats = async function () {
    const contenedor = document.getElementById('lista-chats');
    if (!usuarioID || !contenedor) return;

    contenedor.innerHTML = `<div style="text-align:center; padding:20px; color:#6b7280;">⏳ Cargando tus mensajes...</div>`;

    try {
        // 1. Pedimos los chats privados al servidor
        const resPrivados = await fetch(`${URL_BACKEND}/api/inbox/${usuarioID}`);

        if (!resPrivados.ok) {
            console.error("🚨 Error del servidor en Inbox:", await resPrivados.text());
        }

        const privados = resPrivados.ok ? await resPrivados.json() : [];

        // 2. Pedimos a qué viajes estamos unidos para sacar sus chats grupales
        const resViajes = await fetch(`${URL_BACKEND}/api/mis-viajes/${usuarioID}`);
        const viajes = resViajes.ok ? await resViajes.json() : [];

        let html = '';

        // --- SECCIÓN A: CHATS DE VIAJES ---
        if (viajes.length > 0) {
            html += `<h4 style="margin: 0 0 10px 0; color: #1a2e25; padding: 0 5px;">🚗 Chats Grupales (Mis Viajes)</h4>`;
            viajes.forEach(v => {
                html += `
                <div onclick="abrirChat('${v.id}', '${v.destino}')" style="display:flex; align-items:center; gap:12px; background:white; padding:12px; border-radius:14px; cursor:pointer; border:1px solid #e5e7eb; margin-bottom:10px; transition:0.2s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='white'">
                    <div style="width:46px; height:46px; border-radius:50%; background:#1a2e25; color:#4ade80; display:flex; justify-content:center; align-items:center; font-size:20px; border: 2px solid #e5e7eb;">🛣️</div>
                    <div style="flex:1;">
                        <b style="font-size:15px; color:#111827;">Viaje a ${v.destino}</b>
                        <div style="font-size:13px; color:#6b7280;">Pulsa para abrir el grupo</div>
                    </div>
                </div>`;
            });
        }

        // --- SECCIÓN B: CHATS PRIVADOS ---
        html += `<h4 style="margin: 15px 0 10px 0; color: #1a2e25; padding: 0 5px;">👤 Mensajes Privados</h4>`;
        if (privados.length > 0) {
            privados.forEach(c => {
                const avatar = c.usuario?.avatar_url || `https://ui-avatars.com/api/?name=${c.usuario.nombre}&background=1a2e25&color=4ade80`;
                const f = new Date(c.fecha);
                const hoy = new Date();
                const esHoy = f.getDate() === hoy.getDate() && f.getMonth() === hoy.getMonth();
                const fechaStr = esHoy ? f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

                html += `
                <div onclick="abrirChatPrivado('${c.usuario.id}', '${c.usuario.nombre}')" style="display:flex; align-items:center; gap:12px; background:white; padding:12px; border-radius:14px; cursor:pointer; border:1px solid #e5e7eb; margin-bottom:10px; transition:0.2s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='white'">
                    <img src="${avatar}" style="width:46px; height:46px; border-radius:50%; object-fit:cover; border:1px solid #ddd;">
                    <div style="flex:1; overflow:hidden;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px; align-items:center;">
                            <b style="font-size:15px; color:#111827;">${c.usuario.nombre}</b>
                            <small style="color:#16a34a; font-weight:bold; font-size:11px;">${fechaStr}</small>
                        </div>
                        <div style="font-size:13px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${c.ultimoMensaje}
                        </div>
                    </div>
                </div>`;
            });
        } else {
            html += `<div style="text-align:center; padding:10px; background:white; border-radius:12px; border:1px solid #e5e7eb; color:#9ca3af; font-size:13px;">No tienes mensajes privados.</div>`;
        }

        if (viajes.length === 0 && privados.length === 0) {
            contenedor.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca3af; font-size:14px;">Aún no tienes ningún chat activo. Únete a un viaje para empezar.</div>`;
        } else {
            contenedor.innerHTML = html;
        }

    } catch (e) {
        contenedor.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">Error cargando los chats. Reintenta.</div>`;
    }
};

// ==========================================
// ARRASTRAR PANELES
// ==========================================
function hacerArrastrable(elmnt, handle) {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    const disparador = handle || elmnt;

    disparador.onmousedown = dragMouseDown;
    disparador.addEventListener('touchstart', dragTouchStart, { passive: false });

    function dragMouseDown(e) {
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        p3 = e.clientX; p4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        p1 = p3 - e.clientX; p2 = p4 - e.clientY;
        p3 = e.clientX; p4 = e.clientY;
        aplicarMovimiento();
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

    function dragTouchStart(e) {
        if (e.target.tagName === 'BUTTON') return;
        const touch = e.touches[0];
        p3 = touch.clientX; p4 = touch.clientY;
        document.addEventListener('touchmove', dragTouchMove, { passive: false });
        document.addEventListener('touchend', closeTouchDrag);
    }

    function dragTouchMove(e) {
        const touch = e.touches[0];
        p1 = p3 - touch.clientX; p2 = p4 - touch.clientY;
        p3 = touch.clientX; p4 = touch.clientY;
        aplicarMovimiento();
    }

    function closeTouchDrag() {
        document.removeEventListener('touchmove', dragTouchMove);
        document.removeEventListener('touchend', closeTouchDrag);
    }

    function aplicarMovimiento() {
        if (window.innerWidth <= 1024) return;
        let nuevaPosicionTop = elmnt.offsetTop - p2;
        let nuevaPosicionLeft = elmnt.offsetLeft - p1;
        const alturaHeader = document.getElementById('menu-superior').offsetHeight || 60;
        if (nuevaPosicionTop < alturaHeader + 10) nuevaPosicionTop = alturaHeader + 10;
        const maxTop = window.innerHeight - 50;
        if (nuevaPosicionTop > maxTop) nuevaPosicionTop = maxTop;
        if (nuevaPosicionLeft < 0) nuevaPosicionLeft = 0;
        const maxLeft = window.innerWidth - elmnt.offsetWidth;
        if (nuevaPosicionLeft > maxLeft) nuevaPosicionLeft = maxLeft;
        elmnt.style.top = nuevaPosicionTop + "px";
        elmnt.style.left = nuevaPosicionLeft + "px";
    }
}
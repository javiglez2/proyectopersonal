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
    // 🌟 Eliminado el arrastrable del panel de chats antiguo
});

// ==========================================
// 📱 APERTURA DE PANELES (MÓVIL / TABLET / PC)
// ==========================================
window.togglePanel = function (idPanel) {
    const panel = document.getElementById(idPanel);
    if (!panel) return;

    const esMovilOTablet = window.innerWidth <= 1024;

    if (esMovilOTablet) {
        const estaAbierto = panel.classList.contains('abierta');

        document.querySelectorAll('.tarjeta-flotante').forEach(p => {
            p.classList.remove('abierta');
            setTimeout(() => { if (!p.classList.contains('abierta')) p.style.display = 'none'; }, 350);
        });

        if (!estaAbierto) {
            panel.style.display = 'flex';
            setTimeout(() => panel.classList.add('abierta'), 10);
        }
    } else {
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'flex';

            if (idPanel === 'panel-mis-viajes') {
                const anchoPanel = panel.offsetWidth || 750;
                panel.style.left = (window.innerWidth / 2 - anchoPanel / 2) + 'px';
                panel.style.transform = 'none'; 
            }
        } else {
            panel.style.display = 'none';
        }
    }

    if (idPanel === 'panel-mis-viajes') cargarMisViajes();
    // 🌟 Eliminado el if de cargarPanelChats
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
        
        if (estaLleno && !esConductor && !yaUnido) {
            btnHTML = `<span style="background:#fee2e2; padding:4px 8px; border-radius:20px; color:#ef4444; font-size:11px; font-weight:bold; white-space:nowrap;">Lleno</span>`;
        } else if (esConductor) {
            btnHTML = `<span style="background:#f3f4f6; padding:4px 8px; border-radius:20px; color:#4b5563; font-size:11px; font-weight:bold; white-space:nowrap;">Tu viaje ${estaLleno ? ' (Lleno)' : ''}</span>`;
        } else if (yaUnido) {
            btnHTML = `<span style="background:#dcfce7; padding:4px 8px; border-radius:20px; color:#166534; font-size:11px; font-weight:bold; white-space:nowrap;">✔ Ya estás dentro ${estaLleno ? ' (Lleno)' : ''}</span>`;
        }

        // 🌟 Modificado: Redirige a chat.html
        let btnContactar = '';
        if (!esConductor) {
            btnContactar = `<button onclick="event.stopPropagation(); window.location.href='chat.html'" 
                style="background:#f0fdf4; border:1px solid #bbf7d0; color:#16a34a; padding:7px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer;">
                💬 Chat
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

            const pasajerosHTML = v.reservas && v.reservas.length > 0
                ? v.reservas.map(r => {
                    const nombrePas = r.usuarios?.nombre || 'Pasajero';

                    // 🌟 Modificado: Redirige a chat.html
                    if (esConductor) {
                        return `<span style="background:#dbeafe; color:#1e40af; padding:4px 10px; border-radius:12px; font-size:12px; margin-right:5px; border:1px solid #bfdbfe; display:inline-flex; align-items:center; gap:6px; font-weight:bold;">
                            👤 ${nombrePas} 
                            <button onclick="window.location.href='chat.html'" style="background:none; border:none; cursor:pointer; padding:0; font-size:15px; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Ir a chats">💬</button>
                        </span>`;
                    } else {
                        return `<span style="background:#f3f4f6; color:#374151; padding:4px 10px; border-radius:12px; font-size:12px; margin-right:5px; border:1px solid #e5e7eb; font-weight:bold;">👤 ${nombrePas}</span>`;
                    }
                }).join('')
                : 'Nadie aún';

            const cat = v.categoria || 'General';
            const estilos = obtenerEstilosCategoria(cat);

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
                        <button onclick="window.location.href='chat.html'" 
                            style="width:100%; background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:8px;">
                            💬 Ir a mis chats
                        </button>
                    `}
                    <button onclick="window.location.href='chat.html'" style="width:100%; background:#1a2e25; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">
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

// ==========================================
// SISTEMA DE NOTIFICACIONES DE CHAT
// ==========================================
async function comprobarMensajesNuevos() {
    const userId = localStorage.getItem('benaluma_user_id');
    if (!userId) return;

    try {
        const res = await fetch(`https://proyectopersonal-0xcu.onrender.com/api/mensajes/no-leidos/${userId}`);
        
        if (res.ok) {
            const datos = await res.json();
            const numeroMensajes = datos.no_leidos || 0; 
            
            const badge = document.getElementById('notificacion-chat');
            if (!badge) return; // Por si el ID no existe en el HTML
            
            if (numeroMensajes > 0) {
                badge.textContent = numeroMensajes;
                badge.classList.remove('oculto');
            } else {
                badge.classList.add('oculto');
            }
        }
    } catch (error) {
        console.error("Error comprobando mensajes:", error);
    }
}

comprobarMensajesNuevos();
setInterval(comprobarMensajesNuevos, 10000);
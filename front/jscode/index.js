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
// 🗺️ INICIALIZAR MAPA, MENÚ Y CALENDARIO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar el mapa de Leaflet
    mapa = L.map('miMapa').setView([36.65, -4.50], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO'
}).addTo(mapa);
    setTimeout(() => { mapa.invalidateSize(); }, 500);

    // 2. Evento para publicar un viaje al hacer clic en el mapa
    mapa.on('click', (e) => {
        if (!usuarioID) return alert("Debes iniciar sesión para publicar");
        if (marcadorTemp) mapa.removeLayer(marcadorTemp);
        marcadorTemp = L.marker(e.latlng).addTo(mapa).bindPopup(`<button onclick="prepararViaje(${e.latlng.lat}, ${e.latlng.lng})" style="background:#2563eb; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Publicar aquí 🚗</button>`).openPopup();
    });

    // 3. Cargar el nombre y la foto del usuario en el menú superior
    if (usuarioID) {
        document.getElementById('nombre-usuario-menu').innerText = nombreUsuario;
        fetch(`${URL_BACKEND}/api/usuarios/${usuarioID}`)
            .then(r => r.json())
            .then(u => { if(u.avatar_url) document.getElementById('avatar-menu').src = u.avatar_url; });
    }

    // 4. Activar el calendario moderno (Flatpickr)
    flatpickr("#form-fecha", {
        enableTime: true,
        dateFormat: "Y-m-d\\TH:i",
        minDate: "today",
        time_24hr: true,
        locale: "es"
    });

    // 5. Cargar las listas de viajes
    cargarViajes();
    cargarMisViajes();

    // 6. Activar el sistema de arrastrar en los 3 paneles
    hacerArrastrable(document.getElementById("panel-disponibles"), document.getElementById("cabecera-disponibles"));
    hacerArrastrable(document.getElementById("panel-mis-viajes"), document.getElementById("cabecera-mis-viajes"));
    hacerArrastrable(document.getElementById("panel-publicar"), document.getElementById("cabecera-publicar"));
});


// ==========================================
// 📱 PANELES Y DROPDOWN (MENÚ)
// ==========================================
function togglePanel(idPanel) {
    const panel = document.getElementById(idPanel);
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        
        // Ensanchar Mis Viajes para las 2 columnas
        if(idPanel === 'panel-mis-viajes') {
            if (window.innerWidth > 768) panel.style.width = '700px';
            cargarMisViajes();
        }
        // Tamaño normal para Disponibles
        if(idPanel === 'panel-disponibles') {
            if (window.innerWidth > 768) panel.style.width = '320px';
            cargarViajes();
        }
    } else {
        panel.style.display = 'none';
    }
}

function toggleDropdown() {
    document.getElementById("myDropdown").classList.toggle("show");
}

window.onclick = function(event) {
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
// 📍 VIAJES DISPONIBLES
// ==========================================
// --- VIAJES DISPONIBLES ---
async function cargarViajes() {
    const contenedor = document.getElementById('lista-viajes');
    try {
        const res = await fetch(`${URL_BACKEND}/api/viajes`);
        const viajes = await res.json();
        
        contenedor.innerHTML = ''; // Limpiamos el contenedor

        // 🔥 NUEVO: Si no hay viajes en la base de datos
        if (viajes.length === 0) {
            contenedor.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #6b7280;">
                    <p style="font-size: 14px; margin: 0;">No hay viajes disponibles ahora mismo.</p>
                </div>
            `;
            return; // Salimos de la función para no intentar hacer el forEach
        }

        // Si hay viajes, los dibujamos como siempre
        viajes.forEach(v => {
            // Dibujar marcador en el mapa
            L.marker([v.latitud, v.longitud], { icon: iconoCoche }).addTo(mapa)
             .bindPopup(`<b>${v.usuarios?.nombre || 'Conductor'}</b> va a <b>${v.destino}</b>`);

            const ocupadas = v.plazas_totales - v.plazas_disponibles;
            const yaUnido = v.reservas?.some(r => r.id_pasajero === usuarioID);
            const esConductor = v.id_conductor === usuarioID;

            let btnHTML = `<button onclick="unirseViaje('${v.id}', event, this)" style="background:#10b981; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Unirme</button>`;
            if (!usuarioID) btnHTML = '';
            else if (esConductor) btnHTML = `<span style="color:gray; font-size:12px;">Tu viaje</span>`;
            else if (yaUnido) btnHTML = `<span style="color:green; font-size:12px;">✔ Ya dentro</span>`;

            const div = document.createElement('div');
            div.style = "background:white; padding:15px; border-radius:10px; margin-bottom:10px; border: 1px solid #ddd; cursor:pointer;";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between"><b>🏁 ${v.destino}</b> <b style="color:#2563eb">${v.precio}€</b></div>
                <div style="font-size:13px; color:#666; margin:5px 0;">De: ${v.origen}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <small>👤 ${v.usuarios?.nombre || 'User'} (${ocupadas}/${v.plazas_totales})</small>
                    ${btnHTML}
                </div>
            `;
            div.onclick = () => mapa.flyTo([v.latitud, v.longitud], 15);
            contenedor.appendChild(div);
        });
    } catch (e) { 
        console.error(e);
        contenedor.innerHTML = "<p style='padding: 15px; color: red; text-align: center;'>Error al cargar viajes.</p>"; 
    }
}

async function unirseViaje(idViaje, evento, boton) {
    evento.stopPropagation();
    boton.disabled = true; boton.innerText = "...";
    try {
        const res = await fetch(`${URL_BACKEND}/api/reservar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_viaje: idViaje, id_pasajero: usuarioID })
        });
        if (res.ok) { alert("¡Unido!"); cargarViajes(); cargarMisViajes(); }
        else { alert("Error al unirse"); boton.disabled = false; boton.innerText = "Unirme"; }
    } catch (e) { alert("Error"); }
}


// ==========================================
// ⭐ MIS VIAJES (PANEL 2 COLUMNAS)
// ==========================================
async function cargarMisViajes() {
    const contenedor = document.getElementById('lista-mis-viajes');
    if (!usuarioID) { 
        contenedor.innerHTML = "<p style='padding: 15px; text-align: center;'>Inicia sesión para ver tus viajes.</p>"; 
        return; 
    }
    
    contenedor.innerHTML = '<div style="padding: 15px; text-align: center;">Cargando tus viajes...</div>';
    
    try {
        const res = await fetch(`${URL_BACKEND}/api/mis-viajes/${usuarioID}`);
        const viajes = await res.json();
        
        contenedor.innerHTML = ''; 

        if(viajes.length === 0) {
            contenedor.innerHTML = "<p style='padding: 15px; text-align: center;'>No tienes viajes programados.</p>";
            return;
        }

        const viajesCreados = viajes.filter(v => v.id_conductor === usuarioID);
        const viajesUnidos = viajes.filter(v => v.id_conductor !== usuarioID);

        const pintarTarjeta = (v, esConductor) => {
            let diaFormateado = "No definida";
            let horaFormateada = "No definida";
            if(v.fecha_hora) {
                const fechaObj = new Date(v.fecha_hora);
                diaFormateado = fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                horaFormateada = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            }

            const conductor = v.usuarios ? v.usuarios.nombre : 'Desconocido';
            let pasajerosArray = v.reservas ? v.reservas.map(r => r.usuarios?.nombre || 'Alguien') : [];
            const textoPasajeros = pasajerosArray.length > 0 ? pasajerosArray.join(', ') : 'Aún no hay nadie';
            const colorBorde = esConductor ? '#60b4ec' : '#5334c4';

            return `
                <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #f3f4f6; border-left: 5px solid ${colorBorde};">
                    <div style="margin-bottom: 10px;">
                        <b style="font-size: 15px; display: block; margin-bottom: 4px;">De: ${v.origen}</b>
                        <b style="font-size: 15px; display: block;">A: ${v.destino}</b>
                    </div>
                    
                    <div style="font-size: 13px; color: #4b5563; margin-bottom: 12px; line-height: 1.6; background: #f9fafb; padding: 10px; border-radius: 8px;">
                        <b>Día:</b> ${diaFormateado} <br>
                        <b>Hora:</b> ${horaFormateada} <br>
                        <b>Conductor:</b> ${conductor} <br>
                        <b>Pasajeros:</b> ${textoPasajeros}
                    </div>
                    
                    <button onclick="abrirChat('${v.id}', '${v.destino}')" style="width: 100%; background: #374151; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s;">
                        Abrir Chat
                    </button>
                </div>
            `;
        };

        let htmlFinal = '<div style="display: flex; flex-wrap: wrap; gap: 20px; padding: 10px;">';

        htmlFinal += `<div style="flex: 1; min-width: 280px;">`;
        htmlFinal += `<h4 style="margin: 0 0 15px 0; padding-bottom: 5px; color: #60b4ec; border-bottom: 2px solid #60b4ec;">Viajes que he creado</h4>`;
        if (viajesCreados.length > 0) {
            viajesCreados.forEach(v => htmlFinal += pintarTarjeta(v, true));
        } else {
            htmlFinal += `<p style="color: #6b7280; font-size: 14px;">No has creado viajes aún.</p>`;
        }
        htmlFinal += `</div>`;

        htmlFinal += `<div style="flex: 1; min-width: 280px;">`;
        htmlFinal += `<h4 style="margin: 0 0 15px 0; padding-bottom: 5px; color: #5334c4; border-bottom: 2px solid #5334c4;">Viajes a los que me uní</h4>`;
        if (viajesUnidos.length > 0) {
            viajesUnidos.forEach(v => htmlFinal += pintarTarjeta(v, false));
        } else {
            htmlFinal += `<p style="color: #6b7280; font-size: 14px;">No te has unido a ningún viaje.</p>`;
        }
        htmlFinal += `</div>`;

        htmlFinal += '</div>';

        contenedor.innerHTML = htmlFinal;

    } catch (e) { 
        console.error(e);
        contenedor.innerHTML = "<p style='padding: 15px; color: red; text-align: center;'>Error al cargar tus viajes.</p>"; 
    }
}


// ==========================================
// 🚗 PUBLICAR VIAJE
// ==========================================
function prepararViaje(lat, lng) {
    document.getElementById('form-lat').value = lat;
    document.getElementById('form-lng').value = lng;
    document.getElementById('panel-publicar').style.display = 'block';
    mapa.closePopup();
}

function cancelarPublicacion() {
    document.getElementById('panel-publicar').style.display = 'none';
    if (marcadorTemp) mapa.removeLayer(marcadorTemp);
}

async function enviarViajeAlBack() {
    const fechaInput = document.getElementById('form-fecha').value;
    
    if (!fechaInput) {
        alert("⚠️ Por favor, elige el día y la hora antes de confirmar.");
        return; 
    }

    const viaje = {
        id_conductor: usuarioID,
        origen: document.getElementById('form-origen').value,
        destino: document.getElementById('form-destino').value,
        fecha_hora: fechaInput,
        plazas: parseInt(document.getElementById('form-plazas').value),
        precio: parseFloat(document.getElementById('form-precio').value),
        latitud: parseFloat(document.getElementById('form-lat').value),
        longitud: parseFloat(document.getElementById('form-lng').value)
    };
    
    const res = await fetch(`${URL_BACKEND}/api/crear-viaje`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viaje)
    });
    
    if (res.ok) { 
        alert("¡Viaje publicado!"); 
        location.reload(); 
    } else {
        alert("Error al guardar en el servidor.");
    }
}


// ==========================================
// 🖱️ FUNCIÓN ARRASTRAR PANELES
// ==========================================
function hacerArrastrable(elmnt, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (handle) handle.onmousedown = dragMouseDown;
    else elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event; e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event; e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null; document.onmousemove = null;
    }
}


// ==========================================
// 💬 LÓGICA DEL CHAT (AUTO-GENERADO Y A PRUEBA DE FALLOS)
// ==========================================
let chatViajeActual = null;
let intervaloChat = null;

window.abrirChat = function(idViaje, destino) {
    console.log("🟢 Abriendo chat para:", idViaje);
    
    // 1. Comprobamos si el chat ya está creado. Si no, lo inyectamos al final del body con JS.
    let modal = document.getElementById('modal-chat-dinamico');
    
    if (!modal) {
        console.log("🛠️ Creando HTML del chat al vuelo...");
        modal = document.createElement('div');
        modal.id = 'modal-chat-dinamico';
        // Le damos un z-index absurdamente alto para que nada lo tape
        modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 2147483647; justify-content: center; align-items: center; font-family: sans-serif;';
        
        modal.innerHTML = `
            <div style="background: white; width: 90%; max-width: 450px; height: 80vh; max-height: 600px; border-radius: 15px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <div style="background: #134b2a; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <b id="chat-titulo-dinamico" style="font-size: 18px; margin: 0;">💬 Chat</b>
                    <button onclick="cerrarChat()" style="background: none; border: none; color: white; font-size: 28px; cursor: pointer; line-height: 1;">&times;</button>
                </div>
                <div id="chat-mensajes-dinamico" style="flex: 1; padding: 20px; overflow-y: auto; background: #f3f4f6; display: flex; flex-direction: column; gap: 10px;">
                </div>
                <div style="padding: 15px; background: white; border-top: 1px solid #ddd; display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="input-mensaje-dinamico" placeholder="Escribe tu mensaje..." style="flex: 1; padding: 12px 15px; border-radius: 8px; border: 1px solid #ccc; outline: none; font-size: 15px;">
                    <button onclick="enviarMensaje()" style="background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">Enviar</button>
                </div>
            </div>
        `;
        // Lo pegamos DIRECTAMENTE en el body. ¡Es imposible que quede oculto!
        document.body.appendChild(modal);
    }

    // 2. Mostrarlo y configurarlo
    modal.style.display = 'flex';
    chatViajeActual = idViaje;
    document.getElementById('chat-titulo-dinamico').innerText = `💬 Chat: ${destino}`;
    
    // 3. Cargar mensajes
    cargarMensajes();
    intervaloChat = setInterval(cargarMensajes, 2000);
};

window.cerrarChat = function() {
    const modal = document.getElementById('modal-chat-dinamico');
    if (modal) modal.style.display = 'none';
    chatViajeActual = null;
    clearInterval(intervaloChat);
};

window.cargarMensajes = async function() {
    if (!chatViajeActual) return;
    try {
        const res = await fetch(`${URL_BACKEND}/api/mensajes/${chatViajeActual}`);
        if (!res.ok) return;
        const mensajes = await res.json();
        const contenedor = document.getElementById('chat-mensajes-dinamico');
        if (!contenedor) return;

        const estabaAbajo = contenedor.scrollHeight - contenedor.scrollTop <= contenedor.clientHeight + 50;
        contenedor.innerHTML = '';

        if (mensajes.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; color:#6b7280; margin-top:20px;">No hay mensajes aún. ¡Di hola!</p>';
        }

        mensajes.forEach(m => {
            const esMio = m.id_usuario === usuarioID;
            const alinear = esMio ? 'align-self: flex-end;' : 'align-self: flex-start;';
            const color = esMio ? 'background: #dcf8c6;' : 'background: white; border: 1px solid #e5e7eb;';
            const nombre = esMio ? 'Tú' : (m.usuarios?.nombre || 'Usuario');
            
            contenedor.innerHTML += `
                <div style="${alinear} max-width: 80%; display: flex; flex-direction: column;">
                    <small style="color: #6b7280; font-size: 11px; margin-bottom: 2px; ${esMio ? 'text-align: right;' : 'text-align: left;'}">${nombre}</small>
                    <div style="${color} padding: 10px 15px; border-radius: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); word-break: break-word; font-size: 14px;">
                        ${m.mensaje}
                    </div>
                </div>
            `;
        });

        if (estabaAbajo) contenedor.scrollTop = contenedor.scrollHeight;
    } catch (e) { 
        console.error("Error cargando mensajes:", e); 
    }
};

window.enviarMensaje = async function() {
    const input = document.getElementById('input-mensaje-dinamico');
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
    } catch (e) {
        alert("Error al enviar el mensaje. Revisa tu conexión.");
    }
};

document.addEventListener('keypress', function(e) {
    const modal = document.getElementById('modal-chat-dinamico');
    if (e.key === 'Enter' && modal && modal.style.display === 'flex') {
        enviarMensaje();
    }
});
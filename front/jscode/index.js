const usuarioID = localStorage.getItem('benaluma_user_id');
const nombreUsuario = localStorage.getItem('benaluma_user_nombre') || 'Usuario';

// --- CONFIGURACIÓN DEL MAPA ---
const mapa = L.map('miMapa', { center: [36.65, -4.50], zoom: 13 });
setTimeout(() => {
    mapa.invalidateSize();
}, 500);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapa);

const iconoCoche = L.icon({
    iconUrl: 'https://api.iconify.design/fa6-solid/car-side.svg?color=red',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
});


// --- MENÚ SUPERIOR Y PERFIL ---
async function inicializarMenu() {
    const menu = document.getElementById('menu-usuario');
    if (!menu) return;

    if (usuarioID) {
        // Por defecto usamos iniciales
        let fotoUrl = `https://ui-avatars.com/api/?name=${nombreUsuario}&background=2563eb&color=fff&rounded=true&bold=true`;

        try {
            // Intentamos traer los datos actualizados (por si cambió la foto)
            const res = await fetch(`http://localhost:3000/api/usuarios/${usuarioID}`);
            const usuario = await res.json();
            if (res.ok && usuario.avatar_url) {
                fotoUrl = usuario.avatar_url; // Si tiene foto real, la usamos
            }
        } catch (e) { console.log("Usando avatar por defecto"); }

        menu.innerHTML = `
            <button class="btn btn-primario" onclick="document.getElementById('modal-mis-viajes').style.display='flex'">Mis Viajes</button>
            
            <div class="perfil-dropdown-container">
                <img src="${fotoUrl}" alt="Perfil" class="avatar-perfil" onclick="toggleDropdown()" title="Mi Perfil" style="width:40px; height:40px; border-radius:50%; object-fit:cover; cursor:pointer; border:2px solid white;">
                
                <div id="dropdown-perfil" class="dropdown-content">
                    <div class="dropdown-header">
                        <b>${nombreUsuario}</b>
                        <small>Usuario Benaluma</small>
                    </div>
                    <hr>
                    <a href="perfil.html"><span class="icono">👤</span> Mi Perfil</a>
                    <a href="#" onclick="document.getElementById('modal-mis-viajes').style.display='flex'; toggleDropdown(); return false;"><span class="icono">🚗</span> Mis Viajes</a>
                    <hr>
                    <a href="#" onclick="cerrarSesion()" class="logout-text"><span class="icono">🚪</span> Cerrar Sesión</a>
                </div>
            </div>
        `;
    } else {
        menu.innerHTML = `<a href="login.html" class="btn btn-secundario">Entrar</a>`;
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById("dropdown-perfil");
    if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

window.onclick = function (event) {
    if (!event.target.matches('.avatar-perfil')) {
        const dropdown = document.getElementById("dropdown-perfil");
        if (dropdown && dropdown.style.display === "block") {
            dropdown.style.display = "none";
        }
    }
}

function cerrarSesion() {
    localStorage.clear();
    location.reload();
}


// --- PUBLICAR VIAJE (MAPA) ---
let marcadorTemp = null;
mapa.on('click', (e) => {
    if (!usuarioID) return alert("Logueate primero");
    if (marcadorTemp) mapa.removeLayer(marcadorTemp);
    marcadorTemp = L.marker(e.latlng).addTo(mapa).bindPopup(`
        <button onclick="prepararViaje(${e.latlng.lat}, ${e.latlng.lng})" style="cursor:pointer; padding:5px; background:#2563eb; color:white; border:none; border-radius:5px;">Publicar aquí</button>
    `).openPopup();
});

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
    const viaje = {
        id_conductor: usuarioID,
        origen: document.getElementById('form-origen').value,
        destino: document.getElementById('form-destino').value,
        fecha_hora: document.getElementById('form-fecha').value,
        plazas: parseInt(document.getElementById('form-plazas').value),
        precio: parseFloat(document.getElementById('form-precio').value),
        latitud: parseFloat(document.getElementById('form-lat').value),
        longitud: parseFloat(document.getElementById('form-lng').value)
    };

    const res = await fetch('http://localhost:3000/api/crear-viaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viaje)
    });

    if (res.ok) {
        alert("¡Viaje publicado con éxito!");
        location.reload();
    } else {
        alert("Error al publicar el viaje");
    }
}


// --- LÓGICA DE VIAJES DISPONIBLES Y UNIRSE ---
async function cargarViajes() {
    const lista = document.getElementById('lista-viajes');
    if (!lista) return;

    try {
        const res = await fetch('http://localhost:3000/api/viajes');
        const viajes = await res.json();

        lista.innerHTML = '';

        viajes.forEach(v => {
            const conductor = v.usuarios ? v.usuarios.nombre : "Conductor";
            // LÓGICA DE FOTO: Si tiene avatar_url usamos esa, si no, ui-avatars
            const fotoConductor = (v.usuarios && v.usuarios.avatar_url)
                ? v.usuarios.avatar_url
                : `https://ui-avatars.com/api/?name=${conductor}&background=random&color=fff&rounded=true`;

            const m = L.marker([v.latitud, v.longitud], { icon: iconoCoche }).addTo(mapa);
            m.bindPopup(`<b>${conductor}</b> va a <b>${v.destino}</b>`);

            const ocupadas = v.plazas_totales - v.plazas_disponibles;
            const yaEstaUnido = v.reservas && v.reservas.some(reserva => reserva.id_pasajero === usuarioID);
            const esElConductor = v.id_conductor === usuarioID;

            let botonHTML = '';
            if (!usuarioID) {
                botonHTML = `<button onclick="alert('Loguéate primero')" class="btn-unirme">Unirme</button>`;
            } else if (esElConductor) {
                botonHTML = `<button disabled class="btn-unirme" style="background:gray; cursor:not-allowed;">Tu Viaje</button>`;
            } else if (yaEstaUnido) {
                botonHTML = `<button disabled class="btn-unirme" style="background:green; cursor:not-allowed;">Ya estás dentro</button>`;
            } else {
                botonHTML = `<button onclick="unirseViaje('${v.id}', event, this)" class="btn-unirme">Unirme</button>`;
            }

            const div = document.createElement('div');
            div.className = 'tarjeta-viaje';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4>🏁 A: ${v.destino}</h4>
                    <span class="precio-tag">${v.precio.toFixed(2)}€</span>
                </div>
                <p>🏠 De: ${v.origen}</p>
                <div style="display:flex; align-items:center; gap:10px; margin-top:10px; padding-top:10px; border-top:1px solid #f3f4f6;">
                    <img src="${fotoConductor}" width="35" height="35" style="border-radius:50%; object-fit:cover;">
                    <div style="flex:1;">
                        <small>Conductor</small><br>
                        <b style="font-size:14px;">${conductor}</b>
                    </div>
                    ${botonHTML}
                </div>
                <small style="display:block; margin-top:5px; font-weight:bold; color:#2563eb;">
                    💺 Ocupadas: ${ocupadas} / ${v.plazas_totales}
                </small>
            `;

            div.onclick = () => mapa.flyTo([v.latitud, v.longitud], 15);
            lista.appendChild(div);
        });

    } catch (e) {
        console.error("Error cargando viajes:", e);
        lista.innerHTML = '<p style="color: red;">Error cargando los viajes.</p>';
    }
}

async function unirseViaje(idViaje, evento, botonElemento) {
    evento.stopPropagation();
    if (!usuarioID) return alert("Debes iniciar sesión para unirte a un viaje.");

    botonElemento.disabled = true;
    botonElemento.innerText = 'Uniéndose...';

    try {
        const res = await fetch('http://localhost:3000/api/reservar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_viaje: idViaje, id_pasajero: usuarioID })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.mensaje);
            location.reload();
        } else {
            alert(data.error);
            botonElemento.disabled = false;
            botonElemento.innerText = 'Unirme';
        }
    } catch (error) {
        console.error("Error al reservar:", error);
        alert("No se pudo conectar con el servidor.");
        botonElemento.disabled = false;
        botonElemento.innerText = 'Unirme';
    }
}


// --- MIS VIAJES (PANEL MODAL) ---
async function cargarMisViajes() {
    if (!usuarioID) return;

    const divCreados = document.getElementById('lista-creados');
    const divUnidos = document.getElementById('lista-unidos');

    try {
        const res = await fetch(`http://localhost:3000/api/mis-viajes/${usuarioID}`);
        const viajes = await res.json();

        divCreados.innerHTML = '';
        divUnidos.innerHTML = '';

        const viajesCreados = viajes.filter(v => v.id_conductor === usuarioID);
        const viajesUnidos = viajes.filter(v => v.id_conductor !== usuarioID);

        const pintarTarjeta = (v, contenedor, esConductor) => {
            const conductor = v.usuarios ? v.usuarios.nombre : 'Desconocido';
            // También usamos la foto aquí
            const fotoConductor = (v.usuarios && v.usuarios.avatar_url)
                ? v.usuarios.avatar_url
                : `https://ui-avatars.com/api/?name=${conductor}&background=random&color=fff&rounded=true`;

            let pasajerosArray = v.reservas ? v.reservas.map(r => r.usuarios.nombre) : [];
            const textoPasajeros = pasajerosArray.length > 0 ? pasajerosArray.join(', ') : 'Nadie aún';
            const ocupadas = v.plazas_totales - v.plazas_disponibles;
            const colorBorde = esConductor ? '#2563eb' : '#10b981';

            contenedor.innerHTML += `
                <div class="tarjeta-viaje" style="border-left: 4px solid ${colorBorde}; background: white;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <img src="${fotoConductor}" width="30" height="30" style="border-radius:50%; object-fit:cover;">
                        <h4 style="margin: 0;">🏁 ${v.origen} ➔ ${v.destino}</h4>
                    </div>
                    <p style="margin: 0; font-size:14px;"><b>Conductor:</b> ${conductor}</p>
                    <p style="margin: 5px 0 0 0; font-size:13px; color:#555;">👥 <b>Pasajeros:</b> ${textoPasajeros}</p>
                    <small style="display:block; margin-top:10px; margin-bottom:10px; background:#f3f4f6; padding:5px; border-radius:5px; text-align:center;">
                        💺 Ocupadas: <b>${ocupadas}/${v.plazas_totales}</b>
                    </small>
                    <button onclick="abrirChat('${v.id}', '${v.origen} ➔ ${v.destino}')" class="btn btn-primario" style="width: 100%; background: #374151;">💬 Abrir Chat</button>
                </div>
            `;
        };

        if (viajesCreados.length === 0) divCreados.innerHTML = '<p>No has publicado viajes.</p>';
        else viajesCreados.forEach(v => pintarTarjeta(v, divCreados, true));

        if (viajesUnidos.length === 0) divUnidos.innerHTML = '<p>No te has unido a ningún viaje.</p>';
        else viajesUnidos.forEach(v => pintarTarjeta(v, divUnidos, false));

    } catch (e) {
        console.error("Error cargando mis viajes:", e);
        divCreados.innerHTML = '<p>Error al cargar.</p>';
        divUnidos.innerHTML = '<p>Error al cargar.</p>';
    }
}


// --- PANEL DE VIAJES ARRASTRABLE ---
function hacerArrastrable(elemento) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const cabecera = document.getElementById("cabecera-arrastrable");

    if (window.innerWidth <= 768 || !cabecera) return;

    cabecera.onmousedown = iniciarArrastre;

    function iniciarArrastre(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = soltarElemento;
        document.onmousemove = moverElemento;
        cabecera.style.cursor = 'grabbing';
    }

    function moverElemento(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elemento.style.top = (elemento.offsetTop - pos2) + "px";
        elemento.style.left = (elemento.offsetLeft - pos1) + "px";
        elemento.style.bottom = "auto";
    }

    function soltarElemento() {
        document.onmouseup = null;
        document.onmousemove = null;
        cabecera.style.cursor = 'grab';
    }
}


// --- CHAT PRIVADO ---
let chatViajeActual = null;
let intervaloChat = null;

async function cargarMensajes() {
    if (!chatViajeActual) return;
    try {
        const res = await fetch(`http://localhost:3000/api/mensajes/${chatViajeActual}`);
        const mensajes = await res.json();
        const contenedor = document.getElementById('chat-mensajes');
        const estabaAbajo = contenedor.scrollHeight - contenedor.scrollTop <= contenedor.clientHeight + 50;

        contenedor.innerHTML = '';

        mensajes.forEach(m => {
            const esMio = m.id_usuario === usuarioID;
            
            // Lógica de la hora: Extraemos HH:MM de la fecha de creación
            const fecha = new Date(m.creado_en);
            const horaFormateada = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const fotoMensaje = (m.usuarios && m.usuarios.avatar_url) 
                ? m.usuarios.avatar_url 
                : `https://ui-avatars.com/api/?name=${m.usuarios ? m.usuarios.nombre : 'U'}&background=random&color=fff&rounded=true`;

            const alineacionContenedor = esMio ? 'flex-direction: row-reverse; align-self: flex-end;' : 'flex-direction: row; align-self: flex-start;';
            const estilosGlobo = esMio ? 'background: #dcf8c6; color: #111; border-radius: 15px 0px 15px 15px;' : 'background: white; color: #111; border-radius: 0px 15px 15px 15px;';
            const nombre = esMio ? 'Tú' : (m.usuarios ? m.usuarios.nombre : 'Usuario');
            
            contenedor.innerHTML += `
                <div style="display: flex; align-items: flex-end; gap: 8px; margin-bottom: 12px; width: 100%; ${alineacionContenedor}">
                    <img src="${fotoMensaje}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1px solid #ccc; flex-shrink: 0;">
                    
                    <div style="max-width: 75%; padding: 8px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); ${estilosGlobo}">
                        <small style="font-size: 10px; font-weight: bold; color: #2563eb; display: block; margin-bottom: 2px;">${nombre}</small>
                        <div style="font-size: 14px; line-height: 1.4; word-wrap: break-word;">${m.mensaje}</div>
                        <small style="font-size: 9px; color: #888; display: block; text-align: right; margin-top: 4px;">${horaFormateada}</small>
                    </div>
                </div>
            `;
        });

        if (estabaAbajo) contenedor.scrollTop = contenedor.scrollHeight;
    } catch (e) { console.error("Error chat:", e); }
}

function abrirChat(idViaje, titulo) {
    chatViajeActual = idViaje;
    document.getElementById('chat-titulo').innerText = titulo;
    document.getElementById('modal-chat').style.display = 'flex';
    cargarMensajes();
    intervaloChat = setInterval(cargarMensajes, 2000);
}

function cerrarChat() {
    document.getElementById('modal-chat').style.display = 'none';
    chatViajeActual = null;
    clearInterval(intervaloChat);
}

async function enviarMensaje() {
    const input = document.getElementById('input-mensaje');
    const texto = input.value.trim();
    if (!texto || !chatViajeActual) return;
    input.value = '';
    await fetch('http://localhost:3000/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_viaje: chatViajeActual, id_usuario: usuarioID, mensaje: texto })
    });
    cargarMensajes();
}

// Evento Enter para el chat
const inputChat = document.getElementById('input-mensaje');
if (inputChat) {
    inputChat.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensaje(); });
}


// --- INICIALIZACIÓN ---
inicializarMenu();
cargarViajes();
if (usuarioID) cargarMisViajes();
hacerArrastrable(document.getElementById("lista-viajes-contenedor"));

// Añade esto al final de tu archivo index.js
hacerArrastrable(document.getElementById("panel-publicar"), document.getElementById("cabecera-publicar"));
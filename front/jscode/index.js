const usuarioID = localStorage.getItem('benaluma_user_id');
const nombreUsuario = localStorage.getItem('benaluma_user_nombre') || 'Usuario';

// Configuración Mapa
const mapa = L.map('miMapa', { center: [36.65, -4.50], zoom: 13 });
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapa);

const iconoCoche = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3082/3082349.png',
    iconSize: [35, 35], iconAnchor: [17, 35], popupAnchor: [0, -35]
});

// Menú Usuario
const menu = document.getElementById('menu-usuario');
menu.innerHTML = usuarioID
    ? `<span>👤 Hola, <b>${nombreUsuario}</b></span> <button class="btn btn-secundario" onclick="localStorage.clear();location.reload()">Salir</button>`
    : `<a href="login.html" class="btn btn-secundario">Entrar</a>`;

// Publicar Viaje (Mapa)
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
    const res = await fetch('https://proyectopersonal-0xcu.onrender.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(viaje)
    });
    if (res.ok) location.reload();
}

// Cargar Viajes y Lista
async function cargarViajes() {
    const lista = document.getElementById('lista-viajes');
    try {
        const res = await fetch('https://proyectopersonal-0xcu.onrender.com');
        const viajes = await res.json();
        lista.innerHTML = '';
        // Dentro de jscode/index.js -> cargarViajes()

        viajes.forEach(v => {
            // A) Marcador en el mapa (igual que antes)
            const m = L.marker([v.latitud, v.longitud], { icon: iconoCoche }).addTo(mapa);

            // B) Lógica de la Tarjeta
            const conductor = v.usuarios ? v.usuarios.nombre : "Conductor desconocido";

            // Formatear hora bonita (Ej: "Lun, 14:30")
            const fecha = new Date(v.fecha_hora_salida).toLocaleString('es-ES', {
                weekday: 'short', hour: '2-digit', minute: '2-digit'
            });

            const div = document.createElement('div');
            div.className = 'tarjeta-viaje';
            div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4>🏁 A: ${v.destino}</h4>
            <span class="precio-tag">${v.precio.toFixed(2)}€</span>
        </div>
        
        <p>🏠 De: ${v.origen}</p>
        <p>⏰ ${fecha}</p>
        
        <div style="display:flex; align-items:center; gap:10px; margin-top:5px; padding-top:10px; border-top:1px solid #f3f4f6;">
            <img src="https://ui-avatars.com/api/?name=${conductor}&background=random&color=fff&rounded=true" width="30" height="30" alt="Avatar">
            <div style="flex:1;">
                <small>Conductor</small><br>
                <b style="font-size:14px; color:#1f2937;">${conductor}</b>
            </div>
            <button onclick="unirseViaje('${v.id}', event)" class="btn-unirme">Unirme</button>
        </div>
    `;

            div.onclick = () => {
                mapa.flyTo([v.latitud, v.longitud], 15);
                m.bindPopup(`<b>${conductor}</b> va a ${v.destino}`).openPopup();
            };
            lista.appendChild(div);
        });
    } catch (e) { console.log(e); }
}

async function unirseViaje(idViaje, e) {
    e.stopPropagation();
    if (!usuarioID) return alert("Logueate");
    const res = await fetch('http://localhost:3000/api/reservar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_viaje: idViaje, id_pasajero: usuarioID })
    });
    if (res.ok) { alert("¡Te has unido!"); location.reload(); }
}

cargarViajes();
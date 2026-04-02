// ==========================================
// 📍 GESTIÓN DE VIAJES (LISTAS)
// ==========================================
async function cargarViajes() {
    const contenedor = document.getElementById('lista-viajes');
    try {
        const res = await fetch(`${URL_BACKEND}/api/viajes`);
        let viajes = await res.json();
        contenedor.innerHTML = '';

        if (viajes.length === 0) {
            contenedor.innerHTML = `<div style="padding:20px; text-align:center; color:#6b7280;">📍 No hay viajes disponibles por ahora.</div>`;
            return;
        }

        // Ordenamos para que los viajes más cercanos en fecha salgan primero
        viajes.sort((a, b) => new Date(a.fecha_hora_salida) - new Date(b.fecha_hora_salida));

        viajes.forEach(v => {
            // Poner el marcador en el mapa
            L.marker([v.latitud, v.longitud], { icon: iconoCoche }).addTo(mapa)
                .bindPopup(`<b>${v.usuarios?.nombre || 'Conductor'}</b> va a <b>${v.destino}</b>`);

            const yaUnido = v.reservas?.some(r => r.id_pasajero === usuarioID);
            const esConductor = v.id_conductor === usuarioID;

            // Lógica de botones
            let btnHTML = `<button onclick="unirseViaje('${v.id}', event, this)" style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold; transition:0.2s;">Unirme</button>`;
            if (esConductor) btnHTML = `<span style="background:#f3f4f6; padding:5px 10px; border-radius:5px; color:#4b5563; font-size:12px; font-weight:bold;">🚗 Tu viaje</span>`;
            else if (yaUnido) btnHTML = `<span style="background:#dcf8c6; padding:5px 10px; border-radius:5px; color:#166534; font-size:12px; font-weight:bold;">✔ Ya estás dentro</span>`;

            // Formatear Fecha y Hora
            const fechaObj = new Date(v.fecha_hora_salida);
            const diaFormateado = fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const horaFormateada = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            // Foto de perfil del conductor
            const avatarConductor = v.usuarios?.avatar_url || `https://ui-avatars.com/api/?name=${v.usuarios?.nombre || 'C'}&background=1d352d&color=fff`;

            // Construir la nueva tarjeta interactiva
            const div = document.createElement('div');
            div.className = "viaje-item";
            div.style = "background:white; padding:15px; border-radius:12px; margin-bottom:15px; border:1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor:pointer; transition: all 0.2s;";
            
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="font-size:16px; color:#111827;">🏁 ${v.destino}</b> 
                    <b style="color:#2563eb; font-size:18px;">${v.precio}€</b>
                </div>
                <div style="font-size:13px; color:#6b7280; margin-top:4px;">📍 De: ${v.origen}</div>
                
                <div style="background:#f9fafb; border-radius:8px; padding:10px; margin-top:12px; display:flex; justify-content:space-between; font-size:13px; color:#374151; font-weight:500;">
                    <span>📅 ${diaFormateado} - ⏰ ${horaFormateada}</span>
                    <span>💺 ${v.plazas_disponibles} plazas</span>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="${avatarConductor}" style="width:28px; height:28px; border-radius:50%; border:1px solid #ddd;">
                        <small style="font-weight:bold; color:#374151;">${v.usuarios?.nombre || 'Usuario'}</small>
                    </div>
                    ${btnHTML}
                </div>
            `;
            
            // Efecto Hover
            div.onmouseover = () => div.style.borderColor = '#2563eb';
            div.onmouseout = () => div.style.borderColor = '#e5e7eb';
            
            // Volar al punto en el mapa al hacer clic
            div.onclick = () => mapa.flyTo([v.latitud, v.longitud], 16);
            
            contenedor.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

// ==========================================
// 🚗 PUBLICAR VIAJE AL SERVIDOR
// ==========================================
async function enviarViajeAlBack() {
    const inputFecha = document.getElementById('form-fecha');
    let fechaFinal = inputFecha.value; 

    if (!fechaFinal && inputFecha._flatpickr) {
        fechaFinal = inputFecha._flatpickr.input.value;
    }

    if (!fechaFinal || fechaFinal.trim() === "") {
        return Swal.fire("Falta la fecha", "Toca el recuadro verde para elegir día y hora", "warning");
    }

    try {
        // Formateo infalible de fecha para Supabase
        const fechaISO = new Date(fechaFinal.replace(' ', 'T')).toISOString();

        // El backend en server.js (línea 74) espera "fecha_hora", no "fecha_hora_salida"
        const viaje = {
            id_conductor: usuarioID,
            origen: document.getElementById('form-origen').value || "Origen marcado en mapa",
            destino: document.getElementById('form-destino').value || "Destino pendiente",
            fecha_hora: fechaISO, 
            plazas: parseInt(document.getElementById('form-plazas').value) || 1,
            precio: parseFloat(document.getElementById('form-precio').value.toString().replace(',', '.')) || 0,
            latitud: parseFloat(document.getElementById('form-lat').value),
            longitud: parseFloat(document.getElementById('form-lng').value)
        };

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
            Swal.fire({
                title: "¡Viaje Publicado!", 
                text: "Ya aparece en los Viajes Disponibles", 
                icon: "success",
                confirmButtonColor: '#10b981'
            }).then(() => location.reload());
        } else {
            console.error("❌ Error del servidor:", data);
            Swal.fire("Error 400", data.error || data.message || "Error al publicar", "error");
        }

    } catch (error) {
        console.error("❌ Error de red:", error);
        Swal.fire("Error", "No se pudo conectar con el servidor", "error");
    }
}
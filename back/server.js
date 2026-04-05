const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const upload = multer();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = 'https://lmhtkbrpforiohsxxlzh.supabase.co';
const supabaseKey = 'sb_publishable_-GvUgrKPGPLXpuZfms-AoA_tDQmyvp6';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- SIGNUP ---
app.post('/api/signup', async (req, res) => {
    const { nombre, apellidos, prefijo_telefono, telefono, email, contrasena } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contrasena, salt);
    const { data, error } = await supabase.from('usuarios').insert([{
        nombre,
        apellidos,
        prefijo_telefono: prefijo_telefono || '+34',
        telefono,
        email,
        contrasena: hash
    }]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data[0]);
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
    const { email, contrasena } = req.body;
    const { data: user, error } = await supabase.from('usuarios').select('*').eq('email', email).single();
    if (error || !user) return res.status(400).json({ error: 'Usuario no encontrado' });
    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) return res.status(400).json({ error: 'Contraseña incorrecta' });
    res.status(200).json({ usuario_id: user.id, nombre: user.nombre });
});

// --- GET PERFIL ---
app.get('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('usuarios')
        .select('nombre, apellidos, email, telefono, prefijo_telefono, avatar_url')
        .eq('id', id)
        .single();
    if (error) return res.status(400).json({ error: 'Usuario no encontrado' });
    res.json(data);
});

// --- PUT PERFIL (con cambio de contraseña opcional) ---
app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellidos, telefono, prefijo_telefono, nueva_contrasena } = req.body;

    const camposActualizar = { nombre, apellidos, telefono, prefijo_telefono };

    // Si manda nueva contraseña, la hasheamos y la incluimos
    if (nueva_contrasena) {
        const salt = await bcrypt.genSalt(10);
        camposActualizar.contrasena = await bcrypt.hash(nueva_contrasena, salt);
    }

    const { data, error } = await supabase
        .from('usuarios')
        .update(camposActualizar)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: 'Error al actualizar el perfil' });
    res.json({ mensaje: 'Perfil actualizado con éxito', usuario: data[0] });
});

// --- VIAJES ---
app.get('/api/viajes', async (req, res) => {
    const { data, error } = await supabase
        .from('viajes')
        .select(`*, usuarios!id_conductor ( nombre, apellidos, avatar_url ), reservas ( id_pasajero )`)
        .eq('estado', 'Activo')
        
        .order('fecha_hora_salida', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// --- OBTENER MIS VIAJES (Corregido con id_pasajero) ---
app.get('/api/mis-viajes/:id_usuario', async (req, res) => {
    try {
        const { id_usuario } = req.params;

        // 1. Buscamos los viajes donde soy conductor (AÑADIDO id_pasajero a las reservas)
        const { data: viajesConductor, error: errCond } = await supabase
            .from('viajes')
            .select(`*, usuarios!id_conductor(nombre, apellidos, avatar_url), reservas(id_pasajero, usuarios!fk_pasajero(nombre, apellidos, avatar_url))`)
            .eq('id_conductor', id_usuario);
        if (errCond) throw errCond;

        // 2. Buscamos los viajes donde soy pasajero
        const { data: reservasPasajero, error: errPas } = await supabase
            .from('reservas')
            .select(`viajes(*, usuarios!id_conductor(nombre, apellidos, avatar_url), reservas(id_pasajero, usuarios!fk_pasajero(nombre, apellidos, avatar_url)))`)
            .eq('id_pasajero', id_usuario);
        if (errPas) throw errPas;

        const conductorArray = viajesConductor || [];
        const pasajeroArray = (reservasPasajero || []).map(r => r.viajes).filter(v => v !== null);
        res.json([...conductorArray, ...pasajeroArray]);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo tus viajes' });
    }
});

app.post('/api/crear-viaje', async (req, res) => {
    try {
        const { id_conductor, origen, destino, fecha_hora, plazas, precio, latitud, longitud, categoria } = req.body;
        const { error } = await supabase.from('viajes').insert([{
            id_conductor, origen, destino,
            fecha_hora_salida: fecha_hora,
            plazas_totales: parseInt(plazas),
            plazas_disponibles: parseInt(plazas),
            precio: parseFloat(precio),
            latitud: parseFloat(latitud),
            longitud: parseFloat(longitud),
            estado: 'Activo',
            categoria: categoria || 'General'
        }]);
        if (error) throw error;
        res.status(200).json({ mensaje: 'Viaje creado' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/reservar', async (req, res) => {
    try {
        const { id_viaje, id_pasajero } = req.body;

        const { data: yaReservado } = await supabase
            .from('reservas')
            .select('id')
            .eq('id_viaje', id_viaje)
            .eq('id_pasajero', id_pasajero)
            .single();

        if (yaReservado) {
            return res.status(400).json({ error: 'Ya estás unido a este viaje' });
        }

        const { error: errorReserva } = await supabase
            .from('reservas')
            .insert([{ id_viaje, id_pasajero, estado_reserva: 'Confirmada' }]);

        if (errorReserva) throw errorReserva;

        await supabase.rpc('decrementar_plaza', { viaje_id: id_viaje });

        res.status(200).json({ mensaje: 'Te has unido al viaje correctamente' });
    } catch (error) {
        console.error('Error al reservar:', error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/viajes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await supabase.from('reservas').delete().eq('id_viaje', id);
        await supabase.from('mensajes_viajes').delete().eq('id_viaje', id);
        const { error } = await supabase.from('viajes').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ mensaje: 'Viaje eliminado correctamente' });
    } catch (error) {
        res.status(400).json({ error: 'No se pudo eliminar el viaje' });
    }
});

// --- CHAT ---
app.get('/api/mensajes/:id_viaje', async (req, res) => {
    const { id_viaje } = req.params;
    const { data, error } = await supabase
        .from('mensajes_viajes')
        .select(`*, usuarios(nombre, apellidos, avatar_url)`)
        .eq('id_viaje', id_viaje)
        .order('creado_en', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

app.post('/api/mensajes', async (req, res) => {
    const { id_viaje, id_usuario, mensaje } = req.body;
    if (!mensaje || mensaje.trim() === '') return res.status(400).json({ error: 'Mensaje vacío' });
    const { error } = await supabase.from('mensajes_viajes').insert([{ id_viaje, id_usuario, mensaje }]);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// --- UPLOAD AVATAR ---
app.post('/api/usuarios/:id/upload-avatar', upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.params.id;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No se ha subido ningún archivo' });

        const extension = file.originalname.split('.').pop();
        const fileName = `${userId}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from('benaluma')
            .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('benaluma').getPublicUrl(fileName);
        const avatarUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase.from('usuarios').update({ avatar_url: avatarUrl }).eq('id', userId);
        if (updateError) throw updateError;

        res.json({ mensaje: 'Foto de perfil actualizada!', avatarUrl });
    } catch (error) {
        res.status(500).json({ error: 'Fallo al subir la foto' });
    }
});

// ==========================================
// 💬 MENSAJES PRIVADOS
// ==========================================

// Obtener conversación privada entre dos usuarios
app.get('/api/mensajes-privados/:id_emisor/:id_receptor', async (req, res) => {
    const { id_emisor, id_receptor } = req.params;

    // 🌟 ESCUDO ANTI-CUELGUES: Si falta alguna ID, cortamos aquí
    if (!id_emisor || id_emisor === 'undefined' || !id_receptor || id_receptor === 'undefined') {
        return res.status(400).json({ error: 'IDs de chat no válidas' });
    }

    const { data, error } = await supabase
        .from('mensajes_privados')
        .select(`*,
            emisor:usuarios!id_emisor(nombre, apellidos, avatar_url),
            receptor:usuarios!id_receptor(nombre, apellidos, avatar_url)
        `)
        .or(`and(id_emisor.eq.${id_emisor},id_receptor.eq.${id_receptor}),and(id_emisor.eq.${id_receptor},id_receptor.eq.${id_emisor})`)
        .order('creado_en', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    // Marcar como leídos los mensajes recibidos
    await supabase
        .from('mensajes_privados')
        .update({ leido: true })
        .eq('id_receptor', id_emisor)
        .eq('id_emisor', id_receptor);

    // 🚨 EL ESLABÓN PERDIDO: Devolvemos los mensajes a la web
    res.json(data);
});

// Enviar mensaje privado
app.post('/api/mensajes-privados', async (req, res) => {
    const { id_emisor, id_receptor, mensaje } = req.body;
    if (!mensaje || mensaje.trim() === '') return res.status(400).json({ error: 'Mensaje vacío' });
    const { error } = await supabase
        .from('mensajes_privados')
        .insert([{ id_emisor, id_receptor, mensaje }]);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// Obtener número de mensajes no leídos
app.get('/api/mensajes-privados/no-leidos/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;
    const { data, error } = await supabase
        .from('mensajes_privados')
        .select('id_emisor')
        .eq('id_receptor', id_usuario)
        .eq('leido', false);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ total: data.length });
});

// --- OBTENER LA BANDEJA DE ENTRADA (INBOX) ---
app.get('/api/inbox/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;
    
    // 1. Buscamos todos los mensajes privados donde este usuario sea emisor o receptor
    const { data, error } = await supabase
        .from('mensajes_privados')
        .select(`
            *,
            emisor:usuarios!id_emisor(id, nombre, avatar_url),
            receptor:usuarios!id_receptor(id, nombre, avatar_url)
        `)
        .or(`id_emisor.eq.${id_usuario},id_receptor.eq.${id_usuario}`)
        .order('creado_en', { ascending: false }); // Los más recientes primero
        
    if (error) return res.status(400).json({ error: error.message });

    // 2. Agrupamos para mostrar solo 1 tarjeta por cada persona (con el último mensaje)
    const conversaciones = {};
    
    (data || []).forEach(m => {
        // Averiguamos quién es el "otro" en esta conversación
        const otroUsuario = m.id_emisor === id_usuario ? m.receptor : m.emisor;
        if (!otroUsuario) return;
        
        // Como están ordenados del más nuevo al más viejo, el primero que encontramos es el último mensaje enviado
        if (!conversaciones[otroUsuario.id]) {
            conversaciones[otroUsuario.id] = {
                usuario: otroUsuario,
                ultimoMensaje: m.mensaje,
                fecha: m.creado_en
            };
        }
    });

    // Devolvemos la lista limpia a la web
    res.json(Object.values(conversaciones));
});

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => {
    console.log(`Servidor corriendo en el puerto ${puerto}`);
});
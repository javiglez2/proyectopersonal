const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const upload = multer();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://lmhtkbrpforiohsxxlzh.supabase.co';
// Reemplaza esto con tu clave "service_role" (la secreta larga)
const supabaseKey = 'sb_publishable_-GvUgrKPGPLXpuZfms-AoA_tDQmyvp6';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- RUTAS DE USUARIOS ---
app.post('/api/signup', async (req, res) => {
    const { nombre, telefono, email, contrasena } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contrasena, salt);
    const { data, error } = await supabase.from('usuarios').insert([{ nombre, telefono, email, contrasena: hash }]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data[0]);
});

app.post('/api/login', async (req, res) => {
    const { email, contrasena } = req.body;
    const { data: user, error } = await supabase.from('usuarios').select('*').eq('email', email).single();
    if (error || !user) return res.status(400).json({ error: 'Usuario no encontrado' });
    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) return res.status(400).json({ error: 'Contraseña incorrecta' });
    res.status(200).json({ usuario_id: user.id, nombre: user.nombre });
});

// --- RUTAS DE PERFIL ---
app.get('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('usuarios')
        .select('nombre, email, telefono, avatar_url')
        .eq('id', id)
        .single();
    if (error) return res.status(400).json({ error: 'Usuario no encontrado' });
    res.json(data);
});

app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono } = req.body;
    const { data, error } = await supabase.from('usuarios').update({ nombre, telefono }).eq('id', id).select();
    if (error) return res.status(400).json({ error: 'Error al actualizar el perfil' });
    res.json({ mensaje: 'Perfil actualizado con éxito', usuario: data[0] });
});

// --- RUTAS DE VIAJES ---
app.get('/api/viajes', async (req, res) => {
    const { data, error } = await supabase
        .from('viajes')
        .select(`
            *,
            usuarios!id_conductor ( nombre, avatar_url ),
            reservas ( id_pasajero )
        `)
        .eq('estado', 'Activo')
        .gt('plazas_disponibles', 0)
        .order('fecha_hora_salida', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

app.get('/api/mis-viajes/:id_usuario', async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { data: viajesConductor, error: errCond } = await supabase
            .from('viajes')
            .select(`*, usuarios!id_conductor(nombre, avatar_url), reservas(usuarios!fk_pasajero(nombre, avatar_url))`)
            .eq('id_conductor', id_usuario);

        if (errCond) throw errCond;

        const { data: reservasPasajero, error: errPas } = await supabase
            .from('reservas')
            .select(`viajes(*, usuarios!id_conductor(nombre, avatar_url), reservas(usuarios!fk_pasajero(nombre, avatar_url)))`)
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
        // Extraemos los datos exactos que envía el index.js
        const { id_conductor, origen, destino, fecha_hora, plazas, precio, latitud, longitud, categoria } = req.body;

        const { error } = await supabase.from('viajes').insert([{
            id_conductor,
            origen,
            destino,
            fecha_hora_salida: fecha_hora, // Aseguramos que la fecha entre aquí
            plazas_totales: plazas,
            plazas_disponibles: plazas,
            precio: parseFloat(precio),
            latitud: parseFloat(latitud),
            longitud: parseFloat(longitud),
            estado: 'Activo',
            categoria: categoria || 'General' // Si llega vacío, pone General
        }]);

        if (error) throw error;
        res.status(200).json({ mensaje: 'Viaje creado con éxito' });
    } catch (error) {
        console.error("❌ Error en crear-viaje:", error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/viajes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // El orden de borrado es vital por las claves foráneas
        await supabase.from('reservas').delete().eq('id_viaje', id);
        await supabase.from('mensajes_viajes').delete().eq('id_viaje', id);
        const { error } = await supabase.from('viajes').delete().eq('id', id);
        
        if (error) throw error;
        res.status(200).json({ mensaje: 'Viaje eliminado correctamente' });
    } catch (error) {
        console.error("❌ Error al borrar viaje:", error);
        res.status(400).json({ error: 'No se pudo eliminar el viaje' });
    }
});

// --- RUTAS DEL CHAT ---
app.get('/api/mensajes/:id_viaje', async (req, res) => {
    const { id_viaje } = req.params;
    const { data, error } = await supabase
        .from('mensajes_viajes')
        .select(`*, usuarios(nombre, avatar_url)`)
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

// --- RUTA PARA SUBIR FOTO ---
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
        console.error("🔥 Error subiendo foto:", error);
        res.status(500).json({ error: 'Fallo al subir la foto' });
    }
});

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${puerto}`);
});
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors());
app.use(express.json());

// CONFIGURACIÓN SUPABASE (RELLENA CON TUS DATOS)
const supabaseUrl = 'https://lmhtkbrpforiohsxxlzh.supabase.co';
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

// --- RUTAS DE VIAJES ---

// En back/server.js
app.get('/api/viajes', async (req, res) => {
    const { data, error } = await supabase
        .from('viajes')
        .select(`
            *,
            usuarios:id_conductor ( nombre ) // <--- ESTO TRAE EL NOMBRE
        `)
        .eq('estado', 'Activo')
        .gt('plazas_disponibles', 0)
        .order('fecha_hora_salida', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

app.post('/api/crear-viaje', async (req, res) => {
    const { id_conductor, origen, destino, fecha_hora, plazas, precio, latitud, longitud } = req.body;
    const { error } = await supabase.from('viajes').insert([{
        id_conductor, origen, destino, fecha_hora_salida: fecha_hora,
        plazas_totales: plazas, plazas_disponibles: plazas,
        precio, latitud, longitud, estado: 'Activo'
    }]);
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ mensaje: 'Viaje creado' });
});

// --- RUTA DE RESERVAS (UNIRSE AL VIAJE) ---
app.post('/api/reservar', async (req, res) => {
    const { id_viaje, id_pasajero } = req.body;

    // 1. Crear la reserva
    const { error: errReserva } = await supabase.from('reservas').insert([{ id_viaje, id_pasajero }]);
    if (errReserva) return res.status(400).json({ error: 'Ya estás en este viaje o error' });

    // 2. Bajar plazas disponibles
    const { data: v } = await supabase.from('viajes').select('plazas_disponibles').eq('id', id_viaje).single();
    const { error: errUpdate } = await supabase
        .from('viajes')
        .update({ plazas_disponibles: v.plazas_disponibles - 1 })
        .eq('id', id_viaje);

    if (errUpdate) return res.status(400).json({ error: 'Error al actualizar plazas' });
    res.json({ mensaje: '¡Te has unido con éxito!' });
});

// Cambia la línea del puerto por esta:
const puerto = process.env.PORT || 3000;

app.listen(puerto, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${puerto}`);
});
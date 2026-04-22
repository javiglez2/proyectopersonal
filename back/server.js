// ==========================================================================
// UEQO - Backend
// Express + Supabase + JWT Auth + Rate Limiting + Validaciones
// ==========================================================================

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// ==========================================================================
// CONFIGURACIÓN
// ==========================================================================

// 🔐 G1: credenciales en variables de entorno (nunca hardcodeadas)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// Si falta alguna, mejor crashear al arrancar que quedarnos con un server zombie.
if (!SUPABASE_URL || !SUPABASE_KEY || !JWT_SECRET) {
    console.error('❌ Faltan variables de entorno obligatorias: SUPABASE_URL, SUPABASE_KEY, JWT_SECRET');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Dominios permitidos para CORS. Añade aquí los que uses (GitHub Pages, local, Capacitor).
const ORIGENES_PERMITIDOS = [
    'https://javiglez2.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'capacitor://localhost',   // Apps Capacitor Android/iOS
    'http://localhost'         // Fallback Capacitor
];

const JWT_EXPIRA_EN = '7d';       // Los tokens duran 7 días
const BCRYPT_ROUNDS = 10;
const TAMANO_MAX_AVATAR = 5 * 1024 * 1024; // 5 MB

// ==========================================================================
// APP Y MIDDLEWARES GLOBALES
// ==========================================================================

const app = express();

// 🟠 G1-8: CORS con whitelist
app.use(cors({
    origin: (origin, callback) => {
        // Permite peticiones sin Origin (Postman, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (ORIGENES_PERMITIDOS.includes(origin)) return callback(null, true);
        callback(new Error('CORS bloqueado: origen no permitido'));
    },
    credentials: true
}));

// Body parser con límite razonable (evita payloads gigantes)
app.use(express.json({ limit: '100kb' }));

// 🔴 G1-9: Multer con límite de tamaño y filtro de MIME
const upload = multer({
    limits: { fileSize: TAMANO_MAX_AVATAR },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten imágenes'));
        }
        cb(null, true);
    }
});

// ==========================================================================
// HELPERS DE VALIDACIÓN
// ==========================================================================

// UUID v4/v5 (Supabase usa UUIDs): más estricto que un regex genérico
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esUUID = (v) => typeof v === 'string' && UUID_REGEX.test(v);

const esEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Devuelve string trimado o null si no es string válido
const limpiar = (v, maxLen = 200) => {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (t.length === 0 || t.length > maxLen) return null;
    return t;
};

// Mapeo mimetype → extensión segura (evita que el cliente dicte la extensión)
const MIME_A_EXT = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
};

// Categorías permitidas (tiene que coincidir con el selector del frontend)
const CATEGORIAS_VALIDAS = [
    'UMA Teatinos',
    'UMA Ampliación',
    'UMA El Ejido',
    'Centros Antequera/Ronda',
    'PTA (Parque Tecnológico)',
    'Grado Superior',
    'Otros estudios'
];

// ==========================================================================
// 🔑 MIDDLEWARE DE AUTENTICACIÓN (JWT)
// ==========================================================================

// Verifica el token JWT del header Authorization y pone req.usuario = { id, email }.
// Si no hay token o es inválido → 401.
function requiereAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [tipo, token] = header.split(' ');

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Falta token de autenticación' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.usuario = { id: payload.sub, email: payload.email };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o caducado' });
    }
}

// Middleware que comprueba que el :id del path es el usuario autenticado.
// Úsalo en endpoints tipo /api/usuarios/:id donde solo el propio dueño debe acceder.
function requiereSerPropietario(req, res, next) {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
    if (req.usuario.id !== req.params.id) {
        return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
}

// ==========================================================================
// 🚦 RATE LIMITERS
// ==========================================================================

// 🟡 G2-21: rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10,                  // 10 intentos por IP
    message: { error: 'Demasiados intentos de login. Espera 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1h
    max: 5,                   // 5 cuentas por IP por hora
    message: { error: 'Demasiados registros desde esta IP. Espera una hora.' },
    standardHeaders: true,
    legacyHeaders: false
});

const mensajeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 30,             // 30 mensajes por minuto
    message: { error: 'Estás enviando mensajes demasiado rápido. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Limiter general para el resto de endpoints
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', generalLimiter);

// ==========================================================================
// 🌱 HEALTH CHECK (G2-22)
// ==========================================================================

app.get('/', (req, res) => res.json({ status: 'ok', service: 'UEQO API' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ==========================================================================
// 👤 SIGNUP
// ==========================================================================

app.post('/api/signup', signupLimiter, async (req, res) => {
    try {
        // 🔒 Validación de todos los campos antes de tocar nada
        const nombre = limpiar(req.body.nombre, 60);
        const apellidos = limpiar(req.body.apellidos, 80);
        const email = limpiar(req.body.email, 100);
        const telefono = limpiar(req.body.telefono, 20);
        const prefijo_telefono = limpiar(req.body.prefijo_telefono, 6) || '+34';
        const contrasena = typeof req.body.contrasena === 'string' ? req.body.contrasena : '';

        if (!nombre || !apellidos) {
            return res.status(400).json({ error: 'Nombre y apellidos son obligatorios' });
        }
        if (!email || !esEmail(email)) {
            return res.status(400).json({ error: 'Email no válido' });
        }
        if (!telefono || !/^\d{9,15}$/.test(telefono)) {
            return res.status(400).json({ error: 'Teléfono no válido' });
        }
        if (!contrasena || contrasena.length < 8 || contrasena.length > 128) {
            return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 128 caracteres' });
        }
        // Mismas exigencias que el frontend
        if (!/[A-Z]/.test(contrasena) || !/[a-z]/.test(contrasena) || !/\d/.test(contrasena)) {
            return res.status(400).json({ error: 'La contraseña debe tener mayúscula, minúscula y número' });
        }

        // 🔧 G1-5: normalizamos email a lowercase
        const emailNorm = email.toLowerCase();

        // Hash y creación
        const hash = await bcrypt.hash(contrasena, BCRYPT_ROUNDS);

        // 🔒 G1-2: select explícito, NO devolvemos el hash al cliente
        const { data, error } = await supabase.from('usuarios').insert([{
            nombre,
            apellidos,
            prefijo_telefono,
            telefono,
            email: emailNorm,
            contrasena: hash
        }]).select('id, nombre, apellidos, email').single();

        if (error) {
            // Unique constraint violation (email duplicado) = 23505 en PostgreSQL
            if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
                return res.status(409).json({ error: 'Ya existe una cuenta con este correo' });
            }
            console.error('signup error:', error);
            return res.status(400).json({ error: 'No se pudo crear la cuenta' });
        }

        // 🔑 Al registrarse, le damos un token directamente (auto-login)
        const token = jwt.sign(
            { sub: data.id, email: data.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRA_EN }
        );

        res.status(201).json({
            token,
            usuario: { id: data.id, nombre: data.nombre, apellidos: data.apellidos, email: data.email }
        });
    } catch (err) {
        console.error('signup throw:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================================================
// 🔐 LOGIN
// ==========================================================================

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const email = limpiar(req.body.email, 100);
        const contrasena = typeof req.body.contrasena === 'string' ? req.body.contrasena : '';

        if (!email || !esEmail(email) || !contrasena) {
            return res.status(400).json({ error: 'Email o contraseña incorrectos' });
        }

        const emailNorm = email.toLowerCase();

        const { data: user, error } = await supabase
            .from('usuarios')
            .select('id, nombre, email, contrasena')
            .eq('email', emailNorm)
            .single();

        // 🔒 Mensaje unificado: no distinguir "usuario no existe" de "contraseña incorrecta"
        // (evita enumeración de usuarios)
        if (error || !user) {
            // Aún así, hacemos un bcrypt.compare falso para mitigar timing attacks
            await bcrypt.compare(contrasena, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        const match = await bcrypt.compare(contrasena, user.contrasena);
        if (!match) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { sub: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRA_EN }
        );

        res.json({
            token,
            usuario: { id: user.id, nombre: user.nombre, email: user.email }
        });
    } catch (err) {
        console.error('login throw:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================================================
// 👤 PERFIL: GET y PUT
// ==========================================================================

// GET /api/usuarios/:id — solo el propio usuario puede leer su perfil completo
app.get('/api/usuarios/:id', requiereAuth, requiereSerPropietario, async (req, res) => {
    const { id } = req.params;
    if (!esUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellidos, email, telefono, prefijo_telefono, avatar_url')
        .eq('id', id)
        .single();

    if (error || !data) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(data);
});

// 🔧 Endpoint público ligero para mostrar avatar/nombre de OTROS usuarios
// (lo usa el chat, el mapa, etc. para mostrar conductores y compañeros de viaje)
app.get('/api/usuarios/:id/publico', requiereAuth, async (req, res) => {
    const { id } = req.params;
    if (!esUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellidos, avatar_url')
        .eq('id', id)
        .single();

    if (error || !data) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(data);
});

// PUT /api/usuarios/:id — solo el propio usuario
app.put('/api/usuarios/:id', requiereAuth, requiereSerPropietario, async (req, res) => {
    try {
        const { id } = req.params;
        if (!esUUID(id)) return res.status(400).json({ error: 'ID inválido' });

        const nombre = limpiar(req.body.nombre, 60);
        const apellidos = limpiar(req.body.apellidos, 80);
        const telefono = limpiar(req.body.telefono, 20);
        const prefijo_telefono = limpiar(req.body.prefijo_telefono, 6);
        const nueva_contrasena = typeof req.body.nueva_contrasena === 'string' ? req.body.nueva_contrasena : null;

        if (!nombre || !apellidos) {
            return res.status(400).json({ error: 'Nombre y apellidos son obligatorios' });
        }
        if (!telefono || !/^\d{9,15}$/.test(telefono)) {
            return res.status(400).json({ error: 'Teléfono no válido' });
        }

        const camposActualizar = { nombre, apellidos, telefono };
        if (prefijo_telefono) camposActualizar.prefijo_telefono = prefijo_telefono;

        if (nueva_contrasena) {
            if (nueva_contrasena.length < 8 || nueva_contrasena.length > 128 ||
                !/[A-Z]/.test(nueva_contrasena) || !/[a-z]/.test(nueva_contrasena) || !/\d/.test(nueva_contrasena)) {
                return res.status(400).json({ error: 'Contraseña no cumple los requisitos (8+ caracteres, mayúscula, minúscula y número)' });
            }
            camposActualizar.contrasena = await bcrypt.hash(nueva_contrasena, BCRYPT_ROUNDS);
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update(camposActualizar)
            .eq('id', id)
            .select('id, nombre, apellidos, email, telefono, prefijo_telefono, avatar_url')
            .single();

        if (error || !data) {
            console.error('perfil update:', error);
            return res.status(400).json({ error: 'Error al actualizar el perfil' });
        }

        res.json({ mensaje: 'Perfil actualizado con éxito', usuario: data });
    } catch (err) {
        console.error('perfil PUT throw:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================================================
// 🚗 VIAJES
// ==========================================================================

app.get('/api/viajes', requiereAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('viajes')
        .select(`*, usuarios!id_conductor ( nombre, apellidos, avatar_url ), reservas ( id_pasajero )`)
        .eq('estado', 'Activo')
        .order('fecha_hora_salida', { ascending: true });

    if (error) {
        console.error('GET viajes:', error);
        return res.status(500).json({ error: 'Error obteniendo viajes' });
    }
    res.json(data);
});

app.get('/api/mis-viajes/:id_usuario', requiereAuth, async (req, res) => {
    try {
        const { id_usuario } = req.params;
        if (!esUUID(id_usuario)) return res.status(400).json({ error: 'ID inválido' });

        // 🔒 Solo puedes ver tus propios viajes
        if (req.usuario.id !== id_usuario) {
            return res.status(403).json({ error: 'No tienes permiso' });
        }

        const [condResult, pasResult] = await Promise.all([
            supabase
                .from('viajes')
                .select(`*, usuarios!id_conductor(nombre, apellidos, avatar_url), reservas(id_pasajero, usuarios!fk_pasajero(nombre, apellidos, avatar_url))`)
                .eq('id_conductor', id_usuario),
            supabase
                .from('reservas')
                .select(`viajes(*, usuarios!id_conductor(nombre, apellidos, avatar_url), reservas(id_pasajero, usuarios!fk_pasajero(nombre, apellidos, avatar_url)))`)
                .eq('id_pasajero', id_usuario)
        ]);

        if (condResult.error) throw condResult.error;
        if (pasResult.error) throw pasResult.error;

        const conductorArray = condResult.data || [];
        const pasajeroArray = (pasResult.data || []).map(r => r.viajes).filter(v => v !== null);

        // 🔧 G2-15: deduplicar por id (si algún día el usuario es conductor y pasajero
        // del mismo viaje, evita duplicados).
        const vistos = new Set();
        const todos = [...conductorArray, ...pasajeroArray].filter(v => {
            if (vistos.has(v.id)) return false;
            vistos.add(v.id);
            return true;
        });

        res.json(todos);
    } catch (error) {
        console.error('mis-viajes:', error);
        res.status(500).json({ error: 'Error obteniendo tus viajes' });
    }
});

app.post('/api/crear-viaje', requiereAuth, async (req, res) => {
    try {
        // 🔒 El id_conductor lo tomamos del TOKEN, no del body.
        // Así nadie puede crear viajes a nombre de otro.
        const id_conductor = req.usuario.id;

        const origen = limpiar(req.body.origen, 100);
        const destino = limpiar(req.body.destino, 100);
        const fecha_hora = typeof req.body.fecha_hora === 'string' ? req.body.fecha_hora : null;
        const categoria = limpiar(req.body.categoria, 50) || 'Otros estudios';
        const plazas = parseInt(req.body.plazas, 10);
        const precio = parseFloat(req.body.precio);
        const latitud = parseFloat(req.body.latitud);
        const longitud = parseFloat(req.body.longitud);

        if (!origen) return res.status(400).json({ error: 'Origen obligatorio' });
        if (!destino) return res.status(400).json({ error: 'Destino obligatorio' });
        if (!CATEGORIAS_VALIDAS.includes(categoria)) return res.status(400).json({ error: 'Categoría no válida' });
        if (!fecha_hora) return res.status(400).json({ error: 'Fecha obligatoria' });

        // Validar fecha: ISO y en el futuro
        const fechaObj = new Date(fecha_hora);
        if (isNaN(fechaObj.getTime())) return res.status(400).json({ error: 'Fecha no válida' });
        if (fechaObj.getTime() < Date.now() - 5 * 60 * 1000) {
            return res.status(400).json({ error: 'La fecha no puede ser en el pasado' });
        }

        // Validaciones numéricas estrictas
        if (!Number.isFinite(plazas) || plazas < 1 || plazas > 8) {
            return res.status(400).json({ error: 'Las plazas deben ser entre 1 y 8' });
        }
        if (!Number.isFinite(precio) || precio < 0 || precio > 500) {
            return res.status(400).json({ error: 'El precio debe estar entre 0 y 500€' });
        }
        // Bounding box aproximado de la Península + Baleares + Canarias
        if (!Number.isFinite(latitud) || latitud < 27 || latitud > 44) {
            return res.status(400).json({ error: 'Latitud fuera de rango' });
        }
        if (!Number.isFinite(longitud) || longitud < -19 || longitud > 5) {
            return res.status(400).json({ error: 'Longitud fuera de rango' });
        }

        const { data, error } = await supabase.from('viajes').insert([{
            id_conductor,
            origen,
            destino,
            fecha_hora_salida: fechaObj.toISOString(),
            plazas_totales: plazas,
            plazas_disponibles: plazas,
            precio,
            latitud,
            longitud,
            estado: 'Activo',
            categoria
        }]).select('id').single();

        if (error) throw error;
        res.status(201).json({ mensaje: 'Viaje creado', id: data.id });
    } catch (error) {
        console.error('crear-viaje:', error);
        res.status(400).json({ error: 'No se pudo crear el viaje' });
    }
});

// 🔒 RESERVAR — atómico mediante RPC (ver función SQL más abajo en instrucciones)
app.post('/api/reservar', requiereAuth, async (req, res) => {
    try {
        // 🔒 id_pasajero sale del token, no del body
        const id_pasajero = req.usuario.id;
        const { id_viaje } = req.body;

        if (!esUUID(id_viaje)) return res.status(400).json({ error: 'ID de viaje inválido' });

        // 🟢 G3-7: llamada a función RPC atómica que hace todo en una transacción:
        // 1. Verifica que el viaje existe y está activo
        // 2. Verifica que no eres el conductor
        // 3. Verifica que hay plazas
        // 4. Verifica que no estás ya unido
        // 5. Inserta reserva + decrementa plazas en la misma transacción
        const { data, error } = await supabase.rpc('reservar_viaje_atomico', {
            p_id_viaje: id_viaje,
            p_id_pasajero: id_pasajero
        });

        if (error) {
            // La función SQL lanza excepciones con mensajes amigables
            const msg = error.message || 'No se pudo reservar';
            if (/lleno/i.test(msg)) return res.status(409).json({ error: 'El viaje está lleno' });
            if (/ya.*unido|ya.*reservad/i.test(msg)) return res.status(409).json({ error: 'Ya estás unido a este viaje' });
            if (/conductor/i.test(msg)) return res.status(400).json({ error: 'No puedes unirte a tu propio viaje' });
            if (/no.*existe|no encontrado/i.test(msg)) return res.status(404).json({ error: 'Viaje no encontrado' });
            console.error('reservar RPC:', error);
            return res.status(500).json({ error: 'Error al reservar' });
        }

        res.json({ mensaje: 'Te has unido al viaje correctamente' });
    } catch (error) {
        console.error('reservar throw:', error);
        res.status(500).json({ error: 'Error al reservar' });
    }
});

app.delete('/api/viajes/:id', requiereAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!esUUID(id)) return res.status(400).json({ error: 'ID inválido' });

        // 🔒 Verificar que el que pide el DELETE es el conductor del viaje
        const { data: viaje, error: errFetch } = await supabase
            .from('viajes')
            .select('id_conductor')
            .eq('id', id)
            .single();

        if (errFetch || !viaje) return res.status(404).json({ error: 'Viaje no encontrado' });
        if (viaje.id_conductor !== req.usuario.id) {
            return res.status(403).json({ error: 'No eres el conductor de este viaje' });
        }

        // Borrado en cascada
        await supabase.from('reservas').delete().eq('id_viaje', id);
        await supabase.from('mensajes_viajes').delete().eq('id_viaje', id);
        const { error } = await supabase.from('viajes').delete().eq('id', id);
        if (error) throw error;

        res.json({ mensaje: 'Viaje eliminado correctamente' });
    } catch (error) {
        console.error('DELETE viaje:', error);
        res.status(500).json({ error: 'No se pudo eliminar el viaje' });
    }
});

// ==========================================================================
// 💬 CHAT GRUPAL (por viaje)
// ==========================================================================

// Helper: ¿este usuario pertenece a este viaje? (conductor o pasajero)
async function esParteDelViaje(idUsuario, idViaje) {
    const { data: viaje } = await supabase
        .from('viajes')
        .select('id_conductor')
        .eq('id', idViaje)
        .single();

    if (!viaje) return false;
    if (viaje.id_conductor === idUsuario) return true;

    const { data: reserva } = await supabase
        .from('reservas')
        .select('id')
        .eq('id_viaje', idViaje)
        .eq('id_pasajero', idUsuario)
        .maybeSingle();

    return !!reserva;
}

app.get('/api/mensajes/:id_viaje', requiereAuth, async (req, res) => {
    const { id_viaje } = req.params;
    if (!esUUID(id_viaje)) return res.status(400).json({ error: 'ID inválido' });

    // 🔒 Solo los participantes del viaje pueden leer su chat
    if (!(await esParteDelViaje(req.usuario.id, id_viaje))) {
        return res.status(403).json({ error: 'No perteneces a este viaje' });
    }

    const { data, error } = await supabase
        .from('mensajes_viajes')
        .select(`*, usuarios(nombre, apellidos, avatar_url)`)
        .eq('id_viaje', id_viaje)
        .order('creado_en', { ascending: true });

    if (error) return res.status(500).json({ error: 'Error cargando mensajes' });
    res.json(data);
});

app.post('/api/mensajes', requiereAuth, mensajeLimiter, async (req, res) => {
    try {
        const { id_viaje } = req.body;
        const mensaje = limpiar(req.body.mensaje, 2000);

        if (!esUUID(id_viaje)) return res.status(400).json({ error: 'ID de viaje inválido' });
        if (!mensaje) return res.status(400).json({ error: 'Mensaje vacío' });

        // 🔒 Solo los participantes pueden escribir
        if (!(await esParteDelViaje(req.usuario.id, id_viaje))) {
            return res.status(403).json({ error: 'No perteneces a este viaje' });
        }

        // 🔒 id_usuario sale del token, NO del body
        const { error } = await supabase
            .from('mensajes_viajes')
            .insert([{ id_viaje, id_usuario: req.usuario.id, mensaje }]);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('POST mensaje grupal:', error);
        res.status(500).json({ error: 'Error enviando mensaje' });
    }
});

// ==========================================================================
// 🖼️ UPLOAD AVATAR
// ==========================================================================

app.post('/api/usuarios/:id/upload-avatar', requiereAuth, requiereSerPropietario, (req, res) => {
    // Envuelvemos multer para capturar sus errores (tamaño, MIME)
    upload.single('avatar')(req, res, async (multerErr) => {
        if (multerErr) {
            if (multerErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'La imagen supera los 5 MB' });
            }
            return res.status(400).json({ error: multerErr.message || 'Error con el archivo' });
        }

        try {
            const userId = req.params.id;
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No se ha subido ningún archivo' });

            // 🔒 G1-11: extensión viene del MIME del server, no del nombre del cliente
            const extension = MIME_A_EXT[file.mimetype];
            if (!extension) return res.status(400).json({ error: 'Formato no permitido (solo jpg, png, gif, webp)' });

            const fileName = `${userId}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from('benaluma')
                .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('benaluma').getPublicUrl(fileName);
            // Añadimos querystring con timestamp para invalidar la caché del navegador
            const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ avatar_url: avatarUrl })
                .eq('id', userId);
            if (updateError) throw updateError;

            res.json({ mensaje: 'Foto de perfil actualizada', avatarUrl });
        } catch (error) {
            console.error('upload avatar:', error);
            res.status(500).json({ error: 'Fallo al subir la foto' });
        }
    });
});

// ==========================================================================
// 💌 MENSAJES PRIVADOS
// ==========================================================================

app.get('/api/mensajes-privados/:id_emisor/:id_receptor', requiereAuth, async (req, res) => {
    try {
        const { id_emisor, id_receptor } = req.params;

        if (!esUUID(id_emisor) || !esUUID(id_receptor)) {
            return res.status(400).json({ error: 'IDs no válidos' });
        }

        // 🔒 G1-4: solo puedes leer una conversación donde tú seas una de las partes
        if (req.usuario.id !== id_emisor && req.usuario.id !== id_receptor) {
            return res.status(403).json({ error: 'No participas en esta conversación' });
        }

        const { data, error } = await supabase
            .from('mensajes_privados')
            .select(`*,
                emisor:usuarios!id_emisor(nombre, apellidos, avatar_url),
                receptor:usuarios!id_receptor(nombre, apellidos, avatar_url)
            `)
            .or(`and(id_emisor.eq.${id_emisor},id_receptor.eq.${id_receptor}),and(id_emisor.eq.${id_receptor},id_receptor.eq.${id_emisor})`)
            .order('creado_en', { ascending: true });

        if (error) return res.status(500).json({ error: 'Error cargando mensajes' });

        // Marcar como leídos DESPUÉS de tener los datos listos para responder.
        // Si esto falla, aún devolvemos los mensajes (el marcar-leído se reintentará en el siguiente poll).
        supabase
            .from('mensajes_privados')
            .update({ leido: true })
            .eq('id_receptor', req.usuario.id)
            .eq('id_emisor', req.usuario.id === id_emisor ? id_receptor : id_emisor)
            .then(({ error: updErr }) => {
                if (updErr) console.error('marcar leido privado:', updErr);
            });

        res.json(data);
    } catch (err) {
        console.error('GET mensajes-privados:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.post('/api/mensajes-privados', requiereAuth, mensajeLimiter, async (req, res) => {
    try {
        const { id_receptor } = req.body;
        const mensaje = limpiar(req.body.mensaje, 2000);

        if (!esUUID(id_receptor)) return res.status(400).json({ error: 'ID de receptor inválido' });
        if (!mensaje) return res.status(400).json({ error: 'Mensaje vacío' });
        if (id_receptor === req.usuario.id) return res.status(400).json({ error: 'No puedes enviarte mensajes a ti mismo' });

        // 🔒 id_emisor sale del token, NO del body
        const { error } = await supabase
            .from('mensajes_privados')
            .insert([{ id_emisor: req.usuario.id, id_receptor, mensaje }]);

        if (error) return res.status(500).json({ error: 'Error enviando mensaje' });
        res.json({ success: true });
    } catch (err) {
        console.error('POST mensaje privado:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/mensajes-privados/no-leidos/:id_usuario', requiereAuth, async (req, res) => {
    const { id_usuario } = req.params;
    if (!esUUID(id_usuario)) return res.status(400).json({ error: 'ID inválido' });
    if (req.usuario.id !== id_usuario) return res.status(403).json({ error: 'No autorizado' });

    const { data, error } = await supabase
        .from('mensajes_privados')
        .select('id_emisor')
        .eq('id_receptor', id_usuario)
        .eq('leido', false);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ total: data.length });
});

app.get('/api/inbox/:id_usuario', requiereAuth, async (req, res) => {
    try {
        const { id_usuario } = req.params;
        if (!esUUID(id_usuario)) return res.status(400).json({ error: 'ID inválido' });
        if (req.usuario.id !== id_usuario) return res.status(403).json({ error: 'No autorizado' });

        const { data, error } = await supabase
            .from('mensajes_privados')
            .select(`*,
                emisor:usuarios!id_emisor(id, nombre, avatar_url),
                receptor:usuarios!id_receptor(id, nombre, avatar_url)
            `)
            .or(`id_emisor.eq.${id_usuario},id_receptor.eq.${id_usuario}`)
            .order('creado_en', { ascending: false });

        if (error) return res.status(500).json({ error: 'Error cargando bandeja' });

        const conversaciones = {};
        (data || []).forEach(m => {
            // 🔧 G2-14: comparación de IDs con coerción a String por seguridad
            const esEmisor = String(m.id_emisor) === String(id_usuario);
            const otroUsuario = esEmisor ? m.receptor : m.emisor;
            if (!otroUsuario) return;

            if (!conversaciones[otroUsuario.id]) {
                conversaciones[otroUsuario.id] = {
                    usuario: otroUsuario,
                    ultimoMensaje: m.mensaje,
                    fecha: m.creado_en
                };
            }
        });

        res.json(Object.values(conversaciones));
    } catch (err) {
        console.error('inbox:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================================================
// 🧹 LIMPIEZA AUTOMÁTICA DE VIAJES CADUCADOS
// ==========================================================================
async function borrarViajesCaducados() {
    try {
        const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: viajes, error: errorBusqueda } = await supabase
            .from('viajes')
            .select('id')
            .lt('fecha_hora_salida', hace24Horas);

        if (errorBusqueda) throw errorBusqueda;

        if (viajes && viajes.length > 0) {
            const idsViajes = viajes.map(v => v.id);
            console.log(`[Cron] Borrando ${idsViajes.length} viaje(s) caducado(s)...`);

            await supabase.from('mensajes_viajes').delete().in('id_viaje', idsViajes);
            await supabase.from('reservas').delete().in('id_viaje', idsViajes);
            await supabase.from('viajes').delete().in('id', idsViajes);

            console.log('[Cron] Limpieza completada.');
        }
    } catch (error) {
        console.error('[Cron] Error:', error.message);
    }
}

setInterval(borrarViajesCaducados, 3600000);
borrarViajesCaducados();

// ==========================================================================
// 🧯 ERROR HANDLER GLOBAL (G2-20)
// ==========================================================================

// 404 para cualquier endpoint no matcheado
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Error handler: captura throws sueltos sin try/catch
app.use((err, req, res, next) => {
    console.error('Error no capturado:', err);
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ error: 'Origen no permitido' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
});

// ==========================================================================
// 🚀 LEVANTAR SERVIDOR
// ==========================================================================

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => {
    console.log(`✅ UEQO API corriendo en puerto ${puerto}`);
});
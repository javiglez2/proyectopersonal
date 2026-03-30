// --- CONFIGURACIÓN INICIAL ---
const usuarioID = localStorage.getItem('benaluma_user_id');
let nombreUsuario = localStorage.getItem('benaluma_user_nombre');
let urlFotoReal = null; // Almacenará la URL de Supabase si existe
let modoEdicion = false;

// Protección: Si no hay sesión, al login
if (!usuarioID) {
    window.location.href = 'login.html';
}

// --- CARGA DE DATOS ---
async function cargarDatosPerfil() {
    try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${usuarioID}`);
        const usuario = await res.json();
        
        if (res.ok) {
            // Rellenamos los campos
            document.getElementById('perfil-nombre').value = usuario.nombre || '';
            document.getElementById('perfil-telefono').value = usuario.telefono || '';
            document.getElementById('perfil-email').value = usuario.email || '';
            
            // Guardamos la URL de la foto si existe en la DB
            urlFotoReal = usuario.avatar_url;
            
            // Dibujamos el avatar (Foto real o iniciales)
            actualizarAvatar(usuario.nombre);
        } else {
            alert("Error al obtener los datos del perfil.");
        }
    } catch (error) {
        console.error("Error en cargarDatosPerfil:", error);
        alert("Fallo de conexión con el servidor.");
    }
}

// Función para refrescar la imagen en el HTML
function actualizarAvatar(nombre) {
    const avatarImg = document.getElementById('avatar-grande');
    
    if (urlFotoReal) {
        avatarImg.src = urlFotoReal;
    } else {
        // Plan B: Iniciales si no hay foto subida
        avatarImg.src = `https://ui-avatars.com/api/?name=${nombre}&background=2563eb&color=fff&rounded=true&bold=true&size=128`;
    }
}

// --- LÓGICA DE EDICIÓN DE TEXTO ---
function alternarEdicion() {
    const btn = document.getElementById('btn-accion-perfil');
    const inputNombre = document.getElementById('perfil-nombre');
    const inputTelefono = document.getElementById('perfil-telefono');

    if (!modoEdicion) {
        // Entrar en modo edición
        modoEdicion = true;
        inputNombre.readOnly = false;
        inputTelefono.readOnly = false;
        inputNombre.focus();
        
        btn.innerText = "Guardar Cambios";
        btn.style.background = "#10b981"; // Verde éxito
    } else {
        // Guardar cambios
        guardarPerfil();
    }
}

async function guardarPerfil() {
    const nuevoNombre = document.getElementById('perfil-nombre').value.trim();
    const nuevoTelefono = document.getElementById('perfil-telefono').value.trim();
    const btn = document.getElementById('btn-accion-perfil');
    
    if (!nuevoNombre || !nuevoTelefono) return alert("Los campos no pueden estar vacíos.");

    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${usuarioID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre, telefono: nuevoTelefono })
        });
        
        if (res.ok) {
            localStorage.setItem('benaluma_user_nombre', nuevoNombre);
            nombreUsuario = nuevoNombre;
            
            // Volver a modo lectura
            modoEdicion = false;
            document.getElementById('perfil-nombre').readOnly = true;
            document.getElementById('perfil-telefono').readOnly = true;
            btn.innerText = "Editar Perfil";
            btn.style.background = "#2563eb"; 
            
            actualizarAvatar(nuevoNombre);
            alert("¡Datos actualizados!");
        } else {
            alert("Error al actualizar los datos.");
        }
    } catch (error) {
        alert("Error de conexión.");
    } finally {
        btn.disabled = false;
    }
}

// --- LÓGICA DE SUBIDA DE FOTO ---
function elegirFoto() {
    // Evitamos subir fotos mientras editamos texto para no liar al usuario
    if (modoEdicion) return;
    document.getElementById('input-archivo-foto').click();
}

async function subirFoto(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
        return alert("El archivo debe ser una imagen.");
    }

    const avatarImg = document.getElementById('avatar-grande');
    const originalSrc = avatarImg.src;
    avatarImg.style.opacity = "0.5";

    const formData = new FormData();
    formData.append('avatar', archivo);

    try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${usuarioID}/upload-avatar`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
            urlFotoReal = data.avatarUrl;
            actualizarAvatar(nombreUsuario);
            alert("¡Imagen de perfil actualizada!");
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error("Error subiendo foto:", error);
        alert("No se pudo subir la imagen.");
        avatarImg.src = originalSrc;
    } finally {
        avatarImg.style.opacity = "1";
        input.value = ''; // Limpiar input
    }
}

// --- OTROS ---
function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Ejecutar al cargar la página
cargarDatosPerfil();
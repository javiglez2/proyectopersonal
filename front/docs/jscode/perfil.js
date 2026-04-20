// ==========================================
// VARIABLES GLOBALES
// ==========================================
const usuarioID = localStorage.getItem('benaluma_user_id');
let nombreUsuario = localStorage.getItem('benaluma_user_nombre');
let urlFotoReal = null;
let modoEdicion = false;

const URL_BACKEND = 'https://proyectopersonal-0xcu.onrender.com';
const TAMANO_MAX_AVATAR = 5 * 1024 * 1024; // 5 MB

if (!usuarioID) window.location.href = 'login.html';

// ==========================================
// HELPERS
// ==========================================
// Construye URL de avatar de forma segura: encodeURIComponent evita que nombres
// con & o espacios rompan la query string de ui-avatars.
function urlAvatarFallback(nombreCompleto) {
    const n = encodeURIComponent(nombreCompleto || '?');
    return `https://ui-avatars.com/api/?name=${n}&background=1a2e25&color=4ade80&rounded=true&bold=true&size=128`;
}

// Wrapper de fetch que detecta sesión expirada y redirige al login.
// Antes una 401/403 caía en el catch genérico y el usuario veía "Error de conexión"
// sin entender que su sesión había caducado.
async function fetchConAuth(url, opts = {}) {
    const res = await fetch(url, opts);
    if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        await Swal.fire({
            icon: 'warning',
            title: 'Sesión caducada',
            text: 'Vuelve a iniciar sesión para continuar.',
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Ir al login'
        }).catch(() => { });
        window.location.href = 'login.html';
        throw new Error('Sesión expirada');
    }
    return res;
}

// ==========================================
// INICIALIZACIÓN DE INTL-TEL-INPUT
// ==========================================
const inputTelefono = document.querySelector("#perfil-telefono");
const iti = window.intlTelInput(inputTelefono, {
    initialCountry: "es",
    preferredCountries: ["es", "pt", "fr", "gb"],
    separateDialCode: true,
    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js"
});

// ==========================================
// CARGA DE DATOS DEL PERFIL
// ==========================================
async function cargarDatosPerfil() {
    try {
        const res = await fetchConAuth(`${URL_BACKEND}/api/usuarios/${usuarioID}`);
        const usuario = await res.json();

        if (res.ok) {
            document.getElementById('perfil-nombre').value = usuario.nombre || '';
            document.getElementById('perfil-apellidos').value = usuario.apellidos || '';
            document.getElementById('perfil-email').value = usuario.email || '';

            document.getElementById('perfil-nombre').placeholder = 'Sin nombre';
            document.getElementById('perfil-apellidos').placeholder = 'Sin apellidos';

            if (usuario.prefijo_telefono && usuario.telefono) {
                iti.setNumber(usuario.prefijo_telefono + usuario.telefono);
            } else if (usuario.telefono) {
                iti.setNumber(usuario.telefono);
            }

            urlFotoReal = usuario.avatar_url;
            actualizarAvatar(usuario.nombre, usuario.apellidos);
        } else {
            Swal.fire({ title: 'Error', text: 'Error al obtener los datos del perfil.', icon: 'error', confirmButtonColor: '#16a34a' });
        }
    } catch (error) {
        if (error.message === 'Sesión expirada') return; // ya redirige, no mostrar más
        console.error("Error en cargarDatosPerfil:", error);
        Swal.fire({ title: 'Error de conexión', text: 'Fallo de conexión con el servidor.', icon: 'error', confirmButtonColor: '#16a34a' });
    }
}

function actualizarAvatar(nombre, apellidos) {
    const avatarImg = document.getElementById('avatar-grande');
    if (urlFotoReal) {
        avatarImg.src = urlFotoReal;
    } else {
        // 🔧 Antes concatenaba con `+` sin encodeURIComponent → rompía con nombres como "Juan & María"
        const nombreCompleto = `${nombre || ''} ${apellidos || ''}`.trim();
        avatarImg.src = urlAvatarFallback(nombreCompleto);
    }
}

// ==========================================
// EDICIÓN
// ==========================================
function alternarEdicion() {
    const btn = document.getElementById('btn-accion-perfil');
    const inputs = ['perfil-nombre', 'perfil-apellidos'];
    const inputTel = document.getElementById('perfil-telefono');

    if (!modoEdicion) {
        modoEdicion = true;
        inputs.forEach(id => document.getElementById(id).readOnly = false);
        inputTel.disabled = false;

        document.getElementById('grupo-nueva-contrasena').style.display = 'block';
        document.getElementById('grupo-confirmar-contrasena').style.display = 'block';

        document.getElementById('perfil-nombre').focus();
        btn.innerText = "Guardar Cambios";
        btn.style.background = "#10b981";
    } else {
        guardarPerfil();
    }
}

async function guardarPerfil() {
    const nombre = document.getElementById('perfil-nombre').value.trim();
    const apellidos = document.getElementById('perfil-apellidos').value.trim();
    const telefonoEscrito = inputTelefono.value.replace(/\s+/g, '');
    const prefijo = "+" + iti.getSelectedCountryData().dialCode;

    const nuevaContrasena = document.getElementById('perfil-nueva-contrasena').value;
    const confirmarContrasena = document.getElementById('perfil-confirmar-contrasena').value;
    const btn = document.getElementById('btn-accion-perfil');

    // ---- Validaciones ----
    if (!nombre || !apellidos || !telefonoEscrito) {
        Swal.fire({ title: 'Campos vacíos', text: 'Por favor, rellena tu nombre, apellidos y teléfono.', icon: 'warning', confirmButtonColor: '#16a34a' });
        return;
    }

    // 🔍 Validación de teléfono mejorada: usa el validador de intl-tel-input
    // cuando está disponible (requiere utilsScript cargado). Si no, cae al check de longitud.
    const esTelefonoValido = (typeof iti.isValidNumber === 'function')
        ? iti.isValidNumber()
        : (telefonoEscrito.length >= 9);

    if (!esTelefonoValido) {
        Swal.fire({ title: 'Teléfono inválido', text: 'Introduce un número de teléfono válido.', icon: 'warning', confirmButtonColor: '#16a34a' });
        return;
    }

    if (nuevaContrasena) {
        // 🔑 Antes: /^(?=.*[A-Z])(?=.*\d).{8,12}$/  →  techo de 12 caracteres (demasiado corto)
        // Ahora: al menos 8, una mayúscula y un número, sin techo.
        if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(nuevaContrasena)) {
            Swal.fire({ title: 'Contraseña débil', text: 'Debe tener al menos 8 caracteres, 1 mayúscula y 1 número.', icon: 'warning', confirmButtonColor: '#16a34a' });
            return;
        }
        if (nuevaContrasena !== confirmarContrasena) {
            Swal.fire({ title: 'No coinciden', text: 'Las contraseñas no coinciden.', icon: 'warning', confirmButtonColor: '#16a34a' });
            return;
        }
    }

    // ---- Estado de carga ----
    const textoOriginalBtn = btn.innerText;
    const fondoOriginalBtn = btn.style.background;
    btn.innerText = "Guardando...";
    btn.disabled = true;

    let exito = false;

    try {
        const body = { nombre, apellidos, telefono: telefonoEscrito, prefijo_telefono: prefijo };
        if (nuevaContrasena) body.nueva_contrasena = nuevaContrasena;

        const res = await fetchConAuth(`${URL_BACKEND}/api/usuarios/${usuarioID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            exito = true;
            localStorage.setItem('benaluma_user_nombre', nombre);
            nombreUsuario = nombre;

            modoEdicion = false;
            ['perfil-nombre', 'perfil-apellidos'].forEach(id => {
                document.getElementById(id).readOnly = true;
            });

            inputTelefono.disabled = true;

            document.getElementById('grupo-nueva-contrasena').style.display = 'none';
            document.getElementById('grupo-confirmar-contrasena').style.display = 'none';
            document.getElementById('perfil-nueva-contrasena').value = '';
            document.getElementById('perfil-confirmar-contrasena').value = '';

            btn.innerText = "Editar Perfil";
            btn.style.background = "#2563eb";

            actualizarAvatar(nombre, apellidos);

            Swal.fire({
                title: '¡Genial!',
                text: 'Tus datos se han actualizado correctamente.',
                icon: 'success',
                confirmButtonColor: '#16a34a'
            });

        } else {
            const err = await res.json().catch(() => ({}));
            Swal.fire({ title: 'Error', text: err.error || "Error al actualizar los datos.", icon: 'error', confirmButtonColor: '#16a34a' });
        }
    } catch (error) {
        if (error.message !== 'Sesión expirada') {
            Swal.fire({ title: 'Error de conexión', text: 'Revisa tu internet y vuelve a intentarlo.', icon: 'error', confirmButtonColor: '#16a34a' });
        }
    } finally {
        btn.disabled = false;
        // 🛠️ Si hubo error, restauramos el botón al estado "Guardar Cambios" (verde)
        // para que el usuario pueda reintentar, no se quede colgado en "Guardando...".
        if (!exito) {
            btn.innerText = textoOriginalBtn;
            btn.style.background = fondoOriginalBtn;
        }
    }
}

// ==========================================
// AVATAR (subir foto)
// ==========================================
function elegirFoto() {
    if (modoEdicion) return;
    document.getElementById('input-archivo-foto').click();
}

async function subirFoto(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
        Swal.fire({ title: 'Archivo no válido', text: 'Por favor, sube solo imágenes.', icon: 'warning', confirmButtonColor: '#16a34a' });
        input.value = '';
        return;
    }

    // 🛡️ Límite de tamaño: antes se aceptaba cualquier archivo, incluido un PNG de 30 MB
    // que haría timeout en Render free tier y dejaría el avatar a medio actualizar.
    if (archivo.size > TAMANO_MAX_AVATAR) {
        const tamanoMB = (archivo.size / 1024 / 1024).toFixed(1);
        Swal.fire({
            title: 'Imagen demasiado grande',
            text: `La foto pesa ${tamanoMB} MB. El máximo es 5 MB.`,
            icon: 'warning',
            confirmButtonColor: '#16a34a'
        });
        input.value = '';
        return;
    }

    const avatarImg = document.getElementById('avatar-grande');
    avatarImg.style.opacity = "0.5";

    const formData = new FormData();
    formData.append('avatar', archivo);

    try {
        const res = await fetchConAuth(`${URL_BACKEND}/api/usuarios/${usuarioID}/upload-avatar`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            urlFotoReal = data.avatarUrl;
            actualizarAvatar(nombreUsuario, '');
            Swal.fire({ title: '¡Foto actualizada!', text: 'Tu nueva foto de perfil se ve genial.', icon: 'success', confirmButtonColor: '#16a34a' });
        } else {
            throw new Error(data.error || 'Error al subir la imagen');
        }
    } catch (error) {
        if (error.message !== 'Sesión expirada') {
            Swal.fire({ title: 'Error', text: error.message || 'No se pudo subir la imagen.', icon: 'error', confirmButtonColor: '#16a34a' });
        }
    } finally {
        avatarImg.style.opacity = "1";
        input.value = '';
    }
}

// ==========================================
// CERRAR SESIÓN
// ==========================================
function cerrarSesion() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: "Tendrás que volver a iniciar sesión para entrar.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
}

// ==========================================
// ARRANQUE
// ==========================================
cargarDatosPerfil();
/* ==========================================================================
   UEQO - perfil.js (v3, con JWT)
   ========================================================================== */

if (!window.UEQO?.requireLogin()) throw new Error('No autenticado');

const usuarioID = window.UEQO.getUserId();
let nombreUsuario = window.UEQO.getUserNombre();
let urlFotoReal = null;
let modoEdicion = false;

const TAMANO_MAX_AVATAR = 5 * 1024 * 1024;

function urlAvatarFallback(nombreCompleto) {
    const n = encodeURIComponent(nombreCompleto || '?');
    return `https://ui-avatars.com/api/?name=${n}&background=1a2e25&color=4ade80&rounded=true&bold=true&size=128`;
}

// ---- intl-tel-input ----
const inputTelefono = document.querySelector("#perfil-telefono");
const iti = window.intlTelInput(inputTelefono, {
    initialCountry: "es",
    preferredCountries: ["es", "pt", "fr", "gb"],
    separateDialCode: true,
    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js"
});

// ==========================================================================
// CARGA DE DATOS
// ==========================================================================
async function cargarDatosPerfil() {
    try {
        const usuario = await window.UEQO.apiFetchJSON(`/api/usuarios/${usuarioID}`);

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
    } catch (error) {
        if (error?.status === 401) return;
        console.error("cargarDatosPerfil:", error);
        Swal.fire({ title: 'Error de conexión', text: 'No se han podido cargar tus datos.', icon: 'error', confirmButtonColor: '#16a34a' });
    }
}

function actualizarAvatar(nombre, apellidos) {
    const avatarImg = document.getElementById('avatar-grande');
    if (urlFotoReal) {
        avatarImg.src = urlFotoReal;
    } else {
        const nombreCompleto = `${nombre || ''} ${apellidos || ''}`.trim();
        avatarImg.src = urlAvatarFallback(nombreCompleto);
    }
}

// ==========================================================================
// EDICIÓN
// ==========================================================================
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

    if (!nombre || !apellidos || !telefonoEscrito) {
        Swal.fire({ title: 'Campos vacíos', text: 'Por favor, rellena tu nombre, apellidos y teléfono.', icon: 'warning', confirmButtonColor: '#16a34a' });
        return;
    }

    const esTelefonoValido = (typeof iti.isValidNumber === 'function') ? iti.isValidNumber() : (telefonoEscrito.length >= 9);
    if (!esTelefonoValido) {
        Swal.fire({ title: 'Teléfono inválido', text: 'Introduce un número de teléfono válido.', icon: 'warning', confirmButtonColor: '#16a34a' });
        return;
    }

    if (nuevaContrasena) {
        if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(nuevaContrasena)) {
            Swal.fire({ title: 'Contraseña débil', text: 'Debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.', icon: 'warning', confirmButtonColor: '#16a34a' });
            return;
        }
        if (nuevaContrasena !== confirmarContrasena) {
            Swal.fire({ title: 'No coinciden', text: 'Las contraseñas no coinciden.', icon: 'warning', confirmButtonColor: '#16a34a' });
            return;
        }
    }

    const textoOriginalBtn = btn.innerText;
    const fondoOriginalBtn = btn.style.background;
    btn.innerText = "Guardando...";
    btn.disabled = true;
    let exito = false;

    try {
        const body = { nombre, apellidos, telefono: telefonoEscrito, prefijo_telefono: prefijo };
        if (nuevaContrasena) body.nueva_contrasena = nuevaContrasena;

        await window.UEQO.apiFetchJSON(`/api/usuarios/${usuarioID}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });

        exito = true;
        localStorage.setItem('benaluma_user_nombre', nombre);
        nombreUsuario = nombre;

        modoEdicion = false;
        ['perfil-nombre', 'perfil-apellidos'].forEach(id => { document.getElementById(id).readOnly = true; });
        inputTelefono.disabled = true;
        document.getElementById('grupo-nueva-contrasena').style.display = 'none';
        document.getElementById('grupo-confirmar-contrasena').style.display = 'none';
        document.getElementById('perfil-nueva-contrasena').value = '';
        document.getElementById('perfil-confirmar-contrasena').value = '';
        btn.innerText = "Editar Perfil";
        btn.style.background = "#2563eb";
        actualizarAvatar(nombre, apellidos);

        Swal.fire({ title: '¡Genial!', text: 'Tus datos se han actualizado correctamente.', icon: 'success', confirmButtonColor: '#16a34a' });
    } catch (error) {
        if (error?.status === 401) return;
        Swal.fire({ title: 'Error', text: error?.message || 'Error al actualizar los datos.', icon: 'error', confirmButtonColor: '#16a34a' });
    } finally {
        btn.disabled = false;
        if (!exito) {
            btn.innerText = textoOriginalBtn;
            btn.style.background = fondoOriginalBtn;
        }
    }
}

// ==========================================================================
// AVATAR
// ==========================================================================
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

    if (archivo.size > TAMANO_MAX_AVATAR) {
        const tamanoMB = (archivo.size / 1024 / 1024).toFixed(1);
        Swal.fire({ title: 'Imagen demasiado grande', text: `La foto pesa ${tamanoMB} MB. El máximo es 5 MB.`, icon: 'warning', confirmButtonColor: '#16a34a' });
        input.value = '';
        return;
    }

    const avatarImg = document.getElementById('avatar-grande');
    avatarImg.style.opacity = "0.5";

    const formData = new FormData();
    formData.append('avatar', archivo);

    try {
        // 🔑 FormData + apiFetch: el wrapper NO pone Content-Type para FormData
        const res = await window.UEQO.apiFetch(`/api/usuarios/${usuarioID}/upload-avatar`, {
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
        if (error?.status === 401) return;
        Swal.fire({ title: 'Error', text: error?.message || 'No se pudo subir la imagen.', icon: 'error', confirmButtonColor: '#16a34a' });
    } finally {
        avatarImg.style.opacity = "1";
        input.value = '';
    }
}

// ==========================================================================
// CERRAR SESIÓN
// ==========================================================================
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
            window.UEQO.cerrarSesion();
            window.location.href = 'index.html';
        }
    });
}

cargarDatosPerfil();
const usuarioID = localStorage.getItem('benaluma_user_id');
let nombreUsuario = localStorage.getItem('benaluma_user_nombre');
let urlFotoReal = null;
let modoEdicion = false;

if (!usuarioID) window.location.href = 'login.html';

// 1. INICIALIZAMOS LA BANDERA
const inputTelefono = document.querySelector("#perfil-telefono");
const iti = window.intlTelInput(inputTelefono, {
    initialCountry: "es", 
    preferredCountries: ["es", "pt", "fr", "gb"], 
    separateDialCode: true,
    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js"
});

async function cargarDatosPerfil() {
    try {
        const res = await fetch(`https://proyectopersonal-0xcu.onrender.com/api/usuarios/${usuarioID}`);
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
        console.error("Error en cargarDatosPerfil:", error);
        Swal.fire({ title: 'Error de conexión', text: 'Fallo de conexión con el servidor.', icon: 'error', confirmButtonColor: '#16a34a' });
    }
}

function actualizarAvatar(nombre, apellidos) {
    const avatarImg = document.getElementById('avatar-grande');
    if (urlFotoReal) {
        avatarImg.src = urlFotoReal;
    } else {
        const nombreCompleto = `${nombre || ''}+${apellidos || ''}`;
        avatarImg.src = `https://ui-avatars.com/api/?name=${nombreCompleto}&background=1a2e25&color=4ade80&rounded=true&bold=true&size=128`;
    }
}

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

    // Validaciones con alertas bonitas
    if (!nombre || !apellidos || !telefonoEscrito) {
        Swal.fire({ title: 'Campos vacíos', text: 'Por favor, rellena tu nombre, apellidos y teléfono.', icon: 'warning', confirmButtonColor: '#16a34a' });
        return;
    }
    
    if (telefonoEscrito.length < 9) {
        Swal.fire({ title: 'Teléfono inválido', text: 'El teléfono es demasiado corto.', icon: 'warning', confirmButtonColor: '#16a34a' });
        return;
    }

    if (nuevaContrasena) {
        if (!/^(?=.*[A-Z])(?=.*\d).{8,12}$/.test(nuevaContrasena)) {
            Swal.fire({ title: 'Contraseña débil', text: 'Debe tener 8-12 caracteres, 1 mayúscula y 1 número.', icon: 'warning', confirmButtonColor: '#16a34a' });
            return;
        }
        if (nuevaContrasena !== confirmarContrasena) {
            Swal.fire({ title: 'No coinciden', text: 'Las contraseñas no coinciden.', icon: 'warning', confirmButtonColor: '#16a34a' });
            return;
        }
    }

    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        const body = { nombre, apellidos, telefono: telefonoEscrito, prefijo_telefono: prefijo };
        if (nuevaContrasena) body.nueva_contrasena = nuevaContrasena;

        const res = await fetch(`https://proyectopersonal-0xcu.onrender.com/api/usuarios/${usuarioID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
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
            
            // 🔥 LA ALERTA DE ÉXITO QUE QUERÍAS 🔥
            Swal.fire({
                title: '¡Genial!',
                text: 'Tus datos se han actualizado correctamente.',
                icon: 'success',
                confirmButtonColor: '#16a34a'
            });
            
        } else {
            const err = await res.json();
            Swal.fire({ title: 'Error', text: err.error || "Error al actualizar los datos.", icon: 'error', confirmButtonColor: '#16a34a' });
        }
    } catch (error) {
        Swal.fire({ title: 'Error de conexión', text: 'Revisa tu internet y vuelve a intentarlo.', icon: 'error', confirmButtonColor: '#16a34a' });
    } finally {
        btn.disabled = false;
    }
}

function elegirFoto() {
    if (modoEdicion) return;
    document.getElementById('input-archivo-foto').click();
}

async function subirFoto(input) {
    const archivo = input.files[0];
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
        Swal.fire({ title: 'Archivo no válido', text: 'Por favor, sube solo imágenes.', icon: 'warning', confirmButtonColor: '#16a34a' });
        return;
    }

    const avatarImg = document.getElementById('avatar-grande');
    avatarImg.style.opacity = "0.5";

    const formData = new FormData();
    formData.append('avatar', archivo);

    try {
        const res = await fetch(`https://proyectopersonal-0xcu.onrender.com/api/usuarios/${usuarioID}/upload-avatar`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            urlFotoReal = data.avatarUrl;
            actualizarAvatar(nombreUsuario, '');
            Swal.fire({ title: '¡Foto actualizada!', text: 'Tu nueva foto de perfil se ve genial.', icon: 'success', confirmButtonColor: '#16a34a' });
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        Swal.fire({ title: 'Error', text: 'No se pudo subir la imagen.', icon: 'error', confirmButtonColor: '#16a34a' });
    } finally {
        avatarImg.style.opacity = "1";
        input.value = '';
    }
}

function cerrarSesion() {
    // Alerta de confirmación para cerrar sesión (mucho más profesional)
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: "Tendrás que volver a iniciar sesión para entrar.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48', // Rojo para salir
        cancelButtonColor: '#6b7280', // Gris para cancelar
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
}

cargarDatosPerfil();
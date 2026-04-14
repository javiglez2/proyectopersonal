const usuarioID = localStorage.getItem('benaluma_user_id');
let nombreUsuario = localStorage.getItem('benaluma_user_nombre');
let urlFotoReal = null;
let modoEdicion = false;

if (!usuarioID) window.location.href = 'login.html';

// 1. INICIALIZAMOS LA BANDERA (Se inicializa bloqueada por el HTML)
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

            // Unimos el prefijo y el teléfono que vienen del backend para que la librería los entienda
            if (usuario.prefijo_telefono && usuario.telefono) {
                iti.setNumber(usuario.prefijo_telefono + usuario.telefono);
            } else if (usuario.telefono) {
                iti.setNumber(usuario.telefono); // Por si solo hubiera número
            }

            urlFotoReal = usuario.avatar_url;
            actualizarAvatar(usuario.nombre, usuario.apellidos);
        } else {
            alert("Error al obtener los datos del perfil.");
        }
    } catch (error) {
        console.error("Error en cargarDatosPerfil:", error);
        alert("Fallo de conexión con el servidor.");
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
    const inputs = ['perfil-nombre', 'perfil-apellidos']; // Quitamos el teléfono de aquí
    const inputTel = document.getElementById('perfil-telefono');

    if (!modoEdicion) {
        modoEdicion = true;
        inputs.forEach(id => document.getElementById(id).readOnly = false);
        
        // Desbloqueamos el teléfono (esto también desbloquea la bandera automáticamente)
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
    
    // Extracción limpia a prueba de balas (como hicimos en registro)
    const telefonoEscrito = inputTelefono.value.replace(/\s+/g, '');
    const prefijo = "+" + iti.getSelectedCountryData().dialCode;

    const nuevaContrasena = document.getElementById('perfil-nueva-contrasena').value;
    const confirmarContrasena = document.getElementById('perfil-confirmar-contrasena').value;
    const btn = document.getElementById('btn-accion-perfil');

    if (!nombre || !apellidos || !telefonoEscrito) return alert("Los campos no pueden estar vacíos.");
    
    if (telefonoEscrito.length < 9) return alert("El teléfono es demasiado corto.");

    if (nuevaContrasena) {
        if (!/^(?=.*[A-Z])(?=.*\d).{8,12}$/.test(nuevaContrasena)) {
            return alert("La contraseña debe tener 8-12 caracteres, 1 mayúscula y 1 número.");
        }
        if (nuevaContrasena !== confirmarContrasena) {
            return alert("Las contraseñas no coinciden.");
        }
    }

    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        // Volvemos a separar el prefijo y el teléfono para enviárselo a tu Base de Datos
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
            
            // Volvemos a bloquear el teléfono (y la bandera)
            inputTelefono.disabled = true;
            
            document.getElementById('grupo-nueva-contrasena').style.display = 'none';
            document.getElementById('grupo-confirmar-contrasena').style.display = 'none';
            document.getElementById('perfil-nueva-contrasena').value = '';
            document.getElementById('perfil-confirmar-contrasena').value = '';

            btn.innerText = "Editar Perfil";
            btn.style.background = "#2563eb";

            actualizarAvatar(nombre, apellidos);
            alert("¡Datos actualizados correctamente!");
        } else {
            const err = await res.json();
            alert(err.error || "Error al actualizar los datos.");
        }
    } catch (error) {
        alert("Error de conexión.");
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
    if (!archivo.type.startsWith('image/')) return alert("El archivo debe ser una imagen.");

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
            alert("¡Imagen de perfil actualizada!");
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        alert("No se pudo subir la imagen.");
    } finally {
        avatarImg.style.opacity = "1";
        input.value = '';
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'index.html';
}

cargarDatosPerfil();
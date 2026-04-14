// 1. INICIALIZAMOS LA BANDERA FUERA DEL BOTÓN (Para que salga nada más abrir la página)
const inputTelefono = document.querySelector("#telefono");
const iti = window.intlTelInput(inputTelefono, {
    initialCountry: "es", // España por defecto
    preferredCountries: ["es", "pt", "fr", "gb"], // Favoritos arriba
    separateDialCode: true // Código +34 separado
});

// 2. EVENTO AL HACER CLIC EN REGISTRARSE
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitamos que recargue la página

    // Recogemos los campos
    const nombreInput = document.getElementById('nombre');
    const apellidosInput = document.getElementById('apellidos');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const confPassInput = document.getElementById('confirmar-contrasena');

    // Limpiamos errores previos visuales
    document.querySelectorAll('.error-texto').forEach(el => el.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    let valido = true;

    // Función para pintar errores bonitos
    const mostrarError = (input, mensaje) => {
        input.classList.add('input-error');
        const span = document.createElement('span');
        span.className = 'error-texto';
        span.innerText = mensaje;
        input.parentElement.appendChild(span);
        valido = false;
    };

    // --- VALIDACIONES DE TEXTO ---
    if (!nombreInput.value.trim()) mostrarError(nombreInput, 'El nombre es obligatorio.');
    if (!apellidosInput.value.trim()) mostrarError(apellidosInput, 'Los apellidos son obligatorios.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim()) {
        mostrarError(emailInput, 'El correo es obligatorio.');
    } else if (!emailRegex.test(emailInput.value.trim())) {
        mostrarError(emailInput, 'Introduce un correo válido.');
    }

    const contrasena = passInput.value;
    if (!contrasena) {
        mostrarError(passInput, 'Debes introducir una contraseña.');
    } else if (contrasena.length < 8) {
        mostrarError(passInput, 'Mínimo 8 caracteres, por favor.');
    }

    const confirmar = confPassInput.value;
    if (!confirmar) {
        mostrarError(confPassInput, 'Repite la contraseña para confirmar.');
    } else if (contrasena !== confirmar) {
        mostrarError(confPassInput, 'Las contraseñas no coinciden.');
    }

    // --- VALIDACIÓN DEL TELÉFONO ---
    if (!iti.isValidNumber()) {
        Swal.fire({
            title: 'Teléfono incorrecto',
            text: 'Revisa que el número esté bien escrito para el país seleccionado.',
            icon: 'warning',
            confirmButtonColor: '#16a34a'
        });
        return; // Paramos todo si el teléfono está mal
    }

    const telefonoCompleto = iti.getNumber(); // Coge el formato limpio (Ej: +34600123456)

    // Si hubo algún error en los campos de arriba, paramos.
    if (!valido) return;

    // ==========================================
    // 3. ENVÍO AL SERVIDOR
    // ==========================================
    const btnRegistro = document.querySelector('.btn-submit');
    btnRegistro.disabled = true;
    btnRegistro.innerText = 'Registrando...';

    try {
        const res = await fetch('https://proyectopersonal-0xcu.onrender.com/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombreInput.value.trim(),
                apellidos: apellidosInput.value.trim(),
                email: emailInput.value.trim(),
                contrasena: contrasena,
                telefono: telefonoCompleto // 🔥 ¡AQUÍ ESTÁ! Ahora sí viaja al backend
            })
        });

        if (res.ok) {
            Swal.fire({
                title: '¡Bienvenido a UEQO!',
                text: 'Tu cuenta ha sido creada correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#111827',
                color: '#fff'
            }).then(() => {
                window.location.href = 'login.html';
            });
        } else {
            const d = await res.json();
            mostrarError(emailInput, d.error || 'Este correo ya está en uso.');
        }
    } catch (err) {
        Swal.fire({
            title: 'Error de conexión',
            text: 'Hubo un problema al conectar con el servidor. Vuelve a intentarlo.',
            icon: 'error',
            confirmButtonColor: '#4ade80'
        });
    } finally {
        btnRegistro.disabled = false;
        btnRegistro.innerText = 'Registrarme en UEQO';
    }
});
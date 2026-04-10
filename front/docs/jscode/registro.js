document.getElementById('registro-form').addEventListener('submit', async (e) => {
    // 1. Evitamos que el formulario recargue la página pase lo que pase
    e.preventDefault();

    // 2. Recogemos los elementos del HTML de forma segura
    const nombreInput = document.getElementById('nombre');
    const apellidosInput = document.getElementById('apellidos');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const confPassInput = document.getElementById('confirmar-contrasena');

    // Si por algún motivo no encuentra un input en el HTML, avisa en lugar de romperse
    if (!nombreInput || !apellidosInput || !emailInput || !passInput || !confPassInput) {
        Swal.fire('Error interno', 'No se encontraron algunos campos en el formulario HTML.', 'error');
        return;
    }

    const nombre = nombreInput.value.trim();
    const apellidos = apellidosInput.value.trim();
    const email = emailInput.value.trim();
    const contrasena = passInput.value;
    const confirmar = confPassInput.value;

    // ==========================================
    // 3. VALIDACIONES ESTRICTAS
    // ==========================================

    // A) Comprobar que no haya campos vacíos
    if (!nombre || !apellidos || !email || !contrasena || !confirmar) {
        Swal.fire({
            title: 'Campos incompletos',
            text: 'Por favor, rellena todos los datos para poder registrarte.',
            icon: 'warning',
            confirmButtonColor: '#16a34a'
        });
        return;
    }

    // B) Comprobar la longitud de la contraseña (Mínimo 8 caracteres)
    if (contrasena.length < 8) {
        Swal.fire({
            title: 'Contraseña muy corta',
            text: 'Por seguridad, la contraseña debe tener al menos 8 caracteres.',
            icon: 'warning',
            confirmButtonColor: '#16a34a'
        }).then(() => {
            passInput.focus(); // Ponemos el cursor en la contraseña
        });
        return;
    }

    // C) Comprobar que ambas contraseñas coincidan
    if (contrasena !== confirmar) {
        Swal.fire({
            title: 'Las contraseñas no coinciden',
            text: 'Asegúrate de escribir exactamente la misma contraseña en ambos campos.',
            icon: 'warning',
            confirmButtonColor: '#16a34a'
        }).then(() => {
            confPassInput.focus();
            confPassInput.value = ''; // Vaciamos el campo de confirmar para que lo vuelva a escribir
        });
        return;
    }

    // ==========================================
    // 4. ENVÍO AL SERVIDOR
    // ==========================================

    // Bloqueamos el botón para que no le den dos veces sin querer
    const btnRegistro = document.querySelector('.btn-submit') || document.querySelector('button[type="submit"]');
    if (btnRegistro) {
        btnRegistro.disabled = true;
        btnRegistro.innerText = 'Registrando...';
    }

    try {
        const res = await fetch('https://proyectopersonal-0xcu.onrender.com/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellidos, email, contrasena })
        });

        if (res.ok) {
            Swal.fire({
                title: '¡Bienvenido a UEQO!',
                text: 'Tu cuenta ha sido creada correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'login.html';
            });
        } else {
            const d = await res.json();
            Swal.fire({
                title: 'No se pudo registrar',
                text: d.error || 'El correo electrónico ya está en uso o los datos no son válidos.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (err) {
        Swal.fire({
            title: 'Error de conexión',
            text: 'No se ha podido conectar con el servidor. Inténtalo de nuevo más tarde.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
    } finally {
        // Desbloqueamos el botón si algo falla
        if (btnRegistro) {
            btnRegistro.disabled = false;
            btnRegistro.innerText = 'Crear cuenta gratis';
        }
    }
});
function mostrarError(inputId, errorId, mensaje) {
    const input = document.getElementById(inputId);
    const errorSpan = document.getElementById(errorId);
    input.classList.add('input-error');
    errorSpan.textContent = mensaje;
    errorSpan.classList.add('visible');
}

function limpiarError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const errorSpan = document.getElementById(errorId);
    input.classList.remove('input-error');
    errorSpan.textContent = '';
    errorSpan.classList.remove('visible');
}

// Limpiar errores al escribir
document.getElementById('emailLogin').addEventListener('input', () => {
    limpiarError('emailLogin', 'emailError');
});
document.getElementById('contrasenaLogin').addEventListener('input', () => {
    limpiarError('contrasenaLogin', 'contrasenaError');
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('emailLogin').value.trim();
    const contrasena = document.getElementById('contrasenaLogin').value;

    // --- Validación personalizada ---
    let hayErrores = false;

    if (!email) {
        mostrarError('emailLogin', 'emailError', 'El correo electrónico es obligatorio.');
        hayErrores = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarError('emailLogin', 'emailError', 'Introduce un correo electrónico válido.');
        hayErrores = true;
    } else {
        limpiarError('emailLogin', 'emailError');
    }

    if (!contrasena) {
        mostrarError('contrasenaLogin', 'contrasenaError', 'La contraseña es obligatoria.');
        hayErrores = true;
    } else {
        limpiarError('contrasenaLogin', 'contrasenaError');
    }

    if (hayErrores) return;

    // --- Petición al servidor ---
    try {
        const res = await fetch('https://proyectopersonal-0xcu.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, contrasena })
        });

        const datos = await res.json();

        if (res.ok) {
            localStorage.setItem('benaluma_user_id', datos.usuario_id);
            localStorage.setItem('benaluma_user_nombre', datos.nombre);

            Swal.fire({
                title: '¡Bienvenido de nuevo!',
                text: `Hola ${datos.nombre}, has iniciado sesión correctamente.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#fff'
            }).then(() => {
                window.location.href = 'mapa.html';
            });

        } else {
            // Mostrar error del servidor debajo del campo de contraseña
            mostrarError('contrasenaLogin', 'contrasenaError', datos.error || 'Credenciales incorrectas.');
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
});
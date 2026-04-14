document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitamos que recargue la página

    // 1. Recogemos los campos
    const nombreInput = document.getElementById('nombre');
    const apellidosInput = document.getElementById('apellidos');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const confPassInput = document.getElementById('confirmar-contrasena');

    // 2. Limpiamos errores previos visuales
    document.querySelectorAll('.error-texto').forEach(el => el.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    let valido = true;

    // --- FUNCIÓN MAGICA PARA PINTAR ERRORES BONITOS ---
    const mostrarError = (input, mensaje) => {
        input.classList.add('input-error'); // Pinta el borde y el fondo de rojo

        // Creamos el mensajito de texto y lo ponemos debajo
        const span = document.createElement('span');
        span.className = 'error-texto';
        span.innerText = mensaje;

        // Lo metemos dentro del div .input-group para que se posicione bien
        input.parentElement.appendChild(span);
        valido = false;
    };

    // 3. VALIDACIONES INDIVIDUALES

    // Nombres vacíos
    if (!nombreInput.value.trim()) mostrarError(nombreInput, 'El nombre es obligatorio.');
    if (!apellidosInput.value.trim()) mostrarError(apellidosInput, 'Los apellidos son obligatorios.');

    // Email formato correcto
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim()) {
        mostrarError(emailInput, 'El correo es obligatorio.');
    } else if (!emailRegex.test(emailInput.value.trim())) {
        mostrarError(emailInput, 'Introduce un correo válido.');
    }

    // Contraseña (AQUÍ ESTÁ LA REGLA DE LOS 8 CARACTERES)
    const contrasena = passInput.value;
    if (!contrasena) {
        mostrarError(passInput, 'Debes introducir una contraseña.');
    } else if (contrasena.length < 8) {
        mostrarError(passInput, 'Mínimo 8 caracteres, por favor.');
    }

    // Confirmar contraseña
    const confirmar = confPassInput.value;
    if (!confirmar) {
        mostrarError(confPassInput, 'Repite la contraseña para confirmar.');
    } else if (contrasena !== confirmar) {
        mostrarError(confPassInput, 'Las contraseñas no coinciden.');
    }

    // Si algún 'mostrarError' se ejecutó, 'valido' será false y cortamos aquí.
    if (!valido) return;

    // ==========================================
    // 4. ENVÍO AL SERVIDOR SI TODO ESTÁ PERFECTO
    // ==========================================

    const btnRegistro = document.querySelector('.btn-submit') || document.querySelector('button[type="submit"]');
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
                contrasena: contrasena
            })
        });

        if (res.ok) {
            // SweetAlert sí lo usamos para el éxito porque queda genial en el centro de la pantalla
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
            title: 'Error al registrar',
            text: 'Revisa que todos los campos estén correctos y vuelve a intentarlo.', // Mensaje genérico y amigable
            icon: 'error',
            confirmButtonColor: '#4ade80' // Verde UEQO
        });
    } finally {
        btnRegistro.disabled = false;
        btnRegistro.innerText = 'Registrarme en UEQO';
    }
});
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Limpiamos cualquier error visual previo antes de comprobar
    document.querySelectorAll('.error-texto').forEach(s => s.innerText = '');
    document.querySelectorAll('input').forEach(i => i.classList.remove('input-error'));

    // 2. Recogemos los valores de los campos
    const nombre = document.getElementById('nombre').value.trim();
    const apellidos = document.getElementById('apellidos').value.trim();
    const email = document.getElementById('email').value.trim();
    const contrasena = document.getElementById('password').value;           // ✅ era 'contrasena', el HTML usa 'password'
    const confirmar = document.getElementById('confirmar-contrasena').value;

    let valido = true;

    // 3. Comprobamos que tenga al menos 8 caracteres
    if (contrasena.length < 8) {
        document.getElementById('error-confirmar').innerText = "La contraseña debe tener al menos 8 caracteres."; // ✅ 'error-contrasena' no existe en el HTML, usamos el que sí existe
        document.getElementById('password').classList.add('input-error');
        valido = false;
    }

    // 4. Comprobamos que las contraseñas coincidan
    if (contrasena !== confirmar) {
        document.getElementById('error-confirmar').innerText = "Las contraseñas no coinciden.";
        document.getElementById('confirmar-contrasena').classList.add('input-error');
        document.getElementById('password').classList.add('input-error');
        valido = false;
    }

    // Si hay algún error, cortamos aquí
    if (!valido) return;

    // 5. Si todo está perfecto, enviamos los datos
    const btnRegistro = document.querySelector('.btn-submit');
    btnRegistro.disabled = true;
    btnRegistro.innerText = 'Registrando...';

    try {
        const res = await fetch('https://proyectopersonal-0xcu.onrender.com/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellidos, email, contrasena })
        });

        if (res.ok) {
            Swal.fire({
                title: '¡Bienvenido!',
                text: 'Tu cuenta ha sido creada correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'login.html';
            });
        } else {
            const d = await res.json();
            Swal.fire('Error', d.error || 'No se pudo registrar, comprueba los datos', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    } finally {
        btnRegistro.disabled = false;
        btnRegistro.innerText = 'Registrarme en UEQO';
    }
});
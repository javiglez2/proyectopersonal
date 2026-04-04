document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    document.querySelectorAll('.error-texto').forEach(s => s.innerText = '');
    document.querySelectorAll('input').forEach(i => i.classList.remove('input-error'));

    const nombre = document.getElementById('nombre').value.trim();
    const apellidos = document.getElementById('apellidos').value.trim();
    const prefijo = document.getElementById('prefijo').value;
    const telefono = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim();
    const contrasena = document.getElementById('contrasena').value;
    const confirmar = document.getElementById('confirmar-contrasena').value;

    let valido = true;

    if (!/^[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]{1,}$/.test(nombre)) {
        document.getElementById('error-nombre').innerText = "Empieza por mayúscula";
        document.getElementById('nombre').classList.add('input-error');
        valido = false;
    }

    if (!/^[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]{1,}$/.test(apellidos)) {
        document.getElementById('error-apellidos').innerText = "Empieza por mayúscula";
        document.getElementById('apellidos').classList.add('input-error');
        valido = false;
    }

    if (!/^\d{7,12}$/.test(telefono)) {
        document.getElementById('error-telefono').innerText = "Número no válido";
        document.getElementById('telefono').classList.add('input-error');
        valido = false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('error-email').innerText = "Email no válido";
        document.getElementById('email').classList.add('input-error');
        valido = false;
    }

    if (!/^(?=.*[A-Z])(?=.*\d).{8,12}$/.test(contrasena)) {
        document.getElementById('error-contrasena').innerText = "8-12 caract., 1 mayúscula, 1 número";
        document.getElementById('contrasena').classList.add('input-error');
        valido = false;
    }

    if (contrasena !== confirmar) {
        document.getElementById('error-confirmar').innerText = "Las contraseñas no coinciden";
        document.getElementById('confirmar-contrasena').classList.add('input-error');
        valido = false;
    }

    if (!valido) return;

    const btnRegistro = document.getElementById('btnRegistro');
    btnRegistro.disabled = true;
    btnRegistro.innerText = 'Registrando...';

    try {
        const res = await fetch('https://proyectopersonal-0xcu.onrender.com/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellidos, prefijo_telefono: prefijo, telefono, email, contrasena })
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
            Swal.fire('Error', d.error || 'No se pudo registrar', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    } finally {
        btnRegistro.disabled = false;
        btnRegistro.innerText = 'Registrarme';
    }
});
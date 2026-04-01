document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('emailLogin').value;
    const contrasena = document.getElementById('contrasenaLogin').value;

    try {
        const res = await fetch('https://proyectopersonal-0xcu.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, contrasena })
        });
        
        const datos = await res.json();

        if (res.ok) {
            // Guardamos datos en sesión
            localStorage.setItem('benaluma_user_id', datos.usuario_id);
            localStorage.setItem('benaluma_user_nombre', datos.nombre);

            // Alerta de éxito profesional
            Swal.fire({
                title: '¡Bienvenido de nuevo!',
                text: `Hola ${datos.nombre}, has iniciado sesión correctamente.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#fff'
            }).then(() => {
                window.location.href = 'index.html';
            });

        } else {
            // Alerta de error si la contraseña/email fallan
            Swal.fire({
                title: 'Error de acceso',
                text: datos.error || 'Credenciales incorrectas',
                icon: 'error',
                confirmButtonColor: '#2563eb'
            });
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
});
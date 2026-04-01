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
            localStorage.setItem('benaluma_user_id', datos.usuario_id);
            localStorage.setItem('benaluma_user_nombre', datos.nombre);
            window.location.href = 'index.html';
        } else {
            alert(datos.error);
        }
    } catch (err) {
        alert("Error de conexión");
    }

    Swal.fire({
        title: '¡Bienvenido de nuevo!',
        text: 'Has iniciado sesión correctamente.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        window.location.href = 'index.html';
    });
});
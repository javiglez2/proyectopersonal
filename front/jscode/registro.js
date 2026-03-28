document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Limpiar errores previos
    document.querySelectorAll('.error-texto').forEach(s => s.innerText = '');
    document.querySelectorAll('input').forEach(i => i.classList.remove('input-error'));

    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim();
    const contrasena = document.getElementById('contrasena').value;

    let valido = true;

    if (!/^[A-ZÁÉÍÓÚÑ]/.test(nombre)) {
        document.getElementById('error-nombre').innerText = "Empieza por Mayúscula";
        valido = false;
    }
    if (!/^\d{9}$/.test(telefono)) {
        document.getElementById('error-telefono').innerText = "9 dígitos exactos";
        valido = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('error-email').innerText = "Email no válido";
        valido = false;
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,12}$/.test(contrasena)) {
        document.getElementById('error-contrasena').innerText = "8-12 carac, 1 Mayús, 1 Núm";
        valido = false;
    }

    if (!valido) return;

    try {
        const res = await fetch('https://proyectopersonal-0xcu.onrender.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, telefono, email, contrasena })
        });
        if (res.ok) {
            alert("¡Registrado!");
            window.location.href = 'login.html';
        } else {
            const d = await res.json();
            alert(d.error);
        }
    } catch (err) { alert("Error de conexión"); }
});
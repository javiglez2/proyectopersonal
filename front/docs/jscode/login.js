/* ==========================================================================
   UEQO - login.js  (v2, con JWT)
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("emailLogin");
    const passInput = document.getElementById("contrasenaLogin");
    const toggleBtn = document.getElementById("togglePassword");

    // Si ya hay sesión válida, redirigir al mapa
    if (window.UEQO?.estaLogueado()) {
      window.location.href = "mapa.html";
      return;
    }

    // ---- Toggle ojo contraseña ----
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const isPassword = passInput.type === "password";
        passInput.type = isPassword ? "text" : "password";
        toggleBtn.querySelector("i").className = isPassword
          ? "fa-solid fa-eye-slash"
          : "fa-solid fa-eye";
        toggleBtn.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");
      });
    }

    // ---- Helpers de error ----
    function showError(input, errorId, message) {
      const el = document.getElementById(errorId);
      if (el) { el.textContent = message; el.classList.add("visible"); }
      input.classList.add("input-error");
    }
    function clearError(input, errorId) {
      const el = document.getElementById(errorId);
      if (el) { el.textContent = ""; el.classList.remove("visible"); }
      input.classList.remove("input-error");
    }

    emailInput.addEventListener("input", () => clearError(emailInput, "emailError"));
    passInput.addEventListener("input", () => clearError(passInput, "contrasenaError"));

    emailInput.addEventListener("blur", () => {
      const v = emailInput.value.trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        showError(emailInput, "emailError", "Introduce un correo válido");
      }
    });

    // ---- Submit ----
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let hasError = false;

      const email = emailInput.value.trim();
      if (!email) { showError(emailInput, "emailError", "El correo es obligatorio"); hasError = true; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(emailInput, "emailError", "Introduce un correo válido"); hasError = true;
      }
      if (!passInput.value) { showError(passInput, "contrasenaError", "La contraseña es obligatoria"); hasError = true; }
      if (hasError) return;

      const btn = form.querySelector(".btn-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Entrando...";

      try {
        const data = await window.UEQO.apiFetchJSON('/api/login', {
          method: 'POST',
          body: JSON.stringify({ email, contrasena: passInput.value })
        });

        // Guardar token + usuario
        window.UEQO.guardarSesion(data);

        if (typeof Swal !== "undefined") {
          await Swal.fire({
            icon: "success",
            title: `¡Hola, ${data.usuario?.nombre || "de nuevo"}!`,
            text: "Entrando a UEQO...",
            timer: 1200,
            showConfirmButton: false,
            timerProgressBar: true,
          });
        }
        window.location.href = "mapa.html";
      } catch (error) {
        console.error("Error en login:", error);
        const mensaje = error?.status === 401 || error?.status === 400
          ? "Email o contraseña incorrectos."
          : error?.status === 429
            ? "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo."
            : "No se ha podido contactar con el servidor. Si es la primera vez hoy, puede tardar unos segundos en despertar.";

        showError(passInput, "contrasenaError", mensaje);
        if (typeof Swal !== "undefined") {
          Swal.fire({ icon: "error", title: "No hemos podido entrar", text: mensaje, confirmButtonColor: "#16a34a" });
        }
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });
})();
/* ==========================================================================
   UEQO - login.js
   Validación del formulario de login + conexión real al backend
   ========================================================================== */

(function () {
  "use strict";

  const URL_BACKEND = "https://proyectopersonal-0xcu.onrender.com";

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("emailLogin");
    const passInput = document.getElementById("contrasenaLogin");
    const toggleBtn = document.getElementById("togglePassword");

    // ======================================================================
    // Si ya hay sesión guardada, redirigir directo al mapa
    // ======================================================================
    if (localStorage.getItem("benaluma_user_id")) {
      window.location.href = "mapa.html";
      return;
    }

    // ======================================================================
    // Toggle visibilidad de contraseña
    // ======================================================================
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const isPassword = passInput.type === "password";
        passInput.type = isPassword ? "text" : "password";
        toggleBtn.querySelector("i").className = isPassword
          ? "fa-solid fa-eye-slash"
          : "fa-solid fa-eye";
        toggleBtn.setAttribute(
          "aria-label",
          isPassword ? "Ocultar contraseña" : "Mostrar contraseña"
        );
      });
    }

    // ======================================================================
    // Helpers de error
    // ======================================================================
    function showError(input, errorId, message) {
      const el = document.getElementById(errorId);
      if (el) {
        el.textContent = message;
        el.classList.add("visible");
      }
      input.classList.add("input-error");
    }

    function clearError(input, errorId) {
      const el = document.getElementById(errorId);
      if (el) {
        el.textContent = "";
        el.classList.remove("visible");
      }
      input.classList.remove("input-error");
    }

    emailInput.addEventListener("input", () => clearError(emailInput, "emailError"));
    passInput.addEventListener("input", () => clearError(passInput, "contrasenaError"));

    emailInput.addEventListener("blur", () => {
      const value = emailInput.value.trim();
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        showError(emailInput, "emailError", "Introduce un correo válido");
      }
    });

    // ======================================================================
    // Submit: login real contra el backend
    // ======================================================================
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let hasError = false;

      const email = emailInput.value.trim();
      if (!email) {
        showError(emailInput, "emailError", "El correo es obligatorio");
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(emailInput, "emailError", "Introduce un correo válido");
        hasError = true;
      }

      if (!passInput.value) {
        showError(passInput, "contrasenaError", "La contraseña es obligatoria");
        hasError = true;
      }

      if (hasError) return;

      const btn = form.querySelector(".btn-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Entrando...";

      try {
        // ⚠️ Render free tier: si lleva 15+ min dormido, la primera petición
        // puede tardar 30-50s en despertar. Por eso no ponemos timeout corto.
        const res = await fetch(`${URL_BACKEND}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email,
            contrasena: passInput.value,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.usuario_id) {
          // 🔑 Guardamos con las CLAVES que espera el resto del frontend
          // (mapa.js, perfil.js, chat.js leen `benaluma_user_id` y `benaluma_user_nombre`)
          localStorage.setItem("benaluma_user_id", data.usuario_id);
          localStorage.setItem("benaluma_user_nombre", data.nombre || "Usuario");

          // Mini feedback antes de redirigir
          if (typeof Swal !== "undefined") {
            await Swal.fire({
              icon: "success",
              title: `¡Hola, ${data.nombre || "de nuevo"}!`,
              text: "Entrando a UEQO...",
              timer: 1200,
              showConfirmButton: false,
              timerProgressBar: true,
            });
          }

          window.location.href = "mapa.html";
        } else {
          // El backend devuelve:
          //   400 "Usuario no encontrado" si el email no existe
          //   400 "Contraseña incorrecta" si el hash no coincide
          // Por seguridad (evitar enumerar usuarios), mostramos el mismo mensaje.
          const mensajeError = "Email o contraseña incorrectos. Revísalos e inténtalo de nuevo.";

          showError(passInput, "contrasenaError", mensajeError);

          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "No hemos podido entrar",
              text: mensajeError,
              confirmButtonColor: "#16a34a",
            });
          }
        }
      } catch (error) {
        console.error("Error en login:", error);
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se ha podido contactar con el servidor. Si es la primera vez hoy, el servidor puede tardar unos segundos en despertar. Inténtalo de nuevo en unos instantes.",
            confirmButtonColor: "#16a34a",
          });
        }
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });
})();
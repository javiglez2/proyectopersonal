/* ==========================================================================
   UEQO - login.js
   Validación del formulario de login + toggle de contraseña
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("emailLogin");
    const passInput = document.getElementById("contrasenaLogin");
    const toggleBtn = document.getElementById("togglePassword");

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
    // Helpers de error (usan tus clases .error-msg, .input-error)
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

    // Limpiar errores al escribir
    emailInput.addEventListener("input", () => clearError(emailInput, "emailError"));
    passInput.addEventListener("input", () => clearError(passInput, "contrasenaError"));

    // ======================================================================
    // Validación al hacer blur
    // ======================================================================
    emailInput.addEventListener("blur", () => {
      const value = emailInput.value.trim();
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        showError(emailInput, "emailError", "Introduce un correo válido");
      }
    });

    // ======================================================================
    // Submit
    // ======================================================================
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let hasError = false;

      // Email
      const email = emailInput.value.trim();
      if (!email) {
        showError(emailInput, "emailError", "El correo es obligatorio");
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(emailInput, "emailError", "Introduce un correo válido");
        hasError = true;
      }

      // Contraseña
      if (!passInput.value) {
        showError(passInput, "contrasenaError", "La contraseña es obligatoria");
        hasError = true;
      }

      if (hasError) return;

      // Simular envío (loading)
      const btn = form.querySelector(".btn-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Entrando...";

      // TODO: Reemplazar por tu fetch al backend
      await new Promise((r) => setTimeout(r, 1200));

      btn.disabled = false;
      btn.textContent = originalText;

      // Mensaje informativo con SweetAlert2
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "info",
          title: "Próximamente",
          text: "El login estará disponible pronto. UEQO se encuentra en desarrollo.",
          confirmButtonColor: "#16a34a",
        });
      }
    });
  });
})();
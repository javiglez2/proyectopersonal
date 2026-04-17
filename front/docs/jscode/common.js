/* ==========================================================================
   UEQO - JavaScript común (cargado en todas las páginas)
   Helpers de validación, toggle de contraseñas y año dinámico
   Expone utilidades en window.UEQO para que los otros scripts las usen
   ========================================================================== */

(function () {
  "use strict";

  // ==========================================================================
  // Validadores
  // ==========================================================================

  const validators = {
    email(value) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(value) || "Introduce un correo electrónico válido";
    },

    phone(value) {
      // Teléfono español: opcionalmente +34, luego 9 dígitos empezando por 6, 7, 8 o 9
      const cleaned = value.replace(/\s|-/g, "");
      const regex = /^(\+34)?[6789]\d{8}$/;
      return regex.test(cleaned) || "Introduce un teléfono válido (9 dígitos)";
    },

    password(value) {
      if (value.length < 8)
        return "La contraseña debe tener al menos 8 caracteres";
      if (!/[A-Z]/.test(value))
        return "Debe contener al menos una mayúscula";
      if (!/[a-z]/.test(value))
        return "Debe contener al menos una minúscula";
      if (!/\d/.test(value)) return "Debe contener al menos un número";
      return true;
    },

    name(value) {
      const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,}$/;
      return (
        regex.test(value.trim()) ||
        "Introduce un nombre válido (solo letras)"
      );
    },
  };

  // ==========================================================================
  // Helpers de feedback en formularios
  // ==========================================================================

  function showError(input, message) {
    const group = input.closest(".form-group");
    if (!group) return;
    const errorEl = group.querySelector(".form-error");
    if (errorEl) errorEl.textContent = message;
    input.classList.add("is-invalid");
    input.classList.remove("is-valid");
    input.setAttribute("aria-invalid", "true");
  }

  function markValid(input) {
    const group = input.closest(".form-group");
    if (!group) return;
    const errorEl = group.querySelector(".form-error");
    if (errorEl) errorEl.textContent = "";
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
    input.setAttribute("aria-invalid", "false");
  }

  function clearValidation(input) {
    const group = input.closest(".form-group");
    if (group) {
      const errorEl = group.querySelector(".form-error");
      if (errorEl) errorEl.textContent = "";
    }
    input.classList.remove("is-invalid", "is-valid");
    input.removeAttribute("aria-invalid");
  }

  function showAlert(container, message, type = "info") {
    const alertEl = container.querySelector(".alert");
    if (!alertEl) return;
    alertEl.className = `alert alert-${type}`;
    alertEl.textContent = message;
    alertEl.hidden = false;
    alertEl.setAttribute("role", type === "error" ? "alert" : "status");
  }

  function hideAlert(container) {
    const alertEl = container.querySelector(".alert");
    if (alertEl) alertEl.hidden = true;
  }

  // ==========================================================================
  // Iconos SVG para el toggle de contraseña
  // ==========================================================================

  function iconEye() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  function iconEyeOff() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;
  }

  function initPasswordToggles() {
    const toggles = document.querySelectorAll(".password-toggle");
    toggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const wrapper = toggle.closest(".password-field");
        const input = wrapper.querySelector("input");
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        toggle.setAttribute(
          "aria-label",
          isPassword ? "Ocultar contraseña" : "Mostrar contraseña"
        );
        toggle.innerHTML = isPassword ? iconEyeOff() : iconEye();
      });
    });
  }

  // ==========================================================================
  // Año dinámico en el footer
  // ==========================================================================

  function updateYear() {
    const yearEls = document.querySelectorAll("[data-year]");
    yearEls.forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  // ==========================================================================
  // Exponer utilidades globalmente para los otros scripts
  // ==========================================================================

  window.UEQO = {
    validators,
    showError,
    markValid,
    clearValidation,
    showAlert,
    hideAlert,
  };

  // ==========================================================================
  // Inicialización común
  // ==========================================================================

  document.addEventListener("DOMContentLoaded", () => {
    initPasswordToggles();
    updateYear();
  });
})();

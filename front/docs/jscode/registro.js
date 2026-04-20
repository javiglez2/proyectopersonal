/* ==========================================================================
   UEQO - registro.js
   Validación completa, toggle de contraseña, requisitos en tiempo real
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registroForm");
    if (!form) return;

    const inputs = {
      nombre: document.getElementById("nombre"),
      apellidos: document.getElementById("apellidos"),
      telefono: document.getElementById("telefono"),
      email: document.getElementById("email"),
      contrasena: document.getElementById("contrasena"),
      contrasenaConfirm: document.getElementById("contrasenaConfirm"),
      terms: document.getElementById("termsCheck"),
    };

    // ======================================================================
    // Toggle de contraseña (todos los .toggle-pass)
    // ======================================================================
    document.querySelectorAll(".toggle-pass").forEach((btn) => {
      btn.addEventListener("click", () => {
        const wrapper = btn.closest(".input-wrapper");
        const input = wrapper.querySelector("input");
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.querySelector("i").className = isPassword
          ? "fa-solid fa-eye-slash"
          : "fa-solid fa-eye";
        btn.setAttribute(
          "aria-label",
          isPassword ? "Ocultar contraseña" : "Mostrar contraseña"
        );
      });
    });

    // ======================================================================
    // Helpers de error (usan tus clases .error-texto, .input-error)
    // ======================================================================
    function showError(input, errorId, message) {
      const el = document.getElementById(errorId);
      if (el) el.textContent = message;
      input.classList.add("input-error");
    }

    function clearError(input, errorId) {
      const el = document.getElementById(errorId);
      if (el) el.textContent = "";
      input.classList.remove("input-error");
    }

    // ======================================================================
    // Validadores
    // ======================================================================
    const validar = {
      nombre(v) {
        return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,}$/.test(v.trim())
          || "Introduce un nombre válido";
      },
      email(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
          || "Introduce un correo válido";
      },
      telefono(v) {
        const clean = v.replace(/\s|-/g, "");
        return /^(\+34)?[6789]\d{8}$/.test(clean)
          || "Introduce un teléfono válido (9 dígitos)";
      },
      password(v) {
        if (v.length < 8) return "Mínimo 8 caracteres";
        if (!/[A-Z]/.test(v)) return "Debe tener una mayúscula";
        if (!/[a-z]/.test(v)) return "Debe tener una minúscula";
        if (!/\d/.test(v)) return "Debe tener un número";
        return true;
      },
    };

    // ======================================================================
    // Requisitos de contraseña en tiempo real
    // ======================================================================
    const reqEls = document.querySelectorAll("[data-req]");

    function updateRequirements(password) {
      const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
      };

      reqEls.forEach((el) => {
        const key = el.dataset.req;
        if (checks[key]) {
          el.style.color = "#16a34a";
          el.textContent = "✓ " + el.textContent.replace(/^[○✓]\s*/, "");
        } else {
          el.style.color = "#9ca3af";
          el.textContent = "○ " + el.textContent.replace(/^[○✓]\s*/, "");
        }
      });
    }

    // ======================================================================
    // Eventos en tiempo real
    // ======================================================================

    // Contraseña: requisitos + sincronización con confirmar
    inputs.contrasena.addEventListener("input", () => {
      clearError(inputs.contrasena, "contrasenaError");
      updateRequirements(inputs.contrasena.value);

      if (inputs.contrasenaConfirm.value) {
        if (inputs.contrasenaConfirm.value !== inputs.contrasena.value) {
          showError(inputs.contrasenaConfirm, "contrasenaConfirmError", "Las contraseñas no coinciden");
        } else {
          clearError(inputs.contrasenaConfirm, "contrasenaConfirmError");
        }
      }
    });

    inputs.contrasenaConfirm.addEventListener("input", () => {
      if (!inputs.contrasenaConfirm.value) {
        clearError(inputs.contrasenaConfirm, "contrasenaConfirmError");
        return;
      }
      if (inputs.contrasenaConfirm.value !== inputs.contrasena.value) {
        showError(inputs.contrasenaConfirm, "contrasenaConfirmError", "Las contraseñas no coinciden");
      } else {
        clearError(inputs.contrasenaConfirm, "contrasenaConfirmError");
      }
    });

    // Limpiar errores al escribir en los demás
    const blurMap = {
      nombre: { errorId: "nombreError", validator: validar.nombre },
      apellidos: { errorId: "apellidosError", validator: validar.nombre },
      telefono: { errorId: "telefonoError", validator: validar.telefono },
      email: { errorId: "emailError", validator: validar.email },
    };

    Object.keys(blurMap).forEach((key) => {
      const input = inputs[key];
      const { errorId, validator } = blurMap[key];

      input.addEventListener("input", () => clearError(input, errorId));

      input.addEventListener("blur", () => {
        const value = input.value.trim();
        if (!value) return;
        const result = validator(value);
        if (result !== true) {
          showError(input, errorId, result);
        }
      });
    });

    // ======================================================================
    // Submit
    // ======================================================================
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let hasError = false;

      const checks = [
        {
          input: inputs.nombre, errorId: "nombreError", validate: () => {
            if (!inputs.nombre.value.trim()) return "El nombre es obligatorio";
            return validar.nombre(inputs.nombre.value);
          }
        },
        {
          input: inputs.apellidos, errorId: "apellidosError", validate: () => {
            if (!inputs.apellidos.value.trim()) return "Los apellidos son obligatorios";
            return validar.nombre(inputs.apellidos.value);
          }
        },
        {
          input: inputs.telefono, errorId: "telefonoError", validate: () => {
            if (!inputs.telefono.value.trim()) return "El teléfono es obligatorio";
            return validar.telefono(inputs.telefono.value);
          }
        },
        {
          input: inputs.email, errorId: "emailError", validate: () => {
            if (!inputs.email.value.trim()) return "El correo es obligatorio";
            return validar.email(inputs.email.value);
          }
        },
        {
          input: inputs.contrasena, errorId: "contrasenaError", validate: () => {
            if (!inputs.contrasena.value) return "La contraseña es obligatoria";
            return validar.password(inputs.contrasena.value);
          }
        },
        {
          input: inputs.contrasenaConfirm, errorId: "contrasenaConfirmError", validate: () => {
            if (!inputs.contrasenaConfirm.value) return "Debes confirmar la contraseña";
            if (inputs.contrasenaConfirm.value !== inputs.contrasena.value) return "Las contraseñas no coinciden";
            return true;
          }
        },
      ];

      checks.forEach(({ input, errorId, validate }) => {
        const result = validate();
        if (result !== true) {
          showError(input, errorId, result);
          hasError = true;
        } else {
          clearError(input, errorId);
        }
      });

      // RGPD
      if (!inputs.terms.checked) {
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "warning",
            title: "Acepta los términos",
            text: "Debes aceptar la política de privacidad y los términos de uso para registrarte.",
            confirmButtonColor: "#16a34a",
          });
        }
        hasError = true;
      }

      if (hasError) {
        const firstBad = form.querySelector(".input-error");
        if (firstBad) {
          firstBad.focus();
          firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // Enviar con EmailJS
      const btn = form.querySelector(".btn-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Registrando...";

      try {
        // Estos nombres deben coincidir EXACTAMENTE con las variables {{ }} de tu plantilla
        const templateParams = {
          to_name: inputs.nombre.value.trim(),
          to_email: inputs.email.value.trim(),
        };

        // Reemplaza los IDs por los tuyos
        await emailjs.send("service_xu4vaps", "template_ska0k0x", templateParams);

        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "success",
            title: "¡Cuenta creada!",
            text: "Revisa tu bandeja de entrada, te hemos enviado un correo de bienvenida.",
            confirmButtonColor: "#16a34a",
          }).then(() => {
            // Opcional: Redirigir al usuario al login tras registrarse
            window.location.href = "login.html";
          });
        }
      } catch (error) {
        console.error("Error de EmailJS:", error);
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Hubo un problema al enviar el correo de confirmación.",
            confirmButtonColor: "#16a34a",
          });
        }
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
      /*
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "info",
          title: "Próximamente",
          text: "El registro estará disponible pronto. UEQO se encuentra en desarrollo.",
          confirmButtonColor: "#16a34a",
        });
      }
        */
    });
  });
})();
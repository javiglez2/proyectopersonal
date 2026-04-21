/* ==========================================================================
   UEQO - registro.js
   Validación completa + alta real en el backend + email de bienvenida
   ========================================================================== */

(function () {
  "use strict";

  const URL_BACKEND = "https://proyectopersonal-0xcu.onrender.com";

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
    // Si ya hay sesión, al mapa directo
    // ======================================================================
    if (localStorage.getItem("benaluma_user_id")) {
      window.location.href = "mapa.html";
      return;
    }

    // ======================================================================
    // Toggle de contraseña
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
    // Helpers de error
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
    // Submit: alta real en el backend
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

      const btn = form.querySelector(".btn-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Registrando...";

      // ======================================================================
      // 1. Alta real en el backend (crea el usuario en Supabase con bcrypt)
      // ======================================================================
      try {
        // Normalizamos el teléfono: quitamos espacios, guiones, y separamos el prefijo
        let telefonoLimpio = inputs.telefono.value.replace(/\s|-/g, "");
        let prefijoTelefono = "+34";
        if (telefonoLimpio.startsWith("+34")) {
          telefonoLimpio = telefonoLimpio.slice(3);
        }

        const res = await fetch(`${URL_BACKEND}/api/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: inputs.nombre.value.trim(),
            apellidos: inputs.apellidos.value.trim(),
            email: inputs.email.value.trim().toLowerCase(),
            telefono: telefonoLimpio,
            prefijo_telefono: prefijoTelefono,
            contrasena: inputs.contrasena.value,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // Supabase devuelve mensajes de error útiles. El más común es el
          // de email duplicado (violación de unique constraint).
          let mensajeError = data.error || "No hemos podido crear tu cuenta. Inténtalo de nuevo.";
          const esEmailDuplicado = /duplicate|ya existe|unique|usuarios_email/i.test(mensajeError);

          if (esEmailDuplicado) {
            mensajeError = "Ya existe una cuenta con este correo. ¿Quieres iniciar sesión?";
            if (typeof Swal !== "undefined") {
              const result = await Swal.fire({
                icon: "warning",
                title: "Correo ya registrado",
                text: mensajeError,
                showCancelButton: true,
                confirmButtonColor: "#16a34a",
                cancelButtonColor: "#6b7280",
                confirmButtonText: "Ir al login",
                cancelButtonText: "Usar otro correo",
              });
              if (result.isConfirmed) {
                window.location.href = "login.html";
                return;
              }
            }
            showError(inputs.email, "emailError", "Este correo ya está registrado");
          } else if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "Error al registrarte",
              text: mensajeError,
              confirmButtonColor: "#16a34a",
            });
          }
          btn.disabled = false;
          btn.textContent = originalText;
          return;
        }

        // ======================================================================
        // 2. Email de bienvenida (opcional, no bloqueante)
        //    Si EmailJS falla, el registro SIGUE siendo válido. Solo logueamos el error.
        // ======================================================================
        try {
          if (typeof emailjs !== "undefined") {
            await emailjs.send("service_xu4vaps", "template_ska0k0x", {
              to_name: inputs.nombre.value.trim(),
              to_email: inputs.email.value.trim().toLowerCase(),
            });
          }
        } catch (emailError) {
          // No mostramos nada al usuario — el registro se ha completado.
          console.warn("EmailJS falló (no crítico):", emailError);
        }

        // ======================================================================
        // 3. Auto-login: guardamos la sesión y llevamos directo al mapa
        //    El back devuelve el usuario creado con su `id`.
        // ======================================================================
        if (data.id) {
          localStorage.setItem("benaluma_user_id", data.id);
          localStorage.setItem("benaluma_user_nombre", data.nombre || inputs.nombre.value.trim());

          if (typeof Swal !== "undefined") {
            await Swal.fire({
              icon: "success",
              title: "¡Bienvenido a UEQO!",
              text: "Tu cuenta ha sido creada. Revisa tu correo para más información.",
              confirmButtonColor: "#16a34a",
              confirmButtonText: "Empezar",
            });
          }

          window.location.href = "mapa.html";
        } else {
          // Caso raro: 200 OK pero sin id. Mandamos al login para que entre.
          if (typeof Swal !== "undefined") {
            await Swal.fire({
              icon: "success",
              title: "¡Cuenta creada!",
              text: "Inicia sesión con tu email y contraseña.",
              confirmButtonColor: "#16a34a",
            });
          }
          window.location.href = "login.html";
        }
      } catch (error) {
        console.error("Error en registro:", error);
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se ha podido contactar con el servidor. Si es la primera vez hoy, el servidor puede tardar unos segundos en despertar. Inténtalo de nuevo en unos instantes.",
            confirmButtonColor: "#16a34a",
          });
        }
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });
})();
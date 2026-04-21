/* ==========================================================================
   UEQO - registro.js  (v2, con JWT)
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

    if (window.UEQO?.estaLogueado()) {
      window.location.href = "mapa.html";
      return;
    }

    // ---- Toggle contraseña ----
    document.querySelectorAll(".toggle-pass").forEach((btn) => {
      btn.addEventListener("click", () => {
        const wrapper = btn.closest(".input-wrapper");
        const input = wrapper.querySelector("input");
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.querySelector("i").className = isPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        btn.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");
      });
    });

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

    const validar = {
      nombre(v) { return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,}$/.test(v.trim()) || "Introduce un nombre válido"; },
      email(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Introduce un correo válido"; },
      telefono(v) { const clean = v.replace(/\s|-/g, ""); return /^(\+34)?[6789]\d{8}$/.test(clean) || "Introduce un teléfono válido (9 dígitos)"; },
      password(v) {
        if (v.length < 8) return "Mínimo 8 caracteres";
        if (!/[A-Z]/.test(v)) return "Debe tener una mayúscula";
        if (!/[a-z]/.test(v)) return "Debe tener una minúscula";
        if (!/\d/.test(v)) return "Debe tener un número";
        return true;
      },
    };

    // ---- Requisitos en tiempo real ----
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
      if (!inputs.contrasenaConfirm.value) { clearError(inputs.contrasenaConfirm, "contrasenaConfirmError"); return; }
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
        if (result !== true) showError(input, errorId, result);
      });
    });

    // ---- Submit ----
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let hasError = false;

      const checks = [
        { input: inputs.nombre, errorId: "nombreError", validate: () => { if (!inputs.nombre.value.trim()) return "El nombre es obligatorio"; return validar.nombre(inputs.nombre.value); } },
        { input: inputs.apellidos, errorId: "apellidosError", validate: () => { if (!inputs.apellidos.value.trim()) return "Los apellidos son obligatorios"; return validar.nombre(inputs.apellidos.value); } },
        { input: inputs.telefono, errorId: "telefonoError", validate: () => { if (!inputs.telefono.value.trim()) return "El teléfono es obligatorio"; return validar.telefono(inputs.telefono.value); } },
        { input: inputs.email, errorId: "emailError", validate: () => { if (!inputs.email.value.trim()) return "El correo es obligatorio"; return validar.email(inputs.email.value); } },
        { input: inputs.contrasena, errorId: "contrasenaError", validate: () => { if (!inputs.contrasena.value) return "La contraseña es obligatoria"; return validar.password(inputs.contrasena.value); } },
        { input: inputs.contrasenaConfirm, errorId: "contrasenaConfirmError", validate: () => { if (!inputs.contrasenaConfirm.value) return "Debes confirmar la contraseña"; if (inputs.contrasenaConfirm.value !== inputs.contrasena.value) return "Las contraseñas no coinciden"; return true; } },
      ];

      checks.forEach(({ input, errorId, validate }) => {
        const result = validate();
        if (result !== true) { showError(input, errorId, result); hasError = true; }
        else clearError(input, errorId);
      });

      if (!inputs.terms.checked) {
        if (typeof Swal !== "undefined") {
          Swal.fire({ icon: "warning", title: "Acepta los términos", text: "Debes aceptar la política de privacidad y los términos de uso para registrarte.", confirmButtonColor: "#16a34a" });
        }
        hasError = true;
      }

      if (hasError) {
        const firstBad = form.querySelector(".input-error");
        if (firstBad) { firstBad.focus(); firstBad.scrollIntoView({ behavior: "smooth", block: "center" }); }
        return;
      }

      const btn = form.querySelector(".btn-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Registrando...";

      try {
        let telefonoLimpio = inputs.telefono.value.replace(/\s|-/g, "");
        let prefijoTelefono = "+34";
        if (telefonoLimpio.startsWith("+34")) telefonoLimpio = telefonoLimpio.slice(3);

        const data = await window.UEQO.apiFetchJSON('/api/signup', {
          method: 'POST',
          body: JSON.stringify({
            nombre: inputs.nombre.value.trim(),
            apellidos: inputs.apellidos.value.trim(),
            email: inputs.email.value.trim().toLowerCase(),
            telefono: telefonoLimpio,
            prefijo_telefono: prefijoTelefono,
            contrasena: inputs.contrasena.value,
          }),
        });

        // Email de bienvenida (opcional, no crítico)
        try {
          if (typeof emailjs !== "undefined") {
            await emailjs.send("service_xu4vaps", "template_ska0k0x", {
              to_name: inputs.nombre.value.trim(),
              to_email: inputs.email.value.trim().toLowerCase(),
            });
          }
        } catch (emailError) {
          console.warn("EmailJS falló (no crítico):", emailError);
        }

        // Auto-login: el backend ya nos devolvió token + usuario
        window.UEQO.guardarSesion(data);

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

      } catch (error) {
        console.error("Error en registro:", error);

        if (error?.status === 409) {
          // Email duplicado
          if (typeof Swal !== "undefined") {
            const result = await Swal.fire({
              icon: "warning",
              title: "Correo ya registrado",
              text: "Ya existe una cuenta con este correo. ¿Quieres iniciar sesión?",
              showCancelButton: true,
              confirmButtonColor: "#16a34a",
              cancelButtonColor: "#6b7280",
              confirmButtonText: "Ir al login",
              cancelButtonText: "Usar otro correo",
            });
            if (result.isConfirmed) { window.location.href = "login.html"; return; }
          }
          showError(inputs.email, "emailError", "Este correo ya está registrado");
        } else if (error?.status === 429) {
          if (typeof Swal !== "undefined") {
            Swal.fire({ icon: "warning", title: "Demasiados registros", text: "Espera una hora antes de volver a intentarlo desde esta IP.", confirmButtonColor: "#16a34a" });
          }
        } else {
          const msg = error?.message || "No se ha podido contactar con el servidor. Inténtalo de nuevo.";
          if (typeof Swal !== "undefined") {
            Swal.fire({ icon: "error", title: "Error al registrarte", text: msg, confirmButtonColor: "#16a34a" });
          }
        }
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });
})();
# UEQO — Código actualizado

Este paquete contiene la versión actualizada del sitio UEQO con todas las correcciones del informe QA.

## 📁 Estructura de archivos

Respeta tu convención original (un `.html`, `.css` y `.js` por página, más archivos `common` para lo compartido):

```
docs/
├── index.html
├── login.html
├── registro.html
├── 404.html
├── privacidad.html
├── terminos.html
│
├── estilos/
│   ├── common.css      ← Cargado en TODAS las páginas (variables, navbar, forms, footer, botones)
│   ├── index.css       ← Específico de la landing (hero, features, steps, FAQ)
│   ├── login.css       ← Específico del login
│   ├── registro.css    ← Específico del registro (medidor de contraseña)
│   ├── 404.css         ← Específico de la 404
│   ├── privacidad.css  ← Específico de la política
│   └── terminos.css    ← Específico de los términos
│
├── jscode/
│   ├── common.js       ← Cargado en TODAS las páginas (utilidades, validadores, toggle password)
│   ├── index.js        ← Smooth scroll de la landing
│   ├── login.js        ← Lógica del formulario de login
│   └── registro.js     ← Lógica del formulario de registro (medidor, validación)
│
└── fotos/              ← Tu carpeta de imágenes (déjala como está)
```

## 🔗 Cómo se enlazan los archivos

Cada HTML carga **2 CSS** (común + específico) y **1 o 2 JS** (común + específico si lo necesita):

```html
<!-- En cada HTML -->
<link rel="stylesheet" href="estilos/common.css" />
<link rel="stylesheet" href="estilos/login.css" />
<!-- ... -->
<script src="jscode/common.js"></script>
<script src="jscode/login.js"></script>
```

**Importante:** siempre carga primero `common.css` y `common.js`, después el específico de la página. El orden importa porque los archivos específicos dependen de variables y utilidades definidas en los comunes.

## 🚀 Cómo desplegarlo

1. Sustituye los archivos de tu carpeta `front/docs/` por los de este paquete.
2. Conserva tu carpeta `fotos/` tal cual (no la toco).
3. Haz commit y push a tu repositorio. GitHub Pages lo actualizará automáticamente.

## ✅ Cambios aplicados del QA

### Críticos
- ✅ Validación completa de formularios en cliente
- ✅ Feedback al usuario (mensajes de error, estados de loading)
- ✅ Toggle de visibilidad de contraseña
- ✅ Enlace "¿Olvidaste tu contraseña?"
- ⚠️ Envío al backend: formularios muestran "próximamente" porque aún no hay API. Edita `jscode/login.js` y `jscode/registro.js` cuando tengas tu endpoint (hay comentarios `TODO` marcando dónde).

### Importantes
- ✅ Navbar limpia (sin "+1" ni logo duplicado)
- ✅ Página 404 personalizada
- ✅ Favicon SVG inline (sin necesidad de archivo externo)
- ✅ Meta tags SEO y Open Graph
- ✅ Política de privacidad y términos de uso
- ✅ Checkbox RGPD en registro
- ✅ Requisitos de contraseña visibles con validación en tiempo real
- ✅ Labels asociadas correctamente (`for`/`id`)
- ✅ Atributos `autocomplete` en todos los inputs

### Accesibilidad
- ✅ `lang="es"` en todas las páginas
- ✅ Atributos ARIA (`aria-label`, `aria-required`, `aria-describedby`, `aria-live`)
- ✅ Skip link para saltar al contenido
- ✅ Focus visible en elementos interactivos
- ✅ `role="alert"` en mensajes de error
- ✅ Soporte para `prefers-reduced-motion`

### UX / Diseño
- ✅ Hero mejorado con CTA dual
- ✅ Sección "Cómo funciona" con 3 pasos
- ✅ 6 features destacadas
- ✅ FAQ desplegable
- ✅ Footer completo con enlaces
- ✅ Responsive mobile-first
- ✅ Medidor visual de fuerza de contraseña
- ✅ Animaciones suaves

## 🖼️ Sobre la carpeta `fotos/`

No toqué tu carpeta de imágenes. Si quieres añadir imágenes al sitio, puedes:

1. Ponerlas en `docs/fotos/` (ej. `docs/fotos/hero.jpg`)
2. Referenciarlas en el HTML: `<img src="fotos/hero.jpg" alt="Descripción" />`

**Sugerencias** de dónde añadir imágenes:
- **Hero del index**: una ilustración o foto al lado del título
- **Cada feature card**: un icono o imagen más trabajado
- **Sección "Cómo funciona"**: mockups del producto
- **Logo**: sustituir el favicon SVG inline por tu logo real

## 🔧 Próximos pasos

1. **Conectar backend**: busca `TODO:` en `jscode/login.js` y `jscode/registro.js`.
2. **Logo y imágenes**: añadir assets reales a `fotos/` y sustituir el favicon.
3. **Datos del responsable RGPD**: completar `privacidad.html` y `terminos.html` con tus datos de contacto reales antes del lanzamiento.
4. **Dashboard y páginas internas**: cuando las crees, sigue la misma estructura (HTML + CSS propio + JS propio + carga `common`).

## 📝 Notas técnicas

- Sin frameworks ni dependencias externas — HTML, CSS y JS puros.
- Compatible con GitHub Pages sin configuración.
- CSS con variables: cambias un color en `common.css` y se aplica en todo el sitio.

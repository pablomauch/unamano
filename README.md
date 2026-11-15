# unamano — rifas que dan una mano

**Cada número suma.**

unamano es una plataforma de rifas solidarias con impacto social verificable. Organizaciones de base con personalidad jurídica (juntas de vecinos, centros de padres, clubes, sindicatos) postulan causas de su comunidad: salud, educación, vivienda, emergencias, inclusión y proyectos comunitarios. unamano verifica cada causa, opera la venta, paga directo al proveedor y publica el resultado. Si no se llega a la meta, devuelve el 100% a cada comprador.

Este repositorio es el **MVP funcional**: una app web instalable (PWA) en iPhone y Android, con su landing page y un panel de administración. No requiere compilación ni servidor propio.

---

## Qué incluye

| Parte | Ruta | Para quién |
|---|---|---|
| Landing page | `/` | Público general: explica el modelo y lleva a la app |
| App | `/app/` | Compradores y postulantes |
| Panel de administración | `/admin/` | Equipo de verificación (PIN demo: `1234`) |

### Entrada desde redes sociales (lo principal)
- Cada causa tiene su link y su código QR: `app/#/h/<id-de-la-causa>`. El influencer o la organización lo pone en TikTok o Instagram.
- Quien entra ve solo la historia de esa persona, como una historia de Instagram: quién es, qué necesita, cuánto falta y por qué confiar.
- Aportar toma dos toques: elegir $1.000, $2.000 o $5.000 y pagar. Cada $1.000 es un número del sorteo.
- El agradecimiento muestra el mensaje de la persona, cómo avanzó la meta con tu aporte y un botón para compartir una imagen vertical con QR en tus historias.
- Recién al final aparece «Conocer otras causas» (segunda instancia).
- En el panel y en la postulación publicada hay un kit para redes: QR, link e imagen para historias.

### App: inicio de impacto
- Al abrir, la app muestra el impacto acumulado: cifras principales, recaudación mes a mes, uso por tipo de causa, reparto de cada $1.000, recaudación por región, causas cumplidas y actividad reciente
- Las cifras históricas son de demostración y están marcadas como tales (`HISTORY` y `STORIES` en `data.js`)

### App: compradores
- Explorar causas activas, con búsqueda y filtros por tipo
- Compra en dos pasos: elegir cuántos números (asignados al azar) o elegir números específicos
- Ficha de cada causa: historia, meta, avance, cuenta regresiva, premio, el «sello» con cada verificación y el reparto de la plata
- Selector de números con rangos, compra al azar y bandeja de selección
- Pago (simulado) con Webpay, Mercado Pago o transferencia
- Tickets en «Mis números», con estado: participando, ganador, causa cumplida o devuelto
- Resultado público del sorteo, con verificación criptográfica desde el teléfono

### App: postulantes
- Espacio propio con requisitos, documentos necesarios, costos y proceso
- Formulario en 5 pasos, con afiche generado en vivo (foto opcional en duotono)
- Cálculo automático de meta y cantidad de números según presupuesto, precio y premio
- Seguimiento del estado de la postulación paso a paso
- Kit de difusión por WhatsApp cuando la rifa se publica

### Panel de administración
- Cola de casos por verificar, activos y cerrados, con KPIs
- Checklist de 6 verificaciones con interruptores, puntaje de confianza y alertas automáticas
- Aprobar y publicar, o rechazar con motivo
- Herramientas de demo: simular ventas, cerrar la venta y ejecutar el sorteo
- Si no se llegó a la meta, el sistema devuelve todas las compras automáticamente

### Accesibilidad
- Tipografía Atkinson Hyperlegible (Braille Institute), pensada para personas con baja visión
- Botón «Aa» para agrandar la letra en tres tamaños; toda la interfaz escala
- Botones grandes, una acción principal por pantalla y textos en lenguaje simple
- Colores de los gráficos validados para daltonismo y siempre acompañados de nombre

### Sorteo auditable (commit-reveal)
1. Al publicar la rifa se genera una semilla secreta y se publica su huella: `sha256(semilla)`.
2. Al sortear se revela la semilla.
3. Ganador = `vendidos_ordenados[ sha256("semilla:idCausa:cantidad") mod cantidad ]`.

Cualquiera puede recalcularlo con el botón «Recalcular en mi teléfono».

---

## Probarlo localmente

```bash
# desde la carpeta del proyecto
python3 -m http.server 8080
# o: npx serve .
```

Abre `http://localhost:8080`. El service worker funciona en `localhost` y en HTTPS.

## Publicar en GitHub Pages (gratis)

1. Crea un repositorio nuevo en GitHub, por ejemplo `unamano`.
2. Sube el contenido de esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "unamano MVP"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/unamano.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. En uno o dos minutos queda en `https://TU_USUARIO.github.io/unamano/`.

Todas las rutas son relativas, así que funciona tanto en un subdirectorio de GitHub Pages como en un dominio propio.

## Instalarla como app

- **iPhone:** abre la URL en Safari → botón Compartir → «Agregar a pantalla de inicio».
- **Android:** abre la URL en Chrome → «Instalar app» (o el botón «Instalar» dentro de la app).

Funciona sin conexión después de la primera visita.

---

## Estructura

```
index.html                 Landing
app/index.html             App (compradores y postulantes)
admin/index.html           Panel de administración (misma base, modo escritorio)
manifest.webmanifest       Manifiesto PWA
sw.js                      Service worker (offline)
assets/css/base.css        Sistema visual: tokens, tipografías, tickets, timbres
assets/css/app.css         Estilos de la app y del panel
assets/css/landing.css     Estilos de la landing
assets/js/data.js          Capa de datos (hoy localStorage) y reglas de negocio
assets/js/crypto.js        SHA-256, semilla y selección del ganador
assets/js/media.js         Fotos de las causas, etiquetas y sello
assets/js/charts.js        Gráficos de impacto (SVG, sin librerías)
assets/js/icons.js         Íconos, logo y timbre
assets/js/app.js           Router y vistas
assets/js/landing.js       Interacciones de la landing
assets/js/pwa.js           Instalación y registro del service worker
assets/fonts/              Atkinson Hyperlegible Next y Mono (SIL Open Font License)
assets/icons/              Íconos de la app
```

## Modo demo

- Las fotos de las causas de ejemplo vienen de Unsplash (licencia libre) y se cargan desde internet. Antes de lanzar hay que reemplazarlas por fotos reales, con autorización de cada familia. Si una foto no carga, la app muestra la inicial del nombre.

- Las causas son de ejemplo y los pagos son simulados.
- Los datos viven en el `localStorage` del dispositivo: cada teléfono tiene su propia demo.
- «Más → Reiniciar la demo» vuelve todo a cero.

---

## Camino a producción

`assets/js/data.js` es la única puerta a los datos. Para pasar a producción se reemplazan sus funciones por llamadas a un backend, sin tocar las vistas.

1. **Backend y base de datos.** Por ejemplo Supabase (Postgres, autenticación, almacenamiento y funciones). Tablas: `causas`, `verificaciones`, `compras`, `numeros` (con restricción única por causa y número), `organizaciones`, `pagos_clinica`, `auditoria`.
2. **Pagos.** Flow, Mercado Pago o Transbank (Webpay Plus) con webhooks de confirmación y reserva temporal de números mientras se paga. Los fondos se mantienen en una cuenta de la entidad organizadora o de un proveedor de pagos regulado, nunca en una cuenta personal, y deben soportar reembolsos automáticos.
3. **Sorteo.** La semilla se genera y guarda en el servidor; el sorteo lo ejecuta una función programada a la hora indicada.
4. **Verificación.** Validación de identidad con un proveedor de KYC; consulta al Registro Nacional de Prestadores Individuales de Salud; llamada a la clínica registrada en la auditoría; documentos cifrados en almacenamiento privado.
5. **Notificaciones.** Correo y WhatsApp con los números comprados, recordatorio del sorteo y resultado.
6. **Cuentas.** Inicio de sesión por correo para compradores y organizaciones; roles para el equipo de verificación (reemplaza el PIN de demo).

### Antes de lanzar: revisión legal

Este MVP asume que cada rifa la organiza una organización con personalidad jurídica, con fines benéficos y a favor de un tercero, en línea con la Ley 20.851. Antes de operar con dinero real hay que validar con un abogado:

- si el esquema online de la plataforma calza con la Ley 20.851 o requiere autorización según la Ley 10.262 y el Decreto 955
- la custodia de fondos de terceros y su relación con la regulación de la CMF
- el tratamiento tributario de las rifas y los premios
- el tratamiento de datos de salud, que son datos sensibles, bajo la ley de protección de datos personales vigente

---

Hecho en Chile.

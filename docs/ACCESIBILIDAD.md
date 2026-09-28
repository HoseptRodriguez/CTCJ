# Accesibilidad (WCAG 2.1 AA)

Revisión del 2026-09-28 (Parte 7). Objetivo: WCAG 2.1 nivel AA. Este documento resume lo que se verificó, cómo se verifica de forma automática y lo que falta. **No es una certificación:** las pruebas automáticas encuentran solo una parte de los problemas. Hace falta una prueba con personas que usan lector de pantalla.

## Cómo se verifica

| Verificación                                | Dónde                                                                                                                   | Qué revisa                                                                                                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| axe-core en las pruebas (jsdom)             | `apps/frontend/test/axe.js`, `src/a11y.public.test.jsx`, `MyCtcjTabs.test.jsx` y las pruebas de la consola del personal | Reglas WCAG 2.0/2.1 A y AA. **Cualquier violación grave o crítica hace fallar la prueba** (y el CI).                                                                                                                                    |
| Un solo `h1` y enlace "Saltar al contenido" | Las mismas pruebas                                                                                                      | Cada página pública y de Mi CTCJ tiene exactamente un `h1` y el enlace al contenido.                                                                                                                                                    |
| Contraste de colores                        | `src/lib/a11yContrast.test.js`                                                                                          | 44 combinaciones reales, calculadas con los colores del diseño: texto (4,5:1), texto grande (3:1), bordes, íconos y foco (3:1), estados al pasar el mouse, texto blanco translúcido sobre azul y el peor caso del título sobre la foto. |
| Teclado en la grilla de reservas            | `src/pages/reservation/CourtGrid.test.jsx`                                                                              | Las flechas llevan a la siguiente hora libre, saltando las ocupadas.                                                                                                                                                                    |
| axe-core en un navegador real               | Edge sin ventana, con el sitio en desarrollo y datos simulados (sin tocar la base)                                      | Todas las reglas, **incluido el contraste sobre la página ya pintada**, en 1366 px y en 320/375 px (equivale al zoom del 200 % o más).                                                                                                  |
| CI                                          | `.github/workflows/ci.yml`                                                                                              | Ahora también ejecuta las pruebas del frontend (con axe) y el build de producción.                                                                                                                                                      |

## Resultados en el navegador real

Sin violaciones de axe (WCAG 2.1 A y AA) y sin desplazamiento horizontal, después de las correcciones:

- **Sitio público:** Inicio, El club, Reservar cancha, Entrar, Crear cuenta, Política de datos, Política de cookies (1366 y 320 px).
- **Mi CTCJ:** Inicio, Mis reservas, Mi perfil, Mi progreso, Ranking, Comunidad, Mis datos y privacidad (320/375 y 1366 px).
- **Consola del club:** Panel, Cobros, Salud y bienestar, Datos personales, Finanzas, Planes, Precios de canchas (375 y 1366 px).

## Qué se corrigió en la Parte 7

| Problema                                                                                                                             | Criterio WCAG          | Arreglo                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| El idioma de la página era `es`                                                                                                      | 3.1.1                  | `<html lang="es-CO">`                                                                                          |
| 13 páginas de la consola no cambiaban el título de la pestaña                                                                        | 2.4.2                  | Cada página pone su título ("Cobros · Club de Tenis Ciudad Jardín")                                            |
| El texto de ejemplo de los campos (placeholder) tenía 3,6:1                                                                          | 1.4.3                  | Ahora 7,2:1                                                                                                    |
| El borde de los campos tenía 2,86:1 sobre el fondo gris                                                                              | 1.4.11                 | Nuevo gris `#848D9D`: 3,35:1 sobre blanco y 3,09:1 sobre el fondo                                              |
| El buscador de la consola usaba `aria-expanded` (no válido en un campo de búsqueda) y `aria-controls` hacia una lista que no existía | 4.1.2                  | Se quitó `aria-expanded`; `aria-controls` solo cuando los resultados se muestran (se anuncian con `aria-live`) |
| Los títulos grandes de El club empujaban la página hacia un lado a 320 px                                                            | 1.4.10 (reflujo)       | La línea decorativa pasa a la siguiente línea                                                                  |
| La gráfica de Finanzas estaba oculta para lectores pero podía recibir el foco                                                        | 4.1.2                  | Ya no recibe el foco (la tabla de al lado tiene los mismos datos)                                              |
| Las tablas que se desplazan de lado (Ranking, Finanzas, cuadro de torneos) no se podían desplazar con teclado                        | 2.1.1                  | Se pueden enfocar y desplazar con las flechas; tienen nombre                                                   |
| La grilla de reservas solo se recorría con Tab                                                                                       | 2.1.1                  | En computador, también con las flechas (con una indicación visible)                                            |
| Los errores de los campos no se anunciaban al aparecer                                                                               | 3.3.1, 4.1.3           | Cada campo tiene una región `aria-live`; el error además queda unido al campo con `aria-describedby`           |
| Las tarjetas (`section`) no tenían nombre                                                                                            | 1.3.1 (buena práctica) | Cada tarjeta con título queda nombrada por él                                                                  |
| Los campos del correo de otra persona (menor, profesional) se autocompletaban con el propio                                          | 1.3.5                  | `autocomplete="off"` en esos campos                                                                            |

## Lo que ya estaba bien (verificado)

- Enlace "Saltar al contenido" al inicio de cada pantalla (sitio público, Mi CTCJ y consola), y un solo `h1` por página.
- Etiqueta visible encima de cada campo; `autocomplete` correcto en los datos personales (`given-name`, `family-name`, `email`, `current-password`, `new-password`, `tel`, `bday`); al enviar con errores, el foco va al primer campo con error.
- Diálogos y paneles laterales: atrapan el foco, se cierran con Esc y devuelven el foco a quien los abrió.
- Botones que dicen la acción ("Sí, cancelar reserva", "Guardar y continuar"); los que solo tienen ícono llevan `aria-label` (axe lo verifica: `button-name`).
- Estados con texto, no solo con color (insignias, celdas de la grilla, leyenda).
- Videos de la Comunidad: controles nativos, sin reproducción automática.
- Movimiento reducido: las animaciones respetan `prefers-reduced-motion`.
- Imágenes: texto alternativo descriptivo en las fotos; los íconos decorativos están ocultos para lectores.

## Pendiente

- **Prueba con personas** que usan lector de pantalla (NVDA en Windows, TalkBack en Android, VoiceOver en iPhone) y con ampliación de pantalla. Nivel: **alto**.
- **Subtítulos** de los videos de la Comunidad (los suben los jugadores). Nivel: medio. [VERIFICAR con el abogado] qué se le exige al club por contenido de terceros.
- **Gráficas de rendimiento** de Mi CTCJ: ofrecer los datos también en una tabla. Nivel: medio.
- En el teléfono, la grilla de reservas es una lista por cancha y se recorre con Tab (sin flechas). Nivel: bajo.
- Casillas de verificación de 24 px: toda la fila es el área que se pulsa (más de 44 px), pero la casilla en sí es pequeña. Nivel: bajo.
- Plazo para responder los reportes de accesibilidad: [COMPLETAR] (también en `LEGAL_PENDIENTES.md`).
- La **Declaración de accesibilidad** (`/accesibilidad`) pasó a la versión 2 con estas limitaciones.

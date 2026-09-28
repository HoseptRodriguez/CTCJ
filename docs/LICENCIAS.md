# Licencias de fotos, tipografías, íconos y librerías

Revisado el 2026-09-28 a partir de los archivos `package.json` y `LICENSE` instalados en `node_modules`. Todo lo marcado **[VERIFICAR]** necesita confirmación con la fuente oficial o con un abogado. El aviso que exigen algunas licencias se publica con el sitio en `/licencias-terceros.txt` (`apps/frontend/public/licencias-terceros.txt`).

## Fotos

Solo se usan las fotos oficiales del club (folleto), sin fotos de banco ni generadas. El detalle de cada una (origen, autor, personas reconocibles, menores y autorización) está en `apps/frontend/src/lib/photo-rights.js`. Resumen:

| Foto                                  | Personas reconocibles  | Menores                | Autorización de imagen | En el sitio                                                   |
| ------------------------------------- | ---------------------- | ---------------------- | ---------------------- | ------------------------------------------------------------- |
| `canchas-panoramica-nubes`            | No                     | No                     | No aplica              | Sí                                                            |
| `jugador-desplazamiento`              | Sí (adulto)            | No                     | Pendiente              | Sí, pendiente de autorización                                 |
| `jugador-espera-recepcion`            | Sí (adulto)            | No                     | Pendiente              | Sí, pendiente de autorización                                 |
| `academia-chaqueta-orlando-rodriguez` | Sí (Orlando Rodríguez) | No                     | Pendiente              | Sí, pendiente de autorización                                 |
| `jugador-saque-azul`                  | Sí                     | Posible (se trata así) | No                     | **No** (retirada hasta que se confirme)                       |
| `nino-saque`                          | Sí                     | Sí                     | No                     | **No** (retirada hasta la autorización escrita del acudiente) |

- **Autor de las fotos:** [COMPLETAR] para todas. El club debe confirmar quién las tomó y que le cedió el derecho de usarlas en el sitio (Ley 23 de 1982) [VERIFICAR].
- **Bloqueo:** `npm run build` ejecuta `scripts/check-photo-rights.mjs`, que falla si en `public/img/club` o en el código hay una foto con menores sin autorización, o una foto sin registrar en `photo-rights.js`. `npm run photos` tampoco genera esas fotos.
- Para volver a publicar una foto con menores: guardar la autorización escrita del acudiente, poner `imageAuthorization: true` y `authorizationRef` (dónde está el documento) en `photo-rights.js`, agregarla a `ClubPhoto.jsx` y correr `npm run photos`.

## Tipografías

| Tipografía     | Paquete                            | Licencia    | Aviso de derechos (del archivo LICENSE del paquete)                                               |
| -------------- | ---------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| Archivo        | `@fontsource/archivo` 5.3.0        | SIL OFL 1.1 | Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)              |
| Archivo Narrow | `@fontsource/archivo-narrow` 5.3.0 | SIL OFL 1.1 | Copyright 2019 The Archivo Narrow Project Authors (https://github.com/Omnibus-Type/ArchivoNarrow) |

La OFL permite usarlas y servirlas desde el propio sitio (sin Google Fonts). Al redistribuir los archivos de la fuente hay que incluir el aviso y la licencia: están en `licencias-terceros.txt`.

## Íconos

Los 44 íconos de `apps/frontend/src/components/icons` **derivan de Lucide** (https://lucide.dev): al menos uno (el corazón) tiene el mismo trazo. Lucide usa la licencia **ISC**, que permite usarlos y modificarlos si se conserva el aviso de derechos y de licencia. El aviso se publica en `licencias-terceros.txt` y en `components/icons/LICENCIA-LUCIDE.txt`.

- [VERIFICAR] el texto exacto del aviso contra el archivo `LICENSE` oficial de Lucide (incluye una parte de Feather, de Cole Bemis, con licencia MIT).

## Animaciones: GSAP

| Paquete       | Versión | Licencia                                                              |
| ------------- | ------- | --------------------------------------------------------------------- |
| `gsap`        | 3.15.0  | GSAP Standard "no charge" License (https://gsap.com/standard-license) |
| `@gsap/react` | 2.1.2   | La misma                                                              |

No es una licencia de código abierto: permite el uso gratuito con condiciones. Se usa en cuatro animaciones del sitio público (`src/lib/gsap.js`). [VERIFICAR] que las condiciones vigentes permiten este uso (sitio de un club, sin cobro por la animación). Si no, las animaciones se pueden quitar sin afectar el funcionamiento (el sitio ya funciona sin ellas con `prefers-reduced-motion`).

## Librerías del frontend (se envían al navegador)

| Paquete          | Versión | Licencia   |
| ---------------- | ------- | ---------- |
| react, react-dom | 18.3.1  | MIT        |
| react-router-dom | 6.30.6  | MIT        |
| framer-motion    | 11.18.2 | MIT        |
| recharts         | 3.10.1  | MIT        |
| zod              | 3.25.76 | MIT        |
| @vercel/blob     | 2.8.0   | Apache-2.0 |

MIT y Apache-2.0 permiten el uso comercial; piden conservar sus avisos, que van dentro de los propios paquetes. [VERIFICAR] si el club quiere publicar también esos avisos en `licencias-terceros.txt`.

## Librerías del servidor (no se envían al navegador)

| Paquete                                                                                                         | Licencia                                                                   |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| express, helmet, cors, cookie-parser, multer, jsonwebtoken, argon2, pino, pino-http, express-rate-limit, resend | MIT                                                                        |
| nodemailer 9.1.1                                                                                                | MIT-0                                                                      |
| dotenv 16.6.1                                                                                                   | BSD-2-Clause                                                               |
| @prisma/client 5.22.0, @vercel/blob 2.8.0                                                                       | Apache-2.0                                                                 |
| sharp 0.35.4                                                                                                    | Apache-2.0; incluye libvips (LGPL-3.0, enlazada dinámicamente) [VERIFICAR] |

## Logo y marca

El escudo y el nombre del club son del club. El logo de la Academia Orlando Rodríguez: [VERIFICAR] quién es su titular y que el club puede usarlo en el sitio.

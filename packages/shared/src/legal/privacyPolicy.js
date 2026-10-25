import { BUSINESS } from './business.js';

/**
 * Política de Tratamiento de Datos Personales (Ley 1581 de 2012 y Decreto
 * 1377 de 2013, compilado en el Decreto 1074 de 2015). Built from
 * docs/LEGAL_INVENTARIO.md. A proposal: a Colombian lawyer must review it
 * before publishing. Changing the text requires a new version (see
 * legal/manifest.json and its test).
 */
export const PRIVACY_POLICY = Object.freeze({
  type: 'PRIVACY_POLICY',
  path: '/privacidad',
  title: 'Política de Tratamiento de Datos Personales',
  version: '4',
  publishedOn: '2026-10-03',
  sections: [
    {
      id: 'responsable',
      heading: '1. Quién es el responsable de tus datos',
      blocks: [
        {
          p: `El responsable del tratamiento de tus datos personales es ${BUSINESS.legalName}, identificado con NIT ${BUSINESS.nit}, que opera el ${BUSINESS.commercialName} ("el club").`,
        },
        {
          list: [
            `Dirección: ${BUSINESS.address}, ${BUSINESS.city}.`,
            `Dirección de notificaciones: ${BUSINESS.noticesAddress}.`,
            `Teléfono y WhatsApp: ${BUSINESS.phone}.`,
            `Correo para temas de datos personales: ${BUSINESS.privacyEmail}.`,
          ],
        },
        {
          p: 'Esta política explica qué datos tratamos, para qué, con quién los compartimos y cómo puedes ejercer tus derechos.',
        },
      ],
    },
    {
      id: 'datos',
      heading: '2. Qué datos tratamos',
      blocks: [
        {
          table: {
            head: ['Datos', 'Cuándo los recibimos', '¿Obligatorio?'],
            rows: [
              [
                'Nombre, apellido, correo y contraseña (guardamos solo una versión cifrada)',
                'Al crear tu cuenta',
                'Sí',
              ],
              [
                'Fecha de nacimiento',
                'Al crear tu cuenta',
                'Sí. La usamos para saber si eres menor de edad y, si lo eres, pedir la autorización de tu acudiente',
              ],
              [
                'Verificación en dos pasos: la clave de tu aplicación de autenticación (guardada cifrada) y tus códigos de recuperación (solo una versión cifrada)',
                'Si la activas en "Mi perfil". Es obligatoria para Administración, Psicología, Neuropsicología y Fisioterapia',
                'Solo para esos roles',
              ],
              [
                'Solicitud de información: nombre, celular, correo (opcional), programa de interés, para quién es, la edad del niño o niña (solo la edad, nunca su nombre), horario preferido y mensaje',
                'Si llenas el formulario "Solicitar información", sin necesidad de tener cuenta',
                'Nombre, celular, programa y para quién es: sí. Lo demás: no',
              ],
              [
                'Tus preferencias de notificaciones (qué avisos quieres y por dónde, y si prefieres un resumen diario)',
                'En Mi CTCJ > Notificaciones',
                'No. Los avisos del servicio vienen activados; los promocionales, apagados',
              ],
              [
                'Historial de los correos que te enviamos: dirección, asunto, fecha, si se entregó o falló y, si el proveedor lo informa, si se abrió',
                'Cada vez que te enviamos un aviso o un comunicado',
                'Se registra automáticamente, para saber qué se envió y reintentar si falla',
              ],
              ['Teléfono, presentación ("Sobre mí") y foto de perfil', 'En "Mi perfil"', 'No'],
              ['Mano dominante y tipo de revés', 'En "Mi perfil"', 'No'],
              [
                'Tipo y número de documento de identidad',
                'Solo si lo pides en recepción para una factura electrónica a tu nombre o para inscribirte en un torneo de liga',
                'No',
              ],
              [
                'Reservas, pagos, planes, facturas y ajustes (becas o descuentos)',
                'Al usar los servicios del club',
                'Según el servicio',
              ],
              [
                'Notas y evaluaciones de tus entrenadores, metas, retos, resultados y ranking',
                'Durante tu formación deportiva',
                'Según el servicio',
              ],
              [
                'Publicaciones, comentarios, fotos, videos, "me gusta" y reportes de la Comunidad',
                'Si usas la Comunidad',
                'No',
              ],
              [
                'Datos de salud: citas, notas y planes de psicología, neuropsicología y fisioterapia',
                'Si recibes atención de esos profesionales en el club',
                'No (ver sección 4)',
              ],
              [
                'Dirección IP y navegador de tus sesiones y de tus autorizaciones',
                'Al iniciar sesión y al aceptar o retirar una autorización',
                'Se toman automáticamente, por seguridad y como prueba',
              ],
            ],
          },
        },
        {
          p: 'A las fotos que subes les quitamos los datos ocultos del archivo (como la ubicación GPS) antes de guardarlas.',
        },
      ],
    },
    {
      id: 'finalidades',
      heading: '3. Para qué usamos tus datos',
      blocks: [
        {
          list: [
            'Crear y administrar tu cuenta, y verificar tu correo.',
            'Responder tus solicitudes de información sobre clases y programas, por WhatsApp o por correo.',
            'Gestionar tus reservas de cancha y los cobros en recepción.',
            'Gestionar tu plan de la academia, tus facturas y sus pagos.',
            'Hacer tu seguimiento deportivo: notas, evaluaciones, metas, retos, torneos y ranking.',
            'Permitir tu participación en la Comunidad y moderarla.',
            'Prestar la atención de psicología, neuropsicología y fisioterapia, si la recibes.',
            'Enviarte avisos del servicio (confirmaciones, facturas, cambios de precio, cambios de contraseña; notas y evaluaciones de tu entrenador; cuadros, horarios, resultados y cancelaciones de tus torneos; comunicados operativos del club), dentro de la app y por correo, de 7:00 a. m. a 9:00 p. m. Puedes apagar los que no sean de tu cuenta en Mi CTCJ > Notificaciones.',
            'Publicar los torneos del club en una página pública (sin iniciar sesión), con el nombre y la categoría de cada jugador, sus cuadros y resultados. Nunca se publican datos de contacto.',
            'Enviarte novedades y promociones del club (torneos nuevos, eventos, promociones), solo si lo autorizas, por los canales y temas que elijas, de lunes a viernes de 7:00 a. m. a 7:00 p. m. y sábados de 8:00 a. m. a 3:00 p. m., nunca domingos ni festivos (Ley 2300 de 2023). Cada correo promocional trae un enlace para dejar de recibirlos con un clic.',
            'Proteger la seguridad de las cuentas y del sitio, y conservar la prueba de tus autorizaciones.',
            'Cumplir obligaciones legales, contables y tributarias.',
          ],
        },
      ],
    },
    {
      id: 'sensibles',
      heading: '4. Datos sensibles (salud)',
      blocks: [
        {
          p: 'Los datos de salud son sensibles. Solo los tratamos con tu autorización explícita, que es opcional: puedes negarte, y eso no afecta los demás servicios del club.',
        },
        {
          p: 'Los ven solo los profesionales que te atienden. Administración solo puede leer tus notas de fisioterapia si tú lo autorizas desde "Mi perfil", y cada lectura queda registrada con quién, cuándo y sobre qué jugador.',
        },
        {
          p: 'Los datos de salud nunca se incluyen en correos, notificaciones ni exportaciones.',
        },
      ],
    },
    {
      id: 'menores',
      heading: '5. Niñas, niños y adolescentes',
      blocks: [
        {
          p: 'Respetamos el interés superior de los menores y su derecho a la intimidad y a la imagen (Ley 1098 de 2006).',
        },
        {
          p: 'La cuenta de un menor de edad queda "pendiente de autorización del acudiente". Mientras tanto, puede entrar y ver información, pero no reservar, publicar en la Comunidad ni recibir mensajes promocionales.',
        },
        {
          p: 'Para activarla, su acudiente o representante legal vincula la cuenta desde su propio perfil, el club aprueba la vinculación y el acudiente acepta la autorización de datos e imagen del menor. Puede retirarla cuando quiera.',
        },
        {
          p: 'Las cuentas de menores no pueden subir fotos ni videos. Cualquier persona puede reportar una publicación en la que aparezca un menor sin autorización.',
        },
        {
          p: 'Los correos sobre la cuenta de un menor se envían a su acudiente, no al menor. En las páginas públicas de torneos, un menor aparece solo con su nombre y la inicial del apellido (por ejemplo "Lucía R."), salvo que su acudiente autorice mostrar el nombre completo.',
        },
      ],
    },
    {
      id: 'derechos',
      heading: '6. Tus derechos',
      blocks: [
        {
          p: 'Como titular de tus datos tienes derecho a:',
        },
        {
          list: [
            'Conocer, actualizar y rectificar tus datos.',
            'Pedir la prueba de la autorización que nos diste.',
            'Saber cómo hemos usado tus datos.',
            'Revocar la autorización o pedir que suprimamos tus datos, salvo cuando un deber legal o contractual nos obligue a conservarlos.',
            'Acceder gratis a tus datos.',
            'Presentar quejas ante la Superintendencia de Industria y Comercio, después de haber hecho tu consulta o reclamo al club.',
          ],
        },
      ],
    },
    {
      id: 'como-ejercerlos',
      heading: '7. Cómo ejercer tus derechos y en cuánto tiempo respondemos',
      blocks: [
        {
          list: [
            `Por correo a ${BUSINESS.privacyEmail}.`,
            'Desde "Mis datos y privacidad" en Mi CTCJ: allí puedes ver y retirar tus autorizaciones, descargar y corregir tus datos, pedir la eliminación de tu cuenta y enviar consultas o reclamos con número de radicado.',
          ],
        },
        {
          p: 'Consultas: respondemos en máximo 10 días hábiles desde que la recibimos. Si no alcanzamos, te avisamos el motivo y respondemos en máximo 5 días hábiles más.',
        },
        {
          p: 'Reclamos (para corregir, actualizar o suprimir datos, o por un posible incumplimiento): respondemos en máximo 15 días hábiles desde el día siguiente a recibirlo. Si no alcanzamos, te avisamos el motivo y respondemos en máximo 8 días hábiles más.',
        },
      ],
    },
    {
      id: 'terceros',
      heading: '8. Con quién compartimos tus datos',
      blocks: [
        {
          p: 'No vendemos tus datos. Para funcionar, el sitio usa proveedores que tratan datos por cuenta del club (encargados), algunos con servidores fuera de Colombia:',
        },
        {
          table: {
            head: ['Proveedor', 'Para qué', 'País del servidor'],
            rows: [
              ['Render', 'Alojamiento del servidor del sitio', '[VERIFICAR]'],
              [
                'Vercel',
                'Alojamiento de la página web y de las fotos y videos (Vercel Blob)',
                '[VERIFICAR]',
              ],
              ['[VERIFICAR: proveedor de la base de datos]', 'Base de datos', '[VERIFICAR]'],
              [
                'Resend',
                'Envío de correos (avisos del servicio, comunicados y, si los autorizas, promociones); puede informar si un correo se abrió',
                '[VERIFICAR]',
              ],
            ],
          },
        },
        {
          p: 'Con cada proveedor [VERIFICAR: contrato de transmisión o transferencia de datos y garantías adecuadas]. Los enlaces a WhatsApp, Google Maps, Instagram, Facebook y TikTok te llevan a esos servicios, que tienen sus propias políticas. El sitio no los incrusta ni les envía tus datos.',
        },
      ],
    },
    {
      id: 'seguridad',
      heading: '9. Cómo protegemos tus datos',
      blocks: [
        {
          list: [
            'Las contraseñas se guardan cifradas con un algoritmo de un solo sentido (argon2).',
            'Administración y el personal de salud (Psicología, Neuropsicología y Fisioterapia) entran con verificación en dos pasos: además de la contraseña, un código que genera su teléfono. Cualquier otra persona puede activarla en "Mi perfil".',
            'Cada persona del club ve solo lo que su función necesita.',
            'Las lecturas de datos de salud por parte de Administración quedan registradas.',
            'Los registros técnicos del servidor no guardan contraseñas, tokens de sesión ni direcciones IP.',
            'Las copias de seguridad se guardan cifradas y con acceso restringido [VERIFICAR].',
          ],
        },
      ],
    },
    {
      id: 'conservacion',
      heading: '10. Cuánto tiempo guardamos tus datos',
      blocks: [
        {
          p: 'Guardamos tus datos mientras tengas una cuenta o una relación con el club, y después solo el tiempo que la ley exija:',
        },
        {
          list: [
            'Cuenta y perfil tras eliminarla: [COMPLETAR]. Al eliminar tu cuenta, los datos que la ley no obliga a conservar se anonimizan.',
            'Facturas, pagos y soportes contables: [COMPLETAR: plazo que indique el contador].',
            'Datos de salud: [VERIFICAR: plazo legal de la historia clínica].',
            'Datos de seguridad (sesiones, direcciones IP): [COMPLETAR].',
            'Solicitudes de información descartadas o que nunca se respondieron: se borran automáticamente a los [COMPLETAR: meses] meses. La prueba de tu autorización se conserva sin tus datos de contacto.',
            'Prueba de tus autorizaciones: mientras pueda exigirse [VERIFICAR].',
            'Historial de correos enviados: [COMPLETAR: plazo].',
          ],
        },
      ],
    },
    {
      id: 'cookies',
      heading: '11. Cookies',
      blocks: [
        {
          p: 'Usamos solo las cookies y el almacenamiento del navegador que se describen en la Política de cookies. Las que no son necesarias solo se usan si las aceptas.',
        },
      ],
    },
    {
      id: 'vigencia',
      heading: '12. Vigencia y cambios',
      blocks: [
        {
          p: 'Esta política rige desde la fecha de su última actualización, indicada al inicio. Si la cambiamos de forma importante, te lo avisaremos antes y, cuando corresponda, te pediremos de nuevo tu autorización. Cada versión queda guardada.',
        },
      ],
    },
  ],
});

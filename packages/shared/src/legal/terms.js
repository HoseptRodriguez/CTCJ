import { BUSINESS } from './business.js';

/**
 * Términos y condiciones de uso. A proposal to be reviewed by a Colombian
 * lawyer. Deliberately without abusive clauses (Ley 1480 de 2011, arts. 42
 * y 43): no blanket exclusion of liability, no waiver of consumer rights, no
 * unilateral changes without notice.
 */
export const TERMS = Object.freeze({
  type: 'TERMS',
  path: '/terminos',
  title: 'Términos y condiciones de uso',
  version: '1',
  publishedOn: '2026-09-28',
  sections: [
    {
      id: 'quienes-somos',
      heading: '1. Quiénes somos',
      blocks: [
        {
          list: [
            `Nombre comercial: ${BUSINESS.commercialName}.`,
            `Razón social: ${BUSINESS.legalName}.`,
            `NIT: ${BUSINESS.nit}.`,
            `Dirección: ${BUSINESS.address}, ${BUSINESS.city}.`,
            `Teléfono y WhatsApp: ${BUSINESS.phone}.`,
            `Correo de contacto: ${BUSINESS.contactEmail}.`,
          ],
        },
        {
          p: 'Estos términos regulan el uso de este sitio y de Mi CTCJ. Al crear una cuenta los aceptas. Si no estás de acuerdo con ellos, puedes seguir consultando la información pública del sitio sin registrarte.',
        },
      ],
    },
    {
      id: 'cuentas',
      heading: '2. Cuentas',
      blocks: [
        {
          list: [
            'Cualquier persona puede crear una cuenta con su nombre real, su fecha de nacimiento y un correo propio. La cuenta es personal: no la compartas ni compartas tu contraseña.',
            'Mantén tus datos al día. Puedes corregirlos desde "Mi perfil" o pedirlo al club.',
            'Para ser "Jugador" de la academia, el club aprueba una solicitud de afiliación.',
            'La cuenta de un menor de edad queda pendiente hasta que su acudiente la vincule y autorice sus datos e imagen. Mientras tanto, el menor puede entrar y ver información, pero no reservar ni publicar. El menor no puede dar esa autorización por sí mismo.',
          ],
        },
      ],
    },
    {
      id: 'reservas',
      heading: '3. Reservas de cancha',
      blocks: [
        {
          list: [
            'Al elegir una hora libre, te la guardamos unos minutos para que confirmes. El club define ese tiempo (hoy, 15 minutos) y lo muestra en la pantalla de reservas. Si no confirmas a tiempo, la hora vuelve a quedar libre.',
            'Cada jugador puede tener hasta 2 reservas activas al mismo tiempo.',
            'Si la hora siguiente de la misma cancha está libre, puedes agregarla a tu reserva, hasta un máximo de 2 horas seguidas. Es una sola reserva: una confirmación, una cancelación y un cobro.',
            'El precio es el vigente al confirmar la reserva, y un cambio de precio posterior no lo modifica.',
            'El pago se hace en recepción. El pago en línea todavía no está disponible.',
            'Las cancelaciones y los reembolsos se rigen por la Política de cancelaciones y reembolsos.',
          ],
        },
      ],
    },
    {
      id: 'comunidad',
      heading: '4. Reglas de la Comunidad',
      blocks: [
        { p: 'La Comunidad es un espacio de los jugadores del club. No está permitido publicar:' },
        {
          list: [
            'Contenido ofensivo, discriminatorio, violento, sexual o que acose a otra persona.',
            'Datos personales de otras personas sin su permiso.',
            'Fotos o videos de otras personas sin su permiso. Si aparece un menor, además, se necesita el permiso de su acudiente.',
            'Contenido que infrinja derechos de autor de terceros.',
            'Publicidad o spam.',
          ],
        },
        {
          p: 'Cualquier jugador puede reportar una publicación. Una publicación con 3 reportes se oculta automáticamente hasta que el club la revise. El club puede ocultar o eliminar el contenido que incumpla estas reglas.',
        },
      ],
    },
    {
      id: 'contenidos',
      heading: '5. Tus publicaciones y fotos',
      blocks: [
        {
          p: 'Lo que publicas sigue siendo tuyo. Nos das un permiso no exclusivo, gratuito y limitado para mostrarlo dentro de este sitio, solo a los usuarios que pueden ver la Comunidad, mientras no lo borres. No usamos tus publicaciones en publicidad ni fuera del sitio sin pedirte permiso aparte.',
        },
        {
          p: 'Al publicar fotos o videos declaras que tienes el permiso de las personas que aparecen y, si hay menores, el de su acudiente.',
        },
      ],
    },
    {
      id: 'suspension',
      heading: '6. Suspensión de cuentas',
      blocks: [
        {
          p: 'El club puede suspender una cuenta que incumpla gravemente estos términos, por ejemplo por acoso, suplantación o uso fraudulento. Salvo que haya un riesgo para otras personas, te avisaremos antes y podrás dar tu versión por los canales de PQRS. La suspensión no afecta tus derechos sobre los pagos ya hechos ni tus derechos sobre tus datos personales.',
        },
      ],
    },
    {
      id: 'responsabilidad',
      heading: '7. Responsabilidad',
      blocks: [
        {
          p: 'El club responde por la prestación de sus servicios según la ley colombiana, incluido el Estatuto del Consumidor (Ley 1480 de 2011). Nada de estos términos limita los derechos que la ley te da como consumidor.',
        },
      ],
    },
    {
      id: 'cambios',
      heading: '8. Cambios a estos términos',
      blocks: [
        {
          p: 'Si cambiamos estos términos, te avisaremos con al menos [COMPLETAR: días de aviso] días de anticipación por correo o en Mi CTCJ. Si no estás de acuerdo con los nuevos términos, puedes cerrar tu cuenta antes de que entren en vigor. Cada versión queda guardada, con su fecha.',
        },
      ],
    },
    {
      id: 'ley',
      heading: '9. Ley aplicable y PQRS',
      blocks: [
        { p: 'Estos términos se rigen por las leyes de la República de Colombia.' },
        {
          p: 'Peticiones, quejas, reclamos y sugerencias (PQRS):',
        },
        {
          list: [
            `Correo: ${BUSINESS.contactEmail}.`,
            `WhatsApp: ${BUSINESS.phone}.`,
            'En persona, en la recepción del club.',
          ],
        },
        {
          p: 'Respondemos en máximo [COMPLETAR: plazo de respuesta de PQRS] días hábiles. Si no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio.',
        },
      ],
    },
  ],
});

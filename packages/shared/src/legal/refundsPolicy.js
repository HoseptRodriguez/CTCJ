import { BUSINESS } from './business.js';

/**
 * Política de cancelaciones y reembolsos. The deadlines the club hasn't
 * defined are [COMPLETAR] markers; the legal points to confirm are
 * [VERIFICAR]. Retracto (Ley 1480, art. 47) and reversión del pago (art. 51)
 * are described only where they apply.
 */
export const REFUNDS_POLICY = Object.freeze({
  type: 'REFUNDS',
  path: '/reembolsos',
  title: 'Política de cancelaciones y reembolsos',
  version: '1',
  publishedOn: '2026-09-28',
  sections: [
    {
      id: 'reservas',
      heading: '1. Cancelar una reserva de cancha',
      blocks: [
        {
          list: [
            'Puedes cancelar tu reserva desde Mi CTCJ, en "Reservas". Si la reserva es de 2 horas, se cancelan las dos.',
            'Cancelación sin costo: hasta [COMPLETAR: plazo sin costo] antes de la hora reservada. Hoy la pantalla de reservas avisa con 12 horas; el club debe confirmar ese plazo.',
            'Cancelación tardía: [COMPLETAR: qué pasa si se cancela después del plazo].',
            'Si no te presentas sin cancelar: [COMPLETAR: qué pasa si no se presenta].',
            'Si el club cancela la reserva (lluvia, mantenimiento u otra causa del club), no pagas nada y, si ya pagaste, te devolvemos el valor completo o te damos otra hora, a tu elección.',
          ],
        },
      ],
    },
    {
      id: 'planes',
      heading: '2. Mensualidades y planes de la academia',
      blocks: [
        {
          list: [
            'Cómo retirarse de un plan: [COMPLETAR].',
            'Qué pasa con la mensualidad ya pagada si te retiras a mitad de mes: [COMPLETAR].',
            'Cambios de precio: te avisamos con anticipación antes de que empiece el nuevo precio, y las facturas ya emitidas no cambian.',
          ],
        },
      ],
    },
    {
      id: 'retracto',
      heading: '3. Derecho de retracto',
      blocks: [
        {
          p: 'En las ventas a distancia (Ley 1480 de 2011, art. 47), tienes derecho a retractarte dentro de los 5 días hábiles siguientes a la compra y a que te devuelvan lo que pagaste. No aplica, entre otros casos, a servicios cuya prestación ya empezó con tu acuerdo.',
        },
        {
          p: 'Hoy los pagos se hacen en persona en la recepción del club. [VERIFICAR con el abogado: en qué casos aplica el retracto a las reservas hechas en el sitio y pagadas en recepción, y a los planes de la academia.]',
        },
      ],
    },
    {
      id: 'reversion',
      heading: '4. Reversión del pago',
      blocks: [
        {
          p: 'La reversión del pago (Ley 1480 de 2011, art. 51) aplica a los pagos electrónicos. Hoy el sitio no recibe pagos electrónicos ("Pago en línea — Próximamente"). Cuando los reciba, esta política explicará cómo pedir la reversión.',
        },
      ],
    },
    {
      id: 'como-pedir',
      heading: '5. Cómo pedir un reembolso',
      blocks: [
        {
          list: [
            'En la recepción del club.',
            `Por WhatsApp: ${BUSINESS.phone}.`,
            `Por correo: ${BUSINESS.contactEmail}.`,
          ],
        },
        {
          p: 'Indica tu nombre, la reserva o la factura y el motivo. Respondemos en máximo [COMPLETAR: plazo de respuesta] días hábiles y, si procede, devolvemos el dinero por [COMPLETAR: medio de devolución] en máximo [COMPLETAR: plazo de devolución] días hábiles.',
        },
      ],
    },
  ],
});

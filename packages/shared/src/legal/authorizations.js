/**
 * Short authorizations accepted inside the app (not pages of their own).
 * Versioned like every legal document: a new wording is a new version
 * (manifest.json). Drafts to be reviewed by a Colombian lawyer.
 */

/** Datos sensibles de salud (Ley 1581 de 2012, arts. 5 y 6): explicit and optional. */
export const HEALTH_DATA_AUTHORIZATION = Object.freeze({
  type: 'HEALTH_DATA',
  path: null,
  title: 'Autorización para el tratamiento de mis datos de salud',
  version: '1',
  publishedOn: '2026-09-28',
  sections: [
    {
      id: 'texto',
      heading: null,
      blocks: [
        {
          p: 'Autorizo al club a registrar y consultar mis datos de salud (citas, notas, planes de recuperación, antecedentes y aptitud física) solo para que los profesionales de psicología, neuropsicología y fisioterapia del club me atiendan.',
        },
        {
          p: 'Sé que son datos sensibles y que esta autorización es opcional: puedo negarme, y eso no afecta los demás servicios del club, aunque sin ella esos profesionales no pueden registrar mi atención en el sitio.',
        },
        {
          p: 'Puedo retirarla cuando quiera desde "Mis datos y privacidad". Lo ya registrado se conserva el tiempo que exija la ley para la historia clínica.',
        },
      ],
    },
  ],
});

/** Reglas de la Comunidad: accepted before the first post or comment. */
export const COMMUNITY_RULES_ACCEPTANCE = Object.freeze({
  type: 'COMMUNITY_RULES',
  path: null,
  title: 'Reglas de la Comunidad',
  version: '1',
  publishedOn: '2026-09-28',
  sections: [
    {
      id: 'texto',
      heading: null,
      blocks: [
        {
          list: [
            'Trato a los demás con respeto: nada ofensivo, discriminatorio, violento o sexual, y nada de acoso.',
            'No publico datos personales de otras personas sin su permiso.',
            'Solo publico fotos o videos de otras personas si me dieron permiso, y si aparece un menor de edad, con permiso de su acudiente.',
            'No publico publicidad ni contenido que no sea mío sin permiso de su autor.',
            'Sé que cualquier jugador puede reportar una publicación, que con 3 reportes se oculta hasta que el club la revise, y que el club puede ocultar o eliminar lo que incumpla estas reglas.',
          ],
        },
      ],
    },
  ],
});

/** Novedades y promociones (Ley 2300 de 2023): optional, by the channels chosen. */
export const MARKETING_AUTHORIZATION = Object.freeze({
  type: 'MARKETING',
  path: null,
  title: 'Autorización para recibir novedades y promociones',
  version: '1',
  publishedOn: '2026-09-28',
  sections: [
    {
      id: 'texto',
      heading: null,
      blocks: [
        {
          p: 'Quiero recibir novedades y promociones del club por los canales que elegí. Solo me escribirán de lunes a viernes de 7:00 a. m. a 7:00 p. m. y los sábados de 8:00 a. m. a 3:00 p. m., nunca domingos ni festivos. Puedo retirar esta autorización cuando quiera desde "Mis datos y privacidad".',
        },
        {
          p: 'Los mensajes del servicio (confirmación de reservas, facturas o cambio de contraseña) no dependen de esta autorización.',
        },
      ],
    },
  ],
});

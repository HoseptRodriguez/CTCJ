import {
  BACKHAND,
  BACKHAND_LABELS,
  DOMINANT_HAND,
  DOMINANT_HAND_LABELS,
  HEALTH_DATA_AUTHORIZATION,
  MINOR_AUTHORIZATION,
} from '@ctcj/shared';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { consentClient } from '../api/consentClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { AuthorizationText } from '../components/legal/OptionalAuthorization.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { RadioCards, SelectField, TextAreaField, TextField } from '../components/ui/Field.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';

import { useMyCtcj } from './mictcj/MyCtcjContext.jsx';
import { HealthDataSection } from './mictcj/HealthDataSection.jsx';
import { PhysioConsentSection } from './mictcj/PhysioConsentSection.jsx';
import { REQUEST_STATUS_LABELS } from './mictcj/shared.jsx';

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const REQUEST_BADGE = { PENDING: 'pendiente', APPROVED: 'al-dia', REJECTED: 'suspendida' };

/** ISO datetime -> the plain YYYY-MM-DD an <input type="date"> needs. */
function toDateInputValue(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 10);
}

function AvatarSection({ profile, onUpdated }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
      setError('La foto debe ser JPEG, PNG o WEBP. Elige otra imagen.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('La foto pesa más de 2 MB. Elige una más liviana.');
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const result = await membershipClient.uploadMyAvatar(file);
      onUpdated({ ...profile, avatarUrl: result.avatarUrl });
      toast({ title: 'Foto actualizada' });
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview ?? profile.avatarUrl;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <Avatar
        src={displayUrl}
        firstName={profile.firstName}
        lastName={profile.lastName}
        size="xl"
        alt="Tu foto de perfil"
        fallbackAlt="Aún sin foto"
      />
      <div>
        <Button
          variant="secondary"
          loading={uploading}
          loadingText="Subiendo…"
          onClick={() => fileInputRef.current?.click()}
        >
          Cambiar foto
        </Button>
        <p className="mt-2 text-body-sm text-ink-soft">JPEG, PNG o WEBP, máximo 2 MB.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Elegir foto de perfil"
          onChange={handleFileChange}
        />
        {error && (
          <p role="alert" className="mt-2 text-body font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function PersonalInfoForm({ profile, onUpdated }) {
  const toast = useToast();
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [birthDate, setBirthDate] = useState(toDateInputValue(profile.birthDate));
  const [bio, setBio] = useState(profile.bio ?? '');
  const [dominantHand, setDominantHand] = useState(profile.dominantHand ?? '');
  const [backhand, setBackhand] = useState(profile.backhand ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await membershipClient.updateMyProfile({
        phone: phone.trim() || null,
        birthDate: birthDate || null,
        bio: bio.trim() || null,
        dominantHand: dominantHand || null,
        backhand: backhand || null,
      });
      onUpdated({ ...profile, ...result });
      toast({ title: 'Datos guardados' });
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          label="Fecha de nacimiento"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </div>
      <TextAreaField
        label="Sobre mí"
        rows={3}
        maxLength={500}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        hint="Máximo 500 caracteres."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Mano dominante (opcional)"
          value={dominantHand}
          onChange={(e) => setDominantHand(e.target.value)}
          hint="La ven tus entrenadores."
          options={[
            { value: '', label: 'Sin indicar' },
            ...Object.values(DOMINANT_HAND).map((v) => ({
              value: v,
              label: DOMINANT_HAND_LABELS[v],
            })),
          ]}
        />
        <SelectField
          label="Revés (opcional)"
          value={backhand}
          onChange={(e) => setBackhand(e.target.value)}
          hint="Lo ven tus entrenadores."
          options={[
            { value: '', label: 'Sin indicar' },
            ...Object.values(BACKHAND).map((v) => ({ value: v, label: BACKHAND_LABELS[v] })),
          ]}
        />
      </div>
      <Button type="submit" loading={saving} loadingText="Guardando…">
        Guardar cambios
      </Button>
      {error && (
        <p role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

const AUTHORIZED_ON = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeZone: 'America/Bogota',
});

/**
 * The guardian's authorization for the linked minor's data and image. Until
 * it's given, the minor's account can't book or post.
 */
function MinorAuthorization({ guardianship, onChanged }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(null); // 'authorize' | 'withdraw'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const auth = guardianship.minorAuthorization ?? { authorized: false };

  async function run() {
    setSaving(true);
    setError(null);
    try {
      if (confirming === 'authorize') {
        await guardianshipClient.authorizeMinor(guardianship.id);
        toast({ title: 'Autorización registrada', description: guardianship.minorEmail });
      } else {
        await guardianshipClient.withdrawMinorAuthorization(guardianship.id);
        toast({ title: 'Autorización retirada', description: guardianship.minorEmail });
      }
      onChanged();
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  }

  return (
    <div className="mt-3 w-full space-y-3">
      {auth.authorized ? (
        <p className="text-body text-ink">
          Autorización de datos e imagen vigente desde el{' '}
          {AUTHORIZED_ON.format(new Date(auth.authorizedAt))}.
        </p>
      ) : (
        <p className="rounded-lg border-2 border-amber bg-amber-soft p-3 text-body text-ink">
          La cuenta de este menor está <strong>pendiente de tu autorización</strong>: puede entrar,
          pero no reservar ni publicar en la Comunidad.
        </p>
      )}
      <Button
        variant={auth.authorized ? 'secondary' : 'primary'}
        onClick={() => setConfirming(auth.authorized ? 'withdraw' : 'authorize')}
      >
        {auth.authorized ? 'Retirar autorización' : 'Leer y autorizar'}
      </Button>
      {error && (
        <p role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirming === 'authorize'}
        tone="primary"
        title={MINOR_AUTHORIZATION.TITLE}
        description={
          <div className="space-y-2">
            {MINOR_AUTHORIZATION.TEXT.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className="font-semibold text-ink">Menor: {guardianship.minorEmail}</p>
          </div>
        }
        confirmLabel="Sí, autorizo"
        loading={saving}
        onConfirm={run}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === 'withdraw'}
        tone="danger"
        title="¿Retirar la autorización?"
        description="La cuenta del menor vuelve a quedar pendiente: podrá entrar, pero no reservar ni publicar en la Comunidad hasta que la autorices de nuevo."
        confirmLabel="Sí, retirar autorización"
        loading={saving}
        onConfirm={run}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

/**
 * The guardian's optional authorization for the minor's health data
 * (psychology, neuropsychology, physiotherapy). Separate from the data and
 * image authorization: a guardian may give one and not the other.
 */
function MinorHealthAuthorization({ guardianship, onChanged }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(null); // 'authorize' | 'withdraw'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const auth = guardianship.healthAuthorization ?? { authorized: false };

  async function run() {
    setSaving(true);
    setError(null);
    try {
      await consentClient.setMinorHealthAuthorization(guardianship.id, confirming === 'authorize');
      toast({
        title:
          confirming === 'authorize'
            ? 'Autorización de salud registrada'
            : 'Autorización de salud retirada',
        description: guardianship.minorEmail,
      });
      onChanged();
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  }

  return (
    <div className="mt-3 w-full space-y-3 border-t border-line pt-3">
      <p className="text-body text-ink">
        <strong>Datos de salud (opcional):</strong>{' '}
        {auth.authorized
          ? `autorizados desde el ${AUTHORIZED_ON.format(new Date(auth.authorizedAt))}.`
          : 'sin autorizar. Sin esta autorización, psicología y fisioterapia no pueden atender al menor en el club.'}
      </p>
      <Button
        variant="secondary"
        onClick={() => setConfirming(auth.authorized ? 'withdraw' : 'authorize')}
      >
        {auth.authorized ? 'Retirar autorización de salud' : 'Leer y autorizar datos de salud'}
      </Button>
      {error && (
        <p role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirming === 'authorize'}
        tone="primary"
        title={HEALTH_DATA_AUTHORIZATION.title}
        description={
          <div className="space-y-2">
            <p>Como acudiente, en nombre del menor:</p>
            <AuthorizationText doc={HEALTH_DATA_AUTHORIZATION} />
            <p className="font-semibold text-ink">Menor: {guardianship.minorEmail}</p>
          </div>
        }
        confirmLabel="Sí, autorizo"
        loading={saving}
        onConfirm={run}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === 'withdraw'}
        tone="danger"
        title="¿Retirar la autorización de salud?"
        description="Desde ahora no se podrán agendar citas ni registrar nueva información de salud del menor. Lo ya registrado se conserva como exige la ley."
        confirmLabel="Sí, retirar"
        loading={saving}
        onConfirm={run}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

function GuardianshipSection() {
  const toast = useToast();
  const { guardianships, reloadGuardianships } = useMyCtcj();
  const [minorEmail, setMinorEmail] = useState('');
  const [permissions, setPermissions] = useState('book');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!minorEmail.trim()) {
      setError('Escribe el correo de la cuenta del menor.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await guardianshipClient.requestGuardianship({
        minorEmail: minorEmail.trim(),
        canBook: permissions !== 'pay',
        canPay: permissions !== 'book',
      });
      setMinorEmail('');
      toast({ title: 'Solicitud enviada', description: 'El club debe aprobar la vinculación.' });
      reloadGuardianships();
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      title="Cuentas vinculadas"
      description="Si eres acudiente de un menor, vincula su cuenta para reservar canchas en su nombre. El club aprueba cada vinculación."
    >
      {guardianships.length > 0 && (
        <ul className="mb-6 space-y-2" aria-label="Tus vinculaciones">
          {guardianships.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-page p-3"
            >
              <span className="text-body text-ink">{g.minorEmail}</span>
              <StatusBadge
                status={REQUEST_BADGE[g.status] ?? 'suspendida'}
                label={REQUEST_STATUS_LABELS[g.status] ?? g.status}
              />
              {g.status === 'APPROVED' && (
                <>
                  <MinorAuthorization guardianship={g} onChanged={reloadGuardianships} />
                  <MinorHealthAuthorization guardianship={g} onChanged={reloadGuardianships} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Correo del menor"
          type="email"
          autoComplete="off"
          inputMode="email"
          value={minorEmail}
          onChange={(e) => setMinorEmail(e.target.value)}
          placeholder="menor@correo.com"
          error={error}
        />
        <RadioCards
          legend="¿Qué podrás hacer por el menor?"
          name="guardian-permissions"
          value={permissions}
          onChange={setPermissions}
          options={[
            { value: 'book', label: 'Reservar canchas' },
            {
              value: 'book-pay',
              label: 'Reservar y pagar',
              description: 'También pagar sus facturas.',
            },
            { value: 'pay', label: 'Solo pagar', description: 'Pagar sus facturas, sin reservar.' },
          ]}
        />
        <Button type="submit" loading={submitting} loadingText="Enviando…">
          Solicitar vinculación
        </Button>
      </form>
    </Card>
  );
}

/** Mi CTCJ → Mi perfil (from the avatar in the header). */
export function PlayerProfilePage() {
  useDocumentTitle('Mi perfil');
  const { profile, setProfile, isJugador } = useMyCtcj();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi perfil"
        description="Tu foto y tus datos. Tu nombre y correo solo los cambia el club."
        backTo="/mi-ctcj"
        backLabel="Volver a Inicio"
        className="mb-0 md:mb-0"
      />
      {!profile ? (
        <SkeletonGroup label="Cargando tu perfil…" className="space-y-4">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="h-16 w-full" />
        </SkeletonGroup>
      ) : (
        <>
          <Card title={`${profile.firstName} ${profile.lastName}`} description={profile.email}>
            <AvatarSection profile={profile} onUpdated={setProfile} />
            <div className="mt-8">
              <PersonalInfoForm key={profile.id} profile={profile} onUpdated={setProfile} />
            </div>
          </Card>
          <GuardianshipSection />
          <Card
            title="Mis datos y privacidad"
            description="Tus autorizaciones, descargar tus datos, consultas y reclamos, o eliminar tu cuenta."
          >
            <Link
              to="/mi-ctcj/privacidad"
              className="focus-ring inline-flex min-h-btn items-center rounded-lg font-semibold text-navy-500 underline underline-offset-4"
            >
              Ir a Mis datos y privacidad
            </Link>
          </Card>
          {isJugador && (
            <>
              <HealthDataSection />
              <PhysioConsentSection />
            </>
          )}
        </>
      )}
    </div>
  );
}

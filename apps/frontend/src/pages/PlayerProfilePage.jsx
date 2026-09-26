import { useRef, useState } from 'react';

import { guardianshipClient } from '../api/guardianshipClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { RadioCards, TextAreaField, TextField } from '../components/ui/Field.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';

import { useMyCtcj } from './mictcj/MyCtcjContext.jsx';
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
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Correo del menor"
          type="email"
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
          {isJugador && <PhysioConsentSection />}
        </>
      )}
    </div>
  );
}

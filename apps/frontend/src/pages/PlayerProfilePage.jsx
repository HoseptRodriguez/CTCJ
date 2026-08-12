import { useEffect, useRef, useState } from 'react';

import { goalsClient } from '../api/goalsClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { Button } from '../components/ui/Button.jsx';
import { Section } from '../components/ui/Section.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeGoalsError } from '../lib/goalsErrorMessages.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';
import { AREA_LABELS } from '../lib/performanceRatingLabels.js';

import { MyPerformanceSection, MyRankingSection } from './MyCtcjPage.jsx';

const AREA_CODES = Object.keys(AREA_LABELS);
const CATEGORY_LABELS = {
  SEGUNDA: 'Segunda categoría',
  TERCERA: 'Tercera categoría',
  CUARTA: 'Cuarta categoría',
  QUINTA: 'Quinta categoría',
};
const MODALITY_LABELS = { SINGLES: 'Singles', DOBLES: 'Dobles' };
const METRIC_TYPE_LABELS = {
  SKILL_RATING: 'Habilidad técnica',
  MATCH_WINS: 'Victorias',
  RANKING_POSITION: 'Posición en el ranking',
  TRAINING_FREQUENCY: 'Frecuencia de entrenamiento (sesiones/semana)',
  CUSTOM: 'Meta personal (sin seguimiento automático)',
};
const GOAL_STATUS_LABELS = { ACTIVE: 'Activa', ACHIEVED: 'Cumplida', ABANDONED: 'Abandonada' };

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Converts an ISO datetime/date string to the plain YYYY-MM-DD an
 * `<input type="date">` needs -- the backend returns full ISO datetimes,
 * not the plain date strings the form has to send back. */
function toDateInputValue(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 10);
}

function AvatarSection({ profile, onUpdated }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
      setError('El archivo debe ser una imagen JPEG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('El archivo debe pesar máximo 2MB.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const result = await membershipClient.uploadMyAvatar(file);
      onUpdated((prev) => ({ ...prev, avatarUrl: result.avatarUrl }));
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview ?? profile.avatarUrl;

  return (
    <div className="flex items-center gap-4">
      {displayUrl ? (
        <img
          src={displayUrl}
          alt="Tu foto de perfil"
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-raised font-display text-2xl font-semibold text-secondary">
          {profile.firstName?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Subiendo...' : 'Cambiar foto'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      </div>
    </div>
  );
}

function PersonalInfoForm({ profile, onUpdated }) {
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [birthDate, setBirthDate] = useState(toDateInputValue(profile.birthDate));
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const result = await membershipClient.updateMyProfile({
        phone: phone.trim() || null,
        birthDate: birthDate || null,
        bio: bio.trim() || null,
      });
      onUpdated((prev) => ({ ...prev, ...result }));
      setSaved(true);
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="profile-phone">
            Teléfono
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="profile-birthdate">
            Fecha de nacimiento
          </label>
          <input
            id="profile-birthdate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="profile-bio">
          Sobre mí
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </Button>
      {saved ? <p className="text-sm text-secondary">Perfil actualizado.</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </form>
  );
}

function AchievementsSection() {
  const [badges, setBadges] = useState(null);

  useEffect(() => {
    let cancelled = false;
    membershipClient
      .getMyAchievements()
      .then((data) => {
        if (!cancelled) setBadges(data.badges);
      })
      .catch(() => {
        if (!cancelled) setBadges([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!badges) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Logros</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {badges.map((badge) => (
          <div
            key={badge.code}
            className={`rounded-md border px-4 py-3 text-center ${
              badge.earned ? 'border-action bg-raised' : 'border-neutral-200 bg-canvas opacity-50'
            }`}
          >
            <p className="text-sm font-semibold text-primary">{badge.label}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-tertiary">
              {badge.earned ? 'Obtenido' : 'Pendiente'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateGoalForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [metricType, setMetricType] = useState('CUSTOM');
  const [targetArea, setTargetArea] = useState('SERVE');
  const [targetValue, setTargetValue] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [targetModality, setTargetModality] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await goalsClient.createGoal({
        title: title.trim(),
        metricType,
        targetArea: metricType === 'SKILL_RATING' ? targetArea : undefined,
        targetValue: targetValue !== '' ? Number(targetValue) : undefined,
        targetCategory: targetCategory || undefined,
        targetModality: targetModality || undefined,
      });
      setTitle('');
      setTargetValue('');
      setTargetCategory('');
      setTargetModality('');
      await onCreated();
    } catch (err) {
      setError(describeGoalsError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const needsTargetValue = metricType !== 'CUSTOM';
  const canScopeCategory = metricType === 'MATCH_WINS' || metricType === 'RANKING_POSITION';

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="goal-title">
          Título de la meta
        </label>
        <input
          id="goal-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Mejorar mi saque"
          className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="goal-metric-type">
            Tipo
          </label>
          <select
            id="goal-metric-type"
            value={metricType}
            onChange={(e) => setMetricType(e.target.value)}
            className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          >
            {Object.entries(METRIC_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {metricType === 'SKILL_RATING' ? (
          <div>
            <label className="block text-sm font-semibold text-primary" htmlFor="goal-area">
              Habilidad
            </label>
            <select
              id="goal-area"
              value={targetArea}
              onChange={(e) => setTargetArea(e.target.value)}
              className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
            >
              {AREA_CODES.map((code) => (
                <option key={code} value={code}>
                  {AREA_LABELS[code]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {needsTargetValue ? (
          <div>
            <label className="block text-sm font-semibold text-primary" htmlFor="goal-target-value">
              {metricType === 'SKILL_RATING' ? 'Calificación objetivo (1-10)' : 'Cantidad objetivo'}
            </label>
            <input
              id="goal-target-value"
              type="number"
              min="1"
              max={metricType === 'SKILL_RATING' ? 10 : 1000}
              required
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="mt-1 w-32 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        {canScopeCategory ? (
          <>
            <div>
              <label className="block text-sm font-semibold text-primary" htmlFor="goal-category">
                Categoría (opcional)
              </label>
              <select
                id="goal-category"
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary" htmlFor="goal-modality">
                Modalidad (opcional)
              </label>
              <select
                id="goal-modality"
                value={targetModality}
                onChange={(e) => setTargetModality(e.target.value)}
                className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {Object.entries(MODALITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
      </div>

      <Button type="submit" variant="primary" disabled={submitting || !title.trim()}>
        {submitting ? 'Creando...' : 'Agregar meta'}
      </Button>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </form>
  );
}

function GoalsManagementSection() {
  const [goals, setGoals] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return goalsClient
      .getMyGoals()
      .then((data) => setGoals(data.goals))
      .catch((err) => setError(describeGoalsError(err)));
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAbandon(goalId) {
    try {
      await goalsClient.abandonGoal(goalId);
      await refetch();
    } catch (err) {
      setError(describeGoalsError(err));
    }
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Mis metas</h3>
      <p className="mt-1 text-sm text-secondary">
        Metas conectadas a tu progreso real cuando es posible -- se actualizan automáticamente.
      </p>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {goals === null ? <p className="mt-3 text-sm text-secondary">Cargando...</p> : null}
      {goals?.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">Aún no tienes metas.</p>
      ) : null}

      {goals?.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {goals.map((goal) => (
            <li key={goal.id} className="rounded-md bg-raised px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-primary">{goal.title}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                    {GOAL_STATUS_LABELS[goal.status] ?? goal.status}
                  </span>
                  {goal.status === 'ACTIVE' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-0 text-xs"
                      onClick={() => handleAbandon(goal.id)}
                    >
                      Abandonar
                    </Button>
                  ) : null}
                </span>
              </div>
              <p className="mt-1 text-xs text-tertiary">
                {METRIC_TYPE_LABELS[goal.metricType] ?? goal.metricType}
                {goal.currentProgress != null ? ` · Progreso: ${goal.currentProgress}` : ''}
              </p>
              {goal.percentComplete != null ? (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-action"
                    style={{ width: `${goal.percentComplete}%` }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <CreateGoalForm onCreated={refetch} />
    </div>
  );
}

export function PlayerProfilePage() {
  useDocumentTitle('Mi perfil');
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    membershipClient
      .getMyProfile()
      .then(setProfile)
      .catch((err) => setError(describeIdentityError(err)));
  }, []);

  return (
    <Section
      heading={{
        eyebrow: 'Mi CTCJ',
        title: 'Mi perfil',
        lede: 'Tu información personal, historial y progreso en el club.',
      }}
    >
      <Button to="/mi-ctcj" variant="ghost" className="px-0">
        Volver al panel
      </Button>

      {error ? <p className="mt-4 text-error">{error}</p> : null}
      {!error && !profile ? <p className="mt-4 text-secondary">Cargando...</p> : null}

      {profile ? (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-canvas p-6">
          <AvatarSection profile={profile} onUpdated={setProfile} />
          <PersonalInfoForm profile={profile} onUpdated={setProfile} />
        </div>
      ) : null}

      <MyPerformanceSection />
      <MyRankingSection matchLimit={50} />
      <AchievementsSection />
      <GoalsManagementSection />
    </Section>
  );
}

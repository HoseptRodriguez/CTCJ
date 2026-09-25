# Auditoría técnica — CTCJ (`ctcj-platform`)

**Auditoría inicial:** 2026-09-25, sobre HEAD `25b169a`, en solo lectura.
**Última actualización:** 2026-09-25, estado tras el commit `273f061` y los arreglos de la tabla siguiente.
**Repositorio:** `C:\Users\KTFUS\ctcj-platform`, rama `main`.

## Historial de arreglos

| Commit    | Arreglo                                                                                                                                 | Hallazgo que resuelve                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `0b5a8c9` | Rate limiting en login, registro y reset de contraseña; `trust proxy` en producción                                                     | Cambio que estaba sin commitear                    |
| `1e16fc1` | Los tests de integración abortan si `DATABASE_URL` no contiene `_test`; nuevo `apps/backend/.env.test.example`                          | §5.2: riesgo de borrar `ctcj_dev`                  |
| `c9293da` | Registrarse de nuevo con un correo **sin verificar** reenvía la verificación                                                            | §1, brecha 7                                       |
| `1fc8b86` | Correo de producción por Resend; el servidor no arranca sin `RESEND_API_KEY` y `MAIL_FROM`                                              | §4, punto 5                                        |
| `107cf54` | `bootstrapAdmin.js` funciona en producción con `--confirm` y `--token` = `BOOTSTRAP_TOKEN`, y solo acepta cuentas verificadas y activas | §1, brecha 1 / §4, punto 4                         |
| `275298a` | Avatares en Vercel Blob (disco solo en desarrollo sin token); CSP `img-src` ampliada                                                    | §4, punto 3                                        |
| `5dcba18` | README reescrito con los 11 módulos; se elimina `VITE_API_BASE_URL`, que nada usaba                                                     | README desactualizado / §4, punto 7                |
| `273f061` | Parches de seguridad: nodemailer, express, body-parser, qs, react-router(-dom)                                                          | 4 de los 6 paquetes vulnerables (quedan 2, ver §6) |

**Otros cambios:**

- Se borró `docs/AUDITORIA-copia-escritorio.md`, que auditaba otra carpeta.
- **Decisión:** no se creó una migración con una partición DEFAULT para `audit_logs` porque ya existe (ver §1, brecha 4).

---

## Resumen ejecutivo

1. **Los 11 módulos existen, están montados en `app.js`, tienen tests y tienen UI.** El README ya lo refleja (`5dcba18`).
2. **Tests: todo en verde.**
   - `npm test`: 954 de 954 (backend 717 y frontend 237).
   - Integración contra `ctcj_test`: 201 de 201.
3. **Brechas funcionales que siguen abiertas:**
   - no hay pasarela de pago en línea;
   - no hay UI para asignar roles (existe el endpoint y el primer admin ya se crea con el script);
   - los permisos (`permissions`) no se aplican;
   - `audit_logs` y `outbox_events` no se usan.
4. **Despliegue.**
   - En **Render** (`render.yaml`) ya no hay bloqueos de código: solo falta configurar variables (§4.4).
   - **Vercel** sigue sin ser un destino directo. Pendientes: servidor persistente, job con `setInterval`, rate limiting en memoria, migraciones en el arranque y conexiones de Prisma.

---

## 1. Módulos del backend: la verdad según el código

Ruta: `apps/backend/src/modules/`. Todos siguen la estructura `application/` + `infrastructure/`. La capa `domain/` existe en 8 de los 11.

| Módulo            | Archivos .js | Casos de uso | `domain/` | Montado en                                                                                                     | Tests (unit / integ) | Estado                                                                |
| ----------------- | ------------ | ------------ | --------- | -------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------- |
| **identity**      | 113          | 31           | ✅        | `/api/auth`, `/api/identity/me`, `/api/players`, `/api/admin/{roles,users,affiliation-requests,guardianships}` | 39 / 9               | ✅ Completo, con brechas (ver abajo)                                  |
| **booking**       | 51           | 12           | ✅        | `/api/booking`                                                                                                 | 15 / 4               | ✅ Completo                                                           |
| **billing**       | 57           | 18           | ✅        | `/api/admin/billing`, `/api/billing/me`                                                                        | 17 / 2               | ⚠️ Completo en la parte interna; sin pasarela ni facturación DIAN     |
| **coaching**      | 26           | 8            | ❌        | `/api/admin/coaching`, `/api/coaching/me`                                                                      | 8 / 1                | ✅ Completo (CRUD fino, sin reglas de dominio)                        |
| **clinical**      | 55           | 18           | ✅        | `/api/admin/clinical`, `/api/clinical/me`                                                                      | 21 / 1               | ✅ Completo (psicología + fisioterapia)                               |
| **competition**   | 40           | 10           | ✅        | `/api/competition`                                                                                             | 15 / 1               | ✅ Completo                                                           |
| **tournament**    | 37           | 8            | ✅        | `/api/tournaments`                                                                                             | 8 / 1                | ✅ Completo                                                           |
| **goals**         | 24           | 3            | ✅        | `/api/goals/me`                                                                                                | 5 / 1                | ⚠️ Mínimo: crear, listar y abandonar. El progreso se calcula al leer. |
| **challenges**    | 37           | 6            | ✅        | `/api/challenges/me`                                                                                           | 9 / 2                | ✅ Completo (incluye marcador confirmado → competition)               |
| **notifications** | 13           | 4            | ❌        | `/api/notifications/me`                                                                                        | 1 / 1                | ⚠️ Solo avisos dentro de la app: sin correo ni push                   |
| **community**     | 42           | 12           | ❌        | `/api/community`, `/api/admin/community`                                                                       | 11 / 1               | ✅ Completo (posts, comentarios, likes, reportes, moderación)         |

Además hay tests fuera de los módulos: `test/unit/config/env.test.js` y `test/unit/scripts/bootstrapAdminPolicy.test.js`.

**Conexiones entre módulos** (todas en `app.js`, mediante adaptadores y puertos; dependency-cruiser las verifica):

- identity alimenta a todos (`checkIsJugador`, `getUserSummaries`, `checkHasAnyRole`, etc.);
- notifications → challenges y community;
- competition → tournament (siembra por ranking) y challenges (se construye primero y se parchea después con `_rebuildSubmitMatchScoreWithMatchRecorder`);
- booking, coaching y competition → goals y los logros de identity (parcheados después).

### Brechas e incompletos

| #   | Brecha                                                                                                                                                                       | Estado                                                                                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Primer ADMINISTRADOR en producción.** No había UI para `POST /api/admin/roles/grant` y `bootstrapAdmin.js` abortaba en producción.                                         | ✅ **Resuelta** (`107cf54`). En producción, `node scripts/bootstrapAdmin.js <email> --confirm --token <secreto>` con `BOOTSTRAP_TOKEN` (24+ caracteres, comparación en tiempo constante). Solo acepta cuentas existentes, verificadas y ACTIVE; el script antiguo no lo comprobaba. Sigue sin haber **UI** para asignar roles después: se hace por API.               |
| 2   | **Pagos sin pasarela.** El pago de canchas y facturas lo registra el staff. No hay Wompi ni DIAN.                                                                            | ⏳ Abierta (fuera de alcance de estos arreglos)                                                                                                                                                                                                                                                                                                                       |
| 3   | **Los permisos no se aplican.** `Permission` y `RolePermission` solo se llenan en el seed; la autorización es por rol (`requireRole`).                                       | ⏳ Abierta                                                                                                                                                                                                                                                                                                                                                            |
| 4   | **`audit_logs` no se usa.** Tiene particiones `default`, `2026_07`, `2026_08` y `2026_09`; falta `scripts/createAuditPartition.js`.                                          | ⏳ Abierta, **sin riesgo de fallo**. La partición DEFAULT (`audit_logs_default`) existe desde la migración inicial, así que un insert de octubre en adelante cae en ella. No se crea otra: Postgres admite una sola DEFAULT y la migración rompería `migrate deploy`. Cuando se empiece a escribir en la tabla, convendrá crear particiones mensuales por adelantado. |
| 5   | **`OutboxEvent` sin uso.** Es intencional (ADR-0007).                                                                                                                        | ⏳ Abierta (intencional)                                                                                                                                                                                                                                                                                                                                              |
| 6   | **Endpoints sin UI:** ajustes de membresía, detalle de factura, estado de membresía de billing, "marcar todas leídas" y `GET /api/booking/me/training-frequency` (ver §2.4). | ⏳ Abierta                                                                                                                                                                                                                                                                                                                                                            |
| 7   | **Registro no atómico con el correo.** Si el envío fallaba, reintentar daba "email ya existe".                                                                               | ✅ **Resuelta** (`c9293da`). Si la cuenta sigue en PENDING_VERIFICATION, se reenvía el enlace (201). No se cambian la contraseña ni el nombre del reintento, para impedir que un tercero fije la contraseña de una cuenta sin verificar. Una cuenta verificada, suspendida o desactivada sigue dando 409. Cubierto con tests unitarios y de integración.              |
| 8   | Directorio vacío suelto `apps/backend/apps/backend/test/integration/identity/`.                                                                                              | ⏳ Abierta (cosmético; git no lo rastrea)                                                                                                                                                                                                                                                                                                                             |

### Sobre la contradicción README vs. documento interno

✅ **Resuelta** (`5dcba18`). El README ahora describe los 11 módulos, lo que falta por construir, la base de pruebas, la configuración de producción y el despliegue. El documento interno de 11 módulos sigue sin estar en el repo.

---

## 2. Rutas del frontend y endpoints que llaman

Sin cambios respecto a la auditoría inicial: los arreglos no tocaron rutas ni clientes del frontend.

Router: `apps/frontend/src/App.jsx`. Cliente HTTP: `src/api/httpClient.js`. Siempre usa **rutas relativas al propio origen** (`new URL(path, window.location.origin)`) con `credentials: 'include'`.

### 2.1 Llamadas globales (en todas las rutas)

| Componente                                                                        | Endpoints                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `context/AuthContext.jsx` (al cargar la app y al cerrar sesión)                   | `POST /api/auth/refresh`, `POST /api/auth/logout`                  |
| `layout/NotificationBell.jsx` (en Header y StaffLayout, solo con sesión iniciada) | `GET /api/notifications/me`, `POST /api/notifications/me/:id/read` |

### 2.2 Rutas públicas y de jugador (`PublicLayout`)

| Ruta                 | Protección                               | Página                                                | Endpoints                                                                                                                                                                                                                                                                              |
| -------------------- | ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | pública                                  | `HomePage`                                            | `GET /api/booking/courts` (sección `ReservationPreview`). `GET /api/competition/seasons` y `GET /api/competition/standings` (sección `Ranking`; _standings_ exige sesión, y si no la hay se muestra un mensaje). Las otras 13 secciones son **estáticas**.                             |
| `/canchas`           | pública (reservar exige sesión)          | `ReservationPage` → `BookingGrid`, `HoldConfirmModal` | `GET /api/identity/me/guardianships`, `GET /api/booking/schedule?date=`, `POST /api/booking/hold`, `POST /api/booking/confirm`, `POST /api/booking/:id/cancel`                                                                                                                         |
| `/register`          | pública                                  | `Register`                                            | `POST /api/auth/register`                                                                                                                                                                                                                                                              |
| `/login`             | pública                                  | `Login`                                               | `POST /api/auth/login`                                                                                                                                                                                                                                                                 |
| `/forgot-password`   | pública                                  | `ForgotPassword`                                      | `POST /api/auth/password-reset/request`                                                                                                                                                                                                                                                |
| `/reset-password`    | pública                                  | `ResetPassword`                                       | `POST /api/auth/password-reset/confirm`                                                                                                                                                                                                                                                |
| `/verify-email`      | pública                                  | `VerifyEmail`                                         | `GET /api/auth/verify?token=`                                                                                                                                                                                                                                                          |
| `/mi-ctcj`           | `RequireAuth`                            | `MyCtcjPage`                                          | Ver lista a continuación ↓                                                                                                                                                                                                                                                             |
| `/mi-ctcj/perfil`    | `RequireAuth`                            | `PlayerProfilePage`                                   | `GET/PATCH /api/identity/me`, `POST /api/identity/me/avatar` (multipart), `GET /api/identity/me/achievements`, `GET/POST /api/goals/me`, `POST /api/goals/me/:id/abandon`                                                                                                              |
| `/mi-ctcj/comunidad` | `RequireAuth` (el backend exige JUGADOR) | `CommunityPage`                                       | `GET/POST /api/community/posts`, `DELETE /api/community/posts/:id`, `GET/POST /api/community/posts/:id/comments`, `DELETE /api/community/comments/:id`, `POST/DELETE /api/community/posts/:id/like`, `POST /api/community/posts/:id/report`, `POST /api/community/comments/:id/report` |
| `*`                  | —                                        | redirige a `/`                                        | —                                                                                                                                                                                                                                                                                      |

**`/mi-ctcj` (`MyCtcjPage`) llama a 26 endpoints:**

| Grupo               | Endpoints                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Perfil y membresía  | `GET /api/identity/me`, `GET /api/identity/me/membership-status`                            |
| Afiliación y tutela | `GET/POST /api/identity/me/affiliation-requests`, `GET/POST /api/identity/me/guardianships` |
| Jugadores           | `GET /api/players/search`                                                                   |
| Reservas            | `GET /api/booking/schedule`                                                                 |
| Facturación         | `GET /api/billing/me/memberships`, `GET /api/billing/me/invoices`                           |
| Entrenamiento       | `GET /api/coaching/me/notes`, `GET /api/coaching/me/performance`                            |
| Clínica             | `GET /api/clinical/me/{appointments,notes,recovery-plans,medical-history}`                  |
| Competición         | `GET /api/competition/me/summary`, `GET /api/competition/matches/recent`                    |
| Torneos             | `GET /api/tournaments`                                                                      |
| Objetivos           | `GET /api/goals/me`                                                                         |
| Retos               | `GET/POST /api/challenges/me`, `POST /api/challenges/me/:id/{accept,reject,cancel,score}`   |

### 2.3 Rutas de staff (`RequireRole` + `StaffLayout`)

Grupo exterior: ADMINISTRADOR, RECEPCION, ENTRENADOR, PSICOLOGO, NEUROPSICOLOGO, FISIOTERAPEUTA.

| Ruta                      | Roles                                                       | Página                    | Endpoints                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/staff`                  | todos los de staff                                          | `StaffHome`               | Solo redirige al panel de su rol                                                                                                                                                                                                                                                                                                                                   |
| `/staff/competicion`      | todos los de staff                                          | `CompetitionPage`         | `GET/POST /api/competition/seasons`, `POST /api/competition/seasons/:id/close`, `GET/POST /api/competition/matches`, `POST /api/competition/matches/:id/void`, `GET /api/admin/users/lookup`                                                                                                                                                                       |
| `/staff/torneos`          | todos los de staff                                          | `TournamentsPage`         | `GET/POST /api/tournaments`, `GET /api/tournaments/:id`, `POST /api/tournaments/:id/participants`, `DELETE /api/tournaments/:id/participants/:pid`, `POST /api/tournaments/:id/generate-draw`, `POST /api/tournaments/:id/matches/:mid/result`, `POST /api/tournaments/:id/cancel`, `GET /api/admin/users/lookup`                                                  |
| `/staff/panel`            | ADMIN, RECEPCION                                            | `AdminDashboard`          | `GET /api/booking/{courts,schedule,payments,payments/monthly}`, `GET /api/admin/billing/invoices`, `GET /api/admin/billing/invoices/monthly`, `GET /api/admin/affiliation-requests`, `GET /api/admin/guardianships`, `GET /api/admin/users/counts`                                                                                                                 |
| `/staff/pagos`            | ADMIN, RECEPCION                                            | `PaymentsQueuePage`       | `GET /api/booking/schedule`, `POST /api/booking/:id/payment`                                                                                                                                                                                                                                                                                                       |
| `/staff/membresias`       | ADMIN, RECEPCION                                            | `MembershipStatusPage`    | `GET /api/admin/users/lookup`, `PUT /api/admin/users/:id/membership-status`, `GET/PUT /api/booking/settings/overdue-policy`, `GET /api/admin/billing/plans`, `GET/POST /api/admin/billing/memberships`, `GET/POST /api/admin/billing/memberships/:id/invoices`, `POST /api/admin/billing/invoices/:id/payment`, `POST /api/admin/billing/invoices/:id/cancel`      |
| `/staff/comunidad`        | ADMIN, RECEPCION                                            | `CommunityModerationPage` | `GET /api/admin/community/reports`, `POST /api/admin/community/reports/:id/dismiss`, `DELETE /api/admin/community/posts/:id`, `DELETE /api/admin/community/comments/:id`                                                                                                                                                                                           |
| `/staff/panel-entrenador` | ADMIN, ENTRENADOR                                           | `CoachDashboard`          | `GET /api/booking/schedule`, `GET /api/admin/coaching/recent-activity`, `GET /api/admin/users/lookup`                                                                                                                                                                                                                                                              |
| `/staff/notas`            | ADMIN, ENTRENADOR                                           | `CoachNotesPage`          | `GET/POST /api/admin/coaching/players/:id/notes`, `GET/POST /api/admin/coaching/players/:id/performance`, `GET /api/admin/users/lookup`                                                                                                                                                                                                                            |
| `/staff/clinico`          | ADMIN, RECEPCION, PSICOLOGO, NEUROPSICOLOGO, FISIOTERAPEUTA | `ClinicalPage`            | `GET/POST /api/admin/clinical/appointments`, `POST /api/admin/clinical/appointments/:id/{cancel,complete,no-show}`, `GET/POST /api/admin/clinical/players/:id/{notes,recovery-plans,medical-history}`, `POST /api/admin/clinical/recovery-plans/:id/{complete,discontinue}`, `POST /api/admin/clinical/medical-history/:id/resolve`, `GET /api/admin/users/lookup` |
| `/staff/precios`          | ADMIN                                                       | `CourtPricingPage`        | `GET /api/booking/courts`, `PUT /api/booking/courts/:id/price`                                                                                                                                                                                                                                                                                                     |
| `/staff/solicitudes`      | ADMIN                                                       | `RequestsPage`            | `GET /api/admin/affiliation-requests`, `PUT /api/admin/affiliation-requests/:id/decision`, `GET /api/admin/guardianships`, `PUT /api/admin/guardianships/:id/decision`                                                                                                                                                                                             |
| `/staff/planes`           | ADMIN                                                       | `PlansPage`               | `GET/POST /api/admin/billing/plans`, `GET /api/admin/billing/plans/:id/prices`, `PUT /api/admin/billing/plans/:id/price`                                                                                                                                                                                                                                           |
| `/staff/finanzas`         | ADMIN                                                       | `FinancePage`             | `GET /api/booking/payments`, `GET /api/booking/payments/monthly`, `GET /api/admin/billing/invoices`, `GET /api/admin/billing/invoices/monthly`                                                                                                                                                                                                                     |

### 2.4 Endpoints del backend que ninguna página usa

| Endpoint                                                  | ¿Hay función en un cliente?                                                                           |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `POST /api/admin/roles/grant`                             | **No**. No hay UI para asignar roles. El primer admin se crea con `bootstrapAdmin.js` (§1, brecha 1). |
| `PUT /api/admin/billing/memberships/:id/status`           | Sí (`billingClient.setMembershipStatus`), sin uso                                                     |
| `POST/GET /api/admin/billing/memberships/:id/adjustments` | Sí (`addAdjustment`, `listAdjustments`), sin uso                                                      |
| `GET /api/admin/billing/invoices/:id`                     | Sí (`getInvoice`), sin uso                                                                            |
| `POST /api/notifications/me/read-all`                     | Sí (`markAllNotificationsRead`), sin uso                                                              |
| `GET /api/booking/me/training-frequency`                  | No (se consume por dentro, desde goals y logros)                                                      |
| `GET /health`                                             | No (lo usa el health check de Render)                                                                 |

---

## 3. Modelos de `schema.prisma` y migraciones

Sin cambios de esquema: los arreglos no añadieron migraciones.

### 3.1 Modelos (44) en `apps/backend/prisma/schema.prisma` (1121 líneas)

| Módulo            | Modelos (tabla)                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Núcleo / identity | `Club` (clubs), `User` (users), `Role` (roles), `Permission` (permissions)¹, `RolePermission` (role_permissions)¹, `UserRole` (user_roles), `RefreshToken` (refresh_tokens), `EmailVerification` (email_verifications), `PasswordReset` (password_resets), `SystemSetting` (system_settings), `AffiliationRequest` (affiliation_requests), `Guardianship` (guardianships) |
| Billing           | `MembershipPlan` (membership_plans), `MembershipPlanPrice` (membership_plan_prices), `PlayerMembership` (memberships), `MembershipAdjustment` (membership_adjustments), `Invoice` (invoices), `InvoiceLine` (invoice_lines)                                                                                                                                               |
| Coaching          | `CoachNote` (coach_notes), `PerformanceRating` (performance_ratings)                                                                                                                                                                                                                                                                                                      |
| Competition       | `CompetitionSeason` (competition_seasons), `CompetitionMatch` (competition_matches), `CompetitionMatchParticipant` (competition_match_participants)                                                                                                                                                                                                                       |
| Tournament        | `Tournament` (tournaments), `TournamentParticipant` (tournament_participants), `TournamentParticipantMember` (tournament_participant_members), `TournamentMatch` (tournament_matches)                                                                                                                                                                                     |
| Clinical          | `ClinicalAppointment` (clinical_appointments), `ClinicalNote` (clinical_notes), `RecoveryPlan` (recovery_plans), `MedicalHistoryEntry` (medical_history_entries)                                                                                                                                                                                                          |
| Booking           | `Court` (courts), `Reservation` (reservations), `Payment` (payments), `ShedLock` (shedlock)²                                                                                                                                                                                                                                                                              |
| Goals             | `Goal` (goals)                                                                                                                                                                                                                                                                                                                                                            |
| Notifications     | `Notification` (notifications)                                                                                                                                                                                                                                                                                                                                            |
| Challenges        | `Challenge` (challenges), `ChallengeMatchResult` (challenge_match_results)                                                                                                                                                                                                                                                                                                |
| Community         | `CommunityPost` (community_posts), `CommunityComment` (community_comments), `CommunityPostLike` (community_post_likes), `CommunityReport` (community_reports)                                                                                                                                                                                                             |
| Infraestructura   | `OutboxEvent` (outbox_events)³                                                                                                                                                                                                                                                                                                                                            |

¹ Solo el seed los usa. ² Se usa con SQL crudo en `expireHoldsJob.js`. ³ Sin uso (ADR-0007).

**Objetos fuera de Prisma (SQL crudo en las migraciones):**

- extensiones `pgcrypto`, `btree_gist` y `citext`;
- **2 restricciones `EXCLUDE USING gist`**: `reservations` (init) y citas clínicas (`add_clinical`);
- tabla `audit_logs` particionada por rango: `default`, `2026_07`, `2026_08` y `2026_09`;
- `CHECK` en lugar de ENUM (ADR-0002) e índices parciales.

### 3.2 Migraciones (22)

| #   | Migración                                          | Líneas SQL |
| --- | -------------------------------------------------- | ---------- |
| 1   | `20260731180029_init_identity_booking`             | 402        |
| 2   | `20260801195744_add_payments`                      | 36         |
| 3   | `20260801221716_add_membership_status`             | 7          |
| 4   | `20260802183737_add_affiliation_and_guardianship`  | 74         |
| 5   | `20260803013235_add_billing_plans`                 | 104        |
| 6   | `20260803140000_add_invoices`                      | 83         |
| 7   | `20260804160000_add_coach_notes`                   | 31         |
| 8   | `20260805120000_add_performance_ratings`           | 31         |
| 9   | `20260806090000_add_competition`                   | 129        |
| 10  | `20260807100000_add_tournaments`                   | 142        |
| 11  | `20260808090000_add_clinical`                      | 87         |
| 12  | `20260810100000_add_physiotherapy`                 | 89         |
| 13  | `20260811090000_expand_performance_areas`          | 11         |
| 14  | `20260811091500_add_coach_note_area`               | 10         |
| 15  | `20260812090000_add_profile_fields`                | 6          |
| 16  | `20260812091500_add_goals`                         | 38         |
| 17  | `20260813090000_add_notifications`                 | 27         |
| 18  | `20260813091500_add_challenges`                    | 39         |
| 19  | `20260814090000_add_challenge_match_results`       | 105        |
| 20  | `20260814091500_widen_notification_type`           | 9          |
| 21  | `20260815090000_add_community`                     | 112        |
| 22  | `20260815091500_widen_notification_type_community` | 10         |

**Verificado con `npx prisma migrate status`** (solo lectura): tanto `ctcj_dev` como `ctcj_test` dicen "22 migrations found — Database schema is up to date!". No hay migraciones pendientes ni fallidas. Las 24 filas que mencionaba el informe de la otra copia no se reflejan como problema.

---

## 4. Despliegue

**Contexto:** el repo está diseñado para **Render** (`render.yaml`):

- un solo servicio Node;
- `npm run start` ejecuta `migrate deploy` + `seed` + `server.js`;
- Express sirve `apps/frontend/dist` y el fallback de la SPA en producción.

Todo lo que era común a cualquier destino ya está resuelto. Lo pendiente son incompatibilidades con el modelo _serverless_ de Vercel.

### 4.1 Resueltos

| #   | Problema                                                             | Arreglo                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | **Avatares en disco** (efímero en Render, de solo lectura en Vercel) | `275298a`: adaptador `vercelBlobAvatarStorage.js` para el puerto `AvatarStorage`. `BLOB_READ_WRITE_TOKEN` es obligatorio en producción. La CSP (`app.js`) permite `https://*.public.blob.vercel-storage.com` en `img-src`; sin ese cambio, helmet habría bloqueado las imágenes.      |
| 4   | **Primer administrador imposible en producción**                     | `107cf54` (ver §1, brecha 1)                                                                                                                                                                                                                                                          |
| 5   | **SMTP a Mailhog por defecto; producción arrancaba sin correo**      | `1fc8b86`: Resend por API HTTP. `parseEnv` en `config/env.js` hace fallar el arranque con `NODE_ENV=production` si faltan `RESEND_API_KEY`, `MAIL_FROM` o `BLOB_READ_WRITE_TOKEN`, y lista cada variable. El adaptador convierte el `{ error }` que devuelve el SDK en una excepción. |
| 7   | **`VITE_API_BASE_URL` documentada pero nunca leída**                 | `5dcba18`: se eliminó de `.env.example`. El frontend usa el propio origen a propósito.                                                                                                                                                                                                |

### 4.2 Pendientes solo para Vercel

| #   | Problema                                                                                                                             | Dónde                                                                 | Qué haría falta                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Servidor persistente** (`app.listen`, manejo de SIGTERM); `createApp()` construye los 11 contenedores en cada arranque en frío     | `apps/backend/src/server.js:10`                                       | `api/index.js` que exporte `createApp()`, o frontend en Vercel y backend en otro host                                                             |
| 2   | **Job `expireHoldsJob` con `setInterval`** (cada 60 s). Sin proceso vivo, los HOLD vencidos no expiran y bloquean canchas.           | `server.js:17-20`, `booking/infrastructure/jobs/expireHoldsJob.js:65` | Endpoint protegido + Vercel Cron (el plan Hobby limita la frecuencia; verificar el límite vigente), o tratar como libre un HOLD vencido al leerlo |
| 6   | **Cookie de refresh** `SameSite=Strict`, `path=/api/auth`: no funciona si frontend y API están en dominios distintos                 | `identity/infrastructure/http/authController.js:12-20`                | Mismo origen mediante _rewrites_ en `vercel.json`                                                                                                 |
| 8   | **CORS** con lista fija; los _preview deployments_ cambian de URL                                                                    | `app.js`, `env.js`                                                    | Con un mismo origen deja de importar                                                                                                              |
| 9   | **Fallback de la SPA** lo hace Express                                                                                               | `app.js`                                                              | _Rewrite_ `/(.*)` → `/index.html`                                                                                                                 |
| 11  | **Migraciones y seed en el arranque** (`npm run start`)                                                                              | `package.json` (raíz)                                                 | Moverlos al build o a CI                                                                                                                          |
| 12  | **Rate limiting en memoria** (`0b5a8c9`): en serverless cada instancia cuenta por separado; `trust proxy 1` está pensado para Render | `shared/rateLimiters.js`, `app.js`                                    | Store compartido (Upstash Redis) o el firewall de Vercel                                                                                          |
| 13  | **Prisma en serverless:** un pool por instancia                                                                                      | `shared/prismaClient.js`                                              | Postgres con pooler (Neon, Supabase o Prisma Accelerate)                                                                                          |
| 14  | **Postgres externo** con `btree_gist`, `citext`, `pgcrypto` y particionado                                                           | migración inicial                                                     | Neon o Supabase (verificar antes)                                                                                                                 |
| 15  | **`argon2` nativo**                                                                                                                  | `identity/infrastructure/security/`                                   | Probar en un preview; alternativa `@node-rs/argon2`                                                                                               |
| 16  | **Build de monorepo** (`@ctcj/shared`)                                                                                               | workspaces                                                            | `npm ci` en la raíz                                                                                                                               |

### 4.3 Configuración que sigue sin validarse

| #   | Problema                                                                                                                                                                                              | Qué haría falta                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 10  | `APP_PUBLIC_URL` vale `http://localhost:5173` por defecto y con él se construyen los enlaces de verificación y de reset. En producción, olvidarlo produce correos con enlaces rotos sin ningún error. | Hacerlo obligatorio y distinto de localhost cuando `NODE_ENV=production`, igual que las variables de correo |

### 4.4 Checklist para desplegar en Render hoy

1. En el dashboard de Render, configurar:
   - `RESEND_API_KEY` y `MAIL_FROM` (dominio verificado en Resend);
   - `BLOB_READ_WRITE_TOKEN` (store de Vercel Blob);
   - `APP_PUBLIC_URL` y `CORS_ORIGIN`, con la URL real;
   - `BOOTSTRAP_TOKEN`, un secreto de 24+ caracteres.
2. Registrar la cuenta del administrador y verificar el correo.
3. Desde el shell de Render: `node apps/backend/scripts/bootstrapAdmin.js <email> --confirm --token "$BOOTSTRAP_TOKEN"`.
4. Borrar `BOOTSTRAP_TOKEN`.

---

## 5. Tests

### 5.1 `npm test`: ✅ todo pasa

| Suite        | Archivos | Tests   | Resultado                  |
| ------------ | -------- | ------- | -------------------------- |
| Backend unit | 151      | 717     | ✅ 717 / 717               |
| Frontend     | 34       | 237     | ✅ 237 / 237               |
| **Total**    | **185**  | **954** | **✅ 954 pasan, 0 fallan** |

**Tests unitarios nuevos respecto a la auditoría inicial (+27):**

- `registerUser`: +4 (reenvío, no sobrescribe credenciales, reintento tras fallo del SMTP, cuenta suspendida);
- `config/env`: 7 (arranque en producción);
- `resendEmailSender`: 3;
- `vercelBlobAvatarStorage`: 2;
- `bootstrapAdminPolicy`: 11.

**Ruido en stderr (no son fallos):** advertencias de React Router por los _future flags_ de v7.

### 5.2 Integración: ✅ 201 / 201 (24 archivos)

Se ejecutan contra `ctcj_test` con `npm run -w apps/backend test:integration`.

- **Protección** (`1e16fc1`): `test/integration/setupEnv.js` aborta con un error claro si `DATABASE_URL` no contiene `_test`. La configuración de ejemplo está en `apps/backend/.env.test.example`, con los pasos en el README.
- `authHttp.test.js` se ajustó: el duplicado da 409 solo con una cuenta verificada, y hay un test nuevo del reenvío que comprueba que sigue valiendo la contraseña original.

---

## 6. Otras observaciones

- **Vulnerabilidades** (`npm audit --omit=dev`): de 6 (1 alta, 5 moderadas) se pasó a **2 moderadas**. Se arreglaron con actualizaciones dirigidas (`273f061`), sin `npm audit fix` ni cambios de versión mayor:
  - nodemailer 9.1.1;
  - express 4.22.3, body-parser 1.20.8 y qs 6.16.0;
  - react-router(-dom) 6.30.6.

  **Siguen abiertas:**
  - `react-router` GHSA-wrjc-x8rr-h8h6 (open redirect con barra invertida en `<Link>`/`useNavigate`) y GHSA-337j-9hxr-rhxg (SSR hydration; no aplica a esta SPA). Solo se corrigen en **7.18.0**, y se decidió quedarse en v6.
  - `react-router-dom` aparece solo porque depende de `react-router`.

  **Aviso:** `npm audit fix --omit=dev` **desinstalaría las dependencias de desarrollo**. No usarlo.

- **`ecosystem.config.cjs`** (sin seguimiento, pendiente de decisión): configuración de PM2 para levantar backend y frontend en **desarrollo** (`NODE_ENV=development`, `watch` en `src`). Nada del repo lo referencia. PM2 está instalado globalmente en la máquina, no como dependencia del proyecto.
- **Riesgo de datos:** la copia `OneDrive\Escritorio\CTCJ` comparte `ctcj_dev`. Ejecutar `prisma migrate dev` desde allí podría proponer un reset. Conviene archivarla o darle su propia BD.
- **Comentario obsoleto:** `apps/backend/prisma/seed.js:10` dice "Only identity/booking modules are built".

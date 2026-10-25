import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { consentClient } from '../../api/consentClient.js';
import { privacyClient } from '../../api/privacyClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { PrivacyTab } from './PrivacyTab.jsx';

vi.mock('../../api/consentClient.js', () => ({
  consentClient: { getMyAuthorizations: vi.fn(), setMyAuthorization: vi.fn() },
}));
vi.mock('../../api/privacyClient.js', () => ({
  privacyClient: {
    exportMyData: vi.fn(),
    listMyDataRequests: vi.fn(),
    submitDataRequest: vi.fn(),
  },
}));

const item = (type, title, extra = {}) => ({
  type,
  title,
  currentVersion: '1',
  accepted: false,
  acceptedAt: null,
  acceptedVersion: null,
  givenByGuardian: false,
  ...(type === 'MARKETING' ? { channels: [] } : {}),
  ...extra,
});

const AUTHORIZATIONS = {
  isMinor: false,
  items: [
    item('MARKETING', 'Autorización para recibir novedades y promociones'),
    item('HEALTH_DATA', 'Autorización para el tratamiento de mis datos de salud'),
    item('COMMUNITY_RULES', 'Reglas de la Comunidad', {
      accepted: true,
      acceptedAt: '2026-09-20T15:00:00Z',
      acceptedVersion: '1',
    }),
  ],
  cookies: { decidedAt: null, preferences: false, analytics: false },
};

const REQUEST = {
  id: 'r1',
  radicado: 'CTCJ-2026-00007',
  kind: 'CONSULTA',
  requestType: 'CONSULTA',
  status: 'RECIBIDA',
  description: '¿Qué datos tienen de mí?',
  receivedAt: '2026-09-28T15:00:00Z',
  dueOn: '2026-10-13',
  answer: null,
  alert: 'ON_TIME',
  businessDaysLeft: 10,
};

function renderTab() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <PrivacyTab />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  consentClient.getMyAuthorizations.mockResolvedValue(AUTHORIZATIONS);
  privacyClient.listMyDataRequests.mockResolvedValue({ requests: [] });
});

describe('Mis datos y privacidad', () => {
  it('shows every optional authorization unticked, and the cookie settings button', async () => {
    renderTab();
    expect(
      await screen.findByRole('heading', {
        name: 'Autorización para recibir novedades y promociones',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Correo' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'WhatsApp' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Retirar mi aceptación' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cambiar preferencias de cookies' }),
    ).toBeInTheDocument();
  });

  it('promotions need a channel; then they are saved with it', async () => {
    const user = userEvent.setup();
    consentClient.setMyAuthorization.mockResolvedValue({
      ...AUTHORIZATIONS.items[0],
      accepted: true,
      acceptedAt: '2026-09-28T15:00:00Z',
      channels: ['whatsapp'],
    });
    renderTab();
    await user.click(await screen.findByRole('button', { name: 'Quiero recibir novedades' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Elige al menos un canal');
    await user.click(screen.getByRole('checkbox', { name: 'WhatsApp' }));
    await user.click(screen.getByRole('button', { name: 'Quiero recibir novedades' }));
    expect(consentClient.setMyAuthorization).toHaveBeenCalledWith('MARKETING', {
      accept: true,
      channels: ['whatsapp'],
    });
    expect(await screen.findByText(/por WhatsApp/)).toBeInTheDocument();
  });

  it('health data asks for confirmation before authorizing', async () => {
    const user = userEvent.setup();
    consentClient.setMyAuthorization.mockResolvedValue({
      ...AUTHORIZATIONS.items[1],
      accepted: true,
      acceptedAt: '2026-09-28T15:00:00Z',
    });
    renderTab();
    await screen.findByRole('heading', {
      name: 'Autorización para el tratamiento de mis datos de salud',
    });
    await user.click(screen.getByRole('button', { name: 'Autorizar' }));
    expect(consentClient.setMyAuthorization).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, autorizar' }));
    expect(consentClient.setMyAuthorization).toHaveBeenCalledWith('HEALTH_DATA', { accept: true });
  });

  it('a minor sees that the guardian gives health data, and gets no promotions', async () => {
    consentClient.getMyAuthorizations.mockResolvedValue({ ...AUTHORIZATIONS, isMinor: true });
    renderTab();
    expect(await screen.findByText(/esta autorización la da tu acudiente/)).toBeInTheDocument();
    expect(
      screen.getByText('Las cuentas de menores de edad no reciben promociones.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Autorizar' })).not.toBeInTheDocument();
  });

  it('a consulta gets its radicado and the date it will be answered by', async () => {
    const user = userEvent.setup();
    privacyClient.submitDataRequest.mockResolvedValue(REQUEST);
    renderTab();
    await user.type(await screen.findByLabelText('Cuéntanos'), '¿Qué datos tienen de mí?');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(privacyClient.submitDataRequest).toHaveBeenCalledWith({
      kind: 'CONSULTA',
      description: '¿Qué datos tienen de mí?',
    });
    expect(
      await screen.findByText('Recibimos tu solicitud. Tu número de radicado es CTCJ-2026-00007.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/CTCJ-2026-00007 · Consulta sobre mis datos/)).toBeInTheDocument();
  });

  it('a too-short message is refused before sending, with focus on it', async () => {
    const user = userEvent.setup();
    renderTab();
    const field = await screen.findByLabelText('Cuéntanos');
    await user.type(field, 'hola');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(privacyClient.submitDataRequest).not.toHaveBeenCalled();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveFocus();
  });

  it('deleting the account is a request, confirmed first', async () => {
    const user = userEvent.setup();
    privacyClient.submitDataRequest.mockResolvedValue({
      ...REQUEST,
      id: 'r2',
      kind: 'SUPRESION',
      requestType: 'RECLAMO',
      radicado: 'CTCJ-2026-00008',
      dueOn: '2026-10-20',
    });
    renderTab();
    await user.click(
      await screen.findByRole('button', { name: 'Solicitar la eliminación de mi cuenta' }),
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, solicitar eliminación' }));
    expect(privacyClient.submitDataRequest).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'SUPRESION' }),
    );
    expect(
      await screen.findByText(
        /Ya tienes una solicitud de eliminación en trámite \(CTCJ-2026-00008\)/,
      ),
    ).toBeInTheDocument();
  });
});

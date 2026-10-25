import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { a11yViolations } from '../../../test/axe.js';
import { infoRequestClient } from '../../api/infoRequestClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { InfoRequestsPage, whatsappLink } from './InfoRequestsPage.jsx';

vi.mock('../../api/infoRequestClient.js', () => ({
  infoRequestClient: { list: vi.fn(), setStatus: vi.fn(), addNote: vi.fn() },
}));

const REQUEST = {
  id: 'q1',
  fullName: 'Ana Gómez',
  phone: '+573105551234',
  email: null,
  program: 'ESCUELA_INFANTIL',
  forWhom: 'CHILD',
  childAge: 9,
  preferredTimes: ['TARDE'],
  message: 'Para mi hija',
  marketingOptIn: false,
  status: 'NUEVA',
  createdAt: '2026-09-29T15:00:00Z',
  handledBy: null,
  notes: [],
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <InfoRequestsPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  infoRequestClient.list.mockResolvedValue({ requests: [REQUEST] });
});

describe('Solicitudes de información (consola)', () => {
  it('the WhatsApp link opens a chat with the number and a first message', () => {
    const url = new URL(whatsappLink(REQUEST));
    expect(url.origin + url.pathname).toBe('https://wa.me/573105551234');
    expect(url.searchParams.get('text')).toMatch(/^Hola, Ana\. .*escuela infantil\.$/);
  });

  it('starts on "Nueva", filters by program, and has no serious a11y violations', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const list = await screen.findByRole('list', { name: 'Solicitudes' });
    expect(within(list).getByText('Ana Gómez')).toBeInTheDocument();
    expect(within(list).getByText('Para su hijo o hija de 9 años')).toBeInTheDocument();
    expect(infoRequestClient.list).toHaveBeenCalledWith({ status: 'NUEVA', program: '' });
    expect(await a11yViolations(container)).toEqual([]);

    await user.selectOptions(screen.getAllByLabelText('Programa')[0], 'COMPETENCIA');
    expect(infoRequestClient.list).toHaveBeenLastCalledWith({
      status: 'NUEVA',
      program: 'COMPETENCIA',
    });
  });

  it('changes the status and saves a note; shows who handled it', async () => {
    const user = userEvent.setup();
    const handled = { ...REQUEST, handledBy: { firstName: 'Marta', lastName: 'Ruiz' } };
    infoRequestClient.setStatus.mockResolvedValue({ ...handled, status: 'CONTACTADA' });
    infoRequestClient.addNote.mockResolvedValue({
      ...handled,
      status: 'CONTACTADA',
      notes: [
        {
          id: 'n1',
          text: 'Le escribí.',
          author: { firstName: 'Marta', lastName: 'Ruiz' },
          createdAt: '2026-09-29T16:00:00Z',
        },
      ],
    });
    renderPage();
    const list = await screen.findByRole('list', { name: 'Solicitudes' });
    await user.selectOptions(within(list).getByLabelText('Estado'), 'CONTACTADA');
    expect(infoRequestClient.setStatus).toHaveBeenCalledWith('q1', 'CONTACTADA');
    expect(await within(list).findByText(/Atendida por Marta Ruiz/)).toBeInTheDocument();

    await user.type(within(list).getByLabelText(/Nota interna/), 'Le escribí.');
    await user.click(within(list).getByRole('button', { name: 'Guardar nota' }));
    expect(infoRequestClient.addNote).toHaveBeenCalledWith('q1', 'Le escribí.');
    expect(await within(list).findByRole('list', { name: 'Notas internas' })).toHaveTextContent(
      'Le escribí.',
    );
  });
});

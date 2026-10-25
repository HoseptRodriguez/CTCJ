import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authClient } from '../api/authClient.js';

import { Register } from './Register.jsx';

vi.mock('../api/authClient.js', () => ({ authClient: { register: vi.fn() } }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );

async function fillBasics(user, birthDate = '1990-05-02') {
  await user.type(screen.getByLabelText('Nombre'), 'Ana');
  await user.type(screen.getByLabelText('Apellido'), 'Gómez');
  await user.type(screen.getByLabelText('Correo'), 'ana@correo.com');
  await user.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
  await user.type(screen.getByLabelText('Fecha de nacimiento'), birthDate);
}

beforeEach(() => {
  vi.clearAllMocks();
  authClient.register.mockResolvedValue({});
});

describe('Register (Crear cuenta)', () => {
  it('the authorizations start unticked, each with its link', () => {
    renderPage();
    const privacy = screen.getByLabelText(/Autorizo el tratamiento de mis datos personales/);
    const terms = screen.getByLabelText(/Acepto los/);
    const marketing = screen.getByLabelText(/Quiero recibir novedades y promociones/);
    for (const box of [privacy, terms, marketing]) expect(box).not.toBeChecked();
    expect(screen.getByRole('link', { name: /Política de Tratamiento de Datos/ })).toHaveAttribute(
      'href',
      '/privacidad',
    );
    expect(screen.getByRole('link', { name: /Términos y condiciones/ })).toHaveAttribute(
      'href',
      '/terminos',
    );
  });

  it('without ticking the required boxes it says why, focuses the first problem and sends nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      screen.getByText('Para crear la cuenta debes autorizar el tratamiento de tus datos.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Para crear la cuenta debes aceptar los Términos y condiciones.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByLabelText(/Autorizo el tratamiento de mis datos personales/),
      ).toHaveFocus(),
    );
    expect(authClient.register).not.toHaveBeenCalled();
  });

  it('sends the birth date, both acceptances and only the promotion channels chosen', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillBasics(user);
    await user.click(screen.getByLabelText(/Autorizo el tratamiento/));
    await user.click(screen.getByLabelText(/Acepto los/));
    await user.click(screen.getByLabelText(/Quiero recibir novedades/));
    await user.click(screen.getByLabelText('WhatsApp'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() =>
      expect(authClient.register).toHaveBeenCalledWith({
        email: 'ana@correo.com',
        password: 'ClaveSegura123',
        firstName: 'Ana',
        lastName: 'Gómez',
        birthDate: '1990-05-02',
        acceptPrivacy: true,
        acceptTerms: true,
        marketing: { email: false, whatsapp: true },
      }),
    );
  });

  it('a minor sees why the guardian must authorize, and is never offered promotions', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillBasics(user, '2012-03-01');
    expect(screen.getByRole('status')).toHaveTextContent('Eres menor de edad');
    expect(screen.queryByLabelText(/Quiero recibir novedades/)).not.toBeInTheDocument();
  });
});

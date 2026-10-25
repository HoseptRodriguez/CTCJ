import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { a11yViolations } from '../../../test/axe.js';
import { infoRequestClient } from '../../api/infoRequestClient.js';

import { InfoRequestForm } from './InfoRequestForm.jsx';

vi.mock('../../api/infoRequestClient.js', () => ({
  infoRequestClient: { getFormToken: vi.fn(), submit: vi.fn() },
}));

function renderForm(props = {}) {
  return render(
    <MemoryRouter>
      <InfoRequestForm {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  infoRequestClient.getFormToken.mockResolvedValue({ formToken: 'tok' });
  infoRequestClient.submit.mockResolvedValue({ received: true });
});

describe('InfoRequestForm', () => {
  it('has no serious accessibility violations', async () => {
    const { container } = renderForm();
    await waitFor(() => expect(infoRequestClient.getFormToken).toHaveBeenCalled());
    expect(await a11yViolations(container)).toEqual([]);
  });

  it('the privacy authorization starts unticked; sending without it shows the error and sends nothing', async () => {
    const user = userEvent.setup();
    renderForm({ program: 'ADULTOS' });
    const privacy = screen.getByRole('checkbox', { name: /Obligatoria/ });
    expect(privacy).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Adultos' })).toBeChecked();

    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana Gómez');
    await user.type(screen.getByLabelText(/Celular/), '310 555 1234');
    await user.click(screen.getByRole('radio', { name: 'Para mí' }));
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(privacy).toHaveAttribute('aria-invalid', 'true');
    expect(privacy).toHaveFocus();
    expect(infoRequestClient.submit).not.toHaveBeenCalled();
  });

  it('for a child asks only the age, and sends the normalized request', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(infoRequestClient.getFormToken).toHaveBeenCalled());
    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana Gómez');
    await user.type(screen.getByLabelText(/Celular/), '310 555 1234');
    await user.click(screen.getByRole('radio', { name: 'Escuela infantil' }));
    expect(screen.queryByLabelText(/Edad del niño/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Para mi hijo o hija' }));
    await user.type(screen.getByLabelText(/Edad del niño/), '9');
    await user.click(screen.getByRole('checkbox', { name: /Tarde/ }));
    await user.click(screen.getByRole('checkbox', { name: /Obligatoria/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await screen.findByText(/Recibimos tu solicitud/);
    expect(infoRequestClient.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Ana Gómez',
        program: 'ESCUELA_INFANTIL',
        forWhom: 'CHILD',
        childAge: 9,
        preferredTimes: ['TARDE'],
        acceptPrivacy: true,
        marketing: false,
        formToken: 'tok',
      }),
    );
    expect(screen.getByRole('link', { name: /Escribir por WhatsApp ahora/ })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/'),
    );
  });

  it('a too-fast form tells the person to wait and try again', async () => {
    const user = userEvent.setup();
    infoRequestClient.submit.mockRejectedValue({ code: 'form_token_invalid', status: 400 });
    renderForm({ program: 'COMPETENCIA' });
    await waitFor(() => expect(infoRequestClient.getFormToken).toHaveBeenCalled());
    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana Gómez');
    await user.type(screen.getByLabelText(/Celular/), '3105551234');
    await user.click(screen.getByRole('radio', { name: 'Para mí' }));
    await user.click(screen.getByRole('checkbox', { name: /Obligatoria/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Espera unos segundos/);
  });
});

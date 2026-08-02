import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '../context/AuthContext.jsx';

import { RequireRole } from './RequireRole.jsx';

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderWithAuth(auth) {
  useAuth.mockReturnValue(auth);
  return render(
    <MemoryRouter initialEntries={['/staff/pagos']}>
      <Routes>
        <Route element={<RequireRole roles={['ADMINISTRADOR', 'RECEPCION']} />}>
          <Route path="/staff/pagos" element={<div>Contenido de staff</div>} />
        </Route>
        <Route path="/login" element={<div>Pagina de login</div>} />
        <Route path="/" element={<div>Inicio</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  it('shows a loading state without redirecting while status is loading', () => {
    renderWithAuth({ status: 'loading', user: null });
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByText('Contenido de staff')).not.toBeInTheDocument();
  });

  it('redirects to /login when anonymous', () => {
    renderWithAuth({ status: 'anonymous', user: null });
    expect(screen.getByText('Pagina de login')).toBeInTheDocument();
  });

  it('redirects home when authenticated but lacking any allowed role', () => {
    renderWithAuth({ status: 'authenticated', user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });

  it('renders the protected route when the user has one of the allowed roles', () => {
    renderWithAuth({ status: 'authenticated', user: { id: 'u1', roles: ['RECEPCION'] } });
    expect(screen.getByText('Contenido de staff')).toBeInTheDocument();
  });
});

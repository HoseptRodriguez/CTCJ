import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '../context/AuthContext.jsx';

import { RequireAuth } from './RequireAuth.jsx';

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderWithStatus(status) {
  useAuth.mockReturnValue({ status });
  return render(
    <MemoryRouter initialEntries={['/mi-ctcj']}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/mi-ctcj" element={<div>Contenido privado</div>} />
        </Route>
        <Route path="/login" element={<div>Pagina de login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('shows a loading state without redirecting while status is loading', () => {
    renderWithStatus('loading');
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
    expect(screen.queryByText('Pagina de login')).not.toBeInTheDocument();
  });

  it('redirects to /login when anonymous', () => {
    renderWithStatus('anonymous');
    expect(screen.getByText('Pagina de login')).toBeInTheDocument();
  });

  it('renders the protected route when authenticated', () => {
    renderWithStatus('authenticated');
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });
});

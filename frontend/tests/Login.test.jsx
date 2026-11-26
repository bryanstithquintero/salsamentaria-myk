import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import Login from '../src/pages/Login';
import { ErrorApi } from '../src/api/cliente';

vi.mock('../src/api/servicios', () => ({
  authApi: { login: vi.fn(), perfil: vi.fn() },
}));
const { authApi } = await import('../src/api/servicios');

function montar() {
  const router = createMemoryRouter([
    { path: '/login', element: <Login /> },
    { path: '/', element: <h1>Panel principal</h1> },
  ], { initialEntries: ['/login'] });
  render(<ToastProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></ToastProvider>);
}

describe('Pantalla de inicio de sesión', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  test('valida campos vacíos sin llamar a la API', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ingrese su usuario y contraseña');
    expect(authApi.login).not.toHaveBeenCalled();
  });

  test('muestra el mensaje de error que devuelve la API', async () => {
    authApi.login.mockRejectedValue(new ErrorApi({ status: 401, codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o contraseña incorrectos' }));
    montar();
    await userEvent.type(screen.getByLabelText(/usuario o correo/i), 'admin');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'malaclave');
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos');
  });

  test('con credenciales válidas guarda el token y navega al panel', async () => {
    authApi.login.mockResolvedValue({ token: 'jwt-de-prueba', usuario: { id: 1, nombre: 'Bryan Quintero', rol: 'admin' } });
    montar();
    await userEvent.type(screen.getByLabelText(/usuario o correo/i), 'admin');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => expect(screen.getByText('Panel principal')).toBeInTheDocument());
    expect(localStorage.getItem('myk_token')).toBe('jwt-de-prueba');
  });
});

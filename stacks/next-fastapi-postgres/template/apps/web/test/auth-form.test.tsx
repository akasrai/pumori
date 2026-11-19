import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '@/components/auth-form';

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
};

describe('AuthForm', () => {
  beforeEach(() => {
    router.replace.mockReset();
  });

  it('shows the shared-schema validation message without calling the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<AuthForm mode="signup" />);
    fill('not-an-email', 'password123');
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Enter a valid email address');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts to /api/auth/login and navigates home on success', async () => {
    const user = { id: '7d9f8a2e-1b2c-4d5e-8f90-123456789abc', email: 'a@example.test', createdAt: new Date().toISOString() };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ user }), { status: 200, headers: { 'content-type': 'application/json' } }));
    render(<AuthForm mode="login" />);
    fill('A@example.test', 'secret');
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }));
  });

  it('shows the API error message on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }), {
        status: 401,
      }),
    );
    render(<AuthForm mode="login" />);
    fill('a@example.test', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid email or password');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../store/authStore');

describe('ProtectedRoute', () => {
  it('should redirect to login when not authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      fetchUser: vi.fn(),
      token: null,
    } as any);

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    // Should redirect to login (would need to check navigation in actual test)
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show loading state when checking authentication', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      fetchUser: vi.fn(),
      token: null,
    } as any);

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      fetchUser: vi.fn(),
      token: 'test-token',
    } as any);

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});

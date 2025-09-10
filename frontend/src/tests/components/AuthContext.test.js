import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { mockUser } from '../setup';

// Mock the API
jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    getProfile: jest.fn(),
  },
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { user, login, register, logout, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {user ? (
        <div>
          <div data-testid="user-email">{user.email}</div>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <button
            onClick={() => login('test@example.com', 'password123')}
            data-testid="login-btn"
          >
            Login
          </button>
          <button
            onClick={() => register({ email: 'test@example.com', password: 'password123', firstName: 'Test', lastName: 'User' })}
            data-testid="register-btn"
          >
            Register
          </button>
        </div>
      )}
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should provide initial state without user', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    expect(screen.getByTestId('register-btn')).toBeInTheDocument();
  });

  it('should login user successfully', async () => {
    const mockResponse = {
      data: {
        user: mockUser,
        token: 'mock-jwt-token'
      }
    };

    authAPI.login.mockResolvedValue(mockResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
  });

  it('should register user successfully', async () => {
    const mockResponse = {
      data: {
        user: mockUser,
        token: 'mock-jwt-token'
      }
    };

    authAPI.register.mockResolvedValue(mockResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('register-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
  });

  it('should logout user successfully', async () => {
    // Set up initial logged in state
    localStorage.setItem('token', 'mock-jwt-token');
    authAPI.getProfile.mockResolvedValue({ data: { user: mockUser } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should handle login error', async () => {
    const mockError = {
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    };

    authAPI.login.mockRejectedValue(mockError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    });

    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should handle register error', async () => {
    const mockError = {
      response: {
        data: {
          message: 'User already exists'
        }
      }
    };

    authAPI.register.mockRejectedValue(mockError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('register-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('register-btn')).toBeInTheDocument();
    });

    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should check authentication on mount with valid token', async () => {
    localStorage.setItem('token', 'mock-jwt-token');
    authAPI.getProfile.mockResolvedValue({ data: { user: mockUser } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    expect(authAPI.getProfile).toHaveBeenCalled();
  });

  it('should handle invalid token on mount', async () => {
    localStorage.setItem('token', 'invalid-token');
    authAPI.getProfile.mockRejectedValue(new Error('Invalid token'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should throw error when useAuth is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });
});


import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, FormGroup, Label, ErrorMessage } from '../../styles/GlobalStyles';
import toast from 'react-hot-toast';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}20 0%, ${props => props.theme.colors.secondary}20 100%);
  padding: 1rem;
`;

const LoginCard = styled.div`
  width: 100%;
  max-width: 400px;
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 20px 25px -5px ${props => props.theme.colors.shadow}, 0 10px 10px -5px ${props => props.theme.colors.shadow};
  border: 1px solid ${props => props.theme.colors.border};
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const LogoText = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin: 0;
`;

const LogoSubtext = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textMuted};
  margin: 0.5rem 0 0;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  text-align: center;
  margin-bottom: 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputContainer = styled.div`
  position: relative;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.textMuted};
  z-index: 1;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const InputWithIcon = styled(Input)`
  padding-left: 3rem;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${props => props.theme.colors.textMuted};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ForgotPassword = styled(Link)`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  text-align: right;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primaryHover};
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 1.5rem 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${props => props.theme.colors.border};
  }

  span {
    padding: 0 1rem;
    font-size: 0.875rem;
    color: ${props => props.theme.colors.textMuted};
  }
`;

const SignUpLink = styled.div`
  text-align: center;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};

  a {
    color: ${props => props.theme.colors.primary};
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;

    &:hover {
      color: ${props => props.theme.colors.primaryHover};
    }
  }
`;

const LoadingButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    console.log('Login form submitted with data:', data);
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      console.log('Login result:', result);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <LogoText>Fiddy</LogoText>
          <LogoSubtext>AutoPublisher</LogoSubtext>
        </Logo>

        <Title>Welcome back</Title>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <InputContainer>
              <InputIcon>
                <Mail />
              </InputIcon>
              <InputWithIcon
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
            </InputContainer>
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <InputContainer>
              <InputIcon>
                <Lock />
              </InputIcon>
              <InputWithIcon
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
              />
              <PasswordToggle
                type="button"
                onClick={togglePasswordVisibility}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </PasswordToggle>
            </InputContainer>
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </FormGroup>

          <ForgotPassword to="/forgot-password">
            Forgot your password?
          </ForgotPassword>

          <LoadingButton
            type="submit"
            variant="primary"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </LoadingButton>
        </Form>

        <Divider>
          <span>New to Fiddy?</span>
        </Divider>

        <SignUpLink>
          Don't have an account?{' '}
          <Link to="/register">Create one now</Link>
        </SignUpLink>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;


import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.div`
  display: inline-block;
  width: ${props => props.size || '20px'};
  height: ${props => props.size || '20px'};
  border: 2px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #6366f1;
  animation: ${spin} 1s ease-in-out infinite;
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.padding || '2rem'};
  ${props => props.fullScreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.8);
    z-index: 9999;
  `}
`;

const Text = styled.div`
  margin-left: 0.75rem;
  color: #64748b;
  font-size: 0.875rem;
`;

const LoadingSpinner = ({ 
  size, 
  text, 
  fullScreen = false, 
  padding,
  className 
}) => {
  return (
    <Container fullScreen={fullScreen} padding={padding} className={className}>
      <Spinner size={size} />
      {text && <Text>{text}</Text>}
    </Container>
  );
};

export default LoadingSpinner;


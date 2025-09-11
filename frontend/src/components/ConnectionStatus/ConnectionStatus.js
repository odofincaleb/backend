import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Wifi, WifiOff, Loader } from 'lucide-react';
import { checkConnection } from '../../services/connectionCheck';

const StatusContainer = styled.div`
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  z-index: 2000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: ${props => {
    switch (props.connectionStatus) {
      case 'connected': return props.theme.colors.success;
      case 'disconnected': return props.theme.colors.error;
      case 'reconnecting': return props.theme.colors.warning;
      case 'checking': return props.theme.colors.info;
      default: return props.theme.colors.info;
    }
  }};
`;

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let interval;
    const monitorConnection = async () => {
      try {
        const isConnected = await checkConnection();
        setStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Connection check failed:', error);
        setStatus('disconnected');
      }
    };

    monitorConnection(); // Initial check
    interval = setInterval(monitorConnection, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return <Wifi size={16} />;
      case 'disconnected': return <WifiOff size={16} />;
      case 'reconnecting': return <Loader className="animate-spin" size={16} />;
      case 'checking': return <Loader className="animate-spin" size={16} />;
      default: return <Loader className="animate-spin" size={16} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'reconnecting': return 'Reconnecting...';
      case 'checking': return 'Checking connection...';
      default: return 'Unknown Status';
    }
  };

  return (
    <StatusContainer connectionStatus={status}>
      {getStatusIcon()}
      {getStatusText()}
    </StatusContainer>
  );
};

export default ConnectionStatus;
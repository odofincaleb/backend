import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Wifi, WifiOff, Loader } from 'lucide-react';
import { checkConnection } from '../../services/connectionCheck';
import toast from 'react-hot-toast';

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
  transition: all 0.3s ease;
  cursor: pointer;
  background: ${props => {
    switch (props.connectionStatus) {
      case 'connected': return props.theme.colors.success;
      case 'disconnected': return props.theme.colors.error;
      case 'reconnecting': return props.theme.colors.warning;
      case 'checking': return props.theme.colors.info;
      default: return props.theme.colors.info;
    }
  }};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
`;

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking');
  const [lastConnected, setLastConnected] = useState(Date.now());
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds

  const checkConnectionStatus = useCallback(async () => {
    try {
      const isConnected = await checkConnection();
      
      if (isConnected) {
        if (status !== 'connected') {
          // Only show reconnected toast if we were previously disconnected
          if (status === 'disconnected' || status === 'reconnecting') {
            toast.success('Connection restored!', { id: 'connection-restored' });
          }
          setStatus('connected');
          setLastConnected(Date.now());
          setRetryCount(0);
        }
      } else {
        throw new Error('Connection check failed');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      
      // const timeSinceLastConnected = Date.now() - lastConnected;
      
      if (status === 'connected') {
        // Just disconnected
        toast.error('Connection lost. Attempting to reconnect...', {
          id: 'connection-lost',
          duration: RETRY_DELAY
        });
        setStatus('disconnected');
      } else if (retryCount < MAX_RETRIES) {
        // Still trying to reconnect
        setStatus('reconnecting');
        setRetryCount(prev => prev + 1);
        
        // Show retry toast
        toast.loading(`Reconnecting... Attempt ${retryCount + 1}/${MAX_RETRIES}`, {
          id: 'reconnecting',
          duration: RETRY_DELAY
        });
        
        // Try again after delay
        setTimeout(checkConnectionStatus, RETRY_DELAY);
      } else if (status !== 'disconnected') {
        // Max retries reached
        setStatus('disconnected');
        toast.error('Connection failed. Please check your internet connection.', {
          id: 'connection-failed',
          duration: 10000
        });
      }
    }
  }, [status, lastConnected, retryCount]);

  useEffect(() => {
    // Initial check
    checkConnectionStatus();

    // Set up interval for periodic checks
    const interval = setInterval(checkConnectionStatus, RETRY_DELAY);

    // Clean up
    return () => {
      clearInterval(interval);
      toast.dismiss('connection-lost');
      toast.dismiss('reconnecting');
      toast.dismiss('connection-failed');
      toast.dismiss('connection-restored');
    };
  }, [checkConnectionStatus]);

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
      case 'reconnecting': return `Reconnecting (${retryCount}/${MAX_RETRIES})`;
      case 'checking': return 'Checking connection...';
      default: return 'Unknown Status';
    }
  };

  const handleClick = () => {
    if (status === 'disconnected') {
      setRetryCount(0);
      setStatus('checking');
      checkConnectionStatus();
      toast.loading('Checking connection...', { id: 'manual-check' });
    }
  };

  return (
    <StatusContainer 
      connectionStatus={status}
      onClick={handleClick}
      title={status === 'disconnected' ? 'Click to retry connection' : undefined}
    >
      {getStatusIcon()}
      {getStatusText()}
    </StatusContainer>
  );
};

export default ConnectionStatus;
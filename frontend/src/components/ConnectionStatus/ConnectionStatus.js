import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Wifi, WifiOff, Loader } from 'lucide-react';
import { checkConnection } from '../../services/connectionCheck';

const StatusContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${props => {
    switch (props.status) {
      case 'connected':
        return 'rgba(34, 197, 94, 0.1)';
      case 'disconnected':
        return 'rgba(239, 68, 68, 0.1)';
      case 'reconnecting':
        return 'rgba(234, 179, 8, 0.1)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'connected':
        return '#22c55e';
      case 'disconnected':
        return '#ef4444';
      case 'reconnecting':
        return '#eab308';
      default:
        return '#64748b';
    }
  }};
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  transition: all 0.3s ease;
  opacity: ${props => props.show ? '1' : '0'};
  transform: translateY(${props => props.show ? '0' : '20px'});
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking');
  const [show, setShow] = useState(false);

  useEffect(() => {
    let interval;
    let hideTimeout;

    const checkAndUpdateStatus = async () => {
      try {
        const isConnected = await checkConnection();
        const newStatus = isConnected ? 'connected' : 'disconnected';
        
        if (newStatus !== status) {
          setStatus(newStatus);
          setShow(true);

          // Hide after 5 seconds if connected
          if (newStatus === 'connected') {
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => setShow(false), 5000);
          }
        }
      } catch (error) {
        console.error('Connection check error:', error);
        setStatus('disconnected');
        setShow(true);
      }
    };

    // Initial check
    checkAndUpdateStatus();

    // Set up interval for periodic checks
    interval = setInterval(checkAndUpdateStatus, 5000);

    // Show immediately if not connected
    if (status !== 'connected') {
      setShow(true);
    }

    return () => {
      clearInterval(interval);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi size={16} />;
      case 'disconnected':
        return <WifiOff size={16} />;
      case 'reconnecting':
      case 'checking':
        return <Loader className="animate-spin" size={16} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Connection Lost';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'checking':
        return 'Checking...';
      default:
        return '';
    }
  };

  if (!show) return null;

  return (
    <StatusContainer status={status} show={show}>
      {getStatusIcon()}
      {getStatusText()}
    </StatusContainer>
  );
};

export default ConnectionStatus;
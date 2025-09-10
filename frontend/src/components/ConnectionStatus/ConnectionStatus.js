import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Wifi, WifiOff } from 'lucide-react';
import { subscribeToConnection, getConnectionStatus } from '../../services/connectionCheck';

const StatusContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${props => props.isConnected ? '#22c55e' : '#ef4444'};
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  transition: all 0.3s ease;
  opacity: ${props => props.show ? '1' : '0'};
  transform: translateY(${props => props.show ? '0' : '20px'});
`;

const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(getConnectionStatus());
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribe = subscribeToConnection((status) => {
      setIsConnected(status);
      setShow(true);
      // Hide after 5 seconds if connected
      if (status) {
        setTimeout(() => setShow(false), 5000);
      }
    });

    return () => unsubscribe();
  }, []);

  // Show immediately if disconnected
  useEffect(() => {
    if (!isConnected) {
      setShow(true);
    }
  }, [isConnected]);

  if (!show) return null;

  return (
    <StatusContainer isConnected={isConnected} show={show}>
      {isConnected ? (
        <>
          <Wifi size={16} />
          Connected
        </>
      ) : (
        <>
          <WifiOff size={16} />
          Reconnecting...
        </>
      )}
    </StatusContainer>
  );
};

export default ConnectionStatus;

import React from 'react';
import styled from 'styled-components';
import { User, Key, Bell, Shield } from 'lucide-react';
import { Card, Button } from '../../styles/GlobalStyles';

const SettingsContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 2rem;
`;

const SettingsGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const SettingsCard = styled(Card)`
  padding: 1.5rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${props => props.color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const CardDescription = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 1rem 0;
`;

const Settings = () => {
  return (
    <SettingsContainer>
      <Title>Settings</Title>

      <SettingsGrid>
        <SettingsCard>
          <CardHeader>
            <CardIcon color="#6366f1">
              <User />
            </CardIcon>
            <div>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and account details
              </CardDescription>
            </div>
          </CardHeader>
          <Button variant="outline">Edit Profile</Button>
        </SettingsCard>

        <SettingsCard>
          <CardHeader>
            <CardIcon color="#10b981">
              <Key />
            </CardIcon>
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your OpenAI API keys for content generation
              </CardDescription>
            </div>
          </CardHeader>
          <Button variant="outline">Manage API Keys</Button>
        </SettingsCard>

        <SettingsCard>
          <CardHeader>
            <CardIcon color="#f59e0b">
              <Bell />
            </CardIcon>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure email and in-app notification preferences
              </CardDescription>
            </div>
          </CardHeader>
          <Button variant="outline">Notification Settings</Button>
        </SettingsCard>

        <SettingsCard>
          <CardHeader>
            <CardIcon color="#ef4444">
              <Shield />
            </CardIcon>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Change your password and manage security settings
              </CardDescription>
            </div>
          </CardHeader>
          <Button variant="outline">Security Settings</Button>
        </SettingsCard>
      </SettingsGrid>
    </SettingsContainer>
  );
};

export default Settings;


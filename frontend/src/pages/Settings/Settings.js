import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { User, Key, Bell, Shield, Eye, EyeOff, Save, Loader, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Input, Label, FormGroup } from '../../styles/GlobalStyles';
// import { usersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

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

const ApiKeyForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const ApiKeyInput = styled.div`
  position: relative;
`;

const ApiKeyField = styled(Input)`
  padding-right: 3rem;
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 0.75rem;
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
    width: 16px;
    height: 16px;
  }
`;

const ApiKeyStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => props.status === 'valid' ? '#10b981' : props.status === 'invalid' ? '#ef4444' : '#f59e0b'};
  color: white;

  svg {
    width: 10px;
    height: 10px;
  }
`;

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai_key: '',
    dalle_key: ''
  });
  const [showKeys, setShowKeys] = useState({
    openai_key: false,
    dalle_key: false
  });
  const [keyStatus, setKeyStatus] = useState({
    openai_key: null,
    dalle_key: null
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await usersAPI.getApiKeys();
      // setApiKeys(response.data);
      
      // Mock data for now
      setApiKeys({
        openai_key: 'sk-...',
        dalle_key: 'sk-...'
      });
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const handleApiKeyChange = (keyType, value) => {
    setApiKeys(prev => ({
      ...prev,
      [keyType]: value
    }));
    
    // Reset status when key changes
    setKeyStatus(prev => ({
      ...prev,
      [keyType]: null
    }));
  };

  const toggleKeyVisibility = (keyType) => {
    setShowKeys(prev => ({
      ...prev,
      [keyType]: !prev[keyType]
    }));
  };

  const validateApiKey = async (keyType, keyValue) => {
    if (!keyValue || keyValue.length < 10) {
      setKeyStatus(prev => ({
        ...prev,
        [keyType]: 'invalid'
      }));
      return;
    }

    try {
      // TODO: Replace with actual API validation
      // const response = await usersAPI.validateApiKey(keyType, keyValue);
      
      // Mock validation
      const isValid = keyValue.startsWith('sk-') && keyValue.length > 20;
      setKeyStatus(prev => ({
        ...prev,
        [keyType]: isValid ? 'valid' : 'invalid'
      }));
    } catch (error) {
      setKeyStatus(prev => ({
        ...prev,
        [keyType]: 'invalid'
      }));
    }
  };

  const saveApiKeys = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // await usersAPI.addApiKeys(apiKeys);
      
      toast.success('API keys saved successfully');
    } catch (error) {
      toast.error('Failed to save API keys');
      console.error('Error saving API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKeys = async () => {
    if (!window.confirm('Are you sure you want to delete all API keys? This will stop content generation.')) {
      return;
    }

    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // await usersAPI.deleteApiKeys();
      
      setApiKeys({
        openai_key: '',
        dalle_key: ''
      });
      setKeyStatus({
        openai_key: null,
        dalle_key: null
      });
      toast.success('API keys deleted successfully');
    } catch (error) {
      toast.error('Failed to delete API keys');
      console.error('Error deleting API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderApiKeyStatus = (keyType) => {
    const status = keyStatus[keyType];
    if (!status) return null;

    return (
      <ApiKeyStatus>
        <StatusIcon status={status}>
          {status === 'valid' ? <CheckCircle /> : <XCircle />}
        </StatusIcon>
        <span style={{ color: status === 'valid' ? '#10b981' : '#ef4444' }}>
          {status === 'valid' ? 'Valid API key' : 'Invalid API key'}
        </span>
      </ApiKeyStatus>
    );
  };

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
          <Button variant="outline" onClick={() => setActiveTab('profile')}>
            Edit Profile
          </Button>
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
          <Button variant="outline" onClick={() => setActiveTab('api-keys')}>
            Manage API Keys
          </Button>
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
          <Button variant="outline" onClick={() => setActiveTab('notifications')}>
            Notification Settings
          </Button>
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
          <Button variant="outline" onClick={() => setActiveTab('security')}>
            Security Settings
          </Button>
        </SettingsCard>
      </SettingsGrid>

      {activeTab === 'api-keys' && (
        <SettingsCard style={{ marginTop: '2rem' }}>
          <CardHeader>
            <CardIcon color="#10b981">
              <Key />
            </CardIcon>
            <div>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>
                Add your OpenAI API keys to enable AI content generation
              </CardDescription>
            </div>
          </CardHeader>

          <ApiKeyForm onSubmit={saveApiKeys}>
            <FormGroup>
              <Label htmlFor="openai_key">OpenAI API Key</Label>
              <ApiKeyInput>
                <ApiKeyField
                  id="openai_key"
                  type={showKeys.openai_key ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKeys.openai_key}
                  onChange={(e) => handleApiKeyChange('openai_key', e.target.value)}
                  onBlur={(e) => validateApiKey('openai_key', e.target.value)}
                />
                <ToggleButton
                  type="button"
                  onClick={() => toggleKeyVisibility('openai_key')}
                >
                  {showKeys.openai_key ? <EyeOff /> : <Eye />}
                </ToggleButton>
              </ApiKeyInput>
              {renderApiKeyStatus('openai_key')}
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                Used for generating blog post content. Get your key from{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                  OpenAI Platform
                </a>
              </p>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="dalle_key">DALL-E API Key</Label>
              <ApiKeyInput>
                <ApiKeyField
                  id="dalle_key"
                  type={showKeys.dalle_key ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKeys.dalle_key}
                  onChange={(e) => handleApiKeyChange('dalle_key', e.target.value)}
                  onBlur={(e) => validateApiKey('dalle_key', e.target.value)}
                />
                <ToggleButton
                  type="button"
                  onClick={() => toggleKeyVisibility('dalle_key')}
                >
                  {showKeys.dalle_key ? <EyeOff /> : <Eye />}
                </ToggleButton>
              </ApiKeyInput>
              {renderApiKeyStatus('dalle_key')}
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                Used for generating featured images. Can be the same as OpenAI key.
              </p>
            </FormGroup>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save API Keys
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={deleteApiKeys}
                disabled={loading}
              >
                Delete All Keys
              </Button>
            </div>
          </ApiKeyForm>
        </SettingsCard>
      )}

      {activeTab === 'profile' && (
        <SettingsCard style={{ marginTop: '2rem' }}>
          <CardHeader>
            <CardIcon color="#6366f1">
              <User />
            </CardIcon>
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your current profile information
              </CardDescription>
            </div>
          </CardHeader>

          <div style={{ marginTop: '1rem' }}>
            <FormGroup>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </FormGroup>
            <FormGroup>
              <Label>Name</Label>
              <Input value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()} disabled />
            </FormGroup>
            <FormGroup>
              <Label>Subscription Plan</Label>
              <Input value={user?.subscriptionTier || 'Trial'} disabled />
            </FormGroup>
          </div>
        </SettingsCard>
      )}
    </SettingsContainer>
  );
};

export default Settings;


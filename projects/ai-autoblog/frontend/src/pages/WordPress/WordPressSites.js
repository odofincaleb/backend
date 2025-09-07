import React, { useState } from 'react';
import styled from 'styled-components';
import { Plus, Globe, Settings, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Badge, Input, Label, FormGroup } from '../../styles/GlobalStyles';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const WordPressContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const SitesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const SiteCard = styled(Card)`
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const SiteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const SiteName = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0;
  flex: 1;
`;

const SiteStatus = styled(Badge)`
  margin-left: 1rem;
`;

const SiteUrl = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 1rem;
  word-break: break-all;
`;

const SiteActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${props => props.theme.colors.textMuted};
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.theme.colors.surfaceHover};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  color: ${props => props.theme.colors.textMuted};

  svg {
    width: 40px;
    height: 40px;
  }
`;

const EmptyTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;
`;

const EmptyDescription = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 2rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${props => props.theme.colors.textMuted};
  cursor: pointer;
  padding: 0.25rem;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const WordPressSites = () => {
  const [sites, setSites] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'warning';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Replace with actual API call
      // const response = await wordpressAPI.addSite(formData);
      
      // Mock success for now
      const newSite = {
        id: Date.now(),
        name: formData.name,
        url: formData.url,
        status: 'connected'
      };
      
      setSites(prev => [...prev, newSite]);
      setShowModal(false);
      setFormData({ name: '', url: '', username: '', password: '' });
      toast.success('WordPress site added successfully!');
    } catch (error) {
      toast.error('Failed to add WordPress site');
      console.error('Error adding site:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = (siteId) => {
    setSites(prev => prev.filter(site => site.id !== siteId));
    toast.success('WordPress site removed');
  };

  return (
    <WordPressContainer>
      <Header>
        <Title>WordPress Sites</Title>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Add Site
        </Button>
      </Header>

      {sites.length > 0 ? (
        <SitesGrid>
          {sites.map((site) => (
            <SiteCard key={site.id}>
              <SiteHeader>
                <SiteName>{site.name}</SiteName>
                <SiteStatus variant={getStatusColor(site.status)}>
                  {site.status === 'connected' ? (
                    <><CheckCircle size={12} /> Connected</>
                  ) : (
                    <><XCircle size={12} /> Error</>
                  )}
                </SiteStatus>
              </SiteHeader>

              <SiteUrl>
                <Globe size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                {site.url}
              </SiteUrl>

              <SiteActions>
                <Button size="small" variant="ghost">
                  <Settings size={16} />
                </Button>
                <Button size="small" variant="ghost" onClick={() => handleDeleteSite(site.id)}>
                  <Trash2 size={16} />
                </Button>
              </SiteActions>
            </SiteCard>
          ))}
        </SitesGrid>
      ) : (
        <EmptyState>
          <EmptyIcon>
            <Globe />
          </EmptyIcon>
          <EmptyTitle>No WordPress sites connected</EmptyTitle>
          <EmptyDescription>
            Connect your WordPress site to start publishing content automatically with your campaigns.
          </EmptyDescription>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Add Your First Site
          </Button>
        </EmptyState>
      )}

      {showModal && (
        <Modal onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Add WordPress Site</ModalTitle>
              <CloseButton onClick={() => setShowModal(false)}>×</CloseButton>
            </ModalHeader>

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="name">Site Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="My WordPress Site"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="url">Site URL</Label>
                <Input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://mysite.com"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="username">WordPress Username</Label>
                <Input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="admin"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="password">WordPress Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Your WordPress password"
                  required
                />
              </FormGroup>

              <ModalActions>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Site'}
                </Button>
              </ModalActions>
            </form>
          </ModalContent>
        </Modal>
      )}
    </WordPressContainer>
  );
};

export default WordPressSites;


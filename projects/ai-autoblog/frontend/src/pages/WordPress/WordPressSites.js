import React from 'react';
import styled from 'styled-components';
import { Plus, Globe, Settings, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Badge } from '../../styles/GlobalStyles';
import { useNavigate } from 'react-router-dom';

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

const WordPressSites = () => {
  // Mock data - in real app, this would come from API
  const sites = [];

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

  return (
    <WordPressContainer>
      <Header>
        <Title>WordPress Sites</Title>
        <Button variant="primary">
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
                <Button size="small" variant="ghost">
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
          <Button variant="primary">
            <Plus size={20} />
            Add Your First Site
          </Button>
        </EmptyState>
      )}
    </WordPressContainer>
  );
};

export default WordPressSites;


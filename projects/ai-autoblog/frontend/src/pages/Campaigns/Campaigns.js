import React from 'react';
import styled from 'styled-components';
import { Plus, Target, Play, Pause, Settings, Trash2 } from 'lucide-react';
import { Card, Button, Badge } from '../../styles/GlobalStyles';
import { Link } from 'react-router-dom';

const CampaignsContainer = styled.div`
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

const CampaignsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const CampaignCard = styled(Card)`
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const CampaignHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const CampaignTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0;
  flex: 1;
`;

const CampaignStatus = styled(Badge)`
  margin-left: 1rem;
`;

const CampaignTopic = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 0.5rem;
`;

const CampaignContext = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textMuted};
  line-height: 1.4;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CampaignStats = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textMuted};
`;

const CampaignActions = styled.div`
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

const Campaigns = () => {
  // Mock data - in real app, this would come from API
  const campaigns = [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <CampaignsContainer>
      <Header>
        <Title>Campaigns</Title>
        <Button as={Link} to="/campaigns/create" variant="primary">
          <Plus size={20} />
          Create Campaign
        </Button>
      </Header>

      {campaigns.length > 0 ? (
        <CampaignsGrid>
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id}>
              <CampaignHeader>
                <CampaignTitle>{campaign.name}</CampaignTitle>
                <CampaignStatus variant={getStatusColor(campaign.status)}>
                  {campaign.status}
                </CampaignStatus>
              </CampaignHeader>

              <CampaignTopic>
                <strong>Topic:</strong> {campaign.topic}
              </CampaignTopic>

              <CampaignContext>
                {campaign.context}
              </CampaignContext>

              <CampaignStats>
                <span>Posts: {campaign.postsPublished}</span>
                <span>Next: {campaign.nextPublish}</span>
                <span>Schedule: {campaign.schedule}</span>
              </CampaignStats>

              <CampaignActions>
                <Button size="small" variant="ghost">
                  <Settings size={16} />
                </Button>
                <Button size="small" variant="ghost">
                  {campaign.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                </Button>
                <Button size="small" variant="ghost">
                  <Trash2 size={16} />
                </Button>
              </CampaignActions>
            </CampaignCard>
          ))}
        </CampaignsGrid>
      ) : (
        <EmptyState>
          <EmptyIcon>
            <Target />
          </EmptyIcon>
          <EmptyTitle>No campaigns yet</EmptyTitle>
          <EmptyDescription>
            Create your first AI-powered content campaign to start automatically generating and publishing blog posts.
          </EmptyDescription>
          <Button as={Link} to="/campaigns/create" variant="primary">
            <Plus size={20} />
            Create Your First Campaign
          </Button>
        </EmptyState>
      )}
    </CampaignsContainer>
  );
};

export default Campaigns;


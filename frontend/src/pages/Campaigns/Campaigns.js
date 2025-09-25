import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Plus, Target, Play, Pause, Trash2, Edit, Calendar, Globe, FileText } from 'lucide-react';
import { Card, Button, Badge } from '../../styles/GlobalStyles';
import { Link, useNavigate } from 'react-router-dom';
import { campaignsAPI } from '../../services/api';
import toast from 'react-hot-toast';
// import { useAuth } from '../../contexts/AuthContext';

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
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  // const { } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCampaigns();
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async (campaignId) => {
    try {
      setActionLoading(prev => ({ ...prev, [campaignId]: true }));
      await campaignsAPI.startCampaign(campaignId);
      
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'active' }
          : campaign
      ));
      toast.success('Campaign started successfully');
    } catch (error) {
      toast.error('Failed to start campaign');
      console.error('Error starting campaign:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const handlePauseCampaign = async (campaignId) => {
    try {
      setActionLoading(prev => ({ ...prev, [campaignId]: true }));
      await campaignsAPI.stopCampaign(campaignId);
      
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'paused' }
          : campaign
      ));
      toast.success('Campaign paused successfully');
    } catch (error) {
      toast.error('Failed to pause campaign');
      console.error('Error pausing campaign:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [campaignId]: true }));
      await campaignsAPI.deleteCampaign(campaignId);
      
      setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      toast.success('Campaign deleted successfully');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 500) {
        toast.error('Server error. Please try again in a few moments.');
      } else if (error.response?.status === 404) {
        toast.error('Campaign not found. It may have already been deleted.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You cannot delete this campaign.');
      } else {
        toast.error('Failed to delete campaign. Please try again.');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

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

  const formatNextPublish = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (date - now) / (1000 * 60 * 60);
    
    if (diffHours <= 0) return 'Now';
    if (diffHours < 1) return `${Math.round(diffHours * 60)}m`; // Show minutes for less than 1 hour
    if (diffHours < 24) return `${Math.round(diffHours * 10) / 10}h`; // Show decimal hours
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays}d`;
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading campaigns...</p>
        </div>
      ) : campaigns.length > 0 ? (
        <CampaignsGrid>
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id}>
              <CampaignHeader>
                <CampaignTitle>{campaign.topic}</CampaignTitle>
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
                <span><Target size={12} /> {campaign.postsPublished || 0} posts</span>
                <span><FileText size={12} /> {campaign.titlesInQueue || 0} titles</span>
                <span><Calendar size={12} /> Next: {formatNextPublish(campaign.nextPublishAt)}</span>
                <span><Globe size={12} /> {campaign.wordpressSite?.name || 'No site'}</span>
              </CampaignStats>

              <CampaignActions>
                <Button 
                  size="small" 
                  variant="ghost"
                  onClick={() => navigate(`/title-queue/${campaign.id}`)}
                  title="Manage Title Queue"
                >
                  <FileText size={16} />
                </Button>
                <Button 
                  size="small" 
                  variant="ghost"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  title="Edit Campaign"
                >
                  <Edit size={16} />
                </Button>
                <Button 
                  size="small" 
                  variant="ghost"
                  onClick={() => campaign.status === 'active' ? handlePauseCampaign(campaign.id) : handleStartCampaign(campaign.id)}
                  disabled={actionLoading[campaign.id]}
                  title={campaign.status === 'active' ? 'Pause Campaign' : 'Start Campaign'}
                >
                  {campaign.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                </Button>
                <Button 
                  size="small" 
                  variant="ghost"
                  onClick={() => handleDeleteCampaign(campaign.id)}
                  disabled={actionLoading[campaign.id]}
                  title="Delete Campaign"
                >
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


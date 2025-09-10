import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ArrowLeft, Plus, Trash2, Check, X, Loader, RefreshCw } from 'lucide-react';
import { Button, Input, Label, FormGroup, ErrorMessage } from '../../styles/GlobalStyles';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

const TitleQueueContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const BackButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const CampaignInfo = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const CampaignTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0 0 0.5rem 0;
`;

const CampaignContext = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const GenerateButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AddTitleForm = styled.form`
  display: flex;
  gap: 1rem;
  align-items: end;
  margin-bottom: 2rem;
`;

const TitleInput = styled(Input)`
  flex: 1;
`;

const TitlesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TitleItem = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const TitleText = styled.div`
  flex: 1;
  font-size: 1.1rem;
  color: ${props => props.theme.colors.text};
  line-height: 1.4;
`;

const TitleStatus = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    switch (props.status) {
      case 'pending':
        return `
          background: ${props.theme.colors.warning}20;
          color: ${props.theme.colors.warning};
          border: 1px solid ${props.theme.colors.warning}40;
        `;
      case 'approved':
        return `
          background: ${props.theme.colors.success}20;
          color: ${props.theme.colors.success};
          border: 1px solid ${props.theme.colors.success}40;
        `;
      case 'rejected':
        return `
          background: ${props.theme.colors.error}20;
          color: ${props.theme.colors.error};
          border: 1px solid ${props.theme.colors.error}40;
        `;
      default:
        return `
          background: ${props.theme.colors.textSecondary}20;
          color: ${props.theme.colors.textSecondary};
          border: 1px solid ${props.theme.colors.textSecondary}40;
        `;
    }
  }}
`;

const TitleActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled(Button)`
  padding: 0.5rem;
  min-width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme.colors.text};
`;

const EmptyDescription = styled.p`
  margin: 0;
  line-height: 1.5;
`;

const TitleQueue = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [titles, setTitles] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [addingTitle, setAddingTitle] = useState(false);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
      fetchTitles();
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      setCampaign(response.data.campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to fetch campaign details');
    }
  };

  const fetchTitles = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/title-queue/${campaignId}`);
      setTitles(response.data.titles);
    } catch (error) {
      console.error('Error fetching titles:', error);
      toast.error('Failed to fetch titles');
    } finally {
      setLoading(false);
    }
  };

  const generateTitles = async () => {
    try {
      setGenerating(true);
      const response = await api.post(`/title-queue/${campaignId}/generate`, { count: 5 });
      toast.success(`Generated ${response.data.titles.length} new titles`);
      fetchTitles(); // Refresh the list
    } catch (error) {
      console.error('Error generating titles:', error);
      toast.error('Failed to generate titles');
    } finally {
      setGenerating(false);
    }
  };

  const addTitle = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setAddingTitle(true);
      const response = await api.post(`/title-queue/${campaignId}`, {
        title: newTitle.trim()
      });
      
      toast.success('Title added successfully');
      setNewTitle('');
      fetchTitles(); // Refresh the list
    } catch (error) {
      console.error('Error adding title:', error);
      toast.error('Failed to add title');
    } finally {
      setAddingTitle(false);
    }
  };

  const updateTitleStatus = async (titleId, status) => {
    try {
      const response = await api.put(`/title-queue/${titleId}/status`, { status });
      toast.success(`Title ${status} successfully`);
      fetchTitles(); // Refresh the list
    } catch (error) {
      console.error(`Error ${status}ing title:`, error);
      toast.error(`Failed to ${status} title`);
    }
  };

  const deleteTitle = async (titleId) => {
    if (!window.confirm('Are you sure you want to delete this title?')) return;

    try {
      await api.delete(`/title-queue/${titleId}`);
      toast.success('Title deleted successfully');
      fetchTitles(); // Refresh the list
    } catch (error) {
      console.error('Error deleting title:', error);
      toast.error('Failed to delete title');
    }
  };

  if (loading) {
    return (
      <TitleQueueContainer>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader className="animate-spin" size={32} />
          <p>Loading title queue...</p>
        </div>
      </TitleQueueContainer>
    );
  }

  return (
    <TitleQueueContainer>
      <Header>
        <BackButton as={Link} to="/campaigns" variant="ghost">
          <ArrowLeft size={20} />
          Back to Campaigns
        </BackButton>
        <Title>Title Queue</Title>
      </Header>

      {campaign && (
        <CampaignInfo>
          <CampaignTitle>{campaign.topic}</CampaignTitle>
          <CampaignContext>{campaign.context}</CampaignContext>
        </CampaignInfo>
      )}

      <Actions>
        <GenerateButton
          onClick={generateTitles}
          disabled={generating}
          variant="primary"
        >
          {generating ? (
            <>
              <Loader className="animate-spin" size={16} />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Generate 5 Titles
            </>
          )}
        </GenerateButton>
      </Actions>

      <AddTitleForm onSubmit={addTitle}>
        <FormGroup style={{ flex: 1 }}>
          <Label htmlFor="newTitle">Add Custom Title</Label>
          <TitleInput
            id="newTitle"
            type="text"
            placeholder="Enter a custom blog post title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={addingTitle}
          />
        </FormGroup>
        <Button
          type="submit"
          disabled={!newTitle.trim() || addingTitle}
          variant="outline"
        >
          {addingTitle ? (
            <Loader className="animate-spin" size={16} />
          ) : (
            <Plus size={16} />
          )}
          Add Title
        </Button>
      </AddTitleForm>

      {titles.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📝</EmptyIcon>
          <EmptyTitle>No titles in queue</EmptyTitle>
          <EmptyDescription>
            Generate some titles or add your own to get started.
          </EmptyDescription>
        </EmptyState>
      ) : (
        <TitlesList>
          {titles.map((title) => (
            <TitleItem key={title.id}>
              <TitleText>{title.title}</TitleText>
              <TitleStatus status={title.status}>
                {title.status}
              </TitleStatus>
              <TitleActions>
                {title.status === 'pending' && (
                  <>
                    <ActionButton
                      onClick={() => updateTitleStatus(title.id, 'approved')}
                      variant="success"
                      size="small"
                      title="Approve title"
                    >
                      <Check size={16} />
                    </ActionButton>
                    <ActionButton
                      onClick={() => updateTitleStatus(title.id, 'rejected')}
                      variant="error"
                      size="small"
                      title="Reject title"
                    >
                      <X size={16} />
                    </ActionButton>
                  </>
                )}
                <ActionButton
                  onClick={() => deleteTitle(title.id)}
                  variant="ghost"
                  size="small"
                  title="Delete title"
                >
                  <Trash2 size={16} />
                </ActionButton>
              </TitleActions>
            </TitleItem>
          ))}
        </TitlesList>
      )}
    </TitleQueueContainer>
  );
};

export default TitleQueue;

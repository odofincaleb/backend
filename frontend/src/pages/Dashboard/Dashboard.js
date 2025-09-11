import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  Target, 
  Globe, 
  FileText, 
  TrendingUp, 
  Clock, 
  // CheckCircle,
  // AlertCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button } from '../../styles/GlobalStyles';
import { Link } from 'react-router-dom';
import { campaignsAPI, wordpressAPI } from '../../services/api';

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const WelcomeSection = styled.div`
  margin-bottom: 2rem;
`;

const WelcomeTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;
`;

const WelcomeSubtitle = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color};

  svg {
    width: 24px;
    height: 24px;
  }
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ActionCard = styled(Card)`
  padding: 1.5rem;
  text-align: center;
`;

const ActionIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${props => props.color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color};
  margin: 0 auto 1rem;

  svg {
    width: 32px;
    height: 32px;
  }
`;

const ActionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;
`;

const ActionDescription = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const RecentActivity = styled(Card)`
  padding: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 1rem;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.theme.colors.surfaceHover};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const ActivityIcon = styled.div`
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

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle = styled.div`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.25rem;
`;

const ActivityTime = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textMuted};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${props => props.theme.colors.textMuted};
`;

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    campaigns: 0,
    wordpressSites: 0,
    postsPublished: 0,
    postsThisMonth: 0,
  });
  const [, setLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch campaigns and WordPress sites in parallel
      const [campaignsResponse, sitesResponse] = await Promise.all([
        campaignsAPI.getCampaigns(),
        wordpressAPI.getSites()
      ]);

      const campaigns = campaignsResponse.data.campaigns || [];
      const sites = sitesResponse.data.sites || [];

      // Calculate stats
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const totalPosts = campaigns.reduce((sum, c) => sum + (c.postsPublished || 0), 0);

      setStats({
        campaigns: activeCampaigns,
        wordpressSites: sites.length,
        postsPublished: totalPosts,
        postsThisMonth: user?.postsPublishedThisMonth || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Refresh stats when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchDashboardStats]);

  const [recentActivity, setRecentActivity] = useState([]);

  const fetchRecentActivity = async () => {
    try {
      // For now, we'll create activity based on campaigns
      const campaignsResponse = await campaignsAPI.getCampaigns();
      const campaigns = campaignsResponse.data.campaigns || [];
      
      const activity = campaigns.map(campaign => ({
        id: campaign.id,
        type: 'campaign_created',
        title: `Campaign "${campaign.topic}" created`,
        time: new Date(campaign.createdAt).toLocaleString(),
        icon: <Target />,
        color: '#6366f1'
      }));

      setRecentActivity(activity.slice(0, 5)); // Show last 5 activities
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  return (
    <DashboardContainer>
      <WelcomeSection>
        <WelcomeTitle>
          Welcome back, {user?.firstName}! 👋
        </WelcomeTitle>
        <WelcomeSubtitle>
          Here's what's happening with your content campaigns today.
        </WelcomeSubtitle>
      </WelcomeSection>

      <StatsGrid>
        <StatCard>
          <StatIcon color="#6366f1">
            <Target />
          </StatIcon>
          <StatContent>
            <StatValue>{stats.campaigns}</StatValue>
            <StatLabel>Active Campaigns</StatLabel>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon color="#10b981">
            <Globe />
          </StatIcon>
          <StatContent>
            <StatValue>{stats.wordpressSites}</StatValue>
            <StatLabel>WordPress Sites</StatLabel>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon color="#f59e0b">
            <FileText />
          </StatIcon>
          <StatContent>
            <StatValue>{stats.postsPublished}</StatValue>
            <StatLabel>Total Posts Published</StatLabel>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon color="#8b5cf6">
            <TrendingUp />
          </StatIcon>
          <StatContent>
            <StatValue>{stats.postsThisMonth}</StatValue>
            <StatLabel>Posts This Month</StatLabel>
          </StatContent>
        </StatCard>
      </StatsGrid>

      <QuickActions>
        <ActionCard>
          <ActionIcon color="#6366f1">
            <Plus />
          </ActionIcon>
          <ActionTitle>Create Campaign</ActionTitle>
          <ActionDescription>
            Set up a new AI-powered content campaign to automatically generate and publish blog posts.
          </ActionDescription>
          <Button as={Link} to="/campaigns/create" variant="primary" fullWidth>
            Create Campaign
          </Button>
        </ActionCard>

        <ActionCard>
          <ActionIcon color="#10b981">
            <Globe />
          </ActionIcon>
          <ActionTitle>Add WordPress Site</ActionTitle>
          <ActionDescription>
            Connect your WordPress site to start publishing content automatically.
          </ActionDescription>
          <Button as={Link} to="/wordpress" variant="outline" fullWidth>
            Add Site
          </Button>
        </ActionCard>
      </QuickActions>

      <RecentActivity>
        <SectionTitle>Recent Activity</SectionTitle>
        {recentActivity.length > 0 ? (
          <ActivityList>
            {recentActivity.map((activity, index) => (
              <ActivityItem key={index}>
                <ActivityIcon color={activity.color}>
                  {activity.icon}
                </ActivityIcon>
                <ActivityContent>
                  <ActivityTitle>{activity.title}</ActivityTitle>
                  <ActivityTime>{activity.time}</ActivityTime>
                </ActivityContent>
              </ActivityItem>
            ))}
          </ActivityList>
        ) : (
          <EmptyState>
            <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No recent activity yet. Create your first campaign to get started!</p>
          </EmptyState>
        )}
      </RecentActivity>
    </DashboardContainer>
  );
};

export default Dashboard;

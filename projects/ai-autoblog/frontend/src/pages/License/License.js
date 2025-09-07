import React from 'react';
import styled from 'styled-components';
import { Key, CheckCircle, AlertCircle, Star, Crown, Check } from 'lucide-react';
import { Card, Button, Badge } from '../../styles/GlobalStyles';
import { useAuth } from '../../contexts/AuthContext';

const LicenseContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 2rem;
`;

const CurrentPlan = styled(Card)`
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
`;

const PlanIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: ${props => props.color};

  svg {
    width: 40px;
    height: 40px;
  }
`;

const PlanName = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;
`;

const PlanDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 1.5rem;
`;

const PlanBadge = styled(Badge)`
  margin-bottom: 1.5rem;
`;

const UsageStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const UsageItem = styled.div`
  text-align: center;
  padding: 1rem;
  background: ${props => props.theme.colors.surfaceHover};
  border-radius: 8px;
`;

const UsageValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.25rem;
`;

const UsageLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const PlanCard = styled(Card)`
  padding: 2rem;
  text-align: center;
  position: relative;
  ${props => props.featured && `
    border: 2px solid ${props.theme.colors.primary};
    transform: scale(1.05);
  `}
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: 0.25rem 1rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const PlanFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
  text-align: left;
`;

const PlanFeature = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};

  svg {
    width: 16px;
    height: 16px;
    color: ${props => props.theme.colors.success};
  }
`;

const LicenseForm = styled(Card)`
  padding: 2rem;
`;

const FormTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 1rem;
`;

const FormDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 1.5rem;
`;

const License = () => {
  const { user } = useAuth();

  const plans = [
    {
      id: 'trial',
      name: 'Free Trial',
      price: 'Free',
      description: 'Perfect for trying out Fiddy AutoPublisher',
      icon: Key,
      color: '#6b7280',
      features: [
        '5 posts (one-time)',
        'All AI features',
        'Uses internal API keys',
        '1 active campaign',
        'Basic support'
      ],
      current: user?.subscriptionTier === 'trial'
    },
    {
      id: 'hobbyist',
      name: 'Hobbyist',
      price: '$29/month',
      description: 'Great for personal blogs and small projects',
      icon: Star,
      color: '#10b981',
      features: [
        '25 posts per month',
        'All AI features',
        'Your own API keys',
        '1 active campaign',
        'Basic email support'
      ],
      current: user?.subscriptionTier === 'hobbyist',
      featured: true
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$99/month',
      description: 'Perfect for agencies and content teams',
      icon: Crown,
      color: '#6366f1',
      features: [
        'Unlimited posts',
        'All AI features',
        'Your own API keys',
        'Up to 10 campaigns',
        'Priority support',
        'Advanced analytics'
      ],
      current: user?.subscriptionTier === 'professional'
    }
  ];

  const getCurrentPlan = () => {
    return plans.find(plan => plan.current) || plans[0];
  };

  const currentPlan = getCurrentPlan();

  return (
    <LicenseContainer>
      <Title>License & Subscription</Title>

      <CurrentPlan>
        <PlanIcon color={currentPlan.color}>
          <currentPlan.icon />
        </PlanIcon>
        <PlanName>{currentPlan.name}</PlanName>
        <PlanDescription>{currentPlan.description}</PlanDescription>
        <PlanBadge variant={currentPlan.id === 'trial' ? 'warning' : 'success'}>
          Current Plan
        </PlanBadge>

        <UsageStats>
          <UsageItem>
            <UsageValue>{user?.totalPostsPublished || 0}</UsageValue>
            <UsageLabel>Total Posts</UsageLabel>
          </UsageItem>
          <UsageItem>
            <UsageValue>{user?.postsPublishedThisMonth || 0}</UsageValue>
            <UsageLabel>This Month</UsageLabel>
          </UsageItem>
          <UsageItem>
            <UsageValue>{user?.maxConcurrentCampaigns || 1}</UsageValue>
            <UsageLabel>Max Campaigns</UsageLabel>
          </UsageItem>
        </UsageStats>
      </CurrentPlan>

      <PlansGrid>
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <PlanCard key={plan.id} featured={plan.featured}>
              {plan.featured && <FeaturedBadge>Most Popular</FeaturedBadge>}
              
              <PlanIcon color={plan.color}>
                <Icon />
              </PlanIcon>
              
              <PlanName>{plan.name}</PlanName>
              <PlanDescription>{plan.description}</PlanDescription>
              
              <div style={{ fontSize: '2rem', fontWeight: '700', color: plan.color, margin: '1rem 0' }}>
                {plan.price}
              </div>

              <PlanFeatures>
                {plan.features.map((feature, index) => (
                  <PlanFeature key={index}>
                    <Check />
                    {feature}
                  </PlanFeature>
                ))}
              </PlanFeatures>

              <Button 
                variant={plan.current ? 'outline' : 'primary'} 
                fullWidth
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </Button>
            </PlanCard>
          );
        })}
      </PlansGrid>

      <LicenseForm>
        <FormTitle>Activate License Key</FormTitle>
        <FormDescription>
          Have a license key? Enter it below to activate your subscription.
        </FormDescription>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Enter your license key"
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}
          />
          <Button variant="primary">Activate</Button>
        </div>
      </LicenseForm>
    </LicenseContainer>
  );
};

export default License;

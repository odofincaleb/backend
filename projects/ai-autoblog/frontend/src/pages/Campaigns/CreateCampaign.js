import React from 'react';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../styles/GlobalStyles';
import { Link } from 'react-router-dom';

const CreateCampaignContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
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

const Content = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${props => props.theme.colors.textMuted};
`;

const CreateCampaign = () => {
  return (
    <CreateCampaignContainer>
      <Header>
        <BackButton as={Link} to="/campaigns" variant="ghost">
          <ArrowLeft size={20} />
          Back to Campaigns
        </BackButton>
        <Title>Create Campaign</Title>
      </Header>

      <Content>
        <h2>Campaign Creation Form</h2>
        <p>This page will contain the campaign creation form with all the fields mentioned in the project brief.</p>
        <p>Coming soon in the next development phase!</p>
      </Content>
    </CreateCampaignContainer>
  );
};

export default CreateCampaign;


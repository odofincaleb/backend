import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { Button, Input, Label, FormGroup, Select, TextArea, ErrorMessage } from '../../styles/GlobalStyles';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { campaignsAPI, wordpressAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import ContentTypeSelector from '../../components/ContentTypes/ContentTypeSelector';

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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const ImperfectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ImperfectionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: ${props => props.theme.colors.surfaceHover};
  border-radius: 6px;
`;

const AddImperfectionButton = styled(Button)`
  align-self: flex-start;
  margin-top: 0.5rem;
`;

const CreateCampaign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [wordpressSites, setWordpressSites] = useState([]);
  const [imperfectionList, setImperfectionList] = useState([]);
  const [contentTypes, setContentTypes] = useState({});
  const [selectedContentTypes, setSelectedContentTypes] = useState([]);
  const [contentTypeVariables, setContentTypeVariables] = useState({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm({
    defaultValues: {
      topic: '',
      context: '',
      tone_of_voice: 'conversational',
      writing_style: 'pas',
      scheduleHours: '24.00',
      numberOfTitles: 5,
      wordpress_site_id: '',
      imperfection_list: []
    }
  });

  useEffect(() => {
    fetchWordpressSites();
    fetchContentTypes();
    if (isEditing) {
      fetchCampaign();
    }
  }, [id, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWordpressSites = async () => {
    try {
      const response = await wordpressAPI.getSites();
      setWordpressSites(response.data.sites || []);
    } catch (error) {
      toast.error('Failed to fetch WordPress sites');
      console.error('Error fetching WordPress sites:', error);
    }
  };

  const fetchContentTypes = async () => {
    try {
      const response = await campaignsAPI.getContentTypes();
      setContentTypes(response.data.contentTypes || {});
    } catch (error) {
      console.error('Error fetching content types:', error);
    }
  };

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCampaign(id);
      const campaign = response.data.campaign;

      // Map API response to form fields
      const formData = {
        topic: campaign.topic,
        context: campaign.context,
        tone_of_voice: campaign.toneOfVoice,
        writing_style: campaign.writingStyle,
        scheduleHours: campaign.scheduleHours || 24,
        numberOfTitles: campaign.numberOfTitles || 5,
        wordpress_site_id: campaign.wordpressSite?.id || '',
        imperfection_list: campaign.imperfectionList || []
      };

      Object.keys(formData).forEach(key => {
        setValue(key, formData[key]);
      });

      // Set content types and variables
      setSelectedContentTypes(campaign.contentTypes || []);
      setContentTypeVariables(campaign.contentTypeVariables || {});
      setImperfectionList(formData.imperfection_list);
    } catch (error) {
      toast.error('Failed to fetch campaign');
      console.error('Error fetching campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const addImperfection = () => {
    const newImperfection = prompt('Enter imperfection to avoid:');
    if (newImperfection && newImperfection.trim()) {
      setImperfectionList(prev => [...prev, newImperfection.trim()]);
    }
  };

  const removeImperfection = (index) => {
    setImperfectionList(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Format schedule with 'h' suffix and ensure 2 decimal places
      const scheduleHours = Number(data.scheduleHours);
      if (isNaN(scheduleHours)) {
        throw new Error('Invalid schedule hours');
      }
      const formattedHours = scheduleHours.toFixed(2);
      
      // Map form data to API format
      const campaignData = {
        topic: data.topic,
        context: data.context,
        toneOfVoice: data.tone_of_voice,
        writingStyle: data.writing_style,
        scheduleHours: scheduleHours,
        schedule: `${formattedHours}h`,
        numberOfTitles: parseInt(data.numberOfTitles),
        wordpressSiteId: data.wordpress_site_id || null,
        imperfectionList: imperfectionList,
        contentTypes: selectedContentTypes,
        contentTypeVariables: contentTypeVariables
      };

      if (isEditing) {
        await campaignsAPI.updateCampaign(id, campaignData);
        toast.success('Campaign updated successfully');
      } else {
        await campaignsAPI.createCampaign(campaignData);
        toast.success('Campaign created successfully');
      }

      navigate('/campaigns');
    } catch (error) {
      console.error('Error saving campaign:', error);
      
      // Provide more specific error messages
      if (error.code === 'ERR_NETWORK' || error.message.includes('timeout')) {
        toast.error('Network timeout. Please check your connection and try again.');
      } else if (error.response?.status === 403) {
        // Handle trial limit errors
        const errorData = error.response.data;
        if (errorData.error === 'Campaign limit reached') {
          toast.error(
            `Trial Limit Reached: ${errorData.message}`,
            {
              duration: 6000,
              style: {
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca'
              }
            }
          );
        } else {
          toast.error('Access denied. Please check your permissions.');
        }
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again in a few moments.');
      } else if (error.response?.status === 400) {
        toast.error('Invalid data. Please check your inputs and try again.');
      } else {
        toast.error(isEditing ? 'Failed to update campaign' : 'Failed to create campaign');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <CreateCampaignContainer>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader className="animate-spin" size={32} />
          <p>Loading campaign...</p>
        </div>
      </CreateCampaignContainer>
    );
  }

  return (
    <CreateCampaignContainer>
      <Header>
        <BackButton as={Link} to="/campaigns" variant="ghost">
          <ArrowLeft size={20} />
          Back to Campaigns
        </BackButton>
        <Title>{isEditing ? 'Edit Campaign' : 'Create Campaign'}</Title>
      </Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Label htmlFor="topic">Campaign Topic *</Label>
          <Input
            id="topic"
            type="text"
            placeholder="e.g., AI and Machine Learning, Web Development, Digital Marketing"
            {...register('topic', { required: 'Topic is required' })}
          />
          {errors.topic && <ErrorMessage>{errors.topic.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="context">Content Context *</Label>
          <TextArea
            id="context"
            placeholder="Describe the context, target audience, and content focus for this campaign..."
            rows={4}
            {...register('context', { required: 'Context is required' })}
          />
          {errors.context && <ErrorMessage>{errors.context.message}</ErrorMessage>}
        </FormGroup>

        <FormRow>
          <FormGroup>
            <Label htmlFor="tone_of_voice">Tone of Voice</Label>
            <Select id="tone_of_voice" {...register('tone_of_voice')}>
              <option value="conversational">Conversational</option>
              <option value="formal">Formal</option>
              <option value="humorous">Humorous</option>
              <option value="storytelling">Storytelling</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="writing_style">Writing Style</Label>
            <Select id="writing_style" {...register('writing_style')}>
              <option value="pas">Problem-Agitation-Solution (PAS)</option>
              <option value="aida">Attention-Interest-Desire-Action (AIDA)</option>
              <option value="listicle">Listicle</option>
            </Select>
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup>
            <Label htmlFor="scheduleHours">Publishing Schedule (Hours)</Label>
            <Input
              id="scheduleHours"
              type="text"
              placeholder="e.g., 0.10, 0.50, 1.00, 24.00"
              {...register('scheduleHours', { 
                required: 'Schedule is required',
                pattern: {
                  value: /^\d+\.\d{2}$/,
                  message: 'Please use format like 0.10, 0.50, 1.00, 24.00'
                },
                validate: {
                  isNumber: value => !isNaN(value) || 'Must be a valid number',
                  minValue: value => Number(value) >= 0.1 || 'Minimum is 0.1 hours (6 minutes)',
                  maxValue: value => Number(value) <= 168 || 'Maximum is 168 hours (1 week)',
                  format: value => /^\d+\.\d{2}$/.test(value) || 'Must have exactly 2 decimal places'
                }
              })}
            />
            {errors.scheduleHours && <ErrorMessage>{errors.scheduleHours.message}</ErrorMessage>}
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
              Enter hours with exactly 2 decimal places (e.g., 0.10 for 6 minutes, 0.50 for 30 minutes, 1.00 for 1 hour, 24.00 for daily)
            </p>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="numberOfTitles">Number of Titles to Generate</Label>
            <Input
              id="numberOfTitles"
              type="number"
              min="1"
              max="20"
              placeholder="e.g., 5, 10, 15"
              {...register('numberOfTitles', { 
                required: 'Number of titles is required',
                min: { value: 1, message: 'Minimum is 1 title' },
                max: { value: 20, message: 'Maximum is 20 titles' }
              })}
            />
            {errors.numberOfTitles && <ErrorMessage>{errors.numberOfTitles.message}</ErrorMessage>}
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
              AI will generate this many titles for you to review and approve
            </p>
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup>
            <Label htmlFor="wordpress_site_id">WordPress Site *</Label>
            <Select 
              id="wordpress_site_id" 
              {...register('wordpress_site_id', { required: 'WordPress site is required' })}
            >
              <option value="">Select a WordPress site</option>
              {wordpressSites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.siteName} ({site.siteUrl})
                </option>
              ))}
            </Select>
            {errors.wordpress_site_id && <ErrorMessage>{errors.wordpress_site_id.message}</ErrorMessage>}
          </FormGroup>
        </FormRow>

        <ContentTypeSelector
          selectedTypes={selectedContentTypes}
          onTypesChange={setSelectedContentTypes}
          variables={contentTypeVariables}
          onVariablesChange={setContentTypeVariables}
          availableTypes={contentTypes}
        />

        <FormGroup>
          <Label>Imperfection List</Label>
          <ImperfectionList>
            {imperfectionList.map((imperfection, index) => (
              <ImperfectionItem key={index}>
                <span>{imperfection}</span>
                <Button
                  type="button"
                  size="small"
                  variant="ghost"
                  onClick={() => removeImperfection(index)}
                >
                  ×
                </Button>
              </ImperfectionItem>
            ))}
            <AddImperfectionButton
              type="button"
              variant="outline"
              onClick={addImperfection}
            >
              + Add Imperfection
            </AddImperfectionButton>
          </ImperfectionList>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
            List things to avoid in generated content (e.g., "grammar errors", "typos", "repetitive phrases")
          </p>
        </FormGroup>

        <FormActions>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/campaigns')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={16} />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditing ? 'Update Campaign' : 'Create Campaign'}
              </>
            )}
          </Button>
        </FormActions>
      </Form>
    </CreateCampaignContainer>
  );
};

export default CreateCampaign;


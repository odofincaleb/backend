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
  const [loadingContentTypes, setLoadingContentTypes] = useState(true);

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
      setLoadingContentTypes(true);
      const response = await campaignsAPI.getContentTypes();
      if (response.data.success && response.data.contentTypes) {
        setContentTypes(response.data.contentTypes);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching content types:', error);
      toast.error('Failed to load content types. Please try refreshing the page.');
    } finally {
      setLoadingContentTypes(false);
    }
  };

  const fetchCampaign = async () => {
    try {
      const response = await campaignsAPI.getCampaign(id);
      const campaign = response.data.campaign;

      // Set form values
      setValue('topic', campaign.topic);
      setValue('context', campaign.context);
      setValue('tone_of_voice', campaign.tone_of_voice);
      setValue('writing_style', campaign.writing_style);
      setValue('scheduleHours', campaign.schedule_hours.toFixed(2));
      setValue('numberOfTitles', campaign.number_of_titles);
      setValue('wordpress_site_id', campaign.wordpress_site_id || '');

      // Set other state
      setImperfectionList(campaign.imperfection_list || []);
      setSelectedContentTypes(campaign.content_types || []);
      setContentTypeVariables(campaign.content_type_variables || {});
    } catch (error) {
      toast.error('Failed to fetch campaign');
      console.error('Error fetching campaign:', error);
      navigate('/campaigns');
    }
  };

  const addImperfection = () => {
    setImperfectionList(prev => [...prev, '']);
  };

  const updateImperfection = (index, value) => {
    setImperfectionList(prev => {
      const newList = [...prev];
      newList[index] = value;
      return newList;
    });
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
        imperfectionList: imperfectionList.filter(Boolean), // Remove empty strings
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
      
      // Show error message from API or fallback
      const errorMessage = error.message || (isEditing ? 'Failed to update campaign' : 'Failed to create campaign');
      
      // Show error with appropriate styling
      toast.error(errorMessage, {
        duration: 6000,
        style: error.response?.status === 403 ? {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca'
        } : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Loader className="animate-spin" size={24} />
        <p>Loading campaign...</p>
      </div>
    );
  }

  return (
    <CreateCampaignContainer>
      <Header>
        <BackButton
          as={Link}
          to="/campaigns"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back to Campaigns
        </BackButton>
        <Title>{isEditing ? 'Edit Campaign' : 'Create Campaign'}</Title>
      </Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Label>Campaign Topic *</Label>
          <Input
            type="text"
            placeholder="e.g., AI and Machine Learning, Web Development, Digital Marketing"
            {...register('topic', { required: 'Topic is required' })}
            error={errors.topic?.message}
          />
          {errors.topic && <ErrorMessage>{errors.topic.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Content Context *</Label>
          <TextArea
            placeholder="Describe the context, target audience, and content focus for this campaign..."
            rows={4}
            {...register('context', { required: 'Context is required' })}
            error={errors.context?.message}
          />
          {errors.context && <ErrorMessage>{errors.context.message}</ErrorMessage>}
        </FormGroup>

        <FormRow>
          <FormGroup>
            <Label>Tone of Voice</Label>
            <Select {...register('tone_of_voice')}>
              <option value="conversational">Conversational</option>
              <option value="formal">Formal</option>
              <option value="humorous">Humorous</option>
              <option value="storytelling">Storytelling</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Writing Style</Label>
            <Select {...register('writing_style')}>
              <option value="pas">Problem-Agitation-Solution (PAS)</option>
              <option value="aida">Attention-Interest-Desire-Action (AIDA)</option>
              <option value="listicle">Listicle</option>
            </Select>
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup>
            <Label>Publishing Schedule (Hours)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.10"
              max="168.00"
              {...register('scheduleHours', {
                required: 'Schedule is required',
                min: {
                  value: 0.10,
                  message: 'Minimum schedule is 0.10 hours (6 minutes)'
                },
                max: {
                  value: 168.00,
                  message: 'Maximum schedule is 168.00 hours (7 days)'
                }
              })}
              error={errors.scheduleHours?.message}
            />
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
              Enter hours with exactly 2 decimal places (e.g., 0.10 for 6 minutes, 0.50 for 30 minutes, 1.00 for 1 hour, 24.00 for daily)
            </p>
            {errors.scheduleHours && <ErrorMessage>{errors.scheduleHours.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label>Number of Titles to Generate</Label>
            <Input
              type="number"
              min="1"
              max="20"
              {...register('numberOfTitles', {
                required: 'Number of titles is required',
                min: {
                  value: 1,
                  message: 'Minimum is 1 title'
                },
                max: {
                  value: 20,
                  message: 'Maximum is 20 titles'
                }
              })}
              error={errors.numberOfTitles?.message}
            />
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
              AI will generate this many titles for you to review and approve
            </p>
            {errors.numberOfTitles && <ErrorMessage>{errors.numberOfTitles.message}</ErrorMessage>}
          </FormGroup>
        </FormRow>

        <FormGroup>
          <Label>WordPress Site *</Label>
          <Select {...register('wordpress_site_id')}>
            <option value="">Select a WordPress Site</option>
            {wordpressSites.map(site => (
              <option key={site.id} value={site.id}>
                {site.site_name} ({site.site_url})
              </option>
            ))}
          </Select>
        </FormGroup>

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
                <Input
                  type="text"
                  value={imperfection}
                  onChange={(e) => updateImperfection(index, e.target.value)}
                  placeholder="e.g., grammar errors, typos, repetitive phrases"
                />
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
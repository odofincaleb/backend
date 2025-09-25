import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { contentAPI, titleQueueAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './ContentGeneration.css';

const ContentGeneration = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState(null);
  const [titles, setTitles] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [contentOptions, setContentOptions] = useState({
    contentType: 'blog-post',
    wordCount: 1000,
    tone: 'conversational',
    includeKeywords: true,
    includeImages: false
  });

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch titles and content in parallel
      const [titlesResponse, contentResponse] = await Promise.all([
        titleQueueAPI.getByCampaign(campaignId),
        contentAPI.getByCampaign(campaignId)
      ]);

      setTitles(titlesResponse.data.titles || []);
      setContent(contentResponse.data.content || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!selectedTitle) {
      toast.error('Please select a title');
      return;
    }

    try {
      setGenerating(true);
      
      const contentData = {
        campaignId,
        titleId: selectedTitle,
        ...contentOptions
      };

      const response = await contentAPI.generate(contentData);
      
      toast.success('Content generated successfully!');
      setContent(prev => [response.data.content, ...prev]);
      
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error(error.response?.data?.message || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (contentId, status) => {
    try {
      await contentAPI.updateStatus(contentId, status);
      toast.success(`Content ${status} successfully`);
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update content status');
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      await contentAPI.delete(contentId);
      toast.success('Content deleted successfully');
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      generated: 'status-generated',
      approved: 'status-approved',
      rejected: 'status-rejected',
      published: 'status-published'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-generated'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="content-generation">
      <div className="content-header">
        <h1>Content Generation</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/campaigns')}
        >
          ← Back to Campaigns
        </button>
      </div>

      <div className="content-layout">
        {/* Generation Panel */}
        <div className="generation-panel">
          <h2>Generate New Content</h2>
          
          <div className="form-group">
            <label htmlFor="title-select">Select Title:</label>
            <select
              id="title-select"
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              className="form-control"
            >
              <option value="">Choose a title...</option>
              {titles.map(title => (
                <option key={title.id} value={title.id}>
                  {title.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="content-type">Content Type:</label>
              <select
                id="content-type"
                value={contentOptions.contentType}
                onChange={(e) => setContentOptions(prev => ({
                  ...prev,
                  contentType: e.target.value
                }))}
                className="form-control"
              >
                <option value="blog-post">Blog Post</option>
                <option value="how-to">How-to Guide</option>
                <option value="listicle">Listicle</option>
                <option value="case-study">Case Study</option>
                <option value="newsletter">Newsletter</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="word-count">Word Count:</label>
              <input
                type="number"
                id="word-count"
                value={contentOptions.wordCount}
                onChange={(e) => setContentOptions(prev => ({
                  ...prev,
                  wordCount: parseInt(e.target.value)
                }))}
                min="100"
                max="5000"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tone">Tone:</label>
              <select
                id="tone"
                value={contentOptions.tone}
                onChange={(e) => setContentOptions(prev => ({
                  ...prev,
                  tone: e.target.value
                }))}
                className="form-control"
              >
                <option value="conversational">Conversational</option>
                <option value="formal">Formal</option>
                <option value="humorous">Humorous</option>
                <option value="storytelling">Storytelling</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={contentOptions.includeKeywords}
                onChange={(e) => setContentOptions(prev => ({
                  ...prev,
                  includeKeywords: e.target.checked
                }))}
              />
              Include SEO Keywords
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={contentOptions.includeImages}
                onChange={(e) => setContentOptions(prev => ({
                  ...prev,
                  includeImages: e.target.checked
                }))}
              />
              Generate Featured Image
            </label>
          </div>

          <button
            className="btn btn-primary btn-large"
            onClick={handleGenerateContent}
            disabled={!selectedTitle || generating}
          >
            {generating ? 'Generating...' : 'Generate Content'}
          </button>
        </div>

        {/* Content List */}
        <div className="content-list">
          <h2>Generated Content ({content.length})</h2>
          
          {content.length === 0 ? (
            <div className="empty-state">
              <p>No content generated yet. Create your first piece of content!</p>
            </div>
          ) : (
            <div className="content-items">
              {content.map(item => (
                <div key={item.id} className="content-item">
                  <div className="content-header">
                    <h3>{item.title}</h3>
                    <div className="content-meta">
                      {getStatusBadge(item.status)}
                      <span className="word-count">{item.wordCount} words</span>
                    </div>
                  </div>
                  
                  <div className="content-details">
                    <p><strong>Type:</strong> {item.contentType}</p>
                    <p><strong>Tone:</strong> {item.tone}</p>
                    {item.keywords && item.keywords.length > 0 && (
                      <p><strong>Keywords:</strong> {item.keywords.join(', ')}</p>
                    )}
                  </div>
                  
                  <div className="content-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleStatusUpdate(item.id, 'approved')}
                      disabled={item.status === 'approved'}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleStatusUpdate(item.id, 'rejected')}
                      disabled={item.status === 'rejected'}
                    >
                      Reject
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteContent(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentGeneration;

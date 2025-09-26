import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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

  // Remove individual content generation - this should only be done from Campaign section
  // Users should go back to Campaign -> Title Queue -> Generate Content for approved titles

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
        {/* Instructions Panel */}
        <div className="generation-panel">
          <h2>Content Management</h2>
          <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>How to Generate New Content:</h3>
            <ol style={{ margin: '0', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
              <li>Go to <strong>Campaigns</strong> page</li>
              <li>Click on your campaign</li>
              <li>Go to <strong>Title Queue</strong> section</li>
              <li>Approve the titles you want</li>
              <li>Click <strong>"Generate Content"</strong> button</li>
            </ol>
            <p style={{ margin: '1rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
              <strong>Note:</strong> Content generation is only available from the Campaign section to ensure proper workflow.
            </p>
          </div>
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

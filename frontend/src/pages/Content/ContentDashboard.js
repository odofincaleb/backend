import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Spinner, Alert } from 'react-bootstrap';
import { contentAPI, campaignsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ContentDashboard = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
      fetchJobs();
      fetchContent();
    }
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCampaign = async () => {
    try {
      const response = await campaignsAPI.getById(campaignId);
      setCampaign(response.data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
    }
  };

  const fetchJobs = async () => {
    try {
      setRefreshing(true);
      const response = await contentAPI.getJobs(campaignId);
      setJobs(response.data.jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load content jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchContent = async () => {
    try {
      const response = await contentAPI.getPublishingStatus(campaignId);
      setContent(response.data.content);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content status');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'in_progress': 'warning',
      'completed': 'success',
      'failed': 'danger',
      'pending': 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleViewContent = (job) => {
    if (job.status === 'completed') {
      navigate(`/content/${campaignId}/job/${job.id}`);
    } else {
      toast.error('Content is still being generated. Please wait.');
    }
  };

  const handleRefresh = () => {
    fetchJobs();
    fetchContent();
  };

  const handleReview = async (contentId, action, notes = '') => {
    try {
      await contentAPI.reviewContent(contentId, { action, notes });
      toast.success(`Content ${action}d successfully`);
      fetchContent(); // Refresh content status
    } catch (error) {
      console.error('Error reviewing content:', error);
      toast.error(`Failed to ${action} content`);
    }
  };

  const getPublishingStatusBadge = (status) => {
    const variants = {
      'published': 'success',
      'approved': 'info',
      'rejected': 'danger',
      'pending': 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const processingJobs = jobs.filter(job => job.status === 'in_progress');
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Content Dashboard</h2>
              {campaign && (
                <p className="text-muted mb-0">Campaign: {campaign.topic}</p>
              )}
            </div>
            <div>
              <Button 
                variant="outline-primary" 
                onClick={handleRefresh}
                disabled={refreshing}
                className="me-2"
              >
                {refreshing ? <Spinner size="sm" /> : '🔄'} Refresh
              </Button>
              <Button 
                variant="primary" 
                onClick={() => navigate(`/campaigns/${campaignId}/titles`)}
              >
                ← Back to Titles
              </Button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="row mb-4">
            <div className="col-md-3">
              <Card className="text-center">
                <Card.Body>
                  <h5 className="text-warning">{processingJobs.length}</h5>
                  <p className="mb-0">Processing</p>
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="text-center">
                <Card.Body>
                  <h5 className="text-success">{completedJobs.length}</h5>
                  <p className="mb-0">Completed</p>
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="text-center">
                <Card.Body>
                  <h5 className="text-danger">{failedJobs.length}</h5>
                  <p className="mb-0">Failed</p>
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="text-center">
                <Card.Body>
                  <h5 className="text-primary">{jobs.length}</h5>
                  <p className="mb-0">Total Jobs</p>
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* Processing Jobs Alert */}
          {processingJobs.length > 0 && (
            <Alert variant="info" className="mb-4">
              <Alert.Heading>🔄 Content Generation in Progress</Alert.Heading>
              <p>
                {processingJobs.length} content piece{processingJobs.length > 1 ? 's' : ''} {processingJobs.length > 1 ? 'are' : 'is'} being generated in the background. 
                This may take 2-3 minutes per article. The page will auto-refresh to show updates.
              </p>
            </Alert>
          )}

          {/* Tabs */}
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <div className="nav nav-tabs border-0" role="tablist">
                  <button 
                    className={`nav-link ${activeTab === 'jobs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('jobs')}
                  >
                    Generation Jobs
                  </button>
                  <button 
                    className={`nav-link ${activeTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveTab('content')}
                  >
                    Content Review
                  </button>
                </div>
                <Button 
                  variant="outline-primary" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  size="sm"
                >
                  {refreshing ? <Spinner size="sm" /> : '🔄'} Refresh
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {activeTab === 'jobs' ? (
                jobs.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No content generation jobs found.</p>
                    <Button 
                      variant="primary" 
                      onClick={() => navigate(`/campaigns/${campaignId}/titles`)}
                    >
                      Go to Title Queue
                    </Button>
                  </div>
                ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Completed</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id}>
                          <td>
                            <div className="fw-bold">{job.title}</div>
                            {job.error_message && (
                              <small className="text-danger">{job.error_message}</small>
                            )}
                          </td>
                          <td>{getStatusBadge(job.status)}</td>
                          <td>{formatDate(job.created_at)}</td>
                          <td>{formatDate(job.completed_at)}</td>
                          <td>
                            {job.status === 'completed' ? (
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => handleViewContent(job)}
                              >
                                View Content
                              </Button>
                            ) : job.status === 'processing' ? (
                              <div className="d-flex align-items-center">
                                <Spinner size="sm" className="me-2" />
                                <span className="text-muted">Generating...</span>
                              </div>
                            ) : (
                              <span className="text-muted">No actions available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )
              ) : (
                // Content Review Tab
                content.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No content available for review.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Publishing Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="fw-bold">{item.title}</div>
                              {item.review_notes && (
                                <small className="text-muted">{item.review_notes}</small>
                              )}
                            </td>
                            <td>{getStatusBadge(item.status)}</td>
                            <td>{getPublishingStatusBadge(item.publishing_status)}</td>
                            <td>{formatDate(item.created_at)}</td>
                            <td>
                              {item.status === 'completed' && item.publishing_status === 'pending' ? (
                                <div className="btn-group" role="group">
                                  <Button 
                                    variant="outline-success" 
                                    size="sm"
                                    onClick={() => handleReview(item.id, 'approve')}
                                  >
                                    ✓ Approve
                                  </Button>
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={() => handleReview(item.id, 'reject')}
                                  >
                                    ✗ Reject
                                  </Button>
                                </div>
                              ) : item.publishing_status === 'approved' ? (
                                <span className="text-info">✓ Approved (Scheduled)</span>
                              ) : item.publishing_status === 'published' ? (
                                <span className="text-success">✓ Published</span>
                              ) : item.publishing_status === 'rejected' ? (
                                <span className="text-danger">✗ Rejected</span>
                              ) : (
                                <span className="text-muted">No actions available</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContentDashboard;

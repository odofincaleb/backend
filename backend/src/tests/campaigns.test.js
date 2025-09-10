const request = require('supertest');
const app = require('../server');
const { setupTestDB, cleanupTestDB, createTestUser, createTestCampaign, createTestWordPressSite, cleanupTestData } = require('./setup');

describe('Campaign Management Endpoints', () => {
  let testUser;
  let authToken;
  let testWordPressSite;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestDB();
  });

  beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser();
    testWordPressSite = await createTestWordPressSite(testUser.id);
    
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    authToken = loginResponse.body.token;
  });

  describe('GET /api/campaigns', () => {
    it('should get empty campaigns list for new user', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.campaigns).toEqual([]);
    });

    it('should get campaigns list with existing campaigns', async () => {
      // Create test campaign
      await createTestCampaign(testUser.id, {
        topic: 'Test Campaign',
        context: 'Test context for campaign'
      });

      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.campaigns).toHaveLength(1);
      expect(response.body.campaigns[0].topic).toBe('Test Campaign');
    });
  });

  describe('POST /api/campaigns', () => {
    it('should create a new campaign successfully', async () => {
      const campaignData = {
        topic: 'Healthy Living',
        context: 'My product is a fitness app that helps people track their workouts and nutrition. The blog aims to attract users by providing practical fitness tips.',
        toneOfVoice: 'conversational',
        writingStyle: 'pas',
        imperfectionList: ['add_personal_opinion'],
        schedule: '24h',
        wordpressSiteId: testWordPressSite.id
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(201);

      expect(response.body.message).toBe('Campaign created successfully');
      expect(response.body.campaign.topic).toBe(campaignData.topic);
      expect(response.body.campaign.context).toBe(campaignData.context);
      expect(response.body.campaign.toneOfVoice).toBe(campaignData.toneOfVoice);
      expect(response.body.campaign.writingStyle).toBe(campaignData.writingStyle);
      expect(response.body.campaign.schedule).toBe(campaignData.schedule);
      expect(response.body.campaign.status).toBe('active');
    });

    it('should fail to create campaign with invalid data', async () => {
      const campaignData = {
        topic: 'A', // Too short
        context: 'Short', // Too short
        toneOfVoice: 'invalid', // Invalid value
        writingStyle: 'invalid', // Invalid value
        schedule: 'invalid' // Invalid value
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should fail to create campaign with non-existent WordPress site', async () => {
      const campaignData = {
        topic: 'Test Topic',
        context: 'Test context for campaign',
        wordpressSiteId: 'non-existent-id'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(404);

      expect(response.body.error).toBe('WordPress site not found');
    });

    it('should fail to create campaign when user reaches campaign limit', async () => {
      // Create user with hobbyist subscription (1 campaign limit)
      const hobbyistUser = await createTestUser({ subscriptionTier: 'hobbyist' });
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: hobbyistUser.email,
          password: hobbyistUser.password
        });
      
      const hobbyistToken = loginResponse.body.token;

      // Create first campaign
      await createTestCampaign(hobbyistUser.id);

      // Try to create second campaign
      const campaignData = {
        topic: 'Second Campaign',
        context: 'This should fail due to campaign limit'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${hobbyistToken}`)
        .send(campaignData)
        .expect(403);

      expect(response.body.error).toBe('Campaign limit reached');
    });
  });

  describe('GET /api/campaigns/:id', () => {
    let testCampaign;

    beforeEach(async () => {
      testCampaign = await createTestCampaign(testUser.id);
    });

    it('should get specific campaign', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.campaign.id).toBe(testCampaign.id);
      expect(response.body.campaign.topic).toBe(testCampaign.topic);
    });

    it('should fail to get non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Campaign not found');
    });

    it('should fail to get campaign belonging to another user', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherCampaign = await createTestCampaign(otherUser.id);

      const response = await request(app)
        .get(`/api/campaigns/${otherCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Campaign not found');
    });
  });

  describe('PUT /api/campaigns/:id', () => {
    let testCampaign;

    beforeEach(async () => {
      testCampaign = await createTestCampaign(testUser.id);
    });

    it('should update campaign successfully', async () => {
      const updateData = {
        topic: 'Updated Topic',
        context: 'Updated context for the campaign',
        toneOfVoice: 'formal'
      };

      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Campaign updated successfully');
      expect(response.body.campaign.topic).toBe(updateData.topic);
      expect(response.body.campaign.context).toBe(updateData.context);
      expect(response.body.campaign.toneOfVoice).toBe(updateData.toneOfVoice);
    });

    it('should fail to update non-existent campaign', async () => {
      const updateData = {
        topic: 'Updated Topic'
      };

      const response = await request(app)
        .put('/api/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Campaign not found');
    });

    it('should fail to update campaign with invalid data', async () => {
      const updateData = {
        topic: 'A', // Too short
        toneOfVoice: 'invalid' // Invalid value
      };

      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('DELETE /api/campaigns/:id', () => {
    let testCampaign;

    beforeEach(async () => {
      testCampaign = await createTestCampaign(testUser.id);
    });

    it('should delete campaign successfully', async () => {
      const response = await request(app)
        .delete(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Campaign deleted successfully');
    });

    it('should fail to delete non-existent campaign', async () => {
      const response = await request(app)
        .delete('/api/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Campaign not found');
    });
  });

  describe('POST /api/campaigns/:id/start', () => {
    let testCampaign;

    beforeEach(async () => {
      testCampaign = await createTestCampaign(testUser.id, { status: 'paused' });
    });

    it('should start campaign successfully', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Campaign started successfully');
    });
  });

  describe('POST /api/campaigns/:id/stop', () => {
    let testCampaign;

    beforeEach(async () => {
      testCampaign = await createTestCampaign(testUser.id, { status: 'active' });
    });

    it('should stop campaign successfully', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/stop`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Campaign stopped successfully');
    });
  });
});


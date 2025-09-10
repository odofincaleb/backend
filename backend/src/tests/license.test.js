const request = require('supertest');
const app = require('../server');
const { setupTestDB, cleanupTestDB, createTestUser, createTestLicenseKey, cleanupTestData } = require('./setup');

describe('License Management Endpoints', () => {
  let testUser;
  let authToken;
  let testLicenseKey;

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
    testLicenseKey = await createTestLicenseKey();
    
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    authToken = loginResponse.body.token;
  });

  describe('POST /api/license/activate', () => {
    it('should activate license key successfully', async () => {
      const response = await request(app)
        .post('/api/license/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licenseKey: testLicenseKey.license_key
        })
        .expect(200);

      expect(response.body.message).toBe('License activated successfully');
      expect(response.body.subscription.tier).toBe(testLicenseKey.subscription_tier);
      expect(response.body.subscription.maxCampaigns).toBe(testLicenseKey.max_campaigns);
      expect(response.body.subscription.postsPerMonth).toBe(testLicenseKey.posts_per_month);
    });

    it('should fail to activate non-existent license key', async () => {
      const response = await request(app)
        .post('/api/license/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licenseKey: 'NON-EXISTENT-KEY'
        })
        .expect(404);

      expect(response.body.error).toBe('Invalid license key');
    });

    it('should fail to activate already used license key', async () => {
      // Mark license as used
      await testPool.query(
        'UPDATE license_keys SET status = $1, user_id = $2 WHERE id = $3',
        ['used', testUser.id, testLicenseKey.id]
      );

      const response = await request(app)
        .post('/api/license/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licenseKey: testLicenseKey.license_key
        })
        .expect(409);

      expect(response.body.error).toBe('License already used');
    });

    it('should fail to activate expired license key', async () => {
      // Mark license as expired
      await testPool.query(
        'UPDATE license_keys SET status = $1 WHERE id = $2',
        ['expired', testLicenseKey.id]
      );

      const response = await request(app)
        .post('/api/license/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licenseKey: testLicenseKey.license_key
        })
        .expect(410);

      expect(response.body.error).toBe('License expired');
    });

    it('should fail to activate revoked license key', async () => {
      // Mark license as revoked
      await testPool.query(
        'UPDATE license_keys SET status = $1 WHERE id = $2',
        ['revoked', testLicenseKey.id]
      );

      const response = await request(app)
        .post('/api/license/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licenseKey: testLicenseKey.license_key
        })
        .expect(403);

      expect(response.body.error).toBe('License revoked');
    });

    it('should fail to activate license when user already has one', async () => {
      // Give user an existing license
      await testPool.query(
        'UPDATE users SET license_key_id = $1 WHERE id = $2',
        [testLicenseKey.id, testUser.id]
      );

      const newLicenseKey = await createTestLicenseKey({ licenseKey: 'NEW-1234-ABCD-5678' });

      const response = await request(app)
        .post('/api/license/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licenseKey: newLicenseKey.license_key
        })
        .expect(409);

      expect(response.body.error).toBe('License already active');
    });
  });

  describe('GET /api/license/status', () => {
    it('should get license status for user without license', async () => {
      const response = await request(app)
        .get('/api/license/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe('trial');
      expect(response.body.license).toBeNull();
    });

    it('should get license status for user with license', async () => {
      // Activate license
      await testPool.query(
        'UPDATE users SET license_key_id = $1, subscription_tier = $2 WHERE id = $3',
        [testLicenseKey.id, testLicenseKey.subscription_tier, testUser.id]
      );

      const response = await request(app)
        .get('/api/license/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe(testLicenseKey.subscription_tier);
      expect(response.body.license).toBeDefined();
      expect(response.body.license.key).toBe(testLicenseKey.license_key.substring(0, 8) + '...');
    });
  });

  describe('GET /api/subscription/status', () => {
    it('should get subscription status for trial user', async () => {
      const response = await request(app)
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe('trial');
      expect(response.body.usage.postsLimit).toBe(5);
      expect(response.body.usage.postsRemaining).toBe(5);
      expect(response.body.usage.isTrial).toBe(true);
    });

    it('should get subscription status for hobbyist user', async () => {
      // Update user to hobbyist
      await testPool.query(
        'UPDATE users SET subscription_tier = $1, posts_published_this_month = $2 WHERE id = $3',
        ['hobbyist', 5, testUser.id]
      );

      const response = await request(app)
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe('hobbyist');
      expect(response.body.usage.postsLimit).toBe(25);
      expect(response.body.usage.postsRemaining).toBe(20);
      expect(response.body.usage.isTrial).toBe(false);
    });

    it('should get subscription status for professional user', async () => {
      // Update user to professional
      await testPool.query(
        'UPDATE users SET subscription_tier = $1 WHERE id = $2',
        ['professional', testUser.id]
      );

      const response = await request(app)
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe('professional');
      expect(response.body.usage.postsLimit).toBeNull();
      expect(response.body.usage.postsRemaining).toBeNull();
      expect(response.body.usage.isTrial).toBe(false);
    });
  });
});

describe('Admin License Management Endpoints', () => {
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestDB();
  });

  beforeEach(async () => {
    await cleanupTestData();
    adminUser = await createTestUser({ email: 'admin@fiddy.com' });
    
    // Login as admin
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      });
    
    adminToken = loginResponse.body.token;
  });

  describe('POST /api/admin/license-keys', () => {
    it('should generate license key successfully', async () => {
      const licenseData = {
        subscriptionTier: 'hobbyist',
        postsPerMonth: 25,
        maxCampaigns: 1,
        supportTier: 'basic'
      };

      const response = await request(app)
        .post('/api/admin/license-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(licenseData)
        .expect(201);

      expect(response.body.message).toBe('License key generated successfully');
      expect(response.body.license.subscriptionTier).toBe(licenseData.subscriptionTier);
      expect(response.body.license.postsPerMonth).toBe(licenseData.postsPerMonth);
      expect(response.body.license.maxCampaigns).toBe(licenseData.maxCampaigns);
      expect(response.body.license.supportTier).toBe(licenseData.supportTier);
      expect(response.body.license.licenseKey).toBeDefined();
    });

    it('should fail to generate license key with invalid data', async () => {
      const licenseData = {
        subscriptionTier: 'invalid',
        postsPerMonth: -1,
        maxCampaigns: 0,
        supportTier: 'invalid'
      };

      const response = await request(app)
        .post('/api/admin/license-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(licenseData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should fail for non-admin user', async () => {
      const regularUser = await createTestUser({ email: 'regular@example.com' });
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: regularUser.email,
          password: regularUser.password
        });
      
      const regularToken = loginResponse.body.token;

      const licenseData = {
        subscriptionTier: 'hobbyist',
        postsPerMonth: 25,
        maxCampaigns: 1,
        supportTier: 'basic'
      };

      const response = await request(app)
        .post('/api/admin/license-keys')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(licenseData)
        .expect(403);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('GET /api/admin/license-keys', () => {
    beforeEach(async () => {
      await createTestLicenseKey();
    });

    it('should get all license keys', async () => {
      const response = await request(app)
        .get('/api/admin/license-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.licenses).toHaveLength(1);
      expect(response.body.licenses[0].licenseKey).toBeDefined();
    });
  });

  describe('PUT /api/admin/license-keys/:id', () => {
    let testLicenseKey;

    beforeEach(async () => {
      testLicenseKey = await createTestLicenseKey();
    });

    it('should update license key successfully', async () => {
      const updateData = {
        status: 'revoked'
      };

      const response = await request(app)
        .put(`/api/admin/license-keys/${testLicenseKey.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('License key updated successfully');
      expect(response.body.license.status).toBe('revoked');
    });
  });

  describe('DELETE /api/admin/license-keys/:id', () => {
    let testLicenseKey;

    beforeEach(async () => {
      testLicenseKey = await createTestLicenseKey();
    });

    it('should delete license key successfully', async () => {
      const response = await request(app)
        .delete(`/api/admin/license-keys/${testLicenseKey.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('License key deleted successfully');
    });

    it('should fail to delete used license key', async () => {
      // Mark license as used
      await testPool.query(
        'UPDATE license_keys SET status = $1 WHERE id = $2',
        ['used', testLicenseKey.id]
      );

      const response = await request(app)
        .delete(`/api/admin/license-keys/${testLicenseKey.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(response.body.error).toBe('Cannot delete used license');
    });
  });
});


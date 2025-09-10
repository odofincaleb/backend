# Fiddy AutoPublisher - API Documentation

## Base URL
```
Production: https://your-backend.railway.app/api
Development: http://localhost:5000/api
```

## Authentication

All API endpoints (except auth endpoints) require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Error description"
}
```

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscriptionTier": "trial"
  },
  "token": "jwt-token"
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscriptionTier": "trial",
    "postsPublishedThisMonth": 0,
    "totalPostsPublished": 0
  },
  "token": "jwt-token"
}
```

### GET /auth/me
Get current user profile.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscriptionTier": "trial",
    "postsPublishedThisMonth": 0,
    "totalPostsPublished": 0,
    "maxConcurrentCampaigns": 1,
    "supportTier": "basic",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /auth/change-password
Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## User Management Endpoints

### PUT /users/profile
Update user profile information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "newemail@example.com"
}
```

### POST /users/api-keys
Add or update user's OpenAI API keys.

**Request Body:**
```json
{
  "openaiKey": "sk-...",
  "dalleKey": "sk-..."
}
```

### GET /users/api-keys
Get user's API key status.

**Response:**
```json
{
  "hasOpenaiKey": true,
  "hasDalleKey": true,
  "keysConfigured": true
}
```

### DELETE /users/api-keys
Remove user's API keys.

### GET /users/subscription-status
Get detailed subscription status and usage.

**Response:**
```json
{
  "subscription": {
    "tier": "trial",
    "supportTier": "basic",
    "maxCampaigns": 1,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "usage": {
    "postsPublishedThisMonth": 0,
    "totalPostsPublished": 0,
    "activeCampaigns": 0,
    "maxCampaigns": 1,
    "postsLimit": 5,
    "postsRemaining": 5,
    "isTrial": true
  }
}
```

## Campaign Management Endpoints

### GET /campaigns
Get all campaigns for the user.

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "topic": "Healthy Living",
      "context": "My product is a fitness app...",
      "toneOfVoice": "conversational",
      "writingStyle": "pas",
      "imperfectionList": ["add_personal_opinion"],
      "schedule": "24h",
      "status": "active",
      "nextPublishAt": "2024-01-02T00:00:00Z",
      "wordpressSite": {
        "name": "My Blog",
        "url": "https://myblog.com"
      },
      "postsPublished": 5,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /campaigns/:id
Get a specific campaign.

### POST /campaigns
Create a new campaign.

**Request Body:**
```json
{
  "topic": "Healthy Living",
  "context": "My product is a fitness app that helps people track their workouts and nutrition. The blog aims to attract users by providing practical fitness tips and highlighting the benefits of regular exercise.",
  "toneOfVoice": "conversational",
  "writingStyle": "pas",
  "imperfectionList": ["add_personal_opinion", "add_casual_language"],
  "schedule": "24h",
  "wordpressSiteId": "uuid"
}
```

### PUT /campaigns/:id
Update a campaign.

### DELETE /campaigns/:id
Delete a campaign.

### POST /campaigns/:id/start
Start a campaign.

### POST /campaigns/:id/stop
Stop a campaign.

## WordPress Site Management Endpoints

### GET /wordpress/sites
Get all WordPress sites for the user.

**Response:**
```json
{
  "sites": [
    {
      "id": "uuid",
      "siteName": "My Blog",
      "siteUrl": "https://myblog.com",
      "username": "admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /wordpress/sites/:id
Get a specific WordPress site.

### POST /wordpress/sites
Add a new WordPress site.

**Request Body:**
```json
{
  "siteName": "My Blog",
  "siteUrl": "https://myblog.com",
  "username": "admin",
  "password": "password123"
}
```

### PUT /wordpress/sites/:id
Update a WordPress site.

### DELETE /wordpress/sites/:id
Delete a WordPress site.

### POST /wordpress/sites/:id/test
Test WordPress site connection.

## License Management Endpoints

### POST /license/activate
Activate a license key.

**Request Body:**
```json
{
  "licenseKey": "ABCD-1234-EFGH-5678"
}
```

**Response:**
```json
{
  "message": "License activated successfully",
  "subscription": {
    "tier": "hobbyist",
    "maxCampaigns": 1,
    "supportTier": "basic",
    "postsPerMonth": 25
  }
}
```

### GET /license/status
Get current license status.

**Response:**
```json
{
  "subscription": {
    "tier": "hobbyist",
    "maxCampaigns": 1,
    "supportTier": "basic"
  },
  "license": {
    "key": "ABCD-1234...",
    "tier": "hobbyist",
    "activatedAt": "2024-01-01T00:00:00Z",
    "expiresAt": null
  }
}
```

### GET /subscription/status
Get detailed subscription status and usage.

## Admin Endpoints

### POST /admin/license-keys
Generate a new license key (Admin only).

**Request Body:**
```json
{
  "subscriptionTier": "hobbyist",
  "postsPerMonth": 25,
  "maxCampaigns": 1,
  "supportTier": "basic",
  "expiresAt": "2025-01-01T00:00:00Z"
}
```

### GET /admin/license-keys
Get all license keys (Admin only).

### PUT /admin/license-keys/:id
Update a license key (Admin only).

### DELETE /admin/license-keys/:id
Delete a license key (Admin only).

### GET /admin/users
Get all users (Admin only).

### GET /admin/users/:id
Get a specific user (Admin only).

### PUT /admin/users/:id
Update a user (Admin only).

### GET /admin/stats
Get system statistics (Admin only).

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists or in use |
| 410 | Gone - Resource expired |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

## Webhooks

Currently, the API does not support webhooks. All status updates are available through polling the relevant endpoints.

## SDKs and Libraries

### JavaScript/Node.js
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-backend.railway.app/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Create a campaign
const campaign = await api.post('/campaigns', {
  topic: 'Healthy Living',
  context: 'My fitness app...',
  toneOfVoice: 'conversational',
  writingStyle: 'pas',
  schedule: '24h'
});
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Create a campaign
response = requests.post(
    'https://your-backend.railway.app/api/campaigns',
    json={
        'topic': 'Healthy Living',
        'context': 'My fitness app...',
        'toneOfVoice': 'conversational',
        'writingStyle': 'pas',
        'schedule': '24h'
    },
    headers=headers
)
```

## Testing

### Health Check
```bash
curl https://your-backend.railway.app/health
```

### Authentication Test
```bash
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Support

For API support:
1. Check the error message and status code
2. Review this documentation
3. Check the system status
4. Contact support if needed


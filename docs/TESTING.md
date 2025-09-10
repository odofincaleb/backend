# Fiddy AutoPublisher - Testing Guide

This guide covers the testing framework and how to run tests for the Fiddy AutoPublisher system.

## Testing Overview

The Fiddy AutoPublisher system includes comprehensive testing for both backend and frontend components:

- **Backend Tests**: API endpoints, authentication, business logic, database operations
- **Frontend Tests**: React components, user interactions, context providers, routing
- **Integration Tests**: End-to-end workflows and API integration
- **Unit Tests**: Individual functions and utilities

## Test Structure

### Backend Tests
```
backend/src/tests/
├── setup.js              # Test database setup and utilities
├── auth.test.js          # Authentication endpoint tests
├── campaigns.test.js     # Campaign management tests
├── license.test.js       # License management tests
├── wordpress.test.js     # WordPress integration tests
├── users.test.js         # User management tests
├── admin.test.js         # Admin functionality tests
└── utils.test.js         # Utility function tests
```

### Frontend Tests
```
frontend/src/tests/
├── setup.js                    # Test environment setup
├── __mocks__/
│   └── fileMock.js            # File import mocks
└── components/
    ├── AuthContext.test.js    # Authentication context tests
    ├── Login.test.js          # Login component tests
    ├── Register.test.js       # Registration component tests
    ├── Dashboard.test.js      # Dashboard component tests
    ├── Campaigns.test.js      # Campaign management tests
    └── License.test.js        # License management tests
```

## Running Tests

### Backend Tests

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="login"
```

### Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run tests in watch mode (default with react-scripts)
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test Login.test.js

# Run tests matching pattern
npm test -- --testNamePattern="login"
```

### All Tests

```bash
# From project root
npm test
```

## Test Configuration

### Backend Configuration (Jest)

```javascript
// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  transform: { '^.+\\.js$': 'babel-jest' },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/server.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testTimeout: 30000
};
```

### Frontend Configuration (Jest)

```javascript
// frontend/jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/tests/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js']
};
```

## Test Database Setup

### Backend Test Database

The backend tests use a separate test database to avoid affecting production data:

```javascript
// backend/src/tests/setup.js
const testDbConfig = {
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  ssl: false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

### Environment Variables

Create a `.env.test` file for test-specific configuration:

```env
# Test Database
TEST_DATABASE_URL=postgresql://username:password@localhost:5432/fiddy_autopublisher_test

# Test JWT Secret
JWT_SECRET=test-jwt-secret

# Test Encryption Key
ENCRYPTION_KEY=test-encryption-key-32-chars

# Disable external API calls in tests
NODE_ENV=test
```

## Writing Tests

### Backend Test Example

```javascript
// backend/src/tests/auth.test.js
const request = require('supertest');
const app = require('../server');
const { setupTestDB, createTestUser } = require('./setup');

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  it('should register a new user successfully', async () => {
    const userData = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.message).toBe('User registered successfully');
    expect(response.body.user.email).toBe(userData.email);
    expect(response.body.token).toBeDefined();
  });
});
```

### Frontend Test Example

```javascript
// frontend/src/tests/components/Login.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Auth/Login';

describe('Login Component', () => {
  it('should render login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should login successfully with valid credentials', async () => {
    // Test implementation
  });
});
```

## Test Utilities

### Backend Test Utilities

```javascript
// backend/src/tests/setup.js
const createTestUser = async (userData = {}) => {
  // Creates a test user with default or custom data
};

const createTestCampaign = async (userId, campaignData = {}) => {
  // Creates a test campaign
};

const createTestWordPressSite = async (userId, siteData = {}) => {
  // Creates a test WordPress site
};

const cleanupTestData = async () => {
  // Cleans up all test data
};
```

### Frontend Test Utilities

```javascript
// frontend/src/tests/setup.js
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  subscriptionTier: 'trial'
};

export const renderWithProviders = (component) => {
  // Renders component with all necessary providers
};
```

## Mocking

### API Mocking

```javascript
// Mock API responses
jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    getProfile: jest.fn(),
  },
}));

// In tests
authAPI.login.mockResolvedValue({
  data: { user: mockUser, token: 'mock-token' }
});
```

### External Service Mocking

```javascript
// Mock OpenAI API
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }]
        })
      }
    }
  }))
}));
```

## Coverage Reports

### Backend Coverage

```bash
cd backend
npm test -- --coverage
```

Coverage reports are generated in `backend/coverage/`:
- `lcov-report/index.html` - HTML coverage report
- `lcov.info` - LCOV format for CI/CD

### Frontend Coverage

```bash
cd frontend
npm test -- --coverage
```

Coverage reports are generated in `frontend/coverage/`:
- `lcov-report/index.html` - HTML coverage report
- `lcov.info` - LCOV format for CI/CD

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          file: backend/coverage/lcov.info

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm test -- --coverage --watchAll=false
      - uses: codecov/codecov-action@v3
        with:
          file: frontend/coverage/lcov.info
```

## Test Best Practices

### Backend Testing

1. **Database Isolation**: Use separate test database
2. **Cleanup**: Always clean up test data after tests
3. **Mocking**: Mock external services (OpenAI, WordPress)
4. **Error Testing**: Test both success and error scenarios
5. **Authentication**: Test with and without valid tokens

### Frontend Testing

1. **Component Isolation**: Test components in isolation
2. **User Interactions**: Test user interactions and form submissions
3. **Context Testing**: Test context providers and consumers
4. **Routing**: Test navigation and route changes
5. **Error States**: Test error handling and loading states

### General Testing

1. **Descriptive Names**: Use descriptive test names
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Single Responsibility**: Each test should test one thing
4. **Independent Tests**: Tests should not depend on each other
5. **Fast Execution**: Keep tests fast and efficient

## Debugging Tests

### Backend Test Debugging

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose auth.test.js

# Run tests with Node.js debugger
node --inspect-brk node_modules/.bin/jest auth.test.js
```

### Frontend Test Debugging

```bash
# Run tests with debug output
DEBUG=* npm test

# Run tests in watch mode for development
npm test

# Run specific test file
npm test Login.test.js
```

## Performance Testing

### Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Run load tests
artillery run load-tests/auth-load-test.yml
```

### Memory Testing

```bash
# Run tests with memory profiling
node --inspect --max-old-space-size=4096 node_modules/.bin/jest
```

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure test database is running
2. **Environment Variables**: Check test environment configuration
3. **Mock Issues**: Verify mocks are properly configured
4. **Timeout Issues**: Increase test timeout for slow operations
5. **Port Conflicts**: Use different ports for test servers

### Test Failures

1. **Check Logs**: Review test output for error messages
2. **Verify Setup**: Ensure test setup is correct
3. **Check Dependencies**: Verify all dependencies are installed
4. **Database State**: Check if test database is in correct state
5. **Mock Configuration**: Verify mocks are working correctly

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

*For more information about testing specific components, see the individual test files in the `tests/` directories.*


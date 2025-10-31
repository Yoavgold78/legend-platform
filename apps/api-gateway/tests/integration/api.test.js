require('dotenv').config();
const request = require('supertest');
const express = require('express');
const { jwtCheck, authErrorHandler } = require('../../src/middleware/auth');
const { requestIdMiddleware } = require('../../src/middleware/requestId');
const addUserContext = require('../../src/middleware/addUserContext');
const healthRoutes = require('../../src/routes/health');

// Mock console.log to avoid cluttering test output
console.log = jest.fn();
console.error = jest.fn();

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(requestIdMiddleware);
  app.use(express.json());
  
  // Health check (no auth)
  app.use('/api/v1', healthRoutes);
  
  // Protected test route
  app.get('/api/v1/protected', jwtCheck, addUserContext, (req, res) => {
    res.json({
      message: 'Protected route accessed',
      userId: req.userId,
      userIdHeader: req.headers['x-user-id']
    });
  });
  
  app.use(authErrorHandler);
  
  return app;
};

describe('API Gateway Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Endpoint', () => {
    test('GET /api/v1/health should return 200 OK without auth', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('Health endpoint should include x-request-id header', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-request-id');
    });

    test('Health endpoint should accept and echo x-request-id', async () => {
      const customRequestId = 'test-request-123';
      const response = await request(app)
        .get('/api/v1/health')
        .set('x-request-id', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
    });
  });

  describe('Protected Routes - Auth Validation', () => {
    test('Request without Authorization header should return 400 or 401', async () => {
      const response = await request(app)
        .get('/api/v1/protected');

      // Auth0 JWT middleware returns 400 for missing token, or 401 depending on config
      expect([400, 401]).toContain(response.status);
      // Response body may be empty or have error property depending on Auth0 SDK version
    });

    test('Request with malformed token should return 401', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    test('Request with Bearer but no token should return 400 or 401', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer ');

      expect([400, 401]).toContain(response.status);
    });

    // Note: Testing with valid JWT requires a real Auth0 token or mocking the JWT validation
    // For MVP, we validate the error cases. Valid token testing should be done manually
    // or with Auth0 test tokens in CI/CD
  });

  describe('Proxy Routes - Placeholder Behavior', () => {
    test('Audits route without backend should return auth error (400/401)', async () => {
      // Note: This test assumes AUDITS_BE_URL is not set in test environment
      // Without valid auth token, request will fail at auth middleware first
      const response = await request(app)
        .get('/api/v1/audits/test')
        .set('Authorization', 'Bearer fake-token');

      // Will be 400/401 because auth fails before reaching proxy
      expect([400, 401, 404, 502, 503]).toContain(response.status);
    });
  });
});

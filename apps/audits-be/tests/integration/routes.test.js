import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import auditsRoutes from '../../routes/audits.js';

// Mock User model
vi.mock('../../models/User.js', () => ({
  default: {
    findOne: vi.fn()
  }
}));

import User from '../../models/User.js';

describe('Audits Routes Integration Tests', () => {
  let app;
  
  beforeAll(() => {
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/audits', auditsRoutes);

    // Add error handler middleware (must be after routes)
    app.use((err, req, res, next) => {
      res.status(res.statusCode === 200 ? 500 : res.statusCode);
      res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
      });
    });

    // Mock console methods to suppress output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Restore console methods
    vi.restoreAllMocks();
  });

  describe('AC4.2 & AC4.6: Gateway Trust and Proxy Integration', () => {
    it('should accept request with x-user-id header and return 200', async () => {
      // Arrange
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        auth0Id: 'auth0|123abc',
        role: 'manager'
      };
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/api/audits/')
        .set('x-user-id', 'auth0|123abc');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ msg: 'Welcome to the audits section' });
      expect(User.findOne).toHaveBeenCalledWith({ auth0Id: 'auth0|123abc' });
    });

    it('should return 401 when x-user-id header is missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/audits/');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('Not authorized')
      });
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found in database', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/api/audits/')
        .set('x-user-id', 'auth0|nonexistent');

      // Assert
      expect(response.status).toBe(401);
      expect(User.findOne).toHaveBeenCalledWith({ auth0Id: 'auth0|nonexistent' });
    });
  });

  describe('AC4.3: User lookup by auth0Id field', () => {
    it('should query User model with auth0Id from x-user-id header', async () => {
      // Arrange
      const auth0Id = 'auth0|test-user-123';
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        auth0Id: auth0Id,
        role: 'staff'
      };
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/api/audits/')
        .set('x-user-id', auth0Id);

      // Assert
      expect(response.status).toBe(200);
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledWith({ auth0Id: auth0Id });
    });

    it('should handle different auth0Id formats correctly', async () => {
      // Arrange
      const testCases = [
        { auth0Id: 'auth0|123abc', role: 'manager' },
        { auth0Id: 'google-oauth2|456def', role: 'admin' },
        { auth0Id: 'facebook|789ghi', role: 'staff' }
      ];

      for (const testCase of testCases) {
        const mockUser = {
          _id: '507f1f77bcf86cd799439011',
          email: 'user@example.com',
          ...testCase
        };
        User.findOne.mockResolvedValue(mockUser);

        // Act
        const response = await request(app)
          .get('/api/audits/')
          .set('x-user-id', testCase.auth0Id);

        // Assert
        expect(response.status).toBe(200);
        expect(User.findOne).toHaveBeenCalledWith({ auth0Id: testCase.auth0Id });
        
        vi.clearAllMocks();
      }
    });
  });

  describe('Admin Route Authorization', () => {
    it('should allow admin user to access admin route', async () => {
      // Arrange
      const mockAdminUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        auth0Id: 'auth0|admin123',
        role: 'admin'
      };
      User.findOne.mockResolvedValue(mockAdminUser);

      // Act
      const response = await request(app)
        .get('/api/audits/admin')
        .set('x-user-id', 'auth0|admin123');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ msg: 'Welcome to the admin section' });
    });

    it('should return 403 when non-admin user tries to access admin route', async () => {
      // Arrange
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        auth0Id: 'auth0|user123',
        role: 'manager' // Not admin
      };
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/api/audits/admin')
        .set('x-user-id', 'auth0|user123');

      // Assert
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('Not authorized as an admin')
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database connection errors gracefully', async () => {
      // Arrange
      User.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .get('/api/audits/')
        .set('x-user-id', 'auth0|123abc');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('Not authorized')
      });
    });

    it('should handle malformed x-user-id header', async () => {
      // Arrange
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        auth0Id: 'malformed-id-without-pipe',
        role: 'staff'
      };
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/api/audits/')
        .set('x-user-id', 'malformed-id-without-pipe');

      // Assert
      expect(response.status).toBe(200); // Should still work if user exists
      expect(User.findOne).toHaveBeenCalledWith({ auth0Id: 'malformed-id-without-pipe' });
    });
  });

  describe('Gateway Header Validation', () => {
    it('should extract x-user-id from request headers', async () => {
      // Arrange
      const auth0Id = 'auth0|gateway-test';
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'gateway@example.com',
        auth0Id: auth0Id,
        role: 'manager'
      };
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/api/audits/')
        .set('x-user-id', auth0Id)
        .set('Authorization', 'Bearer fake-token'); // Should be ignored

      // Assert
      expect(response.status).toBe(200);
      expect(User.findOne).toHaveBeenCalledWith({ auth0Id: auth0Id });
      // Verify middleware trusts x-user-id, not Authorization header
    });

    it('should ignore Authorization header when x-user-id is present', async () => {
      // Arrange
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        auth0Id: 'auth0|123abc',
        role: 'staff'
      };
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/api/audits/')
        .set('x-user-id', 'auth0|123abc')
        .set('Authorization', 'Bearer completely-invalid-token');

      // Assert
      expect(response.status).toBe(200);
      // Proves backend trusts x-user-id and doesn't validate Authorization
    });

    it('should return 401 even with valid-looking Authorization header if x-user-id missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/audits/')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

      // Assert
      expect(response.status).toBe(401);
      expect(User.findOne).not.toHaveBeenCalled();
      // Proves backend ONLY trusts x-user-id, not direct token
    });
  });

  describe('Multiple Request Scenarios', () => {
    it('should handle concurrent requests with different users', async () => {
      // Arrange
      const user1 = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user1@example.com',
        auth0Id: 'auth0|user1',
        role: 'manager'
      };
      const user2 = {
        _id: '507f1f77bcf86cd799439012',
        email: 'user2@example.com',
        auth0Id: 'auth0|user2',
        role: 'staff'
      };

      User.findOne
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      // Act
      const [response1, response2] = await Promise.all([
        request(app).get('/api/audits/').set('x-user-id', 'auth0|user1'),
        request(app).get('/api/audits/').set('x-user-id', 'auth0|user2')
      ]);

      // Assert
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(User.findOne).toHaveBeenCalledTimes(2);
    });
  });
});

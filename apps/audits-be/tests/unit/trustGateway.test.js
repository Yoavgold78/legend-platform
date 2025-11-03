import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trustGateway, admin } from '../../middleware/trustGateway.js';

// Mock User model
vi.mock('../../models/User.js', () => ({
  default: {
    findOne: vi.fn()
  }
}));

import User from '../../models/User.js';

describe('trustGateway Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create mock request, response, and next function
    req = {
      headers: {},
      user: null
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    next = vi.fn();

    // Mock console methods to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('AC4.2: Extract x-user-id header and attach to req.user', () => {
    it('should populate req.user when x-user-id header is present', async () => {
      // Arrange
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        auth0Id: 'auth0|123abc',
        role: 'manager'
      };
      req.headers['x-user-id'] = 'auth0|123abc';
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await trustGateway(req, res, next);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ auth0Id: 'auth0|123abc' });
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // No error status set
    });

    it('should call next() after successful authentication', async () => {
      // Arrange
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        auth0Id: 'auth0|456def',
        role: 'admin'
      };
      req.headers['x-user-id'] = 'auth0|456def';
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await trustGateway(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // Called with no arguments (no error)
    });
  });

  describe('AC4.2: Return 401 when x-user-id header is missing', () => {
    it('should return 401 when x-user-id header is not present', async () => {
      // Arrange
      req.headers = {}; // No x-user-id header

      // Act
      await trustGateway(req, res, next);
      
      // Assert - express-async-handler calls next(error) instead of throwing
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized - missing user context'
      }));
      expect(User.findOne).not.toHaveBeenCalled(); // Should not query DB
    });

    it('should return 401 when x-user-id header is empty string', async () => {
      // Arrange
      req.headers['x-user-id'] = '';

      // Act
      await trustGateway(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized - missing user context'
      }));
    });

    it('should return 401 when x-user-id header is null', async () => {
      // Arrange
      req.headers['x-user-id'] = null;

      // Act
      await trustGateway(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized - missing user context'
      }));
    });
  });

  describe('AC4.3: User lookup by auth0Id field', () => {
    it('should query MongoDB using auth0Id field', async () => {
      // Arrange
      const auth0Id = 'auth0|789ghi';
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        auth0Id: auth0Id,
        role: 'staff'
      };
      req.headers['x-user-id'] = auth0Id;
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await trustGateway(req, res, next);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ auth0Id: auth0Id });
      expect(User.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return 401 when user not found in database', async () => {
      // Arrange
      req.headers['x-user-id'] = 'auth0|nonexistent';
      User.findOne.mockResolvedValue(null); // User not found

      // Act
      await trustGateway(req, res, next);
      
      // Assert - express-async-handler calls next(error)
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized - authentication failed' // This is caught in the catch block
      }));
      expect(req.user).toBeNull(); // req.user should not be populated
    });
  });

  describe('Error Handling', () => {
    it('should return 401 when database query fails', async () => {
      // Arrange
      req.headers['x-user-id'] = 'auth0|123abc';
      User.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await trustGateway(req, res, next);
      
      // Assert - express-async-handler calls next(error)
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Not authorized - authentication failed'
      }));
    });

    it('should log error when database query fails', async () => {
      // Arrange
      const dbError = new Error('MongoDB timeout');
      req.headers['x-user-id'] = 'auth0|123abc';
      User.findOne.mockRejectedValue(dbError);

      // Act
      try {
        await trustGateway(req, res, next);
      } catch (error) {
        // Verify error was thrown
        expect(error).toBeDefined();
      }
      
      expect(console.error).toHaveBeenCalledWith('trustGateway error:', dbError);
    });
  });

  describe('Logging and Debugging', () => {
    it('should log x-user-id header (masked) for debugging', async () => {
      // Arrange
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        auth0Id: 'auth0|123abc456def',
        role: 'manager'
      };
      req.headers['x-user-id'] = 'auth0|123abc456def';
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await trustGateway(req, res, next);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        'trustGateway: x-user-id header:',
        expect.stringContaining('auth0|123a...')
      );
    });

    it('should log authenticated user information', async () => {
      // Arrange
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        auth0Id: 'auth0|123abc',
        role: 'manager'
      };
      req.headers['x-user-id'] = 'auth0|123abc';
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await trustGateway(req, res, next);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('trustGateway: Authenticated user 507f1f77bcf86cd799439011 (test@example.com)')
      );
    });

    it('should log warning when x-user-id header is missing', async () => {
      // Arrange
      req.headers = {};

      // Act
      try {
        await trustGateway(req, res, next);
      } catch (error) {
        // Expected to throw
      }
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing x-user-id header')
      );
    });

    it('should log warning when user not found', async () => {
      // Arrange
      const auth0Id = 'auth0|nonexistent';
      req.headers['x-user-id'] = auth0Id;
      User.findOne.mockResolvedValue(null);

      // Act
      try {
        await trustGateway(req, res, next);
      } catch (error) {
        // Expected to throw
      }
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(`User not found for auth0Id: ${auth0Id}`)
      );
    });
  });
});

describe('admin Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();

    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('Admin Role Authorization', () => {
    it('should call next() when user has admin role', () => {
      // Arrange
      req.user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        role: 'admin'
      };

      // Act
      admin(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user does not have admin role', () => {
      // Arrange
      req.user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'manager@example.com',
        role: 'manager'
      };

      // Act & Assert
      expect(() => admin(req, res, next)).toThrow('Not authorized as an admin');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when req.user is not populated', () => {
      // Arrange
      req.user = null;

      // Act & Assert
      expect(() => admin(req, res, next)).toThrow('Not authorized as an admin');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should log warning when access denied', () => {
      // Arrange
      req.user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'staff@example.com',
        role: 'staff'
      };

      // Act & Assert
      expect(() => admin(req, res, next)).toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Access denied for user')
      );
    });
  });
});

import { Request, Response } from 'express';

// Mock JWT service before importing middleware
jest.mock('../../../../src/services/jwt.service', () => ({
  JwtService: {
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
    generateTokenPair: jest.fn(),
  },
}));

// Mock utility functions
jest.mock('../../../../src/utils/validation.utils', () => ({
  validateEmail: jest.fn(),
}));

jest.mock('../../../../src/utils/security.utils', () => ({
  getClientIP: jest.fn(),
}));

jest.mock('../../../../src/models/User', () => ({
  UserModel: {
    findById: jest.fn(),
  },
}));

jest.mock('../../../../src/services/session.service', () => ({
  SessionService: {
    getSession: jest.fn(),
  },
}));

// Import after mocking
import {
  authorize,
  requireRole,
} from '../../../../src/middleware/rbac.middleware';
import { authenticate } from '../../../../src/middleware/auth.middleware';
import { JwtService } from '../../../../src/services/jwt.service';
import { UserModel } from '../../../../src/models/User';
import { SessionService } from '../../../../src/services/session.service';

describe('RBAC Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should call next with an ApiError if no authorization header', async () => {
      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Access token required');
    });

    it('should call next with an ApiError if invalid token format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidToken',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Access token required');
    });

    it('should call next with an ApiError if token verification fails', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (JwtService.verifyToken as jest.Mock).mockReturnValue(null);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid or expired access token');
    });

    it('should authenticate user with valid token', async () => {
      const mockTokenPayload = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        sessionId: 'session-id-123',
      };

      const mockUser = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        permissions: [{ name: 'users.create' }, { name: 'reports.create' }],
      };

      const mockSession = { id: 'session-id-123', userId: '123' };

      (JwtService.verifyToken as jest.Mock).mockReturnValue(mockTokenPayload);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (SessionService.getSession as jest.Mock).mockResolvedValue(mockSession);
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(JwtService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(UserModel.findById).toHaveBeenCalledWith('123');
      expect(mockRequest.user).toEqual({
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        permissions: [{ name: 'users.create' }, { name: 'reports.create' }],
        sessionId: 'session-id-123',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate viewer with correct permissions', async () => {
      const mockTokenPayload = {
        userId: '789',
        email: 'viewer@example.com',
        role: 'viewer',
        sessionId: 'session-id-456',
      };

      const mockUser = {
        userId: '789',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: [{ name: 'reports.read.public' }],
      };

      const mockSession = { id: 'session-id-456', userId: '789' };

      (JwtService.verifyToken as jest.Mock).mockReturnValue(mockTokenPayload);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (SessionService.getSession as jest.Mock).mockResolvedValue(mockSession);
      mockRequest.headers = {
        authorization: 'Bearer viewer-token',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual({
        userId: '789',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: [{ name: 'reports.read.public' }],
        sessionId: 'session-id-456',
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 if user not authenticated', () => {
      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required with a valid user role.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user role not allowed', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        role: 'reporter',
        permissions: ['reports.create'],
        sessionId: 'session123',
      };

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Insufficient role privileges.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access if user has required role', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['users.create'],
        sessionId: 'session123',
      };

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access if user has higher role (role hierarchy)', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['users.create'],
        sessionId: 'session123',
      };

      const middleware = requireRole('staff');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should support multiple roles', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        role: 'staff',
        permissions: ['reports.create'],
        sessionId: 'session123',
      };

      const middleware = requireRole('admin', 'staff');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should return 401 if user not authenticated', () => {
      const middleware = authorize('users.create');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user lacks required permission', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        role: 'reporter',
        permissions: ['reports.create', 'reports.read.own'],
        sessionId: 'session123',
      };

      const middleware = authorize('users.create');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access if user has required permission', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['reports.create', 'users.create', 'profile.read'],
        sessionId: 'session123',
      };

      const middleware = authorize('users.create');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should support multiple permissions (OR logic)', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        role: 'reporter',
        permissions: ['reports.create', 'reports.read.own'],
        sessionId: 'session123',
      };

      const middleware = authorize('users.create', 'reports.create');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail if user has none of the required permissions', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        role: 'viewer',
        permissions: ['reports.read.public', 'profile.read'],
        sessionId: 'session123',
      };

      const middleware = authorize('users.create', 'reports.delete.all');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

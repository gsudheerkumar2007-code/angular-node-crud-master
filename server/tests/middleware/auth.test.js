const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { authenticateToken, authorizeRoles, generateToken } = require('../../src/middleware/auth');

const User = mongoose.model('User');

// Mock request and response objects
const createMockReq = (token = null) => ({
  headers: {
    authorization: token ? `Bearer ${token}` : null
  }
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Auth Middleware', () => {
  let user;
  let token;

  beforeEach(() => {
    jest.clearAllMocks();

    user = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      role: 'user',
      isActive: true,
      toJSON: () => ({
        _id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      })
    };

    // Set JWT_SECRET for testing
    process.env.JWT_SECRET = 'test-secret-key';
    token = generateToken(user);
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(user);

      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(user._id.toString());
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    it('should use JWT_EXPIRES_IN from environment', () => {
      process.env.JWT_EXPIRES_IN = '1h';

      const token = generateToken(user);
      const decoded = jwt.decode(token);

      expect(decoded.exp - decoded.iat).toBe(3600); // 1 hour in seconds

      delete process.env.JWT_EXPIRES_IN;
    });
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      // Mock User.findById
      const mockFindById = jest.spyOn(User, 'findById').mockResolvedValue(user);

      const req = createMockReq(token);
      const res = createMockRes();

      await authenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toEqual(user);
      expect(mockFindById).toHaveBeenCalledWith(user._id.toString());

      mockFindById.mockRestore();
    });

    it('should reject request without token', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'No token provided'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const req = createMockReq('invalid-token');
      const res = createMockRes();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token verification failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const req = createMockReq(expiredToken);
      const res = createMockRes();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        message: 'Please login again'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for inactive user', async () => {
      const inactiveUser = { ...user, isActive: false };
      const mockFindById = jest.spyOn(User, 'findById').mockResolvedValue(inactiveUser);

      const req = createMockReq(token);
      const res = createMockRes();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'Invalid token or user not active'
      });
      expect(mockNext).not.toHaveBeenCalled();

      mockFindById.mockRestore();
    });

    it('should reject token for non-existent user', async () => {
      const mockFindById = jest.spyOn(User, 'findById').mockResolvedValue(null);

      const req = createMockReq(token);
      const res = createMockRes();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'Invalid token or user not active'
      });
      expect(mockNext).not.toHaveBeenCalled();

      mockFindById.mockRestore();
    });
  });

  describe('authorizeRoles', () => {
    it('should authorize user with correct role', () => {
      const middleware = authorizeRoles('user', 'admin');
      const req = { user: { role: 'admin' } };
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user with incorrect role', () => {
      const middleware = authorizeRoles('admin');
      const req = { user: { role: 'user' } };
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      const middleware = authorizeRoles('user');
      const req = {};
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should work with single role string', () => {
      const middleware = authorizeRoles('admin');
      const req = { user: { role: 'admin' } };
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should work with multiple roles', () => {
      const middleware = authorizeRoles('user', 'admin', 'moderator');
      const req = { user: { role: 'moderator' } };
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
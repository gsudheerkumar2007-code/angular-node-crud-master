const { sanitizeInput, validateClient, sanitizeString, sanitizeObject } = require('../../src/middleware/sanitizer');

const createMockReq = (body = {}, query = {}, params = {}) => ({
  body,
  query,
  params
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Sanitizer Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeString', () => {
    it('should sanitize XSS characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';

      expect(sanitizeString(input)).toBe(expected);
    });

    it('should handle HTML entities', () => {
      expect(sanitizeString('<div>Test & Example</div>'))
        .toBe('&lt;div&gt;Test &amp; Example&lt;&#x2F;div&gt;');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
      expect(sanitizeString({})).toEqual({});
    });

    it('should sanitize quotes and slashes', () => {
      const input = `"Hello 'World' & /path/`;
      const expected = `&quot;Hello &#x27;World&#x27; &amp; &#x2F;path&#x2F;`;

      expect(sanitizeString(input)).toBe(expected);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>alert("test")</script>',
        details: {
          description: '<b>Bold</b>',
          tags: ['<em>tag1</em>', 'normal-tag']
        }
      };

      const result = sanitizeObject(input);

      expect(result.name).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;&#x2F;script&gt;');
      expect(result.details.description).toBe('&lt;b&gt;Bold&lt;&#x2F;b&gt;');
      expect(result.details.tags[0]).toBe('&lt;em&gt;tag1&lt;&#x2F;em&gt;');
      expect(result.details.tags[1]).toBe('normal-tag');
    });

    it('should handle arrays', () => {
      const input = ['<script>', 'normal', { nested: '<div>' }];
      const result = sanitizeObject(input);

      expect(result[0]).toBe('&lt;script&gt;');
      expect(result[1]).toBe('normal');
      expect(result[2].nested).toBe('&lt;div&gt;');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should preserve non-string, non-object values', () => {
      const input = {
        number: 123,
        boolean: true,
        date: new Date('2023-01-01')
      };

      const result = sanitizeObject(input);

      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
      expect(result.date).toEqual(new Date('2023-01-01'));
    });
  });

  describe('sanitizeInput middleware', () => {
    it('should sanitize request body', () => {
      const req = createMockReq({
        name: '<script>test</script>',
        description: 'Normal text'
      });
      const res = createMockRes();

      sanitizeInput(req, res, mockNext);

      expect(req.body.name).toBe('&lt;script&gt;test&lt;&#x2F;script&gt;');
      expect(req.body.description).toBe('Normal text');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize request query parameters', () => {
      const req = createMockReq({}, {
        search: '<script>alert("xss")</script>',
        page: '1'
      });
      const res = createMockRes();

      sanitizeInput(req, res, mockNext);

      expect(req.query.search).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(req.query.page).toBe('1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize request params', () => {
      const req = createMockReq({}, {}, {
        id: '<script>',
        slug: 'normal-slug'
      });
      const res = createMockRes();

      sanitizeInput(req, res, mockNext);

      expect(req.params.id).toBe('&lt;script&gt;');
      expect(req.params.slug).toBe('normal-slug');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle sanitization errors', () => {
      // Mock sanitizeObject to throw an error
      const originalSanitizeObject = require('../../src/middleware/sanitizer').sanitizeObject;
      require('../../src/middleware/sanitizer').sanitizeObject = jest.fn(() => {
        throw new Error('Sanitization error');
      });

      const req = createMockReq({ name: 'test' });
      const res = createMockRes();

      sanitizeInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Input processing error',
        message: 'Failed to process request input'
      });
      expect(mockNext).not.toHaveBeenCalled();

      // Restore original function
      require('../../src/middleware/sanitizer').sanitizeObject = originalSanitizeObject;
    });
  });

  describe('validateClient middleware', () => {
    it('should validate valid client data', () => {
      const req = createMockReq({
        code: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        status: 'active',
        birthDate: '1990-01-01'
      });
      const res = createMockRes();

      validateClient(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.body.email).toBe('john@example.com'); // Should be lowercase
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid email', () => {
      const req = createMockReq({
        code: 1,
        name: 'John Doe',
        email: 'invalid-email'
      });
      const res = createMockRes();

      validateClient(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('valid email')
            })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing required fields', () => {
      const req = createMockReq({
        name: 'John Doe'
        // Missing code and email
      });
      const res = createMockRes();

      validateClient(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'code',
              message: expect.stringContaining('required')
            }),
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('required')
            })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid phone number format', () => {
      const req = createMockReq({
        code: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123' // Too short
      });
      const res = createMockRes();

      validateClient(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'phone',
              message: expect.stringContaining('at least 10')
            })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid status', () => {
      const req = createMockReq({
        code: 1,
        name: 'John Doe',
        email: 'john@example.com',
        status: 'invalid-status'
      });
      const res = createMockRes();

      validateClient(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'status',
              message: expect.stringContaining('active')
            })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should strip unknown fields', () => {
      const req = createMockReq({
        code: 1,
        name: 'John Doe',
        email: 'john@example.com',
        unknownField: 'should be removed',
        anotherUnknown: 'also removed'
      });
      const res = createMockRes();

      validateClient(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.body.unknownField).toBeUndefined();
      expect(req.body.anotherUnknown).toBeUndefined();
      expect(req.body.code).toBe(1);
      expect(req.body.name).toBe('John Doe');
      expect(req.body.email).toBe('john@example.com');
    });

    it('should set default values', () => {
      const req = createMockReq({
        code: 1,
        name: 'John Doe',
        email: 'john@example.com'
        // No status provided
      });
      const res = createMockRes();

      validateClient(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.body.status).toBe('active'); // Default value
    });
  });
});
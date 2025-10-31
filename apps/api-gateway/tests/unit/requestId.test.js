const { requestIdMiddleware } = require('../../src/middleware/requestId');

// Mock console.log to avoid cluttering test output
console.log = jest.fn();

describe('requestId Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      method: 'GET',
      path: '/test'
    };
    res = {
      setHeader: jest.fn()
    };
    next = jest.fn();
  });

  test('should generate request ID if not provided', () => {
    requestIdMiddleware(req, res, next);

    expect(req.id).toBeDefined();
    expect(typeof req.id).toBe('string');
    expect(req.id.length).toBeGreaterThan(0);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.id);
    expect(next).toHaveBeenCalled();
  });

  test('should use existing request ID if provided', () => {
    const existingId = 'existing-request-id-123';
    req.headers['x-request-id'] = existingId;

    requestIdMiddleware(req, res, next);

    expect(req.id).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', existingId);
    expect(next).toHaveBeenCalled();
  });

  test('should log request with ID', () => {
    requestIdMiddleware(req, res, next);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('GET /test')
    );
  });
});

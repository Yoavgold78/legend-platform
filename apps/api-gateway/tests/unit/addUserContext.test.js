const addUserContext = require('../../src/middleware/addUserContext');

describe('addUserContext Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      auth: {
        payload: {
          sub: 'auth0|123456'
        }
      },
      headers: {}
    };
    res = {};
    next = jest.fn();
  });

  test('should add x-user-id header from req.auth.payload.sub', () => {
    addUserContext(req, res, next);

    expect(req.headers['x-user-id']).toBe('auth0|123456');
    expect(req.userId).toBe('auth0|123456');
    expect(next).toHaveBeenCalled();
  });

  test('should call next even if req.auth is missing', () => {
    req.auth = undefined;

    addUserContext(req, res, next);

    expect(req.headers['x-user-id']).toBeUndefined();
    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  test('should call next even if req.auth.payload is missing', () => {
    req.auth = {};

    addUserContext(req, res, next);

    expect(req.headers['x-user-id']).toBeUndefined();
    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  test('should call next even if req.auth.payload.sub is missing', () => {
    req.auth = {
      payload: {}
    };

    addUserContext(req, res, next);

    expect(req.headers['x-user-id']).toBeUndefined();
    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

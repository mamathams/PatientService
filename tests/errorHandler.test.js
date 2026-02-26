const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('errorHandler middleware', () => {
  it('handles Sequelize unique constraint errors', () => {
    const err = {
      name: 'SequelizeUniqueConstraintError',
      errors: [{ path: 'email' }]
    };
    const req = { path: '/api/v1/patients', method: 'POST' };
    const res = createRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 409 })
    );
  });

  it('handles timeout errors', () => {
    const err = { name: 'TimeoutError', message: 'timeout' };
    const req = { path: '/api/v1/patients', method: 'GET' };
    const res = createRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(408);
  });

  it('handles default errors', () => {
    const err = { message: 'boom' };
    const req = { path: '/api/v1/patients', method: 'GET' };
    const res = createRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'boom' })
    );
  });

  it('returns not found route response', () => {
    const req = { path: '/missing', method: 'GET' };
    const res = createRes();

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 404 })
    );
  });
});

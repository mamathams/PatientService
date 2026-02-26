const validate = require('../src/middleware/validation');
const Joi = require('joi');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('validation middleware', () => {
  it('passes valid request and strips unknown fields', () => {
    const schema = Joi.object({
      firstName: Joi.string().required()
    });
    const middleware = validate(schema);
    const req = { body: { firstName: 'Mamatha', extra: 'remove-me' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(req.body).toEqual({ firstName: 'Mamatha' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 with details for invalid request', () => {
    const schema = Joi.object({
      firstName: Joi.string().required()
    });
    const middleware = validate(schema);
    const req = { body: {} };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Validation failed'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

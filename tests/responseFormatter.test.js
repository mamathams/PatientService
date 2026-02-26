const responseFormatter = require('../src/utils/responseFormatter');

describe('responseFormatter', () => {
  it('formats success responses', () => {
    const result = responseFormatter.success({ id: 'p1' }, 'ok', 200);

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        statusCode: 200,
        message: 'ok',
        data: { id: 'p1' }
      })
    );
    expect(result.timestamp).toBeDefined();
  });

  it('formats error responses with optional data', () => {
    const result = responseFormatter.error('bad', 400, [{ field: 'email' }], { hint: true });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'bad',
        errors: [{ field: 'email' }],
        data: { hint: true }
      })
    );
  });

  it('formats paginated and created responses', () => {
    const paginated = responseFormatter.paginated([1, 2], { total: 20, page: 2, limit: 5 });
    const created = responseFormatter.created({ id: 'p2' });

    expect(paginated.pagination).toEqual({ total: 20, page: 2, limit: 5, pages: 4 });
    expect(created).toEqual(
      expect.objectContaining({
        success: true,
        statusCode: 201
      })
    );
  });
});

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/models');
const runDbTests = process.env.RUN_DB_TESTS === 'true';
const describeIfDb = runDbTests ? describe : describe.skip;

describeIfDb('Patient API', () => {
  let patientId;

  beforeAll(async () => {
    await db.sequelize.authenticate();
    await db.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  // Create patient
  describe('POST /api/v1/patients', () => {
    it('should create a new patient', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .send({
          firstName: 'Test',
          lastName: 'Patient',
          email: 'test.patient@example.com',
          phone: '+1-555-0199',
          dateOfBirth: '1990-01-01',
          gender: 'M'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      patientId = response.body.data.id;
    });

    it('should return 400 for invalid patient data', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .send({
          firstName: 'Test'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // Get all patients
  describe('GET /api/v1/patients', () => {
    it('should return a list of patients', async () => {
      const response = await request(app)
        .get('/api/v1/patients')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Get patient by ID
  describe('GET /api/v1/patients/:id', () => {
    it('should return a patient by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/patients/${patientId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(patientId);
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/v1/patients/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // Update patient
  describe('PUT /api/v1/patients/:id', () => {
    it('should update a patient', async () => {
      const response = await request(app)
        .put(`/api/v1/patients/${patientId}`)
        .send({
          email: 'updated.email@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Delete patient
  describe('DELETE /api/v1/patients/:id', () => {
    it('should delete a patient (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/v1/patients/${patientId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

// Health check
describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });
});

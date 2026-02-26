const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

const loadService = () => {
  jest.resetModules();

  const Patient = {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    sequelize: {
      sync: jest.fn().mockResolvedValue(undefined)
    }
  };

  const Op = { or: 'or', iLike: 'iLike' };

  jest.doMock('../src/models', () => ({ Patient }));
  jest.doMock('sequelize', () => ({ Op }));

  // eslint-disable-next-line global-require
  const service = require('../src/services/patientService');
  return { service, Patient, Op };
};

describe('patientService unit', () => {
  it('creates a patient', async () => {
    const { service, Patient } = loadService();
    const created = { id: 'p1' };
    Patient.create.mockResolvedValue(created);

    const result = await service.createPatient({ firstName: 'Test' });

    expect(result).toEqual(created);
    expect(Patient.create).toHaveBeenCalledWith({ firstName: 'Test' });
  });

  it('recovers from missing table by syncing schema and retrying', async () => {
    const { service, Patient } = loadService();
    const created = { id: 'p1' };

    Patient.create
      .mockRejectedValueOnce({ message: "Table 'hospitaldb.patients' doesn't exist" })
      .mockResolvedValueOnce(created);

    const result = await service.createPatient({ firstName: 'Retry' });

    expect(result).toEqual(created);
    expect(Patient.sequelize.sync).toHaveBeenCalledTimes(1);
    expect(Patient.create).toHaveBeenCalledTimes(2);
  });

  it('gets paginated patients with search and status filters', async () => {
    const { service, Patient, Op } = loadService();
    Patient.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 'p1' }] });

    const result = await service.getAllPatients(2, 5, { status: 'active', search: 'jo' });

    expect(result).toEqual({
      patients: [{ id: 'p1' }],
      total: 1,
      page: 2,
      limit: 5
    });
    expect(Patient.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: 5,
        limit: 5,
        where: {
          status: 'active',
          [Op.or]: expect.any(Array)
        }
      })
    );
  });

  it('returns 404 for invalid patient id', async () => {
    const { service, Patient } = loadService();

    await expect(service.getPatientById('invalid-id')).rejects.toMatchObject({ statusCode: 404 });
    expect(Patient.findByPk).not.toHaveBeenCalled();
  });

  it('updates and deletes patient records', async () => {
    const { service, Patient } = loadService();
    const patient = { update: jest.fn().mockResolvedValue(undefined) };
    Patient.findByPk.mockResolvedValue(patient);

    await service.updatePatient(VALID_UUID, { city: 'Bengaluru' });
    await service.deletePatient(VALID_UUID);

    expect(patient.update).toHaveBeenCalledWith({ city: 'Bengaluru' });
    expect(patient.update).toHaveBeenCalledWith({ status: 'inactive' });
  });

  it('gets patient stats via counts', async () => {
    const { service, Patient } = loadService();
    Patient.findAll.mockResolvedValue([]);
    Patient.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2);

    const result = await service.getPatientStats();

    expect(result).toEqual({ total: 10, active: 8, inactive: 2 });
    expect(Patient.count).toHaveBeenCalledTimes(3);
  });
});

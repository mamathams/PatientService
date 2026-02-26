const { Patient } = require('../models');
const { Op } = require('sequelize');

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const notFoundError = () => {
  const error = new Error('Patient not found');
  error.statusCode = 404;
  return error;
};

class PatientService {
  /**
   * Create a new patient
   */
  async createPatient(data) {
    try {
      const patient = await Patient.create(data);
      return patient;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all patients with pagination
   */
  async getAllPatients(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = {};

      // Build filter conditions
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.search) {
        where[Op.or] = [
          { firstName: { [Op.iLike]: `%${filters.search}%` } },
          { lastName: { [Op.iLike]: `%${filters.search}%` } },
          { email: { [Op.iLike]: `%${filters.search}%` } },
          { phone: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }

      const { count, rows } = await Patient.findAndCountAll({
        where,
        offset,
        limit,
        order: [['createdAt', 'DESC']]
      });

      return {
        patients: rows,
        total: count,
        page,
        limit
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient by ID
   */
  async getPatientById(patientId) {
    try {
      if (!UUID_V4_REGEX.test(patientId)) {
        throw notFoundError();
      }

      const patient = await Patient.findByPk(patientId);

      if (!patient) {
        throw notFoundError();
      }

      return patient;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient by email
   */
  async getPatientByEmail(email) {
    try {
      const patient = await Patient.findOne({ where: { email } });
      return patient;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update patient
   */
  async updatePatient(patientId, data) {
    try {
      const patient = await this.getPatientById(patientId);

      // Update patient record
      await patient.update(data);

      return patient;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete patient (soft delete via status)
   */
  async deletePatient(patientId) {
    try {
      const patient = await this.getPatientById(patientId);

      // Soft delete by setting status to inactive
      await patient.update({ status: 'inactive' });

      return patient;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search patients by multiple criteria
   */
  async searchPatients(criteria) {
    try {
      const where = {};

      if (criteria.firstName) {
        where.firstName = { [Op.iLike]: `%${criteria.firstName}%` };
      }

      if (criteria.lastName) {
        where.lastName = { [Op.iLike]: `%${criteria.lastName}%` };
      }

      if (criteria.email) {
        where.email = { [Op.iLike]: `%${criteria.email}%` };
      }

      if (criteria.phone) {
        where.phone = { [Op.iLike]: `%${criteria.phone}%` };
      }

      if (criteria.bloodType) {
        where.bloodType = criteria.bloodType;
      }

      const patients = await Patient.findAll({
        where,
        limit: criteria.limit || 20
      });

      return patients;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient statistics
   */
  async getPatientStats() {
    try {
      const stats = await Patient.findAll({
        attributes: [
          ['status', 'status'],
          ['gender', 'gender']
        ],
        raw: true,
        subQuery: false
      });

      const groupedStats = stats.reduce((acc, stat) => {
        return acc;
      }, {});

      const totalPatients = await Patient.count();
      const activePatients = await Patient.count({
        where: { status: 'active' }
      });
      const inactivePatients = await Patient.count({
        where: { status: 'inactive' }
      });

      return {
        total: totalPatients,
        active: activePatients,
        inactive: inactivePatients
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PatientService();

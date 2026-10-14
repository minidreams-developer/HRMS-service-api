const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const SeriesConfiguration = require('../../src/models/seriesConfiguration.model');
const seriesService = require('../../src/services/seriesConfiguration.service');

setupTestDB();

const makeSeries = (overrides = {}) => ({
  seriesName: `Series ${new mongoose.Types.ObjectId()}`,
  voucherType: 'employee',
  prefix: 'EMP',
  suffix: '',
  startingNo: 1,
  lengthOfZero: 4,
  ...overrides,
});

describe('SETTINGS-SERIES-04 allocation', () => {
  beforeEach(async () => {
    await SeriesConfiguration.deleteMany({});
  });

  test('registers contractors through the real HTTP endpoint using the configured series', async () => {
    const admin = await User.create({
      name: 'Series Admin',
      email: `series-admin-${Date.now()}@example.com`,
      password: await bcrypt.hash('password1', 8),
      role: 'admin',
      isEmailVerified: true,
    });
    const authorization = { Authorization: `Bearer ${tokenService.generateToken(admin._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` };
    await seriesService.createSeriesConfiguration(makeSeries({ voucherType: 'contractor', prefix: 'CTR-' }));

    const body = (suffix) => ({
      name: `Contractor ${suffix}`,
      email: `contractor-${suffix}-${Date.now()}@example.com`,
      password: 'password1',
      phone: Number(`98765${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`),
      workInformation: { companyName: `Company ${suffix}` },
    });
    const first = await request(app).post('/v1/contractors/register').set(authorization).send(body('one')).expect(201);
    const second = await request(app).post('/v1/contractors/register').set(authorization).send(body('two')).expect(201);
    expect(first.body.employeeId).toBe('CTR-0001');
    expect(second.body.employeeId).toBe('CTR-0002');
    expect(await User.exists({ employeeId: 'CTR-0001', role: 'contractor' })).toBeTruthy();
    expect(await User.exists({ employeeId: 'CTR-0002', role: 'contractor' })).toBeTruthy();
    const current = await SeriesConfiguration.findOne({ voucherType: 'contractor' });
    expect(current.currentNumber).toBe(2);
    expect(current.hasBeenUsed).toBe(true);
  });

  test('allocates exact first and second values with formatting', async () => {
    const config = await seriesService.createSeriesConfiguration(makeSeries());
    expect(await seriesService.allocateNextNumber('employee')).toBe('EMP0001');
    expect(await seriesService.allocateNextNumber('employee')).toBe('EMP0002');
    const current = await SeriesConfiguration.findById(config._id);
    expect(current.currentNumber).toBe(2);
    expect(current.hasBeenUsed).toBe(true);
  });

  test('supports prefix, suffix, and zero padding', async () => {
    await seriesService.createSeriesConfiguration(makeSeries({ prefix: 'EMP-', suffix: '-TN', startingNo: 12 }));
    expect(await seriesService.allocateNextNumber('employee')).toBe('EMP-0012-TN');
  });

  test('allocates staff, agent, and contractor series independently', async () => {
    await seriesService.createSeriesConfiguration(makeSeries({ voucherType: 'staff', prefix: 'STF' }));
    await seriesService.createSeriesConfiguration(makeSeries({ voucherType: 'agent', prefix: 'AGT' }));
    await seriesService.createSeriesConfiguration(makeSeries({ voucherType: 'contractor', prefix: 'CTR-' }));
    await expect(seriesService.allocateNextNumber('staff')).resolves.toBe('STF0001');
    await expect(seriesService.allocateNextNumber('staff')).resolves.toBe('STF0002');
    await expect(seriesService.allocateNextNumber('agent')).resolves.toBe('AGT0001');
    await expect(seriesService.allocateNextNumber('agent')).resolves.toBe('AGT0002');
    await expect(seriesService.allocateNextNumber('contractor')).resolves.toBe('CTR-0001');
    await expect(seriesService.allocateNextNumber('contractor')).resolves.toBe('CTR-0002');
  });

  test('allocates ten concurrent values without duplicates', async () => {
    await seriesService.createSeriesConfiguration(makeSeries({ prefix: 'CC' }));
    const values = await Promise.all(Array.from({ length: 10 }, () => seriesService.allocateNextNumber('employee')));
    expect(new Set(values).size).toBe(10);
    expect(values.sort()).toEqual(Array.from({ length: 10 }, (_, i) => `CC${String(i + 1).padStart(4, '0')}`));
    const current = await SeriesConfiguration.findOne({ voucherType: 'employee' });
    expect(current.currentNumber).toBe(10);
    expect(current.hasBeenUsed).toBe(true);
  });

  test('rejects duplicate voucher types and protects used series', async () => {
    const config = await seriesService.createSeriesConfiguration(makeSeries());
    await expect(seriesService.createSeriesConfiguration(makeSeries())).rejects.toThrow('Series for voucherType already exists');
    await seriesService.allocateNextNumber('employee');
    await expect(seriesService.updateSeriesConfigurationById(config._id, { startingNo: 20 }))
      .rejects.toThrow('startingNo cannot be changed after the series is used');
    await expect(seriesService.deleteSeriesConfigurationById(config._id))
      .rejects.toThrow('Used series configuration cannot be deleted');
  });

  test('allows unused series deletion and preserves fallback absence', async () => {
    const config = await seriesService.createSeriesConfiguration(makeSeries());
    await expect(seriesService.deleteSeriesConfigurationById(config._id)).resolves.toBeTruthy();
    await expect(seriesService.allocateNextNumber('employee')).resolves.toBeNull();
  });
});

process.env.DB_DIALECT = 'sqlite';
process.env.SQLITE_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Device API', () => {
  let deviceId;
  let authToken;

  test('POST /api/devices registers a new device', async () => {
    const res = await request(app)
      .post('/api/devices')
      .send({ name: 'Test Tablet', deviceType: 'tablet', os: 'Android 14' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Tablet');
    expect(res.body.status).toBe('offline');
    deviceId = res.body.id;
  });

  test('POST /api/devices fails without a name', async () => {
    const res = await request(app).post('/api/devices').send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/devices lists devices', async () => {
    const res = await request(app).get('/api/devices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('POST /api/devices/:id/heartbeat updates telemetry and flips status online', async () => {
    const res = await request(app)
      .post(`/api/devices/${deviceId}/heartbeat`)
      .send({ batteryLevel: 55, crashCount: 1, storageFreeMb: 500 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.batteryLevel).toBe(55);
    expect(res.body.healthScore).toBeDefined();
  });

  test('POST /api/auth/login returns a token for valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
  });

  test('POST /api/devices/:id/command without auth is rejected', async () => {
    const res = await request(app)
      .post(`/api/devices/${deviceId}/command`)
      .send({ command: 'lock' });
    expect(res.status).toBe(401);
  });

  test('POST /api/devices/:id/command with auth locks the device', async () => {
    const res = await request(app)
      .post(`/api/devices/${deviceId}/command`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ command: 'lock' });

    expect(res.status).toBe(200);
    expect(res.body.device.status).toBe('locked');
    expect(res.body.commandLog.command).toBe('lock');
  });

  test('GET /api/devices/:id/logs returns the command audit trail', async () => {
    const res = await request(app)
      .get(`/api/devices/${deviceId}/logs`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].command).toBe('lock');
  });

  test('GET /api/fleet/summary returns aggregate counts', async () => {
    const res = await request(app).get('/api/fleet/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('healthy');
    expect(res.body).toHaveProperty('critical');
  });

  test('DELETE /api/devices/:id removes the device', async () => {
    const res = await request(app)
      .delete(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(204);
  });

  test('GET /api/devices/:id after delete returns 404', async () => {
    const res = await request(app).get(`/api/devices/${deviceId}`);
    expect(res.status).toBe(404);
  });
});
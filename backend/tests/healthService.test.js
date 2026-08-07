const { computeHealth } = require('../src/services/healthService');

describe('healthService.computeHealth', () => {
  test('a fresh, fully healthy device scores 100', () => {
    const device = {
      batteryLevel: 100,
      lastHeartbeat: new Date(),
      crashCount: 0,
      storageFreeMb: 2000,
    };
    const result = computeHealth(device);
    expect(result.score).toBe(100);
    expect(result.status).toBe('healthy');
  });

  test('low battery reduces score and adds a reason', () => {
    const device = {
      batteryLevel: 10,
      lastHeartbeat: new Date(),
      crashCount: 0,
      storageFreeMb: 2000,
    };
    const result = computeHealth(device);
    expect(result.score).toBeLessThan(100);
    expect(result.reasons.some((r) => r.includes('Low battery'))).toBe(true);
  });

  test('stale heartbeat pushes device toward critical', () => {
    const staleDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const device = {
      batteryLevel: 100,
      lastHeartbeat: staleDate,
      crashCount: 0,
      storageFreeMb: 2000,
    };
    const result = computeHealth(device);
    expect(result.score).toBeLessThanOrEqual(60);
  });

  test('device that never checked in is heavily penalized', () => {
    const device = {
      batteryLevel: 100,
      lastHeartbeat: null,
      crashCount: 0,
      storageFreeMb: 2000,
    };
    const result = computeHealth(device);
    expect(result.score).toBe(50);
  });

  test('multiple compounding issues push status to critical', () => {
    const staleDate = new Date(Date.now() - 10 * 60 * 1000);
    const device = {
      batteryLevel: 5,
      lastHeartbeat: staleDate,
      crashCount: 5,
      storageFreeMb: 20,
    };
    const result = computeHealth(device);
    expect(result.status).toBe('critical');
    expect(result.score).toBeLessThan(40);
  });

  test('score never goes below 0', () => {
    const veryStale = new Date(Date.now() - 100 * 60 * 1000);
    const device = {
      batteryLevel: 0,
      lastHeartbeat: veryStale,
      crashCount: 20,
      storageFreeMb: 0,
    };
    const result = computeHealth(device);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
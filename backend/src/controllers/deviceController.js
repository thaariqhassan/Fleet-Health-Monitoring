const Device = require('../models/Device');
const CommandLog = require('../models/CommandLog');
const { computeHealth } = require('../services/healthService');

// Enrich a device row with a live-computed health score before sending to client
function toDeviceDto(device) {
  const plain = device.toJSON ? device.toJSON() : device;
  const health = computeHealth(plain);
  return { ...plain, healthScore: health.score, healthStatus: health.status, healthReasons: health.reasons };
}

// GET /api/devices
async function listDevices(req, res, next) {
  try {
    const devices = await Device.findAll({ order: [['name', 'ASC']] });
    res.json(devices.map(toDeviceDto));
  } catch (err) {
    next(err);
  }
}

// GET /api/devices/:id
async function getDevice(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(toDeviceDto(device));
  } catch (err) {
    next(err);
  }
}

// POST /api/devices  (register a new device)
async function registerDevice(req, res, next) {
  try {
    const { name, deviceType, os } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const device = await Device.create({
      name,
      deviceType: deviceType || 'mobile',
      os: os || 'unknown',
      status: 'offline',
    });
    res.status(201).json(toDeviceDto(device));
  } catch (err) {
    next(err);
  }
}

// POST /api/devices/:id/heartbeat  (device check-in, called by real or simulated devices)
async function heartbeat(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const { batteryLevel, storageFreeMb, crashCount } = req.body;

    if (batteryLevel !== undefined) device.batteryLevel = batteryLevel;
    if (storageFreeMb !== undefined) device.storageFreeMb = storageFreeMb;
    if (crashCount !== undefined) device.crashCount = crashCount;

    device.lastHeartbeat = new Date();
    if (device.status !== 'locked') device.status = 'online';

    const health = computeHealth(device);
    device.healthScore = health.score;
    device.healthStatus = health.status;

    await device.save();
    res.json(toDeviceDto(device));
  } catch (err) {
    next(err);
  }
}

// POST /api/devices/:id/command  (admin sends lock/unlock/wipe/message/restart)
async function sendCommand(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const { command, payload } = req.body;
    const validCommands = ['lock', 'unlock', 'wipe', 'message', 'restart'];
    if (!validCommands.includes(command)) {
      return res.status(400).json({ error: `command must be one of: ${validCommands.join(', ')}` });
    }

    if (command === 'lock') device.status = 'locked';
    if (command === 'unlock') device.status = 'online';
    if (command === 'wipe') {
      device.batteryLevel = 100;
      device.crashCount = 0;
      device.storageFreeMb = 1000;
      device.status = 'offline';
    }

    await device.save();

    const log = await CommandLog.create({
      deviceId: device.id,
      command,
      payload: payload || null,
      issuedBy: (req.user && req.user.username) || 'admin',
    });

    res.json({ device: toDeviceDto(device), commandLog: log });
  } catch (err) {
    next(err);
  }
}

// GET /api/devices/:id/logs  (audit trail for a device)
async function getDeviceLogs(req, res, next) {
  try {
    const logs = await CommandLog.findAll({
      where: { deviceId: req.params.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/devices/:id
async function deleteDevice(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    await device.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/fleet/summary  (dashboard header stats)
async function fleetSummary(req, res, next) {
  try {
    const devices = await Device.findAll();
    const enriched = devices.map((d) => computeHealth(d));

    const summary = {
      total: devices.length,
      online: devices.filter((d) => d.status === 'online').length,
      offline: devices.filter((d) => d.status === 'offline').length,
      locked: devices.filter((d) => d.status === 'locked').length,
      healthy: enriched.filter((h) => h.status === 'healthy').length,
      warning: enriched.filter((h) => h.status === 'warning').length,
      critical: enriched.filter((h) => h.status === 'critical').length,
    };
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDevices,
  getDevice,
  registerDevice,
  heartbeat,
  sendCommand,
  getDeviceLogs,
  deleteDevice,
  fleetSummary,
};
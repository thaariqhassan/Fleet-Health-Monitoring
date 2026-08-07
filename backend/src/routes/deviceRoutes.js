const express = require('express');
const router = express.Router();
const controller = require('../controllers/deviceController');
const { requireAuth, login } = require('../middleware/auth');

// Auth
router.post('/auth/login', login);

// Fleet-wide stats (used by dashboard header)
router.get('/fleet/summary', controller.fleetSummary);

// Device CRUD
router.get('/devices', controller.listDevices);
router.get('/devices/:id', controller.getDevice);
router.post('/devices', controller.registerDevice);
router.delete('/devices/:id', requireAuth, controller.deleteDevice);

// Device check-in (called by real/simulated devices - no admin auth needed)
router.post('/devices/:id/heartbeat', controller.heartbeat);

// Admin commands (locked down)
router.post('/devices/:id/command', requireAuth, controller.sendCommand);
router.get('/devices/:id/logs', requireAuth, controller.getDeviceLogs);

module.exports = router;
/**
 * Simulates a small fleet of devices checking in with the API.
 * Run with: npm run simulate  (make sure the server is running first)
 */
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const NUM_DEVICES = parseInt(process.env.NUM_DEVICES || '6', 10);
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '5000', 10);

const DEVICE_NAMES = [
  'Warehouse Scanner 01', 'Warehouse Scanner 02', 'Delivery Tablet A',
  'Delivery Tablet B', 'Kiosk - Lobby', 'Kiosk - Floor 2',
  'Field Rep Phone 1', 'Field Rep Phone 2',
];

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          resolve(raw);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function registerDevices() {
  const devices = [];
  for (let i = 0; i < NUM_DEVICES; i++) {
    const name = DEVICE_NAMES[i % DEVICE_NAMES.length] + (i >= DEVICE_NAMES.length ? ` (${i})` : '');
    const deviceType = i % 3 === 0 ? 'iot-sensor' : (i % 2 === 0 ? 'tablet' : 'mobile');
    const device = await request('POST', '/devices', { name, deviceType, os: 'Android 14' });
    console.log(`Registered: ${device.name} (${device.id})`);
    devices.push(device);
  }
  return devices;
}

async function sendHeartbeats(devices) {
  for (const device of devices) {
    // Occasionally simulate a degrading device to show the health scoring in action
    const isDegrading = Math.random() < 0.2;

    const batteryLevel = isDegrading ? randomBetween(1, 19) : randomBetween(40, 100);
    const crashCount = isDegrading ? randomBetween(3, 6) : randomBetween(0, 1);
    const storageFreeMb = isDegrading ? randomBetween(10, 90) : randomBetween(200, 2000);

    try {
      await request('POST', `/devices/${device.id}/heartbeat`, { batteryLevel, crashCount, storageFreeMb });
    } catch (err) {
      console.error(`Heartbeat failed for ${device.name}:`, err.message);
    }
  }
  console.log(`Sent heartbeats for ${devices.length} devices at ${new Date().toLocaleTimeString()}`);
}

async function main() {
  console.log(`Registering ${NUM_DEVICES} simulated devices...`);
  const devices = await registerDevices();

  console.log(`Starting heartbeat loop every ${HEARTBEAT_INTERVAL_MS}ms. Press Ctrl+C to stop.`);
  await sendHeartbeats(devices);
  setInterval(() => sendHeartbeats(devices), HEARTBEAT_INTERVAL_MS);
}

main().catch((err) => {
  console.error('Simulator failed:', err);
  process.exit(1);
});
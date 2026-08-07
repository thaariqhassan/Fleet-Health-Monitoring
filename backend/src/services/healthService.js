require('dotenv').config();

const BATTERY_LOW_THRESHOLD = parseInt(process.env.BATTERY_LOW_THRESHOLD || '20', 10);
const HEARTBEAT_TIMEOUT_SECONDS = parseInt(process.env.HEARTBEAT_TIMEOUT_SECONDS || '120', 10);
const CRASH_COUNT_THRESHOLD = parseInt(process.env.CRASH_COUNT_THRESHOLD || '3', 10);

function computeHealth(device) {
  let score = 100;
  const reasons = [];

  if (device.batteryLevel <= BATTERY_LOW_THRESHOLD) {
    score -= 30;
    reasons.push(`Low battery (${device.batteryLevel}%)`);
  } else if (device.batteryLevel <= BATTERY_LOW_THRESHOLD + 15) {
    score -= 10;
    reasons.push(`Battery getting low (${device.batteryLevel}%)`);
  }

  if (device.lastHeartbeat) {
    const secondsSinceHeartbeat = (Date.now() - new Date(device.lastHeartbeat).getTime()) / 1000;
    if (secondsSinceHeartbeat > HEARTBEAT_TIMEOUT_SECONDS) {
      score -= 40;
      reasons.push(`No heartbeat for ${Math.round(secondsSinceHeartbeat)}s`);
    } else if (secondsSinceHeartbeat > HEARTBEAT_TIMEOUT_SECONDS / 2) {
      score -= 10;
      reasons.push('Heartbeat delayed');
    }
  } else {
    score -= 50;
    reasons.push('Never checked in');
  }

  if (device.crashCount >= CRASH_COUNT_THRESHOLD) {
    score -= 20;
    reasons.push(`High crash count (${device.crashCount})`);
  } else if (device.crashCount > 0) {
    score -= 5 * device.crashCount;
    reasons.push(`${device.crashCount} crash(es) reported`);
  }

  if (device.storageFreeMb < 100) {
    score -= 15;
    reasons.push('Very low free storage');
  }

  score = Math.max(0, Math.min(100, score));

  let status = 'healthy';
  if (score < 40) status = 'critical';
  else if (score < 75) status = 'warning';

  return { score, status, reasons };
}

module.exports = { computeHealth, BATTERY_LOW_THRESHOLD, HEARTBEAT_TIMEOUT_SECONDS, CRASH_COUNT_THRESHOLD };